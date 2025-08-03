// src/services/nfts.service.ts

import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import nftFactoryAbi from '../abi/nftFactoryAbi.json';
import erc721Abi from '../abi/erc721Abi.json';

import { BrandSettings }   from '../models/brandSettings.model';
import { Product }         from '../models/product.model';
import { NftCertificate }  from '../models/nftCertificate.model';
import { Subscription }    from '../models/subscription.model';
import * as billingService from './billing.service';
import { uploadJsonToStorage } from './storage.service';

const provider = new JsonRpcProvider(process.env.BASE_RPC_URL!);
const signer   = new Wallet(process.env.PRIVATE_KEY!, provider);

/** Factory contract to deploy new ERC721s */
const factory = new Contract(
  process.env.NFT_FACTORY_ADDRESS!,
  nftFactoryAbi,
  signer
);

type DeployInput = { name: string; symbol: string; baseUri: string };
type MintInput   = { productId: string; recipient?: string };

/**
 * Deploys a new ERC721 contract via the on-chain factory.
 */
export async function deployContract(
  input: DeployInput,
  businessId: string
): Promise<{ address: string; txHash: string }> {
  const tx      = await factory.deployNFT(input.name, input.symbol, input.baseUri);
  const receipt = await tx.wait();

  // Annotate 'e' as any so TS won’t infer an implicit any
  const evt = receipt.events?.find((e: any) => e.event === 'NFTDeployed');
  if (!evt) throw new Error('NFTDeployed event not found');

  // Cast args as any to access contractAddress
  const address = (evt.args as any).contractAddress as string;
  await BrandSettings.findOneAndUpdate(
    { business: businessId },
    { nftContract: address },
    { new: true, upsert: true }
  );

  return { address, txHash: receipt.transactionHash };
}

/**
 * Lists NFT contracts this business has deployed.
 */
export async function listContracts(
  businessId: string
): Promise<string[]> {
  const count = await factory.getUserContractCount(businessId);
  const addrs: string[] = [];
  for (let i = 0; i < count; i++) {
    const addr = await factory.userContracts(businessId, i);
    addrs.push(addr);
  }
  return addrs;
}

/**
 * Mints a certificate NFT for a product to a recipient (or default wallet),
 * enforcing the brand’s subscription limits.
 */
export async function mintNft(
  businessId: string,
  input: MintInput
): Promise<{ tokenId: string; txHash: string }> {
  // 1) Subscription & 30-day usage
  const sub = await Subscription.findOne({ business: businessId });
  if (!sub) throw { statusCode: 500, message: 'Subscription not found' };

  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const usedMints   = await NftCertificate.countDocuments({
    business:  businessId,
    mintedAt:  { $gte: windowStart }
  });

  if (sub.nftLimit >= 0 && usedMints + 1 > sub.nftLimit) {
    const over = usedMints + 1 - sub.nftLimit;
    if (!sub.allowOverage) {
      throw { statusCode: 402, message: `NFT limit of ${sub.nftLimit} per 30 days exceeded` };
    }
    await billingService.charge(businessId, over * sub.surchargePerNft, 'nft overage');
  }

  // 2) Brand’s deployed contract
  const settings = await BrandSettings.findOne({ business: businessId });
  if (!settings?.nftContract) {
    throw { statusCode: 400, message: 'NFT contract not deployed for this business.' };
  }
  const nftContract = new Contract(
    settings.nftContract,
    erc721Abi,
    signer
  );

  // 3) Determine recipient
  const to = input.recipient
    ?? settings.certificateWallet
    ?? (() => { throw { statusCode: 400, message: 'No recipient provided or default wallet set.' }; })();

  // 4) Product metadata
  const product = await Product.findById(input.productId).populate('media');
  if (!product) {
    throw { statusCode: 404, message: 'Product not found.' };
  }
  const firstMedia = (product.media as any[])[0];
  const metadata = {
    name:        product.title,
    description: product.description,
    image:       firstMedia?.url,
    attributes:  []
  };
  const tokenUri = await uploadJsonToStorage(
    businessId,
    product._id.toString(),
    metadata
  );

 // 5) Mint on-chain
const tx      = await nftContract.safeMint(to, tokenUri);
const receipt = await tx.wait();

// annotate `e` as any so TS doesn’t infer an implicit any
const evt = receipt.events?.find((e: any) => e.event === 'Transfer');
if (!evt) throw new Error('Transfer event not found');

// cast args as any to access tokenId
const tokenId = ((evt.args as any).tokenId as bigint).toString();

  // 6) Persist in DB
  await NftCertificate.create({
    business:  businessId,
    product:   product._id,
    recipient: to,
    tokenId,
    tokenUri,
    txHash:    receipt.transactionHash,
    mintedAt:  new Date()
  });

  return { tokenId, txHash: receipt.transactionHash };
}

/**
 * Lists all certificates for a business (optionally filtering by product).
 */
export async function listCertificates(
  businessId: string,
  productId?: string
): Promise<Array<{
  tokenId:   string;
  tokenUri:  string;
  recipient: string;
  txHash:    string;
  mintedAt:  Date;
  product:   string;
}>> {
  const filter: any = { business: businessId };
  if (productId) filter.product = productId;

  return NftCertificate.find(filter)
    .select('tokenId tokenUri recipient txHash mintedAt product -_id')
    .sort({ mintedAt: -1 })
    .lean();
}






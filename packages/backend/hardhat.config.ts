import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {},
    goerli: {
      url: process.env.GOERLI_RPC_URL!,
      accounts: process.env.DEPLOYER_KEY
        ? [process.env.DEPLOYER_KEY]
        : []
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL!,
      accounts: process.env.DEPLOYER_KEY
        ? [process.env.DEPLOYER_KEY]
        : []
    }
  },
  paths: {
    sources:    "./contracts",
    artifacts:  "./artifacts",
    cache:      "./cache",
    tests:      "./test"
  },
  typechain: {
    outDir:     "typechain",
    target:     "ethers-v6",
    alwaysGenerateOverloads: false
  }
};

export default config;


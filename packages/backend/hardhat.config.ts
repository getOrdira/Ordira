import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
  hardhat: {},
  base: {
    url: process.env.BASE_RPC_URL!,
    accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : []
  },
  'base-sepolia': {
    url: process.env.BASE_SEPOLIA_RPC_URL!,
    accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : []
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


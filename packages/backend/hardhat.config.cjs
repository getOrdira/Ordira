require("hardhat/config");
require("@nomicfoundation/hardhat-ethers");
require("@typechain/hardhat");
const dotenv = require("dotenv");

dotenv.config();

const config = {
  solidity: "0.8.19",
  networks: {
  hardhat: {},
  base: {
    url: process.env.BASE_RPC_URL,
    accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : []
  },
  'base-sepolia': {
    url: process.env.BASE_SEPOLIA_RPC_URL,
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

module.exports = config;


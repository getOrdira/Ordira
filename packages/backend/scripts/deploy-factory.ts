// scripts/deploy-factory.js
import { ethers } from 'hardhat';

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with", deployer.address);
  
    const Factory = await ethers.getContractFactory("NFTFactory");
    const factory  = await Factory.deploy();
    await factory.deployed();
  
    console.log("NFTFactory deployed to:", factory.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
  
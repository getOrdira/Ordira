// scripts/deploy-factory.ts
const { ethers } = require('hardhat');
const mongoose = require('mongoose');
require('dotenv').config();

// Import the model
const { FactorySettings } = require('../src/models/factorySettings.model');

async function main() {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  
    // Deploy NFTFactory
    console.log("\n=== Deploying NFTFactory ===");
    const NFTFactory = await ethers.getContractFactory("NFTFactory");
    const nftFactory = await NFTFactory.deploy();
    await nftFactory.waitForDeployment();
    const nftFactoryAddress = await nftFactory.getAddress();
    
    console.log("NFTFactory deployed to:", nftFactoryAddress);
    
    // Deploy VotingFactory
    console.log("\n=== Deploying VotingFactory ===");
    const VotingFactory = await ethers.getContractFactory("VotingFactory");
    const votingFactory = await VotingFactory.deploy();
    await votingFactory.waitForDeployment();
    const votingFactoryAddress = await votingFactory.getAddress();
    
    console.log("VotingFactory deployed to:", votingFactoryAddress);
    
    // Verify deployments
    console.log("\n=== Verification ===");
    console.log("NFTFactory owner:", await nftFactory.owner());
    console.log("VotingFactory owner:", await votingFactory.owner());
    
    // Store factory addresses in database
    console.log("\n=== Storing Factory Addresses in Database ===");
    
    // Store NFT Factory
    await FactorySettings.findOneAndUpdate(
        { type: 'nft' },
        {
            type: 'nft',
            address: nftFactoryAddress,
            networkName: process.env.BLOCKCHAIN_NETWORK || 'base',
            chainId: parseInt(process.env.CHAIN_ID || '8453'),
            deployedBy: deployer.address,
            isActive: true
        },
        { upsert: true, new: true }
    );
    console.log("✅ NFT Factory stored in database");
    
    // Store Voting Factory
    await FactorySettings.findOneAndUpdate(
        { type: 'voting' },
        {
            type: 'voting',
            address: votingFactoryAddress,
            networkName: process.env.BLOCKCHAIN_NETWORK || 'base',
            chainId: parseInt(process.env.CHAIN_ID || '8453'),
            deployedBy: deployer.address,
            isActive: true
        },
        { upsert: true, new: true }
    );
    console.log("✅ Voting Factory stored in database");
    
    // Summary
    console.log("\n=== Deployment Summary ===");
    console.log("NFTFactory Address:", nftFactoryAddress);
    console.log("VotingFactory Address:", votingFactoryAddress);
    console.log("Deployer Address:", deployer.address);
    console.log("Network:", process.env.BLOCKCHAIN_NETWORK || 'base');
    console.log("Chain ID:", process.env.CHAIN_ID || '8453');
    
    // Close database connection
    await mongoose.disconnect();
    console.log("\n✅ Deployment complete! Factory addresses stored in database.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
  
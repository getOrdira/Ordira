// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CertificateERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title NFTFactory - Factory for Deploying Brand-Specific Certificate Contracts
/// @notice Allows brands to deploy their own CertificateERC721 contracts with proper access control
contract NFTFactory is Ownable, ReentrancyGuard {
    // Mapping from brand address to their deployed contracts
    mapping(address => address[]) public brandContracts;
    
    // Mapping from contract address to brand address
    mapping(address => address) public contractToBrand;
    
    // Array of all deployed contracts
    address[] public allContracts;
    
    // Deployment fee (in wei)
    uint256 public deploymentFee = 0;
    
    // Maximum contracts per brand
    uint256 public maxContractsPerBrand = 10;
    
    // Events
    event NFTDeployed(
        address indexed brand, 
        address indexed contractAddress, 
        string name, 
        string symbol
    );
    event DeploymentFeeUpdated(uint256 newFee);
    event MaxContractsUpdated(uint256 newMax);
    
    /// @notice Deploy a new CertificateERC721 contract for a brand
    /// @param name Token name for the certificate contract
    /// @param symbol Token symbol for the certificate contract
    /// @param baseUri Base URI for token metadata
    /// @param brandAddress Address of the brand (will own the deployed contract)
    function deployNFT(
        string calldata name,
        string calldata symbol,
        string calldata baseUri,
        address brandAddress
    ) external payable nonReentrant returns (address) {
        require(brandAddress != address(0), "Invalid brand address");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        
        // Check if brand has reached max contracts
        require(
            brandContracts[brandAddress].length < maxContractsPerBrand,
            "Brand has reached maximum contract limit"
        );
        
        // Deploy new CertificateERC721 contract
        CertificateERC721 cert = new CertificateERC721(
            name,
            symbol,
            baseUri,
            brandAddress
        );
        
        address contractAddress = address(cert);
        
        // Update mappings
        brandContracts[brandAddress].push(contractAddress);
        contractToBrand[contractAddress] = brandAddress;
        allContracts.push(contractAddress);
        
        emit NFTDeployed(brandAddress, contractAddress, name, symbol);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value - deploymentFee);
        }
        
        return contractAddress;
    }
    
    /// @notice Deploy NFT contract for the caller (brand self-deployment)
    /// @param name Token name for the certificate contract
    /// @param symbol Token symbol for the certificate contract
    /// @param baseUri Base URI for token metadata
    function deployNFTForSelf(
        string calldata name,
        string calldata symbol,
        string calldata baseUri
    ) external payable nonReentrant returns (address) {
        return deployNFT(name, symbol, baseUri, msg.sender);
    }
    
    /// @notice Get all contracts deployed by a brand
    /// @param brandAddress Address of the brand
    /// @return contracts Array of contract addresses
    function getBrandContracts(address brandAddress) external view returns (address[] memory contracts) {
        return brandContracts[brandAddress];
    }
    
    /// @notice Get total number of contracts deployed by a brand
    /// @param brandAddress Address of the brand
    /// @return count Number of contracts deployed
    function getBrandContractCount(address brandAddress) external view returns (uint256 count) {
        return brandContracts[brandAddress].length;
    }
    
    /// @notice Get all deployed contracts
    /// @return contracts Array of all contract addresses
    function getAllContracts() external view returns (address[] memory contracts) {
        return allContracts;
    }
    
    /// @notice Get total number of deployed contracts
    /// @return count Total number of contracts
    function getTotalContractCount() external view returns (uint256 count) {
        return allContracts.length;
    }
    
    /// @notice Check if an address is a deployed contract
    /// @param contractAddress Address to check
    /// @return isContract True if the address is a deployed contract
    function isDeployedContract(address contractAddress) external view returns (bool isContract) {
        return contractToBrand[contractAddress] != address(0);
    }
    
    /// @notice Get brand address for a contract
    /// @param contractAddress Address of the contract
    /// @return brandAddress Address of the brand that deployed the contract
    function getContractBrand(address contractAddress) external view returns (address brandAddress) {
        return contractToBrand[contractAddress];
    }
    
    /// @notice Set deployment fee (only owner)
    /// @param newFee New deployment fee in wei
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }
    
    /// @notice Set maximum contracts per brand (only owner)
    /// @param newMax New maximum number of contracts per brand
    function setMaxContractsPerBrand(uint256 newMax) external onlyOwner {
        maxContractsPerBrand = newMax;
        emit MaxContractsUpdated(newMax);
    }
    
    /// @notice Withdraw collected fees (only owner)
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(owner()).transfer(balance);
    }
    
    /// @notice Emergency pause for all contracts (only owner)
    /// @param contractAddress Address of the contract to pause
    function emergencyPauseContract(address contractAddress) external onlyOwner {
        require(contractToBrand[contractAddress] != address(0), "Contract not found");
        CertificateERC721(contractAddress).pause();
    }
    
    /// @notice Emergency unpause for all contracts (only owner)
    /// @param contractAddress Address of the contract to unpause
    function emergencyUnpauseContract(address contractAddress) external onlyOwner {
        require(contractToBrand[contractAddress] != address(0), "Contract not found");
        CertificateERC721(contractAddress).unpause();
    }
}

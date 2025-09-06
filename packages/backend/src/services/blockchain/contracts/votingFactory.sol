// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Voting.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title VotingFactory - Factory for Deploying Brand-Specific Voting Contracts
/// @notice Allows brands to deploy their own voting contracts for product proposals
contract VotingFactory is Ownable, ReentrancyGuard {
    // Mapping from brand address to their deployed voting contracts
    mapping(address => address[]) public brandVotingContracts;
    
    // Mapping from contract address to brand address
    mapping(address => address) public contractToBrand;
    
    // Array of all deployed voting contracts
    address[] public allVotingContracts;
    
    // Deployment fee (in wei)
    uint256 public deploymentFee = 0;
    
    // Maximum voting contracts per brand
    uint256 public maxContractsPerBrand = 5;
    
    // Events
    event VotingDeployed(
        address indexed brand, 
        address indexed votingAddress,
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 quorumPercentage
    );
    event DeploymentFeeUpdated(uint256 newFee);
    event MaxContractsUpdated(uint256 newMax);
    
    /// @notice Deploy a new Voting contract for a brand
    /// @param brandAddress Address of the brand (will own the deployed contract)
    /// @param votingDelay Delay before voting starts (in seconds)
    /// @param votingPeriod Duration of voting period (in seconds)
    /// @param quorumPercentage Required quorum percentage (0-100)
    function deployVoting(
        address brandAddress,
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 quorumPercentage
    ) external payable nonReentrant returns (address) {
        require(brandAddress != address(0), "Invalid brand address");
        require(votingDelay >= 0, "Invalid voting delay");
        require(votingPeriod > 0, "Invalid voting period");
        require(quorumPercentage <= 100, "Quorum percentage cannot exceed 100");
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        
        // Check if brand has reached max contracts
        require(
            brandVotingContracts[brandAddress].length < maxContractsPerBrand,
            "Brand has reached maximum voting contract limit"
        );
        
        // Deploy new Voting contract
        Voting voting = new Voting();
        
        // Transfer ownership to the brand
        voting.transferOwnership(brandAddress);
        
        // Configure voting settings
        voting.updateVotingSettings(votingDelay, votingPeriod, quorumPercentage);
        
        address contractAddress = address(voting);
        
        // Update mappings
        brandVotingContracts[brandAddress].push(contractAddress);
        contractToBrand[contractAddress] = brandAddress;
        allVotingContracts.push(contractAddress);
        
        emit VotingDeployed(brandAddress, contractAddress, votingDelay, votingPeriod, quorumPercentage);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value - deploymentFee);
        }
        
        return contractAddress;
    }
    
    /// @notice Deploy voting contract for the caller (brand self-deployment)
    /// @param votingDelay Delay before voting starts (in seconds)
    /// @param votingPeriod Duration of voting period (in seconds)
    /// @param quorumPercentage Required quorum percentage (0-100)
    function deployVotingForSelf(
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 quorumPercentage
    ) external payable nonReentrant returns (address) {
        return deployVoting(msg.sender, votingDelay, votingPeriod, quorumPercentage);
    }
    
    /// @notice Get all voting contracts deployed by a brand
    /// @param brandAddress Address of the brand
    /// @return contracts Array of voting contract addresses
    function getBrandVotingContracts(address brandAddress) external view returns (address[] memory contracts) {
        return brandVotingContracts[brandAddress];
    }
    
    /// @notice Get total number of voting contracts deployed by a brand
    /// @param brandAddress Address of the brand
    /// @return count Number of voting contracts deployed
    function getBrandVotingContractCount(address brandAddress) external view returns (uint256 count) {
        return brandVotingContracts[brandAddress].length;
    }
    
    /// @notice Get all deployed voting contracts
    /// @return contracts Array of all voting contract addresses
    function getAllVotingContracts() external view returns (address[] memory contracts) {
        return allVotingContracts;
    }
    
    /// @notice Get total number of deployed voting contracts
    /// @return count Total number of voting contracts
    function getTotalVotingContractCount() external view returns (uint256 count) {
        return allVotingContracts.length;
    }
    
    /// @notice Check if an address is a deployed voting contract
    /// @param contractAddress Address to check
    /// @return isContract True if the address is a deployed voting contract
    function isDeployedVotingContract(address contractAddress) external view returns (bool isContract) {
        return contractToBrand[contractAddress] != address(0);
    }
    
    /// @notice Get brand address for a voting contract
    /// @param contractAddress Address of the voting contract
    /// @return brandAddress Address of the brand that deployed the contract
    function getVotingContractBrand(address contractAddress) external view returns (address brandAddress) {
        return contractToBrand[contractAddress];
    }
    
    /// @notice Set deployment fee (only owner)
    /// @param newFee New deployment fee in wei
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }
    
    /// @notice Set maximum voting contracts per brand (only owner)
    /// @param newMax New maximum number of voting contracts per brand
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
    
    /// @notice Emergency pause for a voting contract (only owner)
    /// @param contractAddress Address of the voting contract to pause
    function emergencyPauseVotingContract(address contractAddress) external onlyOwner {
        require(contractToBrand[contractAddress] != address(0), "Voting contract not found");
        Voting(contractAddress).pause();
    }
    
    /// @notice Emergency unpause for a voting contract (only owner)
    /// @param contractAddress Address of the voting contract to unpause
    function emergencyUnpauseVotingContract(address contractAddress) external onlyOwner {
        require(contractToBrand[contractAddress] != address(0), "Voting contract not found");
        Voting(contractAddress).unpause();
    }
    
    /// @notice Get voting contract statistics
    /// @return totalContracts Total number of deployed contracts
    /// @return totalBrands Number of unique brands with contracts
    function getVotingStatistics() external view returns (uint256 totalContracts, uint256 totalBrands) {
        totalContracts = allVotingContracts.length;
        
        // Count unique brands
        uint256 uniqueBrands = 0;
        for (uint256 i = 0; i < allVotingContracts.length; i++) {
            address brand = contractToBrand[allVotingContracts[i]];
            bool isNewBrand = true;
            for (uint256 j = 0; j < i; j++) {
                if (contractToBrand[allVotingContracts[j]] == brand) {
                    isNewBrand = false;
                    break;
                }
            }
            if (isNewBrand) {
                uniqueBrands++;
            }
        }
        
        totalBrands = uniqueBrands;
    }
}


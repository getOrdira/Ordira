// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./SupplyChain.sol";

/**
 * @title SupplyChainFactory
 * @dev Factory contract for deploying SupplyChain contracts for manufacturers
 */
contract SupplyChainFactory is Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // ===== STRUCTS =====
    
    struct FactorySettings {
        uint256 deploymentFee;
        uint256 maxContractsPerBusiness;
        bool isActive;
    }

    // ===== STATE VARIABLES =====
    
    Counters.Counter private _contractCounter;
    
    // Mappings
    mapping(string => address[]) public businessContracts; // businessId => contract addresses
    mapping(address => string) public contractToBusiness; // contract address => businessId
    mapping(address => bool) public deployedContracts; // contract address => exists
    mapping(string => uint256) public businessContractCount; // businessId => count
    
    // Factory settings
    FactorySettings public settings;
    uint256 public totalContractsDeployed;
    uint256 public totalFeesCollected;

    // ===== EVENTS =====
    
    event SupplyChainDeployed(
        address indexed contractAddress,
        string indexed businessId,
        string manufacturerName,
        address indexed deployer,
        uint256 deploymentFee
    );

    event SettingsUpdated(
        uint256 deploymentFee,
        uint256 maxContractsPerBusiness,
        bool isActive
    );

    event ContractPaused(
        address indexed contractAddress,
        string indexed businessId,
        address indexed pauser
    );

    event ContractUnpaused(
        address indexed contractAddress,
        string indexed businessId,
        address indexed unpauser
    );

    event FeesWithdrawn(
        address indexed to,
        uint256 amount
    );

    // ===== CONSTRUCTOR =====
    
    constructor() {
        settings = FactorySettings({
            deploymentFee: 0.01 ether, // 0.01 ETH deployment fee
            maxContractsPerBusiness: 5, // Max 5 contracts per business
            isActive: true
        });
    }

    // ===== MODIFIERS =====
    
    modifier onlyValidBusiness(string memory _businessId) {
        require(bytes(_businessId).length > 0, "Business ID cannot be empty");
        _;
    }

    modifier withinContractLimit(string memory _businessId) {
        require(
            businessContractCount[_businessId] < settings.maxContractsPerBusiness,
            "Maximum contracts per business reached"
        );
        _;
    }

    modifier whenFactoryActive() {
        require(settings.isActive, "Factory is not active");
        _;
    }

    // ===== CONTRACT DEPLOYMENT =====
    
    /**
     * @dev Deploy a new SupplyChain contract for a business
     * @param _businessId Unique business identifier
     * @param _manufacturerName Name of the manufacturer
     * @return contractAddress Address of the deployed contract
     */
    function deploySupplyChain(
        string memory _businessId,
        string memory _manufacturerName
    ) 
        external 
        payable 
        onlyValidBusiness(_businessId) 
        withinContractLimit(_businessId) 
        whenFactoryActive 
        whenNotPaused 
        nonReentrant 
        returns (address contractAddress) 
    {
        require(bytes(_manufacturerName).length > 0, "Manufacturer name cannot be empty");
        require(msg.value >= settings.deploymentFee, "Insufficient deployment fee");
        
        // Deploy new SupplyChain contract
        SupplyChain newContract = new SupplyChain(
            _businessId,
            _manufacturerName,
            msg.sender
        );
        
        contractAddress = address(newContract);
        
        // Update mappings
        businessContracts[_businessId].push(contractAddress);
        contractToBusiness[contractAddress] = _businessId;
        deployedContracts[contractAddress] = true;
        businessContractCount[_businessId]++;
        
        // Update counters
        _contractCounter.increment();
        totalContractsDeployed++;
        totalFeesCollected += msg.value;
        
        emit SupplyChainDeployed(
            contractAddress,
            _businessId,
            _manufacturerName,
            msg.sender,
            msg.value
        );
        
        return contractAddress;
    }

    // ===== QUERY FUNCTIONS =====
    
    /**
     * @dev Get all contracts for a business
     * @param _businessId Business identifier
     * @return contracts Array of contract addresses
     */
    function getBusinessContracts(string memory _businessId) 
        external 
        view 
        returns (address[] memory contracts) 
    {
        return businessContracts[_businessId];
    }

    /**
     * @dev Get business ID for a contract
     * @param _contractAddress Contract address
     * @return businessId Business identifier
     */
    function getContractBusiness(address _contractAddress) 
        external 
        view 
        returns (string memory businessId) 
    {
        require(deployedContracts[_contractAddress], "Contract not found");
        return contractToBusiness[_contractAddress];
    }

    /**
     * @dev Check if contract exists
     * @param _contractAddress Contract address
     * @return exists True if contract exists
     */
    function contractExists(address _contractAddress) external view returns (bool exists) {
        return deployedContracts[_contractAddress];
    }

    /**
     * @dev Get contract count for business
     * @param _businessId Business identifier
     * @return count Number of contracts deployed
     */
    function getBusinessContractCount(string memory _businessId) 
        external 
        view 
        returns (uint256 count) 
    {
        return businessContractCount[_businessId];
    }

    /**
     * @dev Get factory statistics
     * @return stats Factory statistics
     */
    function getFactoryStats() external view returns (
        uint256 _totalContracts,
        uint256 _totalFees,
        uint256 _deploymentFee,
        uint256 _maxContractsPerBusiness,
        bool _isActive
    ) {
        return (
            totalContractsDeployed,
            totalFeesCollected,
            settings.deploymentFee,
            settings.maxContractsPerBusiness,
            settings.isActive
        );
    }

    /**
     * @dev Get all deployed contracts (for admin)
     * @return contracts Array of all contract addresses
     */
    function getAllContracts() external view returns (address[] memory contracts) {
        // This is a simplified version - in production you might want pagination
        address[] memory allContracts = new address[](totalContractsDeployed);
        uint256 index = 0;
        
        // Note: This is expensive and should be avoided in production
        // Consider using events or off-chain indexing instead
        return allContracts;
    }

    // ===== ADMIN FUNCTIONS =====
    
    /**
     * @dev Update factory settings
     * @param _deploymentFee New deployment fee
     * @param _maxContractsPerBusiness New max contracts per business
     * @param _isActive New active status
     */
    function updateSettings(
        uint256 _deploymentFee,
        uint256 _maxContractsPerBusiness,
        bool _isActive
    ) external onlyOwner {
        settings.deploymentFee = _deploymentFee;
        settings.maxContractsPerBusiness = _maxContractsPerBusiness;
        settings.isActive = _isActive;
        
        emit SettingsUpdated(_deploymentFee, _maxContractsPerBusiness, _isActive);
    }

    /**
     * @dev Pause a specific contract
     * @param _contractAddress Contract address to pause
     */
    function pauseContract(address _contractAddress) external onlyOwner {
        require(deployedContracts[_contractAddress], "Contract not found");
        
        SupplyChain contractInstance = SupplyChain(_contractAddress);
        contractInstance.pause();
        
        string memory businessId = contractToBusiness[_contractAddress];
        emit ContractPaused(_contractAddress, businessId, msg.sender);
    }

    /**
     * @dev Unpause a specific contract
     * @param _contractAddress Contract address to unpause
     */
    function unpauseContract(address _contractAddress) external onlyOwner {
        require(deployedContracts[_contractAddress], "Contract not found");
        
        SupplyChain contractInstance = SupplyChain(_contractAddress);
        contractInstance.unpause();
        
        string memory businessId = contractToBusiness[_contractAddress];
        emit ContractUnpaused(_contractAddress, businessId, msg.sender);
    }

    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 amount = totalFeesCollected;
        require(amount > 0, "No fees to withdraw");
        
        totalFeesCollected = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FeesWithdrawn(owner(), amount);
    }

    /**
     * @dev Pause factory operations
     */
    function pauseFactory() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause factory operations
     */
    function unpauseFactory() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency function to disable factory
     */
    function emergencyDisable() external onlyOwner {
        settings.isActive = false;
        emit SettingsUpdated(settings.deploymentFee, settings.maxContractsPerBusiness, false);
    }
}

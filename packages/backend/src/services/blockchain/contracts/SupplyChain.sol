// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SupplyChain
 * @dev Smart contract for tracking supply chain events with manufacturer-specific endpoints
 */
contract SupplyChain is Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // ===== STRUCTS =====
    
    struct SupplyChainEvent {
        uint256 eventId;
        string eventType; // "sourced", "manufactured", "quality_checked", "packaged", "shipped", "delivered"
        string productId;
        string location;
        string details;
        uint256 timestamp;
        address loggedBy;
        bool isValid;
    }

    struct Endpoint {
        string name;
        string eventType;
        string location;
        bool isActive;
        uint256 eventCount;
        uint256 createdAt;
    }

    struct Product {
        string productId;
        string name;
        string description;
        uint256 totalEvents;
        uint256 createdAt;
        bool isActive;
    }

    // ===== STATE VARIABLES =====
    
    Counters.Counter private _eventCounter;
    Counters.Counter private _endpointCounter;
    Counters.Counter private _productCounter;

    // Mappings
    mapping(uint256 => SupplyChainEvent) public events;
    mapping(uint256 => Endpoint) public endpoints;
    mapping(uint256 => Product) public products;
    mapping(string => uint256) public productIdToIndex;
    mapping(string => uint256[]) public productEvents; // productId => eventIds[]
    mapping(address => uint256[]) public manufacturerEndpoints; // manufacturer => endpointIds[]
    mapping(address => uint256[]) public manufacturerProducts; // manufacturer => productIds[]

    // Business association
    string public businessId;
    string public manufacturerName;
    uint256 public totalEvents;
    uint256 public totalProducts;
    uint256 public totalEndpoints;

    // ===== EVENTS =====
    
    event EventLogged(
        uint256 indexed eventId,
        string indexed productId,
        string eventType,
        string location,
        address indexed loggedBy,
        uint256 timestamp
    );

    event EndpointCreated(
        uint256 indexed endpointId,
        string name,
        string eventType,
        string location,
        address indexed creator
    );

    event ProductRegistered(
        uint256 indexed productId,
        string productIdentifier,
        string name,
        address indexed creator
    );

    event EndpointUpdated(
        uint256 indexed endpointId,
        string name,
        bool isActive,
        address indexed updater
    );

    // ===== CONSTRUCTOR =====
    
    constructor(
        string memory _businessId,
        string memory _manufacturerName,
        address _owner
    ) {
        businessId = _businessId;
        manufacturerName = _manufacturerName;
        _transferOwnership(_owner);
    }

    // ===== MODIFIERS =====
    
    modifier onlyValidEndpoint(uint256 _endpointId) {
        require(_endpointId > 0 && _endpointId <= _endpointCounter.current(), "Invalid endpoint ID");
        require(endpoints[_endpointId].isActive, "Endpoint is not active");
        _;
    }

    modifier onlyValidProduct(string memory _productId) {
        require(productIdToIndex[_productId] > 0, "Product not registered");
        require(products[productIdToIndex[_productId]].isActive, "Product is not active");
        _;
    }

    // ===== ENDPOINT MANAGEMENT =====
    
    /**
     * @dev Create a new supply chain endpoint
     * @param _name Endpoint name (e.g., "Manufacturing Facility A")
     * @param _eventType Type of events this endpoint handles
     * @param _location Physical location of the endpoint
     */
    function createEndpoint(
        string memory _name,
        string memory _eventType,
        string memory _location
    ) external onlyOwner whenNotPaused {
        require(bytes(_name).length > 0, "Endpoint name cannot be empty");
        require(bytes(_eventType).length > 0, "Event type cannot be empty");
        
        _endpointCounter.increment();
        uint256 endpointId = _endpointCounter.current();
        
        endpoints[endpointId] = Endpoint({
            name: _name,
            eventType: _eventType,
            location: _location,
            isActive: true,
            eventCount: 0,
            createdAt: block.timestamp
        });
        
        manufacturerEndpoints[msg.sender].push(endpointId);
        totalEndpoints++;
        
        emit EndpointCreated(endpointId, _name, _eventType, _location, msg.sender);
    }

    /**
     * @dev Update endpoint status
     * @param _endpointId ID of the endpoint to update
     * @param _isActive New active status
     */
    function updateEndpointStatus(uint256 _endpointId, bool _isActive) 
        external 
        onlyOwner 
        onlyValidEndpoint(_endpointId) 
    {
        endpoints[_endpointId].isActive = _isActive;
        emit EndpointUpdated(_endpointId, endpoints[_endpointId].name, _isActive, msg.sender);
    }

    // ===== PRODUCT MANAGEMENT =====
    
    /**
     * @dev Register a new product for tracking
     * @param _productId Unique product identifier
     * @param _name Product name
     * @param _description Product description
     */
    function registerProduct(
        string memory _productId,
        string memory _name,
        string memory _description
    ) external onlyOwner whenNotPaused {
        require(bytes(_productId).length > 0, "Product ID cannot be empty");
        require(productIdToIndex[_productId] == 0, "Product already registered");
        
        _productCounter.increment();
        uint256 productIndex = _productCounter.current();
        
        products[productIndex] = Product({
            productId: _productId,
            name: _name,
            description: _description,
            totalEvents: 0,
            createdAt: block.timestamp,
            isActive: true
        });
        
        productIdToIndex[_productId] = productIndex;
        manufacturerProducts[msg.sender].push(productIndex);
        totalProducts++;
        
        emit ProductRegistered(productIndex, _productId, _name, msg.sender);
    }

    // ===== EVENT LOGGING =====
    
    /**
     * @dev Log a supply chain event
     * @param _endpointId ID of the endpoint logging the event
     * @param _productId Product identifier
     * @param _eventType Type of event
     * @param _location Event location
     * @param _details Additional event details
     */
    function logEvent(
        uint256 _endpointId,
        string memory _productId,
        string memory _eventType,
        string memory _location,
        string memory _details
    ) external onlyValidEndpoint(_endpointId) onlyValidProduct(_productId) whenNotPaused {
        require(bytes(_eventType).length > 0, "Event type cannot be empty");
        
        _eventCounter.increment();
        uint256 eventId = _eventCounter.current();
        
        events[eventId] = SupplyChainEvent({
            eventId: eventId,
            eventType: _eventType,
            productId: _productId,
            location: _location,
            details: _details,
            timestamp: block.timestamp,
            loggedBy: msg.sender,
            isValid: true
        });
        
        // Update counters
        endpoints[_endpointId].eventCount++;
        products[productIdToIndex[_productId]].totalEvents++;
        productEvents[_productId].push(eventId);
        totalEvents++;
        
        emit EventLogged(eventId, _productId, _eventType, _location, msg.sender, block.timestamp);
    }

    // ===== VIEW FUNCTIONS =====
    
    /**
     * @dev Get all events for a specific product
     * @param _productId Product identifier
     * @return eventIds Array of event IDs for the product
     */
    function getProductEvents(string memory _productId) 
        external 
        view 
        returns (uint256[] memory eventIds) 
    {
        return productEvents[_productId];
    }

    /**
     * @dev Get event details
     * @param _eventId Event ID
     * @return SupplyChainEvent struct
     */
    function getEvent(uint256 _eventId) external view returns (SupplyChainEvent memory) {
        require(_eventId > 0 && _eventId <= _eventCounter.current(), "Invalid event ID");
        return events[_eventId];
    }

    /**
     * @dev Get all endpoints for the manufacturer
     * @return endpointIds Array of endpoint IDs
     */
    function getManufacturerEndpoints() external view returns (uint256[] memory endpointIds) {
        return manufacturerEndpoints[msg.sender];
    }

    /**
     * @dev Get all products for the manufacturer
     * @return productIds Array of product IDs
     */
    function getManufacturerProducts() external view returns (uint256[] memory productIds) {
        return manufacturerProducts[msg.sender];
    }

    /**
     * @dev Get contract statistics
     * @return stats Contract statistics
     */
    function getContractStats() external view returns (
        uint256 _totalEvents,
        uint256 _totalProducts,
        uint256 _totalEndpoints,
        string memory _businessId,
        string memory _manufacturerName
    ) {
        return (totalEvents, totalProducts, totalEndpoints, businessId, manufacturerName);
    }

    /**
     * @dev Get endpoint details
     * @param _endpointId Endpoint ID
     * @return Endpoint struct
     */
    function getEndpoint(uint256 _endpointId) external view returns (Endpoint memory) {
        require(_endpointId > 0 && _endpointId <= _endpointCounter.current(), "Invalid endpoint ID");
        return endpoints[_endpointId];
    }

    /**
     * @dev Get product details
     * @param _productId Product identifier
     * @return Product struct
     */
    function getProduct(string memory _productId) external view returns (Product memory) {
        require(productIdToIndex[_productId] > 0, "Product not found");
        return products[productIdToIndex[_productId]];
    }

    // ===== ADMIN FUNCTIONS =====
    
    /**
     * @dev Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Update manufacturer name
     * @param _newName New manufacturer name
     */
    function updateManufacturerName(string memory _newName) external onlyOwner {
        require(bytes(_newName).length > 0, "Name cannot be empty");
        manufacturerName = _newName;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title CertificateERC721 - NFT Certificates for Product Authentication
/// @notice A comprehensive ERC-721 contract for minting product certificates with transfer restrictions and burn capabilities
contract CertificateERC721 is ERC721URIStorage, Ownable, Pausable {
    using Counters for Counters.Counter;
    
    // Token ID counter
    Counters.Counter private _tokenIdCounter;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Transfer restrictions
    bool public transfersEnabled = true;
    
    // Certificate metadata
    struct CertificateData {
        uint256 productId;
        string productName;
        address brandAddress;
        uint256 mintedAt;
        bool isRevoked;
    }
    
    // Mapping from token ID to certificate data
    mapping(uint256 => CertificateData) public certificates;
    
    // Events
    event CertificateMinted(uint256 indexed tokenId, address indexed to, uint256 productId, string productName);
    event CertificateBurned(uint256 indexed tokenId, string reason);
    event TransferToggled(bool enabled);
    event BaseURIUpdated(string newBaseURI);
    
    /// @notice Constructor for CertificateERC721
    /// @param name Token name (e.g., "Brand Certificates")
    /// @param symbol Token symbol (e.g., "CERT")
    /// @param baseTokenUri Base URI for all token metadata
    /// @param initialOwner Address that will own the contract
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenUri,
        address initialOwner
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenUri;
        _tokenIdCounter.increment(); // Start token IDs at 1
        transferOwnership(initialOwner);
    }
    
    /// @notice Override baseURI to use custom base URI
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /// @notice Update the base URI for all tokens
    /// @param newBaseURI New base URI
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }
    
    /// @notice Mint a new certificate with product data
    /// @param to Address to mint the certificate to
    /// @param tokenUri Metadata URI for the certificate
    /// @param productId ID of the product this certificate represents
    /// @param productName Name of the product
    function safeMint(
        address to,
        string calldata tokenUri,
        uint256 productId,
        string calldata productName
    ) external onlyOwner whenNotPaused {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);
        
        // Store certificate data
        certificates[tokenId] = CertificateData({
            productId: productId,
            productName: productName,
            brandAddress: owner(),
            mintedAt: block.timestamp,
            isRevoked: false
        });
        
        emit CertificateMinted(tokenId, to, productId, productName);
    }
    
    /// @notice Burn a certificate (revoke it)
    /// @param tokenId ID of the token to burn
    /// @param reason Reason for burning the certificate
    function burn(uint256 tokenId, string calldata reason) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(!certificates[tokenId].isRevoked, "Certificate already revoked");
        
        certificates[tokenId].isRevoked = true;
        _burn(tokenId);
        
        emit CertificateBurned(tokenId, reason);
    }
    
    /// @notice Check if a certificate is valid (not revoked)
    /// @param tokenId ID of the token to check
    /// @return isValid True if the certificate is valid
    function isValidCertificate(uint256 tokenId) external view returns (bool isValid) {
        return _exists(tokenId) && !certificates[tokenId].isRevoked;
    }
    
    /// @notice Get certificate data
    /// @param tokenId ID of the token
    /// @return data CertificateData struct
    function getCertificateData(uint256 tokenId) external view returns (CertificateData memory data) {
        require(_exists(tokenId), "Token does not exist");
        return certificates[tokenId];
    }
    
    /// @notice Toggle transfer functionality
    /// @param enabled Whether transfers should be enabled
    function setTransfersEnabled(bool enabled) external onlyOwner {
        transfersEnabled = enabled;
        emit TransferToggled(enabled);
    }
    
    /// @notice Override transfer functions to respect transfer restrictions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Allow minting and burning regardless of transfer status
        if (from == address(0) || to == address(0)) {
            return;
        }
        
        require(transfersEnabled, "Transfers are currently disabled");
        require(!certificates[tokenId].isRevoked, "Cannot transfer revoked certificate");
    }
    
    /// @notice Pause the contract
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /// @notice Get total supply of certificates
    /// @return Total number of certificates minted
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice A simple ERC-721 where the owner (you) can mint certificates with custom URIs
contract CertificateERC721 is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    /// @param name        “MyBrand Certificates”
    /// @param symbol      “MYBC”
    /// @param baseTokenUri optional base URI for all token URIs
    /// @param initialOwner who will own & be allowed to mint
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenUri,
        address initialOwner
    ) ERC721(name, symbol) {
        _nextTokenId = 1;
        if (bytes(baseTokenUri).length > 0) {
            _setBaseURI(baseTokenUri);
        }
        // transfer ownership so that `onlyOwner` functions go to the brand (or your factory)
        transferOwnership(initialOwner);
    }

    /// @notice Mint a new certificate to `to` with metadata URI
    function safeMint(address to, string calldata tokenUri) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);
    }
}

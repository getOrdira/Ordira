// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CertificateERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Master “factory” that spins up a per-brand ERC-721 certificate contract
contract NFTFactory is Ownable {
    /// @param brand      the address calling deploy (your master-wallet)
    /// @param contractAddress the new CertificateERC721 instance
    event NFTDeployed(address indexed brand, address indexed contractAddress);

    /// @notice Deploy a brand’s new CertificateERC721
    /// @param name     token name, 
    /// @param symbol   token symbol,
    /// @param baseUri  optional baseTokenUri passed into CertificateERC721
    function deployNFT(
        string calldata name,
        string calldata symbol,
        string calldata baseUri
    ) external onlyOwner returns (address) {
        // the factory deploys, but ownership is handed off to msg.sender
        CertificateERC721 cert = new CertificateERC721(
            name,
            symbol,
            baseUri,
            msg.sender
        );
        address addr = address(cert);
        emit NFTDeployed(msg.sender, addr);
        return addr;
    }
}

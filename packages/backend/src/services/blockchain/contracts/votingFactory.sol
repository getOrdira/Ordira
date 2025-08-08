// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Voting.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VotingFactory is Ownable {
    event VotingDeployed(address indexed brand, address indexed votingAddress);

    function deployVoting() external onlyOwner returns (address) {
        Voting v = new Voting();
        // transfer ownership to the caller (your master wallet)
        v.transferOwnership(msg.sender);
        address addr = address(v);
        emit VotingDeployed(msg.sender, addr);
        return addr;
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Brand-specific Voting with meta-tx batch support
contract Voting is Ownable {
    using ECDSA for bytes32;

    // Proposal counter
    uint256 public proposalCount;
    // Proposal metadata URI storage
    mapping(uint256 => string) public proposalUri;
    // Tracks if an address has voted on a proposal
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    // Tracks processed voteIds to prevent replays
    mapping(uint256 => bool) public processedVotes;

    /// @notice Emitted when a new proposal is created
    event ProposalCreated(uint256 indexed proposalId, string metadataUri);
    /// @notice Emitted for each individual vote (batched or single)
    event VoteCast(uint256 indexed voteId, address indexed voter, uint256 indexed proposalId);

    /// @notice Only the brand (owner) can create new proposals
    function createProposal(string calldata metadataUri) external onlyOwner {
        uint256 pid = ++proposalCount;
        proposalUri[pid] = metadataUri;
        emit ProposalCreated(pid, metadataUri);
    }

    /// @notice Direct on-chain vote (customer pays gas)
    function vote(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;
        emit VoteCast(0, msg.sender, proposalId);
    }

    /// @notice Meta-tx vote: backend relayer pays gas, onlyOwner
    function submitVote(
        uint256 proposalId,
        address voter,
        bytes calldata signature
    ) external onlyOwner {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(!hasVoted[proposalId][voter], "Already voted");

        // Verify signature over (voteId=0, proposalId)
        bytes32 hash = keccak256(abi.encodePacked(uint256(0), proposalId));
        address signer_ = hash.toEthSignedMessageHash().recover(signature);
        require(signer_ == voter, "Invalid signature");

        hasVoted[proposalId][voter] = true;
        emit VoteCast(0, voter, proposalId);
    }

    /// @notice Relay multiple votes in one transaction, each vote unique by voteId
    function batchSubmitVote(
        uint256[] calldata proposalIds,
        uint256[] calldata voteIds,
        bytes[]   calldata signatures
    ) external onlyOwner {
        uint256 len = proposalIds.length;
        require(voteIds.length == len && signatures.length == len, "Length mismatch");

        for (uint256 i = 0; i < len; i++) {
            uint256 pid = proposalIds[i];
            uint256 vid = voteIds[i];
            bytes calldata sig = signatures[i];

            require(pid > 0 && pid <= proposalCount, "Invalid proposal");
            require(!processedVotes[vid], "VoteId already used");

            // Rebuild signed message (voteId, proposalId)
            bytes32 hash = keccak256(abi.encodePacked(vid, pid));
            address voter = hash.toEthSignedMessageHash().recover(sig);

            require(!hasVoted[pid][voter], "Already voted");

            // Mark processed and record vote
            processedVotes[vid] = true;
            hasVoted[pid][voter] = true;
            emit VoteCast(vid, voter, pid);
        }
    }
}



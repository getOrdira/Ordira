// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title Brand-specific Voting with Product Proposals and Meta-tx Batch Support
/// @notice Allows brands to create product proposals and customers to vote on them
contract Voting is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    // Proposal counter
    uint256 public proposalCount;
    
    // Proposal data structure
    struct Proposal {
        uint256 id;
        string title;
        string description;
        string metadataUri;
        address creator;
        uint256 startTime;
        uint256 endTime;
        uint256 selectionCount; 
        bool executed;
        bool cancelled;
    }
    
    // Mapping from proposal ID to proposal data
    mapping(uint256 => Proposal) public proposals;
    
    // Proposal metadata URI storage
    mapping(uint256 => string) public proposalUri;
    
    // Tracks if an email has voted (regardless of which proposals they selected)
    mapping(string => bool) public hasVotedByEmail;
    
    // Tracks processed voteIds to prevent replays
    mapping(uint256 => bool) public processedVotes;
    
    // Tracks which proposals each email voter selected
    mapping(string => uint256[]) public emailVoterSelections;
    
    // Tracks email to voteId mapping for verification
    mapping(string => uint256) public emailToVoteId;
    
    // Voting configuration
    uint256 public votingDelay = 1; // 1 block delay before voting starts
    uint256 public votingPeriod = 17280; // ~3 days in blocks (assuming 15s per block)
    uint256 public quorumPercentage = 4; // 4% quorum required
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId, 
        address indexed creator, 
        string title, 
        string metadataUri,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(
        uint256 indexed voteId, 
        string indexed voterEmail, 
        uint256[] selectedProposals,
        uint256 totalSelections
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event VotingSettingsUpdated(uint256 votingDelay, uint256 votingPeriod, uint256 quorumPercentage);
    
    /// @notice Create a new product proposal
    /// @param title Title of the proposal
    /// @param description Description of the proposal
    /// @param metadataUri URI containing proposal metadata (images, product details, etc.)
    function createProposal(
        string calldata title,
        string calldata description,
        string calldata metadataUri
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(metadataUri).length > 0, "Metadata URI cannot be empty");
        
        uint256 proposalId = ++proposalCount;
        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            title: title,
            description: description,
            metadataUri: metadataUri,
            creator: msg.sender,
            startTime: startTime,
            endTime: endTime,
            selectionCount: 0,
            executed: false,
            cancelled: false
        });
        
        proposalUri[proposalId] = metadataUri;
        
        emit ProposalCreated(proposalId, msg.sender, title, metadataUri, startTime, endTime);
        
        return proposalId;
    }
    
    /// @notice Direct on-chain vote (customer pays gas) - NOT USED for email-gated users
    /// @param selectedProposals Array of proposal IDs that the user selected
    function vote(uint256[] calldata selectedProposals) external whenNotPaused {
        require(selectedProposals.length > 0, "Must select at least one proposal");
        require(!hasVotedByEmail[msg.sender], "Already voted");
        
        // Validate all selected proposals
        for (uint256 i = 0; i < selectedProposals.length; i++) {
            uint256 proposalId = selectedProposals[i];
            require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
            require(block.timestamp >= proposals[proposalId].startTime, "Voting not started");
            require(block.timestamp <= proposals[proposalId].endTime, "Voting ended");
            require(!proposals[proposalId].cancelled, "Proposal cancelled");
        }
        
        hasVotedByEmail[msg.sender] = true;
        emailVoterSelections[msg.sender] = selectedProposals;
        
        // Increment selection count for each selected proposal
        for (uint256 i = 0; i < selectedProposals.length; i++) {
            proposals[selectedProposals[i]].selectionCount++;
        }
        
        emit VoteCast(0, msg.sender, selectedProposals, selectedProposals.length);
    }
    
    /// @notice Meta-tx vote: backend relayer pays gas, onlyOwner
    /// @param selectedProposals Array of proposal IDs that the voter selected
    /// @param voterEmail Email address of the voter
    /// @param voteId Unique vote ID for this email
    /// @param signature Signature from the voter
    function submitVote(
        uint256[] calldata selectedProposals,
        string calldata voterEmail,
        uint256 voteId,
        bytes calldata signature
    ) external onlyOwner whenNotPaused {
        require(selectedProposals.length > 0, "Must select at least one proposal");
        require(!hasVotedByEmail[voterEmail], "Email already voted");
        require(!processedVotes[voteId], "VoteId already used");
        
        // Validate all selected proposals
        for (uint256 i = 0; i < selectedProposals.length; i++) {
            uint256 proposalId = selectedProposals[i];
            require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
            require(block.timestamp >= proposals[proposalId].startTime, "Voting not started");
            require(block.timestamp <= proposals[proposalId].endTime, "Voting ended");
            require(!proposals[proposalId].cancelled, "Proposal cancelled");
        }
        
        // Verify signature over (voteId, selectedProposals, voterEmail)
        bytes32 hash = keccak256(abi.encodePacked(voteId, selectedProposals, voterEmail));
        address signer = hash.toEthSignedMessageHash().recover(signature);
        require(signer == owner(), "Invalid signature - must be from relayer");
        
        // Mark as processed and voted
        processedVotes[voteId] = true;
        hasVotedByEmail[voterEmail] = true;
        emailVoterSelections[voterEmail] = selectedProposals;
        emailToVoteId[voterEmail] = voteId;
        
        // Increment selection count for each selected proposal
        for (uint256 i = 0; i < selectedProposals.length; i++) {
            proposals[selectedProposals[i]].selectionCount++;
        }
        
        emit VoteCast(voteId, voterEmail, selectedProposals, selectedProposals.length);
    }
    
    /// @notice Relay multiple votes in one transaction, each vote unique by voteId
    /// @param selectedProposalsArray Array of arrays - each inner array contains proposal IDs selected by a voter
    /// @param voteIds Array of unique vote IDs
    /// @param voterEmails Array of voter email addresses
    /// @param signatures Array of signatures
    function batchSubmitVote(
        uint256[][] calldata selectedProposalsArray,
        uint256[] calldata voteIds,
        string[] calldata voterEmails,
        bytes[] calldata signatures
    ) external onlyOwner whenNotPaused nonReentrant {
        uint256 len = selectedProposalsArray.length;
        require(voteIds.length == len && voterEmails.length == len && signatures.length == len, "Length mismatch");
        
        for (uint256 i = 0; i < len; i++) {
            uint256[] calldata selectedProposals = selectedProposalsArray[i];
            uint256 vid = voteIds[i];
            string calldata voterEmail = voterEmails[i];
            bytes calldata sig = signatures[i];
            
            require(selectedProposals.length > 0, "Must select at least one proposal");
            require(!processedVotes[vid], "VoteId already used");
            require(!hasVotedByEmail[voterEmail], "Email already voted");
            
            // Validate all selected proposals
            for (uint256 j = 0; j < selectedProposals.length; j++) {
                uint256 pid = selectedProposals[j];
                require(pid > 0 && pid <= proposalCount, "Invalid proposal");
                require(block.timestamp >= proposals[pid].startTime, "Voting not started");
                require(block.timestamp <= proposals[pid].endTime, "Voting ended");
                require(!proposals[pid].cancelled, "Proposal cancelled");
            }
            
            // Verify signature over (voteId, selectedProposals, voterEmail)
            bytes32 hash = keccak256(abi.encodePacked(vid, selectedProposals, voterEmail));
            address signer = hash.toEthSignedMessageHash().recover(sig);
            require(signer == owner(), "Invalid signature - must be from relayer");
            
            // Mark processed and record vote
            processedVotes[vid] = true;
            hasVotedByEmail[voterEmail] = true;
            emailVoterSelections[voterEmail] = selectedProposals;
            emailToVoteId[voterEmail] = vid;
            
            // Increment selection count for each selected proposal
            for (uint256 j = 0; j < selectedProposals.length; j++) {
                proposals[selectedProposals[j]].selectionCount++;
            }
            
            emit VoteCast(vid, voterEmail, selectedProposals, selectedProposals.length);
        }
    }
    
    /// @notice Execute a proposal (only if it has enough selections)
    /// @param proposalId ID of the proposal to execute
    function executeProposal(uint256 proposalId) external onlyOwner {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(block.timestamp > proposals[proposalId].endTime, "Voting not ended");
        require(!proposals[proposalId].executed, "Proposal already executed");
        require(!proposals[proposalId].cancelled, "Proposal cancelled");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.selectionCount > 0, "Proposal has no selections");
        
        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }
    
    /// @notice Cancel a proposal
    /// @param proposalId ID of the proposal to cancel
    function cancelProposal(uint256 proposalId) external onlyOwner {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(!proposals[proposalId].executed, "Proposal already executed");
        require(!proposals[proposalId].cancelled, "Proposal already cancelled");
        
        proposals[proposalId].cancelled = true;
        emit ProposalCancelled(proposalId);
    }
    
    /// @notice Get proposal details
    /// @param proposalId ID of the proposal
    /// @return proposal Proposal struct
    function getProposal(uint256 proposalId) external view returns (Proposal memory proposal) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        return proposals[proposalId];
    }
    
    /// @notice Get proposal state
    /// @param proposalId ID of the proposal
    /// @return state Current state of the proposal
    function getProposalState(uint256 proposalId) external view returns (string memory state) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal memory proposal = proposals[proposalId];
        
        if (proposal.cancelled) {
            return "Cancelled";
        } else if (proposal.executed) {
            return "Executed";
        } else if (block.timestamp < proposal.startTime) {
            return "Pending";
        } else if (block.timestamp <= proposal.endTime) {
            return "Active";
        } else if (proposal.selectionCount == 0) {
            return "No Selections";
        } else {
            return "Has Selections";
        }
    }
    
    /// @notice Check if an email has voted
    /// @param voterEmail Email address of the voter
    /// @return voted True if the email has voted
    function hasVotedByEmail(string calldata voterEmail) external view returns (bool voted) {
        return hasVotedByEmail[voterEmail];
    }
    
    /// @notice Get the proposals selected by an email voter
    /// @param voterEmail Email address of the voter
    /// @return selectedProposals Array of proposal IDs selected by the voter
    function getEmailVoterSelections(string calldata voterEmail) external view returns (uint256[] memory selectedProposals) {
        return emailVoterSelections[voterEmail];
    }
    
    /// @notice Get the vote ID for an email
    /// @param voterEmail Email address of the voter
    /// @return voteId The vote ID associated with this email
    function getEmailVoteId(string calldata voterEmail) external view returns (uint256 voteId) {
        return emailToVoteId[voterEmail];
    }
    
    /// @notice Update voting settings (only owner)
    /// @param newVotingDelay New voting delay in seconds
    /// @param newVotingPeriod New voting period in seconds
    /// @param newQuorumPercentage New quorum percentage
    function updateVotingSettings(
        uint256 newVotingDelay,
        uint256 newVotingPeriod,
        uint256 newQuorumPercentage
    ) external onlyOwner {
        require(newQuorumPercentage <= 100, "Quorum percentage cannot exceed 100");
        
        votingDelay = newVotingDelay;
        votingPeriod = newVotingPeriod;
        quorumPercentage = newQuorumPercentage;
        
        emit VotingSettingsUpdated(newVotingDelay, newVotingPeriod, newQuorumPercentage);
    }
    
    /// @notice Pause the contract
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }
}



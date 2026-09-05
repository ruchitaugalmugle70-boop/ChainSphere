// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChainSphere {
    struct ContentRecord {
        string contentHash; // SHA-256 hash generated off-chain
        address creator;    // Wallet address of the content creator
        uint256 timestamp;  // Block timestamp when registered
    }

    // Mapping from Post ID to Content Record
    mapping(string => ContentRecord) private _contentRegistry;

    // Events for application indexing (Kafka / Frontend listening)
    event ContentRegistered(string indexed postId, string contentHash, address indexed creator, uint256 timestamp);
    event TipSent(address indexed sender, address indexed creator, uint256 amount, uint256 timestamp);

    /// @notice Registers content hash on-chain for proof of authenticity & ownership
    function registerContent(string memory postId, string memory contentHash) external {
        require(bytes(_contentRegistry[postId].contentHash).length == 0, "Post ID already registered");
        require(bytes(contentHash).length > 0, "Invalid content hash");

        _contentRegistry[postId] = ContentRecord({
            contentHash: contentHash,
            creator: msg.sender,
            timestamp: block.timestamp
        });

        emit ContentRegistered(postId, contentHash, msg.sender, block.timestamp);
    }

    /// @notice Verifies whether a given content payload matches the registered on-chain hash
    function verifyContent(string memory postId, string memory currentContentHash) external view returns (bool isAuthentic, address creator) {
        ContentRecord memory record = _contentRegistry[postId];
        require(bytes(record.contentHash).length > 0, "Post ID not found");

        bool matches = keccak256(bytes(record.contentHash)) == keccak256(bytes(currentContentHash));
        return (matches, record.creator);
    }

    /// @notice Allows users to tip creators directly using native blockchain tokens (ETH / Native asset)
    function tipCreator(address payable creator) external payable {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(creator != address(0), "Invalid creator address");

        (bool sent, ) = creator.call{value: msg.value}("");
        require(sent, "Failed to send tip");

        emit TipSent(msg.sender, creator, msg.value, block.timestamp);
    }
}
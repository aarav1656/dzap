// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract NFTStakingContract is Initializable, PausableUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // Interfaces for the NFT and ERC20 contracts
    IERC721Upgradeable public nftContract;
    IERC20Upgradeable public rewardToken;

    // Reward parameters
    uint256 public rewardPerBlock;
    uint256 public unbondingPeriod;
    uint256 public rewardClaimDelay;

    // Struct to hold information about each stake
    struct Stake {
        uint256 tokenId;                   // Token ID of the staked NFT
        uint256 stakedAtBlock;             // Block number when NFT was staked
        uint256 lastRewardsClaimedBlock;   // Last block number when rewards were claimed
        uint256 unbondingStartBlock;       // Block number when unbonding started, 0 if not unstaked
    }

    // Mapping to hold the stakes of each user
    mapping(address => Stake[]) public stakes;
    // Mapping to track ownership of staked tokens
    mapping(uint256 => address) public tokenOwners;
    // Mapping to track pending rewards for each user
    mapping(address => uint256) public pendingRewards;

    // Events
    event Staked(address indexed user, uint256 tokenId);
    event Unstaked(address indexed user, uint256 tokenId);
    event RewardsClaimed(address indexed user, uint256 amount);

    // Constructor (disable initializers to prevent deployment directly)
    constructor() {
        _disableInitializers();
    }

    // Initializer function to set up the contract
    function initialize(
        address _nftContract,
        address _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _unbondingPeriod,
        uint256 _rewardClaimDelay
    ) public initializer {
        __Pausable_init();
        __Ownable_init(msg.sender); // Set the contract deployer as the initial owner
        __UUPSUpgradeable_init();

        nftContract = IERC721Upgradeable(_nftContract);
        rewardToken = IERC20Upgradeable(_rewardToken);
        rewardPerBlock = _rewardPerBlock;
        unbondingPeriod = _unbondingPeriod;
        rewardClaimDelay = _rewardClaimDelay;
    }

    // Function to authorize contract upgrades (UUPS pattern)
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Function to stake NFTs
    function stake(uint256[] memory tokenIds) external whenNotPaused {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner of the NFT");

            // Transfer NFT to the contract
            nftContract.transferFrom(msg.sender, address(this), tokenId);

            // Store the stake details
            stakes[msg.sender].push(Stake({
                tokenId: tokenId,
                stakedAtBlock: block.number,
                lastRewardsClaimedBlock: block.number,
                unbondingStartBlock: 0
            }));

            tokenOwners[tokenId] = msg.sender;
            emit Staked(msg.sender, tokenId);
        }
    }

    // Function to unstake NFTs (starts the unbonding period)
    function unstake(uint256[] memory tokenIds) external whenNotPaused {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(tokenOwners[tokenId] == msg.sender, "Not the staker of this NFT");

            for (uint256 j = 0; j < stakes[msg.sender].length; j++) {
                if (stakes[msg.sender][j].tokenId == tokenId) {
                    _updateRewards(msg.sender, j);
                    stakes[msg.sender][j].unbondingStartBlock = block.number; // Start unbonding
                    break;
                }
            }

            emit Unstaked(msg.sender, tokenId);
        }
    }

    // Function to withdraw unstaked NFTs after the unbonding period
    function withdraw(uint256 tokenId) external {
        require(tokenOwners[tokenId] == msg.sender, "Not the owner of this NFT");
        
        Stake[] storage userStakes = stakes[msg.sender];
        for (uint256 i = 0; i < userStakes.length; i++) {
            if (userStakes[i].tokenId == tokenId) {
                require(userStakes[i].unbondingStartBlock != 0, "NFT not unstaked");
                require(block.number >= userStakes[i].unbondingStartBlock + unbondingPeriod, "Unbonding period not over");

                // Transfer NFT back to the user
                nftContract.transferFrom(address(this), msg.sender, tokenId);
                // Remove the stake
                userStakes[i] = userStakes[userStakes.length - 1];
                userStakes.pop();

                delete tokenOwners[tokenId];
                break;
            }
        }
    }

    // Function to claim rewards for all staked NFTs
    function claimRewards() external whenNotPaused {
        uint256 rewards = pendingRewards[msg.sender];
        Stake[] storage userStakes = stakes[msg.sender];

        for (uint256 i = 0; i < userStakes.length; i++) {
            if (userStakes[i].unbondingStartBlock == 0) { // Only claim for active stakes
                rewards += _calculateRewards(userStakes[i]);
                userStakes[i].lastRewardsClaimedBlock = block.number;
            }
        }

        require(rewards > 0, "No rewards to claim");
        pendingRewards[msg.sender] = 0;
        rewardToken.transfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    // Internal function to calculate rewards for a specific stake
    function _calculateRewards(Stake memory stake) internal view returns (uint256) {
        return (block.number - stake.lastRewardsClaimedBlock) * rewardPerBlock;
    }

    // Internal function to update pending rewards
    function _updateRewards(address user, uint256 stakeIndex) internal {
        uint256 rewards = _calculateRewards(stakes[user][stakeIndex]);
        pendingRewards[user] += rewards;
        stakes[user][stakeIndex].lastRewardsClaimedBlock = block.number;
    }

    // Owner-only function to pause the contract
    function pause() external onlyOwner {
        _pause();
    }

    // Owner-only function to unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }

    // Owner-only function to set the reward per block
    function setRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        rewardPerBlock = _rewardPerBlock;
    }

    // Owner-only function to set the unbonding period
    function setUnbondingPeriod(uint256 _unbondingPeriod) external onlyOwner {
        unbondingPeriod = _unbondingPeriod;
    }

    // Owner-only function to set the reward claim delay
    function setRewardClaimDelay(uint256 _rewardClaimDelay) external onlyOwner {
        rewardClaimDelay = _rewardClaimDelay;
    }
}

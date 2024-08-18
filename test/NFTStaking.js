const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTStakingContract", function () {
    let NFTStakingContract, nftStakingContract, owner, addr1, addr2, NFT, nft, RewardToken, rewardToken;
    let rewardPerBlock = ethers.utils.parseEther("1");
    let unbondingPeriod = 10; // in blocks
    let rewardClaimDelay = 5; // in blocks

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Mock ERC721 NFT contract
        NFT = await ethers.getContractFactory("MockERC721");
        nft = await NFT.deploy("TestNFT", "TNFT");
        await nft.deployed();

        // Deploy Mock ERC20 reward token contract
        RewardToken = await ethers.getContractFactory("MockERC20");
        rewardToken = await RewardToken.deploy("RewardToken", "RTKN", ethers.utils.parseEther("10000"));
        await rewardToken.deployed();

        // Deploy NFT Staking Contract
        NFTStakingContract = await ethers.getContractFactory("NFTStakingContract");
        nftStakingContract = await upgrades.deployProxy(NFTStakingContract, [
            nft.address,
            rewardToken.address,
            rewardPerBlock,
            unbondingPeriod,
            rewardClaimDelay
        ]);
        await nftStakingContract.deployed();

        // Mint some NFTs and reward tokens to addr1
        await nft.mint(addr1.address, 1);
        await nft.mint(addr1.address, 2);
        await rewardToken.transfer(nftStakingContract.address, ethers.utils.parseEther("1000"));
    });

    it("Should allow staking of NFTs", async function () {
        await nft.connect(addr1).approve(nftStakingContract.address, 1);
        await nftStakingContract.connect(addr1).stake([1]);

        const stake = await nftStakingContract.stakes(addr1.address, 0);
        expect(stake.tokenId).to.equal(1);
        expect(await nft.ownerOf(1)).to.equal(nftStakingContract.address);
    });

    it("Should calculate rewards correctly", async function () {
        await nft.connect(addr1).approve(nftStakingContract.address, 1);
        await nftStakingContract.connect(addr1).stake([1]);

        // Move forward by 10 blocks
        await ethers.provider.send("evm_mine", []);
        for (let i = 0; i < 9; i++) {
            await ethers.provider.send("evm_mine", []);
        }

        await nftStakingContract.connect(addr1).claimRewards();

        const rewards = await rewardToken.balanceOf(addr1.address);
        expect(rewards).to.equal(rewardPerBlock.mul(10));
    });

    it("Should allow unstaking and respect unbonding period", async function () {
        await nft.connect(addr1).approve(nftStakingContract.address, 1);
        await nftStakingContract.connect(addr1).stake([1]);

        await nftStakingContract.connect(addr1).unstake([1]);

        // Try withdrawing before unbonding period ends
        await expect(nftStakingContract.connect(addr1).withdraw(1))
            .to.be.revertedWith("Unbonding period not over");

        // Move forward by unbonding period blocks
        for (let i = 0; i < unbondingPeriod; i++) {
            await ethers.provider.send("evm_mine", []);
        }

        // Withdraw after unbonding period
        await nftStakingContract.connect(addr1).withdraw(1);
        expect(await nft.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should allow updating reward parameters", async function () {
        const newRewardPerBlock = ethers.utils.parseEther("2");
        await nftStakingContract.setRewardPerBlock(newRewardPerBlock);
        expect(await nftStakingContract.rewardPerBlock()).to.equal(newRewardPerBlock);
    });

    it("Should handle multiple NFTs correctly", async function () {
        await nft.connect(addr1).approve(nftStakingContract.address, 1);
        await nft.connect(addr1).approve(nftStakingContract.address, 2);
        await nftStakingContract.connect(addr1).stake([1, 2]);

        const stake1 = await nftStakingContract.stakes(addr1.address, 0);
        const stake2 = await nftStakingContract.stakes(addr1.address, 1);
        expect(stake1.tokenId).to.equal(1);
        expect(stake2.tokenId).to.equal(2);
        expect(await nft.ownerOf(1)).to.equal(nftStakingContract.address);
        expect(await nft.ownerOf(2)).to.equal(nftStakingContract.address);

        await nftStakingContract.connect(addr1).unstake([1]);
        expect(await nft.ownerOf(1)).to.equal(addr1.address);
        expect(await nft.ownerOf(2)).to.equal(nftStakingContract.address);
    });

    it("Should only allow reward claims after the claim delay", async function () {
        await nft.connect(addr1).approve(nftStakingContract.address, 1);
        await nftStakingContract.connect(addr1).stake([1]);

        // Move forward by 2 blocks (less than rewardClaimDelay)
        await ethers.provider.send("evm_mine", []);
        await ethers.provider.send("evm_mine", []);

        await expect(nftStakingContract.connect(addr1).claimRewards())
            .to.be.revertedWith("Claim delay not met");

        // Move forward by the remaining blocks to satisfy rewardClaimDelay
        for (let i = 0; i < rewardClaimDelay - 2; i++) {
            await ethers.provider.send("evm_mine", []);
        }

        await nftStakingContract.connect(addr1).claimRewards();
        const rewards = await rewardToken.balanceOf(addr1.address);
        expect(rewards).to.be.gt(0);
    });
});

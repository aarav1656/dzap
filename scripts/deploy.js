// scripts/deploy.js
async function main() {
    // Get the ContractFactory and Signers here
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy the NFTStakingContract
    const NFTStakingContract = await ethers.getContractFactory("NFTStakingContract");
    const nftStakingContract = await NFTStakingContract.deploy();

    // Initialize the contract with required parameters
    const nftContractAddress = "0xYourNFTContractAddress"; // Replace with your actual NFT contract address
    const rewardTokenAddress = "0xYourERC20TokenAddress";  // Replace with your actual reward token address
    const rewardPerBlock = ethers.utils.parseUnits("10", 18); // Example: 10 tokens per block
    const unbondingPeriod = 100; // Example: 100 blocks
    const rewardClaimDelay = 50; // Example: 50 blocks

    await nftStakingContract.deployed();
    console.log("NFTStakingContract deployed to:", nftStakingContract.address);

    // Initialize the contract
    await nftStakingContract.initialize(
        nftContractAddress,
        rewardTokenAddress,
        rewardPerBlock,
        unbondingPeriod,
        rewardClaimDelay
    );

    console.log("NFTStakingContract initialized with parameters.");
}

// Boilerplate code to run the script and handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

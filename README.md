# NFT Staking Contract

This repository contains a smart contract for staking NFTs and earning ERC20 token rewards. The contract allows users to stake their NFTs, earn rewards per block, and claim those rewards after a specified delay. The contract is upgradeable using the UUPS (Universal Upgradeable Proxy Standard) proxy pattern.

## Features

- **Stake NFTs**: Users can stake one or more NFTs to start earning rewards.
- **Unstake NFTs**: Users can unstake specific NFTs, with an unbonding period before withdrawal.
- **Claim Rewards**: Users can claim accumulated rewards after a delay period.
- **Upgradeable**: The contract supports upgrades using the UUPS pattern.
- **Pause/Unpause**: The owner can pause and unpause the staking process.
- **Control Mechanisms**: The owner can adjust reward rates, unbonding periods, and reward claim delays.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) (v6 or later)
- [Hardhat](https://hardhat.org/) (v2.0 or later)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/nft-staking-contract.git
    cd nft-staking-contract
    ```

2. Install the dependencies:

    ```bash
    npm install
    ```

### Setup

1. Create a `.env` file in the root directory of the project and add your private key and Infura project ID:

    ```bash
    INFURA_PROJECT_ID=your-infura-project-id
    PRIVATE_KEY=your-private-key
    ```

    Replace `your-infura-project-id` with your Infura project ID and `your-private-key` with your Ethereum wallet's private key.

2. Update the `hardhat.config.js` file if you wish to deploy to a network other than the default.

### Deployment

1. Compile the smart contracts:

    ```bash
    npx hardhat compile
    ```

2. Deploy the contract to your chosen network:

    ```bash
    npx hardhat run scripts/deploy.js --network rinkeby
    ```

    Replace `rinkeby` with the network you're deploying to. You can configure networks in `hardhat.config.js`.

### Testing

1. To run the tests:

    ```bash
    npx hardhat test
    ```

    The tests are located in the `test/` directory and are written using Hardhat's testing framework with Chai assertions.

### Interacting with the Contract

You can interact with the deployed contract using Hardhat's console:

```bash
npx hardhat console --network rinkeby

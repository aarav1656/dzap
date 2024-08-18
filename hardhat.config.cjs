require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.18",
  networks: {
    rinkeby: {
      url: "https://base-sepolia.infura.io/v3/2SpxOEP71Uxa3lR459eEAQXR2Gw", 
      accounts: [`0x${YOUR_PRIVATE_KEY}`] 
    },
  }
};

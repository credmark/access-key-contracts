

const HDWalletProvider = require('@truffle/hdwallet-provider');


require('dotenv').config();

module.exports = {

  networks: {
    development: {
     host: "127.0.0.1",
     port: 8545,
     network_id: "*",
    },
    rinkeby: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`),
      network_id: 4,
      gas: 6900000,
      gasPrice: 10000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  mocha: {
    // timeout: 100000
  },

  compilers: {
    solc: {
      version: "0.8.7",
      settings: {
       optimizer: {
         enabled: false,
         runs: 200
       },
      }
    }
  }
};

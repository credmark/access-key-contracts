const StakedCredmark = artifacts.require("StakedCredmark");
const MockCredmark = artifacts.require("MockCMK");
const RewardsPool = artifacts.require("RewardsPool");
const CredmarkAccessKey = artifacts.require("CredmarkAccessKey");
const CredmarkAccessProvider = artifacts.require("CredmarkAccessProvider");

module.exports = async (deployer) => {

    // WARNING: USING MOCK VALUES FOR EVERYTHING HERE!! //
    
    await deployer.deploy(MockCredmark);
    let mockCredmark = await MockCredmark.deployed();

    await deployer.deploy(StakedCredmark,mockCredmark.address);
    let stakedCredmark = await StakedCredmark.deployed();

    await deployer.deploy(RewardsPool, stakedCredmark.address, mockCredmark.address);
    let rewardsPool = await RewardsPool.deployed();

    await deployer.deploy(CredmarkAccessKey, stakedCredmark.address, mockCredmark.address, mockCredmark.address);
    let credmarkAccessKey = await CredmarkAccessKey.deployed();

    await deployer.deploy(CredmarkAccessProvider, credmarkAccessKey.address);
    let credmarkAccessProvider = await CredmarkAccessProvider.deployed();

};

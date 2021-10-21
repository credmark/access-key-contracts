import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { MockCMK } from "../typechain/MockCMK.d";
import { StakedCredmark } from "../typechain/StakedCredmark.d";
import { RewardsPool } from "../typechain/RewardsPool.d";

describe("Rewards Pool", () => {
  let cmk: MockCMK;
  let stakedCmk: StakedCredmark;
  let rewardsPool: RewardsPool;
  let wallet: SignerWithAddress;
  let otherWallet: SignerWithAddress;
  let now = BigNumber.from(Date.now()).div(1000);

  const sevenDays = 7 * 24 * 60 * 60;

  const fixture = async (): Promise<[MockCMK, StakedCredmark, RewardsPool]> => {
    const mockCmkFactory = await ethers.getContractFactory("MockCMK");
    const _cmk = (await mockCmkFactory.deploy()) as MockCMK;

    const stakedCmkFactory = await ethers.getContractFactory("StakedCredmark");
    const _stakedCmk = (await stakedCmkFactory.deploy(_cmk.address)) as StakedCredmark;

    const rewardsPoolFactory = await ethers.getContractFactory("RewardsPool");
    const _rewardsPool = (await rewardsPoolFactory.deploy(_cmk.address, _stakedCmk.address)) as RewardsPool;

    await _stakedCmk.setRewardsPool(_rewardsPool.address);

    return [_cmk, _stakedCmk, _rewardsPool];
  };

  beforeEach(async () => {
    [cmk, stakedCmk, rewardsPool] = await waffle.loadFixture(fixture);
    [wallet, otherWallet] = await ethers.getSigners();

    /**
     * Since rewards pool is time based, manually changing block time, to validate
     * such calculations.
     */
    now = now.add(sevenDays * 4);
    await ethers.provider.send("evm_setNextBlockTimestamp", [now.toNumber()]);
    await ethers.provider.send("evm_mine", []);
  });

  it("should not be started by non owner", async () => {
    const otherRewardsPool = rewardsPool.connect(otherWallet);
    await expect(otherRewardsPool.start(0)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should not be started with end time in past", async () => {
    await expect(rewardsPool.start(BigNumber.from(Date.now()).div(1000).sub(sevenDays))).to.be.revertedWith(
      "End time is not in future"
    );
  });

  it("should not issue rewards when not started", async () => {
    await expect(rewardsPool.issueRewards()).to.be.revertedWith("Pool has not started");
  });

  it("should be started by owner", async () => {
    await rewardsPool.start(now.add(sevenDays));
    expect(await rewardsPool.started()).to.equal(true);
  });

  it("should not restart", async () => {
    await rewardsPool.start(now.add(sevenDays));
    await expect(rewardsPool.start(now.add(sevenDays))).to.be.revertedWith("Contract Already Started");
  });

  it("should allow owner to set end time", async () => {
    await rewardsPool.start(now.add(sevenDays));
    await rewardsPool.setEndTime(now.add(sevenDays));
  });

  it("should not allow non-owner to set end time", async () => {
    await rewardsPool.start(now.add(sevenDays));
    const otherRewardsPool = rewardsPool.connect(otherWallet);
    await expect(otherRewardsPool.setEndTime(now.add(sevenDays))).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("should not allow to set end time in the past", async () => {
    await rewardsPool.start(now.add(sevenDays));
    await expect(rewardsPool.setEndTime(BigNumber.from(Date.now()).div(1000).sub(sevenDays))).to.be.revertedWith(
      "End time is not in future"
    );
  });

  it("should be able to manipulate time", async () => {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter.timestamp;

    expect(blockNumAfter).to.be.equal(blockNumBefore + 1);
    expect(timestampAfter).to.be.closeTo(timestampBefore + sevenDays, 60);
  });

  it("should increase unissued rewards with time", async () => {
    await cmk.transfer(rewardsPool.address, 10000000);

    await rewardsPool.start(now.add(sevenDays).add(sevenDays));
    const unissuedRewardsBefore = await rewardsPool.unissuedRewards();

    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    const unissuedRewardsAfter = await rewardsPool.unissuedRewards();
    expect(unissuedRewardsAfter.sub(unissuedRewardsBefore)).to.be.closeTo(BigNumber.from(5000000), 100);
  });

  it("should issue rewards to staked cmk", async () => {
    await cmk.transfer(rewardsPool.address, 10000000);

    await rewardsPool.start(now.add(sevenDays).add(sevenDays));

    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    const unissuedRewards = await rewardsPool.unissuedRewards();
    expect(unissuedRewards).to.be.closeTo(BigNumber.from(5000000), 100);

    await expect(rewardsPool.issueRewards()).to.emit(rewardsPool, "RewardsIssued");
    expect(await cmk.balanceOf(rewardsPool.address)).to.be.closeTo(BigNumber.from(10000000).sub(unissuedRewards), 100);
    expect(await cmk.balanceOf(stakedCmk.address)).to.be.closeTo(unissuedRewards, 100);
  });

  it("should not emit event when no unissued rewards", async () => {
    await rewardsPool.start(now.add(sevenDays).add(sevenDays));

    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    const unissuedRewards = await rewardsPool.unissuedRewards();
    expect(unissuedRewards).to.be.equal(BigNumber.from(0));

    await expect(rewardsPool.issueRewards()).to.not.emit(rewardsPool, "RewardsIssued");
    expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(BigNumber.from(0));
  });

  it("should update lastEmitted on rewards issued", async () => {
    await cmk.transfer(rewardsPool.address, 10000000);

    await rewardsPool.start(now.add(sevenDays).add(sevenDays));

    /**
     * After 7 days (at halfway), half should be exhausted
     */
    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    const unissuedRewards = await rewardsPool.unissuedRewards();
    expect(unissuedRewards).to.be.closeTo(BigNumber.from(5000000), 100);

    await expect(rewardsPool.issueRewards()).to.emit(rewardsPool, "RewardsIssued");
    expect(await cmk.balanceOf(rewardsPool.address)).to.be.closeTo(BigNumber.from(10000000).sub(unissuedRewards), 100);
    expect(await cmk.balanceOf(stakedCmk.address)).to.be.closeTo(unissuedRewards, 100);

    /**
     * After 14 more days (at end time), everything should be exhausted
     */
    await ethers.provider.send("evm_increaseTime", [sevenDays * 2]);
    await ethers.provider.send("evm_mine", []);

    const unissuedRewards2 = await rewardsPool.unissuedRewards();
    expect(unissuedRewards2).to.be.closeTo(BigNumber.from(5000000), 100);

    await expect(rewardsPool.issueRewards()).to.emit(rewardsPool, "RewardsIssued");
    expect(await cmk.balanceOf(rewardsPool.address)).to.be.equal(BigNumber.from(0));
    expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(BigNumber.from(10000000));

    /**
     * Now no rewards should be issued
     */
    const unissuedRewards3 = await rewardsPool.unissuedRewards();
    expect(unissuedRewards3).to.be.equal(BigNumber.from(0));

    await expect(rewardsPool.issueRewards()).to.not.emit(rewardsPool, "RewardsIssued");
  });

  it("should issue rewards on updating end time", async () => {
    await cmk.transfer(rewardsPool.address, 10000000);

    await rewardsPool.start(now.add(sevenDays).add(sevenDays));

    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    const unissuedRewards = await rewardsPool.unissuedRewards();
    expect(unissuedRewards).to.be.closeTo(BigNumber.from(5000000), 100);

    await expect(rewardsPool.setEndTime(now.add(sevenDays).add(sevenDays * 2))).to.emit(rewardsPool, "RewardsIssued");

    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);
    const unissuedRewards2 = await rewardsPool.unissuedRewards();
    expect(unissuedRewards2).to.be.closeTo(BigNumber.from(2500000), 100);
  });

  it("should issue rewards on removing staked credmark share", async () => {
    await cmk.transfer(rewardsPool.address, 10000000);

    await rewardsPool.start(now.add(sevenDays).add(sevenDays));

    await cmk.approve(stakedCmk.address, 1000);
    await stakedCmk.createShare(1000);

    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    const unissuedRewards = await rewardsPool.unissuedRewards();
    expect(unissuedRewards).to.be.closeTo(BigNumber.from(5000000), 100);

    await expect(stakedCmk.removeShare(1000)).to.emit(rewardsPool, "RewardsIssued");
  });
});

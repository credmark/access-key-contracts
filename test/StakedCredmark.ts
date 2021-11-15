import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { MockCMK } from "../typechain/MockCMK.d";
import { RewardsPool } from "../typechain/RewardsPool";
import { StakedCredmark } from "../typechain/StakedCredmark.d";

describe("Staked Credmark", () => {
  let cmk: MockCMK;
  let stakedCmk: StakedCredmark;
  let wallet: SignerWithAddress;
  let otherWallet: SignerWithAddress;

  const sevenDays = 7 * 24 * 60 * 60;

  const fixture = async (): Promise<[MockCMK, StakedCredmark]> => {
    const mockCmkFactory = await ethers.getContractFactory("MockCMK");
    const _cmk = (await mockCmkFactory.deploy()) as MockCMK;

    const stakedCmkFactory = await ethers.getContractFactory("StakedCredmark");
    const _stakedCmk = (await stakedCmkFactory.deploy(_cmk.address)) as StakedCredmark;

    return [_cmk, _stakedCmk];
  };

  beforeEach(async () => {
    [cmk, stakedCmk] = await waffle.loadFixture(fixture);
    [wallet, otherWallet] = await ethers.getSigners();
  });

  describe("#cmkSupply", () => {
    it("should assign initial cmk supply", async () => {
      await cmk.transfer(stakedCmk.address, 1000);
      expect(await stakedCmk.cmkBalance()).to.equal(BigNumber.from(1000));
    });

    it("should increase sCmk value on cmk infusion", async () => {
      await cmk.approve(stakedCmk.address, 100);
      await stakedCmk.createShare(100);
      const beforeInfusionValue = await stakedCmk.sharesToCmk(1);
      await cmk.transfer(stakedCmk.address, 1000);
      const afterInfusionValue = await stakedCmk.sharesToCmk(1);

      expect(afterInfusionValue).to.be.gt(beforeInfusionValue);
    });
  });

  describe("#createShare", () => {
    it("should create share", async () => {
      await cmk.approve(stakedCmk.address, 100);
      await stakedCmk.createShare(100);
      expect(await stakedCmk.balanceOf(wallet.address)).to.equal(BigNumber.from(100));
      expect(await stakedCmk.totalSupply()).to.equal(BigNumber.from(100));
    });

    it("should not create share if low cmk balance", async () => {
      await cmk.connect(otherWallet).approve(stakedCmk.connect(otherWallet).address, 100);
      await expect(stakedCmk.connect(otherWallet).createShare(100)).to.be.reverted;
    });
  });

  describe("#removeShare", () => {
    it("should remove share", async () => {
      await cmk.approve(stakedCmk.address, 100);
      await stakedCmk.createShare(100);

      const cmkBalance = await cmk.balanceOf(wallet.address);
      await stakedCmk.removeShare(100);
      expect(await stakedCmk.balanceOf(wallet.address)).to.equal(BigNumber.from(0));
      expect(await stakedCmk.totalSupply()).to.equal(BigNumber.from(0));
      expect(await cmk.balanceOf(wallet.address)).to.be.equal(cmkBalance.add(100));
    });

    it("should not remove share if low share balance", async () => {
      await expect(stakedCmk.removeShare(100)).to.be.reverted;
    });

    it("should issue rewards on removing share", async () => {
      const rewardsPoolFactory = await ethers.getContractFactory("RewardsPool");
      const rewardsPool = (await rewardsPoolFactory.deploy(cmk.address, stakedCmk.address)) as RewardsPool;
      await stakedCmk.setRewardsPool(rewardsPool.address);

      await cmk.transfer(rewardsPool.address, 10000000);

      const bn = await ethers.provider.getBlockNumber();
      const blk = await ethers.provider.getBlock(bn);
      const now = BigNumber.from(blk.timestamp);
      await rewardsPool.start(now.add(sevenDays).add(sevenDays));

      await cmk.approve(stakedCmk.address, 1000);
      await stakedCmk.createShare(1000);

      await ethers.provider.send("evm_increaseTime", [sevenDays]);
      await ethers.provider.send("evm_mine", []);

      const unissuedRewards = await rewardsPool.unissuedRewards();
      expect(unissuedRewards).to.be.closeTo(BigNumber.from(5000000), 100);

      await expect(stakedCmk.removeShare(1000)).to.emit(rewardsPool, "RewardsIssued");
    });

    it("should issue rewards once every 24 hours", async () => {
      const rewardsPoolFactory = await ethers.getContractFactory("RewardsPool");
      const rewardsPool = (await rewardsPoolFactory.deploy(cmk.address, stakedCmk.address)) as RewardsPool;
      await stakedCmk.setRewardsPool(rewardsPool.address);

      await cmk.transfer(rewardsPool.address, 10000000);

      const bn = await ethers.provider.getBlockNumber();
      const blk = await ethers.provider.getBlock(bn);
      const now = BigNumber.from(blk.timestamp);
      await rewardsPool.start(now.add(sevenDays).add(sevenDays));

      await cmk.approve(stakedCmk.address, 1000);
      await stakedCmk.createShare(1000);

      await ethers.provider.send("evm_increaseTime", [sevenDays]);
      await ethers.provider.send("evm_mine", []);

      await expect(stakedCmk.removeShare(100)).to.emit(rewardsPool, "RewardsIssued");
      await expect(stakedCmk.removeShare(100)).to.not.emit(rewardsPool, "RewardsIssued");

      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      await expect(stakedCmk.removeShare(100)).to.emit(rewardsPool, "RewardsIssued");
    });
  });
});

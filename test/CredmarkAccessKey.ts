import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { CredmarkAccessKey } from "../typechain/CredmarkAccessKey";
import { MockCMK } from "../typechain/MockCMK";
import { StakedCredmark } from "../typechain/StakedCredmark";

describe("Credmark Access Key", () => {
  let cmk: MockCMK;
  let stakedCmk: StakedCredmark;
  let credmarkAccessKey: CredmarkAccessKey;
  let wallet: SignerWithAddress;
  let otherWallet: SignerWithAddress;
  let credmarkDao: SignerWithAddress;

  const cmkFeePerSec = BigNumber.from(100);
  const liquidatorRewardPercent = BigNumber.from(5);
  const stakedCmkSweepPercent = BigNumber.from(40);

  const fixture = async (): Promise<[MockCMK, StakedCredmark, CredmarkAccessKey]> => {
    const mockCmkFactory = await ethers.getContractFactory("MockCMK");
    const _cmk = (await mockCmkFactory.deploy()) as MockCMK;

    const stakedCmkFactory = await ethers.getContractFactory("StakedCredmark");
    const _stakedCmk = (await stakedCmkFactory.deploy(_cmk.address)) as StakedCredmark;

    const credmarkAccessKeyFactory = await ethers.getContractFactory("CredmarkAccessKey");
    const _credmarkAccessKey = (await credmarkAccessKeyFactory.deploy(
      _stakedCmk.address,
      _cmk.address,
      credmarkDao.address,
      cmkFeePerSec,
      liquidatorRewardPercent,
      stakedCmkSweepPercent
    )) as CredmarkAccessKey;

    return [_cmk, _stakedCmk, _credmarkAccessKey];
  };

  beforeEach(async () => {
    [wallet, otherWallet, credmarkDao] = await ethers.getSigners();
    [cmk, stakedCmk, credmarkAccessKey] = await waffle.loadFixture(fixture);
  });

  describe("#fee", () => {
    it("should get current fee", async () => {
      const feeCount = await credmarkAccessKey.getFeesCount();
      const fee = await credmarkAccessKey.fees(feeCount.sub(1));
      expect(fee.feePerSecond).to.be.equal(cmkFeePerSec);
    });

    it("should allow owner to set fee", async () => {
      const newFee = BigNumber.from(2000);
      await expect(credmarkAccessKey.setFee(newFee)).to.emit(credmarkAccessKey, "FeeChanged").withArgs(newFee);
      const feeCount = await credmarkAccessKey.getFeesCount();
      expect(feeCount).to.be.equal(BigNumber.from(2));
      const fee = await credmarkAccessKey.fees(feeCount.sub(1));
      expect(fee.feePerSecond).to.be.equal(newFee);
    });

    it("should not allow non owner to set fee", async () => {
      const newFee = BigNumber.from(2000);
      await expect(credmarkAccessKey.connect(otherWallet).setFee(newFee)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("#stakedCmkSweepPercent", () => {
    const newStakedCmkSweepPercent = BigNumber.from(80);

    it("should get current stakedCmkSweepPercent", async () => {
      expect(await credmarkAccessKey.stakedCmkSweepPercent()).to.be.equal(stakedCmkSweepPercent);
    });

    it("should allow owner to set stakedCmkSweepPercent", async () => {
      await expect(credmarkAccessKey.setStakedCmkSweepPercent(newStakedCmkSweepPercent))
        .to.emit(credmarkAccessKey, "StakedCmkSweepPercentChanged")
        .withArgs(newStakedCmkSweepPercent);
      expect(await credmarkAccessKey.stakedCmkSweepPercent()).to.be.equal(newStakedCmkSweepPercent);
    });

    it("should not allow to set invalid percent", async () => {
      await expect(credmarkAccessKey.setStakedCmkSweepPercent(BigNumber.from(101))).to.be.revertedWith(
        "Percent not in 0-100 range"
      );
      await expect(credmarkAccessKey.setStakedCmkSweepPercent(BigNumber.from(-1))).to.be.reverted;
    });

    it("should not allow non owner to set stakedCmkSweepPercent", async () => {
      await expect(
        credmarkAccessKey.connect(otherWallet).setStakedCmkSweepPercent(newStakedCmkSweepPercent)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("#liquidatorRewardPercent", () => {
    const newLiquidatorRewardPercent = BigNumber.from(80);

    it("should get current liquidatorRewardPercent", async () => {
      expect(await credmarkAccessKey.liquidatorRewardPercent()).to.be.equal(liquidatorRewardPercent);
    });

    it("should allow owner to set liquidatorRewardPercent", async () => {
      await expect(credmarkAccessKey.setLiquidatorRewardPercent(newLiquidatorRewardPercent))
        .to.emit(credmarkAccessKey, "LiquidatorRewardPercentChanged")
        .withArgs(newLiquidatorRewardPercent);
      expect(await credmarkAccessKey.liquidatorRewardPercent()).to.be.equal(newLiquidatorRewardPercent);
    });

    it("should not allow to set invalid percent", async () => {
      await expect(credmarkAccessKey.setLiquidatorRewardPercent(BigNumber.from(101))).to.be.revertedWith(
        "Percent not in 0-100 range"
      );
      await expect(credmarkAccessKey.setLiquidatorRewardPercent(BigNumber.from(-1))).to.be.reverted;
    });

    it("should not allow non owner to set liquidatorRewardPercent", async () => {
      await expect(
        credmarkAccessKey.connect(otherWallet).setLiquidatorRewardPercent(newLiquidatorRewardPercent)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("#mint", () => {
    it("should mint nft", async () => {
      await credmarkAccessKey.approveCmkForSCmk(1000);

      const initialMintAmount = BigNumber.from(1000);
      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
      await expect(credmarkAccessKey.mint(initialMintAmount))
        .to.emit(credmarkAccessKey, "AccessKeyMinted")
        .withArgs(BigNumber.from(0));
      const tokenId = BigNumber.from(0);
      expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(1));
      expect(await credmarkAccessKey.tokenOfOwnerByIndex(wallet.address, 0)).to.be.equal(tokenId);
      expect(await credmarkAccessKey.cmkValue(tokenId)).to.be.equal(initialMintAmount);
    });

    it("should add cmk to token", async () => {
      const initialMintAmount = BigNumber.from(1000);
      await credmarkAccessKey.approveCmkForSCmk(initialMintAmount.mul(2));
      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      await credmarkAccessKey.addCmk(tokenId, initialMintAmount);
      expect(await credmarkAccessKey.cmkValue(tokenId)).to.be.equal(initialMintAmount.mul(2));
    });

    it("should accumulate fees with time", async () => {
      const initialMintAmount = BigNumber.from(100000000);

      await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);
      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      const sevenDays = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [sevenDays]);
      await ethers.provider.send("evm_mine", []);

      expect(await credmarkAccessKey.feesAccumulated(tokenId)).to.be.closeTo(
        cmkFeePerSec.mul(sevenDays),
        cmkFeePerSec.mul(5).toNumber()
      );
    });

    it("should accumulate fees with time proportional to fee duration", async () => {
      const initialMintAmount = BigNumber.from(10);
      await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);
      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));

      const oneDay = 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [oneDay]);
      await ethers.provider.send("evm_mine", []);

      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      const sevenDays = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [sevenDays - oneDay]);
      await ethers.provider.send("evm_mine", []);

      expect(await credmarkAccessKey.feesAccumulated(tokenId)).to.be.closeTo(
        cmkFeePerSec.mul(sevenDays - oneDay),
        cmkFeePerSec.mul(5).toNumber()
      );

      await credmarkAccessKey.setFee(cmkFeePerSec.mul(2));
      await ethers.provider.send("evm_increaseTime", [sevenDays]);
      await ethers.provider.send("evm_mine", []);

      expect(await credmarkAccessKey.feesAccumulated(tokenId)).to.be.closeTo(
        cmkFeePerSec.mul(sevenDays - oneDay).add(cmkFeePerSec.mul(2).mul(sevenDays)),
        cmkFeePerSec.mul(5).toNumber()
      );
    });
  });

  describe("#burn", () => {
    it("should burn nft", async () => {
      await credmarkAccessKey.approveCmkForSCmk(1000);

      const initialMintAmount = BigNumber.from(1000);
      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      await expect(credmarkAccessKey.burn(tokenId)).to.emit(credmarkAccessKey, "AccessKeyBurned").withArgs(tokenId);
      expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(0));
    });

    it("should not burn nft if not owner", async () => {
      await credmarkAccessKey.approveCmkForSCmk(1000);

      const initialMintAmount = BigNumber.from(1000);
      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      await expect(credmarkAccessKey.connect(otherWallet).burn(tokenId)).to.be.revertedWith(
        "Only owner can burn their NFT"
      );
      expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(1));
    });
  });

  describe("#liquidate", () => {
    it("should liquidate by owner when defaulting fees", async () => {
      const initialMintAmount = BigNumber.from(1000);
      await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);

      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      const sevenDays = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [sevenDays]);
      await ethers.provider.send("evm_mine", []);

      const cmkBalanceBefore = await cmk.balanceOf(wallet.address);
      await expect(credmarkAccessKey.liquidate(tokenId))
        .to.emit(credmarkAccessKey, "AccessKeyBurned")
        .withArgs(tokenId)
        .and.to.emit(credmarkAccessKey, "AccessKeyLiquidated")
        .withArgs(tokenId, wallet.address, initialMintAmount.mul(liquidatorRewardPercent).div(100));

      expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(0));

      const cmkBalanceAfter = await cmk.balanceOf(wallet.address);
      expect(cmkBalanceAfter.sub(cmkBalanceBefore)).to.be.equal(
        initialMintAmount.mul(liquidatorRewardPercent).div(100)
      );
    });

    it("should liquidate by non owner when defaulting fees", async () => {
      const initialMintAmount = BigNumber.from(1000);
      await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);

      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      const sevenDays = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [sevenDays]);
      await ethers.provider.send("evm_mine", []);

      const cmkBalanceBefore = await cmk.balanceOf(otherWallet.address);
      await expect(credmarkAccessKey.connect(otherWallet).liquidate(tokenId))
        .to.emit(credmarkAccessKey, "AccessKeyBurned")
        .withArgs(tokenId)
        .and.to.emit(credmarkAccessKey, "AccessKeyLiquidated")
        .withArgs(tokenId, otherWallet.address, initialMintAmount.mul(liquidatorRewardPercent).div(100));

      expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(0));

      const cmkBalanceAfter = await cmk.balanceOf(otherWallet.address);
      expect(cmkBalanceAfter.sub(cmkBalanceBefore)).to.be.equal(
        initialMintAmount.mul(liquidatorRewardPercent).div(100)
      );
    });

    it("should not liquidate when not defaulting fees", async () => {
      const initialMintAmount = BigNumber.from(100000000);
      await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);

      await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      const sevenDays = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [sevenDays]);
      await ethers.provider.send("evm_mine", []);

      await expect(credmarkAccessKey.liquidate(tokenId)).to.be.revertedWith("Not liquidiateable");
      expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(1));
    });
  });

  describe("#sweep", () => {
    it("should sweep", async () => {
      const initialMintAmount = BigNumber.from(1000);
      await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);

      await cmk.approve(credmarkAccessKey.address, initialMintAmount);
      await credmarkAccessKey.mint(initialMintAmount);
      const tokenId = BigNumber.from(0);

      const sevenDays = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [sevenDays]);
      await ethers.provider.send("evm_mine", []);

      await credmarkAccessKey.burn(tokenId);
      await expect(credmarkAccessKey.sweep())
        .to.emit(credmarkAccessKey, "Sweeped")
        .withArgs(
          initialMintAmount.mul(stakedCmkSweepPercent).div(100),
          initialMintAmount.mul(BigNumber.from(100).sub(stakedCmkSweepPercent)).div(100)
        );

      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(initialMintAmount.mul(stakedCmkSweepPercent).div(100));
      expect(await cmk.balanceOf(credmarkDao.address)).to.be.equal(
        initialMintAmount.mul(BigNumber.from(100).sub(stakedCmkSweepPercent)).div(100)
      );
    });

    it("should sweep nothing when minted token exists", async () => {
      const initialMintAmount = BigNumber.from(1000);
      await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);

      await cmk.approve(credmarkAccessKey.address, initialMintAmount);
      await credmarkAccessKey.mint(initialMintAmount);

      await expect(credmarkAccessKey.sweep())
        .to.emit(credmarkAccessKey, "Sweeped")
        .withArgs(BigNumber.from(0), BigNumber.from(0));
      expect(await cmk.balanceOf(credmarkDao.address)).to.be.equal(BigNumber.from(0));
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(initialMintAmount);
    });
  });
});

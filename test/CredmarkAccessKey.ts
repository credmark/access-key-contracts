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
      cmkFeePerSec
    )) as CredmarkAccessKey;

    return [_cmk, _stakedCmk, _credmarkAccessKey];
  };

  beforeEach(async () => {
    [wallet, otherWallet, credmarkDao] = await ethers.getSigners();
    [cmk, stakedCmk, credmarkAccessKey] = await waffle.loadFixture(fixture);
  });

  it("should get current fee", async () => {
    expect(await credmarkAccessKey.getFee()).to.be.equal(cmkFeePerSec);
  });

  it("should allow owner to set fee", async () => {
    const newFee = BigNumber.from(2000);
    await expect(credmarkAccessKey.setFee(newFee)).to.emit(credmarkAccessKey, "FeeChanged").withArgs(newFee);
    expect(await credmarkAccessKey.getFee()).to.be.equal(newFee);
  });

  it("should not allow non owner to set fee", async () => {
    const newFee = BigNumber.from(2000);
    await expect(credmarkAccessKey.connect(otherWallet).setFee(newFee)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

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

  it("should accumulate fees with time capped at cmk value", async () => {
    const initialMintAmount = BigNumber.from(10);
    await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);
    await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
    await credmarkAccessKey.mint(initialMintAmount);
    const tokenId = BigNumber.from(0);

    const sevenDays = 7 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    expect(await credmarkAccessKey.feesAccumulated(tokenId)).to.be.equal(initialMintAmount);
  });

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

    await expect(credmarkAccessKey.connect(otherWallet).burn(tokenId)).to.be.revertedWith("Only owner can burn their NFT")
    expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(1));
  });

  it("should liquidate by owner when defaulting fees", async () => {
    const initialMintAmount = BigNumber.from(1000);
    await credmarkAccessKey.approveCmkForSCmk(initialMintAmount);

    await cmk.approve(credmarkAccessKey.address, initialMintAmount.mul(100));
    await credmarkAccessKey.mint(initialMintAmount);
    const tokenId = BigNumber.from(0);

    const sevenDays = 7 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [sevenDays]);
    await ethers.provider.send("evm_mine", []);

    expect(await credmarkAccessKey.isLiquidateable(tokenId)).to.be.equal(true);
    await expect(credmarkAccessKey.liquidate(tokenId)).to.emit(credmarkAccessKey, "AccessKeyLiquidated").withArgs(tokenId);
    expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(0));
    expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(initialMintAmount.div(2));
    expect(await cmk.balanceOf(credmarkDao.address)).to.be.equal(initialMintAmount.div(2));
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

    expect(await credmarkAccessKey.isLiquidateable(tokenId)).to.be.equal(true);
    await expect(credmarkAccessKey.connect(otherWallet).liquidate(tokenId)).to.emit(credmarkAccessKey, "AccessKeyLiquidated").withArgs(tokenId);
    expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(0));
    expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(initialMintAmount.div(2));
    expect(await cmk.balanceOf(credmarkDao.address)).to.be.equal(initialMintAmount.div(2));
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

    expect(await credmarkAccessKey.isLiquidateable(tokenId)).to.be.equal(false);
    await expect(credmarkAccessKey.liquidate(tokenId)).to.be.revertedWith("Not Insolvent")
    expect(await credmarkAccessKey.balanceOf(wallet.address)).to.be.equal(BigNumber.from(1));
    expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(initialMintAmount);
    expect(await cmk.balanceOf(credmarkDao.address)).to.be.equal(BigNumber.from(0));
  });
});

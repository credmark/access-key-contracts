import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { MockCMK } from "../typechain/MockCMK.d";
import { StakedCredmark } from "../typechain/StakedCredmark.d";

describe("Staked Credmark", () => {
  let cmk: MockCMK;
  let stakedCmk: StakedCredmark;
  let wallet: SignerWithAddress;
  let walletTo: SignerWithAddress;

  const fixture = async (): Promise<[MockCMK, StakedCredmark]> => {
    const mockCmkFactory = await ethers.getContractFactory("MockCMK");
    const _cmk = (await mockCmkFactory.deploy()) as MockCMK;

    const stakedCmkFactory = await ethers.getContractFactory("StakedCredmark");
    const _stakedCmk = (await stakedCmkFactory.deploy(_cmk.address)) as StakedCredmark;

    return [_cmk, _stakedCmk];
  };

  beforeEach(async () => {
    [cmk, stakedCmk] = await waffle.loadFixture(fixture);
    [wallet, walletTo] = await ethers.getSigners();
  });

  it("should assign initial cmk supply", async () => {
    await cmk.transfer(stakedCmk.address, 1000);
    expect(await stakedCmk.cmkTotalSupply()).to.equal(BigNumber.from(1000));
  });

  it("should create share", async () => {
    await cmk.approve(stakedCmk.address, 100);
    await stakedCmk.createShare(100);
    expect(await stakedCmk.balanceOf(wallet.address)).to.equal(BigNumber.from(100));
    expect(await stakedCmk.totalSupply()).to.equal(BigNumber.from(100));
  });

  it("should increase sCmk value on cmk infusion", async () => {
    await cmk.approve(stakedCmk.address, 100);
    await stakedCmk.createShare(100);
    const beforeInfusionValue = await stakedCmk.sharesToCmk(1);
    await cmk.transfer(stakedCmk.address, 1000);
    const afterInfusionValue = await stakedCmk.sharesToCmk(1);

    expect(afterInfusionValue).to.be.gt(beforeInfusionValue);
  });

  it("should not create share if low cmk balance", async () => {
    const otherStakedCmk = stakedCmk.connect(walletTo);
    const otherCmk = cmk.connect(walletTo);
    await otherCmk.approve(stakedCmk.address, 100);
    await expect(otherStakedCmk.createShare(100)).to.be.reverted;
  });

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
});

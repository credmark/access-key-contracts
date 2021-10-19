import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import { ethers, waffle } from 'hardhat';
import { MockCMK } from '../typechain/MockCMK.d';

describe('Mock Credmark', () => {
  let cmk: MockCMK;
  let wallet: SignerWithAddress;
  let walletTo: SignerWithAddress;

  const fixture = async () => {
    const factory = await ethers.getContractFactory('MockCMK');
    return (await factory.deploy()) as MockCMK;
  };

  beforeEach(async () => {
    cmk = await waffle.loadFixture(fixture);
    [wallet, walletTo] = await ethers.getSigners();
  });

  it('should assign initial balance', async () => {
    expect(await cmk.balanceOf(wallet.address)).to.equal(BigNumber.from(10).pow(18).mul(100000000));
  });

  it('should add amount to destination account on transfer', async () => {
    await cmk.transfer(walletTo.address, 7);
    expect(await cmk.balanceOf(walletTo.address)).to.equal(7);
  });

  it('should emit transfer event', async () => {
    await expect(cmk.transfer(walletTo.address, 7))
      .to.emit(cmk, 'Transfer')
      .withArgs(wallet.address, walletTo.address, 7);
  });

  it('can not transfer above the amount', async () => {
    await expect(cmk.transfer(walletTo.address, BigNumber.from(10).pow(18).mul(100000000).add(1))).to.be.reverted;
  });

  it('can not transfer from empty account', async () => {
    const tokenFromOtherWallet = cmk.connect(walletTo);
    await expect(tokenFromOtherWallet.transfer(wallet.address, 1)).to.be.reverted;
  });

  it('can not transfer when paused', async () => {
    await cmk.pause();
    await expect(cmk.transfer(walletTo.address, 1)).to.be.reverted;
  });

  it('can transfer when unpaused', async () => {
    await cmk.pause();
    await expect(cmk.transfer(walletTo.address, 7)).to.be.reverted;
    await cmk.unpause();
    await cmk.transfer(walletTo.address, 7);
    expect(await cmk.balanceOf(walletTo.address)).to.equal(7);
  });
});

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { MockCMK } from '../typechain/MockCMK.d';

describe('Mock Credmark', () => {
  let cmk: MockCMK;
  let wallet: SignerWithAddress;
  let walletTo: SignerWithAddress;

  beforeEach(async () => {
    const factory = await ethers.getContractFactory('MockCMK');
    cmk = (await factory.deploy()) as MockCMK;
    [wallet, walletTo] = await ethers.getSigners();
  });

  it('Assigns initial balance', async () => {
    expect(await cmk.balanceOf(wallet.address)).to.equal(BigNumber.from(10).pow(18).mul(100000000));
  });

  it('Transfer adds amount to destination account', async () => {
    await cmk.transfer(walletTo.address, 7);
    expect(await cmk.balanceOf(walletTo.address)).to.equal(7);
  });

  it('Transfer emits event', async () => {
    await expect(cmk.transfer(walletTo.address, 7))
      .to.emit(cmk, 'Transfer')
      .withArgs(wallet.address, walletTo.address, 7);
  });

  it('Can not transfer above the amount', async () => {
    await expect(cmk.transfer(walletTo.address, BigNumber.from(10).pow(18).mul(100000000).add(1))).to.be.reverted;
  });

  it('Can not transfer from empty account', async () => {
    const tokenFromOtherWallet = cmk.connect(walletTo);
    await expect(tokenFromOtherWallet.transfer(wallet.address, 1)).to.be.reverted;
  });
});

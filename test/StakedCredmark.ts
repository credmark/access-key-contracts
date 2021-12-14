import { BigNumber } from '@ethersproject/bignumber';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { MockCMK, RewardsPool, StakedCredmark } from '../typechain';

describe('Staked Credmark', () => {
  let cmk: MockCMK;
  let stakedCmk: StakedCredmark;
  let wallet: SignerWithAddress;
  let secondWallet: SignerWithAddress;
  let thirdWallet: SignerWithAddress;
  let fourthWallet: SignerWithAddress;

  const sevenDays = 7 * 24 * 60 * 60;

  const fixture = async (): Promise<[MockCMK, StakedCredmark]> => {
    const mockCmkFactory = await ethers.getContractFactory('MockCMK');
    const _cmk = (await mockCmkFactory.deploy()) as MockCMK;

    const stakedCmkFactory = await ethers.getContractFactory('StakedCredmark');
    const _stakedCmk = (await stakedCmkFactory.deploy(
      _cmk.address
    )) as StakedCredmark;

    return [_cmk, _stakedCmk];
  };

  beforeEach(async () => {
    [cmk, stakedCmk] = await waffle.loadFixture(fixture);
    [wallet, secondWallet, thirdWallet, fourthWallet] =
      await ethers.getSigners();
  });

  describe('#cmkSupply', () => {
    it('should assign initial cmk supply', async () => {
      await cmk.transfer(stakedCmk.address, 1000);
      expect(await stakedCmk.cmkBalance()).to.equal(BigNumber.from(1000));
    });

    it('should increase xCMK value on CMK infusion', async () => {
      await cmk.approve(stakedCmk.address, 100);
      await stakedCmk.createShare(100);
      const beforeInfusionValue = await stakedCmk.sharesToCmk(1);
      await cmk.transfer(stakedCmk.address, 1000);
      const afterInfusionValue = await stakedCmk.sharesToCmk(1);

      expect(afterInfusionValue).to.be.gt(beforeInfusionValue);
    });
  });

  describe('#createShare', () => {
    it('should create share', async () => {
      await cmk.approve(stakedCmk.address, 100);
      await stakedCmk.createShare(100);
      expect(await stakedCmk.balanceOf(wallet.address)).to.equal(
        BigNumber.from(100)
      );
      expect(await stakedCmk.totalSupply()).to.equal(BigNumber.from(100));
    });

    it('should create share if rewards pool set but not started', async () => {
      const rewardsPoolFactory = await ethers.getContractFactory('RewardsPool');
      const rewardsPool = (await rewardsPoolFactory.deploy(
        cmk.address,
        stakedCmk.address
      )) as RewardsPool;
      await stakedCmk.setRewardsPool(rewardsPool.address);

      await cmk.approve(stakedCmk.address, 100);
      await stakedCmk.createShare(100);
      expect(await stakedCmk.balanceOf(wallet.address)).to.equal(
        BigNumber.from(100)
      );
      expect(await stakedCmk.totalSupply()).to.equal(BigNumber.from(100));
    });

    it('should not create share if low cmk balance', async () => {
      await cmk
        .connect(secondWallet)
        .approve(stakedCmk.connect(secondWallet).address, 100);
      await expect(stakedCmk.connect(secondWallet).createShare(100)).to.be
        .reverted;
    });
  });

  describe('#removeShare', () => {
    it('should remove share', async () => {
      await cmk.approve(stakedCmk.address, 100);
      await stakedCmk.createShare(100);

      const cmkBalance = await cmk.balanceOf(wallet.address);
      await stakedCmk.removeShare(100);
      expect(await stakedCmk.balanceOf(wallet.address)).to.equal(
        BigNumber.from(0)
      );
      expect(await stakedCmk.totalSupply()).to.equal(BigNumber.from(0));
      expect(await cmk.balanceOf(wallet.address)).to.be.equal(
        cmkBalance.add(100)
      );
    });

    it('should not remove share if low share balance', async () => {
      await expect(stakedCmk.removeShare(100)).to.be.reverted;
    });

    it('should issue rewards on removing share', async () => {
      const rewardsPoolFactory = await ethers.getContractFactory('RewardsPool');
      const rewardsPool = (await rewardsPoolFactory.deploy(
        cmk.address,
        stakedCmk.address
      )) as RewardsPool;
      await stakedCmk.setRewardsPool(rewardsPool.address);

      await cmk.transfer(rewardsPool.address, 10000000);

      const bn = await ethers.provider.getBlockNumber();
      const blk = await ethers.provider.getBlock(bn);
      const now = BigNumber.from(blk.timestamp);
      await rewardsPool.start(now.add(sevenDays).add(sevenDays));

      await cmk.approve(stakedCmk.address, 1000);
      await stakedCmk.createShare(1000);

      await ethers.provider.send('evm_increaseTime', [sevenDays]);
      await ethers.provider.send('evm_mine', []);

      const unissuedRewards = await rewardsPool.unissuedRewards();
      expect(unissuedRewards).to.be.closeTo(BigNumber.from(5000000), 100);

      await expect(stakedCmk.removeShare(1000)).to.emit(
        rewardsPool,
        'RewardsIssued'
      );
    });

    it('should issue rewards once every 8 hours', async () => {
      const rewardsPoolFactory = await ethers.getContractFactory('RewardsPool');
      const rewardsPool = (await rewardsPoolFactory.deploy(
        cmk.address,
        stakedCmk.address
      )) as RewardsPool;
      await stakedCmk.setRewardsPool(rewardsPool.address);

      await cmk.transfer(rewardsPool.address, 10000000);

      const bn = await ethers.provider.getBlockNumber();
      const blk = await ethers.provider.getBlock(bn);
      const now = BigNumber.from(blk.timestamp);
      await rewardsPool.start(now.add(sevenDays).add(sevenDays));

      await cmk.approve(stakedCmk.address, 1000);
      await stakedCmk.createShare(1000);

      await ethers.provider.send('evm_increaseTime', [sevenDays]);
      await ethers.provider.send('evm_mine', []);

      await expect(stakedCmk.removeShare(100)).to.emit(
        rewardsPool,
        'RewardsIssued'
      );
      await expect(stakedCmk.removeShare(100)).to.not.emit(
        rewardsPool,
        'RewardsIssued'
      );

      await ethers.provider.send('evm_increaseTime', [8 * 60 * 60]);
      await ethers.provider.send('evm_mine', []);
      await expect(stakedCmk.removeShare(100)).to.emit(
        rewardsPool,
        'RewardsIssued'
      );
    });
  });

  describe('#complexMath', () => {
    it('should have perfect CMK->xCMK and xCMK->CMK conversion for multiple wallets', async () => {
      const rewardsPoolFactory = await ethers.getContractFactory('RewardsPool');
      const rewardsPool = (await rewardsPoolFactory.deploy(
        cmk.address,
        stakedCmk.address
      )) as RewardsPool;
      await stakedCmk.setRewardsPool(rewardsPool.address);

      /**
       * Stage 1 starts
       * Rewards pool with 100_000 for 1 week
       * Since no rewards have been issued, CKM is equivalent to xCMK
       *
       * In this stage 4 wallets, creates some xCMK shares
       */
      await cmk.transfer(rewardsPool.address, 100_000);

      const bn = await ethers.provider.getBlockNumber();
      const blk = await ethers.provider.getBlock(bn);
      const now = BigNumber.from(blk.timestamp);
      await rewardsPool.start(now.add(BigNumber.from(sevenDays)));

      await cmk.transfer(secondWallet.address, 10_000_000);
      await cmk.transfer(thirdWallet.address, 10_000_000);
      await cmk.transfer(fourthWallet.address, 10_000_000);

      await cmk.approve(stakedCmk.address, 10_000_000);
      await cmk.connect(secondWallet).approve(stakedCmk.address, 10_000_000);
      await cmk.connect(thirdWallet).approve(stakedCmk.address, 10_000_000);
      await cmk.connect(fourthWallet).approve(stakedCmk.address, 10_000_000);

      // Before any issue of rewards, xCMK should be equivalent to cmk
      await stakedCmk.createShare(1_000_000);
      expect(await stakedCmk.balanceOf(wallet.address)).to.be.equal(
        BigNumber.from(1_000_000)
      );
      expect(await stakedCmk.cmkBalanceOf(wallet.address)).to.be.equal(
        BigNumber.from(1_000_000)
      );
      expect(await stakedCmk.sharesToCmk(1_000_000)).to.be.equal(
        BigNumber.from(1_000_000)
      );

      await stakedCmk.connect(secondWallet).createShare(500_000);
      expect(await stakedCmk.balanceOf(secondWallet.address)).to.be.equal(
        BigNumber.from(500_000)
      );
      expect(await stakedCmk.cmkBalanceOf(secondWallet.address)).to.be.equal(
        BigNumber.from(500_000)
      );
      expect(await stakedCmk.sharesToCmk(1_000_000)).to.be.equal(
        BigNumber.from(1_000_000)
      );

      await stakedCmk.connect(thirdWallet).createShare(400_000);
      expect(await stakedCmk.balanceOf(thirdWallet.address)).to.be.equal(
        BigNumber.from(400_000)
      );
      expect(await stakedCmk.cmkBalanceOf(thirdWallet.address)).to.be.equal(
        BigNumber.from(400_000)
      );
      expect(await stakedCmk.sharesToCmk(1_000_000)).to.be.equal(
        BigNumber.from(1_000_000)
      );

      await stakedCmk.connect(fourthWallet).createShare(100_000);
      expect(await stakedCmk.balanceOf(fourthWallet.address)).to.be.equal(
        BigNumber.from(100_000)
      );
      expect(await stakedCmk.cmkBalanceOf(fourthWallet.address)).to.be.equal(
        BigNumber.from(100_000)
      );
      expect(await stakedCmk.sharesToCmk(1_000_000)).to.be.equal(
        BigNumber.from(1_000_000)
      );

      /**
       * Stage 1 ends
       *
       * All of the 100_000 reward is issued after 7 days, changing total CMK to 2.1M
       * Now 2_100_000 CMK is equivalent to 2_000_000 xCMK, that makes xCMK to be 1.05x CMK
       */

      await ethers.provider.send('evm_increaseTime', [sevenDays]);
      await ethers.provider.send('evm_mine', []);

      await rewardsPool.issueRewards();
      expect(await stakedCmk.sharesToCmk(1_000_000)).to.be.equal(
        BigNumber.from(1_050_000)
      ); // 1M * 1.05 CMK

      // Checking if equivalent reward is distributed among wallets
      // walletReward = cmkRewarded * (xCMKBalance / xCMKTotalSupply)
      expect(await stakedCmk.cmkBalanceOf(wallet.address)).to.be.equal(
        BigNumber.from(1_000_000).add(50_000)
      ); // 100_000 * (1_000_000 / 2_000_000)
      expect(await stakedCmk.cmkBalanceOf(secondWallet.address)).to.be.equal(
        BigNumber.from(500_000).add(25_000)
      ); // 100_000 * (500_000 / 2_000_000)
      expect(await stakedCmk.cmkBalanceOf(thirdWallet.address)).to.be.equal(
        BigNumber.from(400_000).add(20_000)
      ); // 100_000 * (400_000 / 2_000_000)
      expect(await stakedCmk.cmkBalanceOf(fourthWallet.address)).to.be.equal(
        BigNumber.from(100_000).add(5_000)
      ); // 100_000 * (100_000 / 2_000_000)

      /**
       * Stage 2 starts
       * Rewards pool now reset with 1_000_000 for 1 week
       *
       * In this stage, 2 wallets removes some shares and 2 wallets adds some shares
       */
      const bn2 = await ethers.provider.getBlockNumber();
      const blk2 = await ethers.provider.getBlock(bn2);
      const now2 = BigNumber.from(blk2.timestamp);
      await rewardsPool.setEndTime(now2.add(BigNumber.from(sevenDays)));
      await cmk.transfer(rewardsPool.address, 1_000_000);

      // Wallet 1
      // Removing 0.5M shares returns 0.525M CMK
      await expect(stakedCmk.removeShare(500_000))
        .to.emit(cmk, 'Transfer')
        .withArgs(stakedCmk.address, wallet.address, BigNumber.from(525_000)); // 0.5M * 1.05 CMK
      expect(await stakedCmk.cmkBalanceOf(wallet.address)).to.be.equal(
        BigNumber.from(525_000)
      ); // 1.05M - 0.525M CMK
      expect(await stakedCmk.balanceOf(wallet.address)).to.be.equal(
        BigNumber.from(500_000)
      ); // 1M - 0.5M xCMK
      // Staked Credmark
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(
        BigNumber.from(1_575_000)
      ); // 2.1M - 0.525M CMK
      expect(await stakedCmk.totalSupply()).to.be.equal(
        BigNumber.from(1_500_000)
      ); // 2M - 0.5M xCMK

      // Wallet 2
      // Removing 0.4M shares returns 0.42M CMK
      await expect(stakedCmk.connect(secondWallet).removeShare(400_000))
        .to.emit(cmk, 'Transfer')
        .withArgs(
          stakedCmk.address,
          secondWallet.address,
          BigNumber.from(420_000)
        ); // 400k * 1.05 CMK
      expect(await stakedCmk.cmkBalanceOf(secondWallet.address)).to.be.equal(
        BigNumber.from(105_000)
      ); // 525k - 420k CMK
      expect(await stakedCmk.balanceOf(secondWallet.address)).to.be.equal(
        BigNumber.from(100_000)
      ); // 500k - 400k xCMK
      // Staked Credmark
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(
        BigNumber.from(1_155_000)
      ); // 1.575M - 0.42M CMK
      expect(await stakedCmk.totalSupply()).to.be.equal(
        BigNumber.from(1_100_000)
      ); // 1.5M - 0.4M xCMK

      // Wallet 3
      // Creating shares worth 630k CMK will mint 600k xCMK
      await expect(stakedCmk.connect(thirdWallet).createShare(630_000))
        .to.emit(stakedCmk, 'Transfer')
        .withArgs(
          ethers.constants.AddressZero,
          thirdWallet.address,
          BigNumber.from(600_000)
        ); // 630_000 / 1.05
      expect(await stakedCmk.cmkBalanceOf(thirdWallet.address)).to.be.equal(
        BigNumber.from(1_050_000)
      ); // 420k + 630k CMK
      expect(await stakedCmk.balanceOf(thirdWallet.address)).to.be.equal(
        BigNumber.from(1_000_000)
      ); // 400k + 600k xCMK
      // Staked Credmark
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(
        BigNumber.from(1_785_000)
      ); // 1.155M + 0.63M CMK
      expect(await stakedCmk.totalSupply()).to.be.equal(
        BigNumber.from(1_700_000)
      ); // 1.1M + 0.6M xCMK

      // Wallet 4
      // Creating shares worth 84k CMK will mint 80k xCMK
      await expect(stakedCmk.connect(fourthWallet).createShare(84_000))
        .to.emit(stakedCmk, 'Transfer')
        .withArgs(
          ethers.constants.AddressZero,
          fourthWallet.address,
          BigNumber.from(80_000)
        ); // 84_000 / 1.05
      expect(await stakedCmk.cmkBalanceOf(fourthWallet.address)).to.be.equal(
        BigNumber.from(189_000)
      ); // 105k + 84k CMK
      expect(await stakedCmk.balanceOf(fourthWallet.address)).to.be.equal(
        BigNumber.from(180_000)
      ); // 100k + 80k xCMK
      // Staked Credmark
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(
        BigNumber.from(1_869_000)
      ); // 1.785M + 0.084M CMK
      expect(await stakedCmk.totalSupply()).to.be.equal(
        BigNumber.from(1_780_000)
      ); // 1.7M + 0.08M xCMK

      /**
       * Stage 2 ends
       *
       * All of the 1_000_000 reward will be issued after 7 days, changing total cmk balance to 2_869_000
       * Now 2_869_000 CMK is equivalent to 1_780_000 xCMK, that makes xCMK to be ~1.61x CMK
       */

      await ethers.provider.send('evm_increaseTime', [sevenDays]);
      await ethers.provider.send('evm_mine', []);

      await rewardsPool.issueRewards();
      expect(await stakedCmk.sharesToCmk(1_000_000)).to.be.equal(
        BigNumber.from(1_611_797)
      ); // ~ 1M * 1.61 CMK

      // Checking if equivalent reward is distributed among wallets
      // walletReward = cmkRewarded * (xCMKBalance / xCMKTotalSupply)
      expect(await stakedCmk.cmkBalanceOf(wallet.address)).to.be.equal(
        BigNumber.from(525_000).add(280_898)
      ); // 1_000_000 * (500_000 / 1_780_000)
      expect(await stakedCmk.cmkBalanceOf(secondWallet.address)).to.be.equal(
        BigNumber.from(105_000).add(56_179)
      ); // 1_000_000 * (100_000 / 1_780_000)
      expect(await stakedCmk.cmkBalanceOf(thirdWallet.address)).to.be.equal(
        BigNumber.from(1_050_000).add(561_797)
      ); // 1_000_000 * (1_000_000 / 1_780_000)
      expect(await stakedCmk.cmkBalanceOf(fourthWallet.address)).to.be.equal(
        BigNumber.from(189_000).add(101_123)
      ); // 1_000_000 * (180_000 / 1_780_000)

      /**
       * Stage 3 starts
       * Not resetting rewards pool anymore
       * In this stage, 4 wallets will remove their remaining shares
       */

      // Wallet 1
      // Removing all 500_000 shares
      await expect(stakedCmk.removeShare(500_000))
        .to.emit(cmk, 'Transfer')
        .withArgs(stakedCmk.address, wallet.address, BigNumber.from(805_898)); // 500_000 * (2_869_000 / 1_780_000)
      expect(await stakedCmk.cmkBalanceOf(wallet.address)).to.be.equal(
        BigNumber.from(0)
      );
      expect(await stakedCmk.balanceOf(wallet.address)).to.be.equal(
        BigNumber.from(0)
      );
      // Staked Credmark
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(
        BigNumber.from(2_063_102)
      ); // 2_869_000 - 805_898 CMK
      expect(await stakedCmk.totalSupply()).to.be.equal(
        BigNumber.from(1_280_000)
      ); // 1.78M - 0.5M xCMK

      // Wallet 2
      // Removing all 500_000 shares
      await expect(stakedCmk.connect(secondWallet).removeShare(100_000))
        .to.emit(cmk, 'Transfer')
        .withArgs(
          stakedCmk.address,
          secondWallet.address,
          BigNumber.from(161_179)
        ); // 100_000 * (2_063_102 / 1_280_000)
      expect(await stakedCmk.cmkBalanceOf(secondWallet.address)).to.be.equal(
        BigNumber.from(0)
      );
      expect(await stakedCmk.balanceOf(secondWallet.address)).to.be.equal(
        BigNumber.from(0)
      );
      // Staked Credmark
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(
        BigNumber.from(1_901_923)
      ); // 2_063_102 - 161_179 CMK
      expect(await stakedCmk.totalSupply()).to.be.equal(
        BigNumber.from(1_180_000)
      ); // 1.28M - 0.1M xCMK

      // Wallet 3
      // Removing all 1_000_000 shares
      await expect(stakedCmk.connect(thirdWallet).removeShare(1_000_000))
        .to.emit(cmk, 'Transfer')
        .withArgs(
          stakedCmk.address,
          thirdWallet.address,
          BigNumber.from(1_611_799)
        ); // 1_000_000 * (1_901_923 / 1_180_000)
      expect(await stakedCmk.cmkBalanceOf(thirdWallet.address)).to.be.equal(
        BigNumber.from(0)
      );
      expect(await stakedCmk.balanceOf(thirdWallet.address)).to.be.equal(
        BigNumber.from(0)
      );
      // Staked Credmark
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(
        BigNumber.from(290_124)
      ); // 1_901_923 - 1_611_799 CMK
      expect(await stakedCmk.totalSupply()).to.be.equal(
        BigNumber.from(180_000)
      ); // 1.18M - 1M xCMK

      // Wallet 4
      // Removing all 1_000_000 shares
      await expect(stakedCmk.connect(fourthWallet).removeShare(180_000))
        .to.emit(cmk, 'Transfer')
        .withArgs(
          stakedCmk.address,
          fourthWallet.address,
          BigNumber.from(290_124)
        ); // 1_000_000 * (1_901_923 / 1_180_000)
      expect(await stakedCmk.cmkBalanceOf(fourthWallet.address)).to.be.equal(
        BigNumber.from(0)
      );
      expect(await stakedCmk.balanceOf(fourthWallet.address)).to.be.equal(
        BigNumber.from(0)
      );
      // Staked Credmark
      expect(await cmk.balanceOf(stakedCmk.address)).to.be.equal(
        BigNumber.from(0)
      ); // 290_124 - 290_124 CMK
      expect(await stakedCmk.totalSupply()).to.be.equal(BigNumber.from(0)); // 0.18M - 0.18M xCMK

      /**
       * Stage 3 ends
       * Staked CMK contract is now empty
       */
    });
  });
});

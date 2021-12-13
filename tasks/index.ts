import { task } from 'hardhat/config';
import { ERC20, RewardsPool, StakedCredmark } from '../typechain';

task('x-cmk:deploy', 'Deploy StakedCredmark')
  .addParam('cmk', 'CMK Token Address')
  .setAction(async function ({ cmk }, { ethers }) {
    const cmkContract = (await ethers.getContractAt('ERC20', cmk)) as ERC20;
    if ((await cmkContract.symbol()) !== 'CMK') {
      throw new Error('Invalid CMK contract address');
    }

    const stakedCmkFactory = await ethers.getContractFactory('StakedCredmark');
    const stakedCmk = (await stakedCmkFactory.deploy(
      cmkContract.address
    )) as StakedCredmark;

    console.log('Staked CMK deployed at', stakedCmk.address);
  });

task('x-cmk:set-rewards-pool', 'Set rewards pool')
  .addParam('xCmk', 'Staked CMK Token Address')
  .addParam('rewardsPool', 'Rewards Pool Address')
  .setAction(async function (
    { xCmk, rewardsPool }: { xCmk: string; rewardsPool: string },
    { ethers }
  ) {
    const xCmkContract = (await ethers.getContractAt(
      'StakedCredmark',
      xCmk
    )) as StakedCredmark;

    if ((await xCmkContract.symbol()) !== 'xCMK') {
      throw new Error('Invalid Staked CMK contract address');
    }

    await xCmkContract.setRewardsPool(rewardsPool);
  });

task('rewards-pool:deploy', 'Deploy RewardsPool')
  .addParam('cmk', 'CMK Token Address')
  .addParam('xCmk', 'Staked CMK Token Address')
  .setAction(async function (
    { cmk, xCmk }: { cmk: string; xCmk: string },
    { ethers }
  ) {
    const cmkContract = (await ethers.getContractAt('ERC20', cmk)) as ERC20;
    if ((await cmkContract.symbol()) !== 'CMK') {
      throw new Error('Invalid CMK contract address');
    }

    const xCmkContract = (await ethers.getContractAt('ERC20', xCmk)) as ERC20;
    if ((await xCmkContract.symbol()) !== 'xCMK') {
      throw new Error('Invalid Staked CMK contract address');
    }

    const rewardsPoolFactory = await ethers.getContractFactory('RewardsPool');
    const rewardsPool = (await rewardsPoolFactory.deploy(
      cmkContract.address,
      xCmkContract.address
    )) as RewardsPool;

    console.log('Rewards Pool deployed at', rewardsPool.address);
  });

task('rewards-pool:start', 'Start rewards pool')
  .addParam('rewardsPool', 'Rewards Pool Address')
  .addParam('endTime', 'End time (unix epoch)')
  .setAction(async function (
    { rewardsPool, endTime }: { rewardsPool: string; endTime: string },
    { ethers }
  ) {
    const rewardsPoolContract = (await ethers.getContractAt(
      'RewardsPool',
      rewardsPool
    )) as RewardsPool;

    await rewardsPoolContract.start(endTime);
  });

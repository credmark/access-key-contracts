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

task('rewards-pool:unissued-rewards', 'Get unissued rewards')
  .addParam('rewardsPool', 'Rewards Pool Address')
  .setAction(async function (
    { rewardsPool }: { rewardsPool: string },
    { ethers }
  ) {
    const rewardsPoolContract = (await ethers.getContractAt(
      'RewardsPool',
      rewardsPool
    )) as RewardsPool;

    const unissuedRewards = await rewardsPoolContract.unissuedRewards();
    console.log(unissuedRewards.toString());
  });

task('rewards-pool:issue-rewards', 'Issue rewards')
  .addParam('rewardsPool', 'Rewards Pool Address')
  .setAction(async function (
    { rewardsPool }: { rewardsPool: string },
    { ethers }
  ) {
    const rewardsPoolContract = (await ethers.getContractAt(
      'RewardsPool',
      rewardsPool
    )) as RewardsPool;

    const tx = await rewardsPoolContract.issueRewards();

    console.log('Rewards issued transaction: ', tx.hash);
  });

task('rewards-pool:get-end-time', 'Get end Time')
  .addParam('rewardsPool', 'Rewards Pool Address')
  .setAction(async function (
    { rewardsPool }: { rewardsPool: string },
    { ethers }
  ) {
    const rewardsPoolContract = (await ethers.getContractAt(
      'RewardsPool',
      rewardsPool
    )) as RewardsPool;

    const endTimeUnix = await rewardsPoolContract.endTime();
    const endTime = new Date(endTimeUnix.toNumber() * 1000);
    console.log(endTime);
  });

task('rewards-pool:set-end-time', 'Set end time')
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

    const tx = await rewardsPoolContract.setEndTime(endTime);
    console.log('End time set transaction: ', tx.hash);

    await tx.wait();

    const newEndTimeUnix = await rewardsPoolContract.endTime();
    const newEndTime = new Date(newEndTimeUnix.toNumber() * 1000);
    console.log('New end time is', newEndTime);
  });

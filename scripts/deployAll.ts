import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import {
  CredmarkAccessKey,
  CredmarkAccessProvider,
  MockCMK,
  RewardsPool,
  StakedCredmark,
} from '../typechain';

const DECIMALS = BigNumber.from(10).pow(18);

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const [owner] = await ethers.getSigners();
  const mockCmkFactory = await ethers.getContractFactory('MockCMK');
  const mockCmk = (await mockCmkFactory.deploy()) as MockCMK;

  console.log('Mock CMK deployed');

  const stakedCmkFactory = await ethers.getContractFactory('StakedCredmark');
  const stakedCmk = (await stakedCmkFactory.deploy(
    mockCmk.address
  )) as StakedCredmark;

  console.log('Staked CMK deployed');

  const rewardsPoolFactory = await ethers.getContractFactory('RewardsPool');
  const rewardsPool = (await rewardsPoolFactory.deploy(
    mockCmk.address,
    stakedCmk.address
  )) as RewardsPool;

  console.log('Rewards Pool deployed');

  await mockCmk.transfer(
    rewardsPool.address,
    BigNumber.from(1000000).mul(DECIMALS)
  );
  await rewardsPool.start(Math.round(Date.now() / 1000) + 365 * 24 * 3600); // 1 year from now

  console.log('Rewards Pool started');

  await stakedCmk.setRewardsPool(rewardsPool.address);

  const credmarkAccessKeyFactory = await ethers.getContractFactory(
    'CredmarkAccessKey'
  );
  const dailyFee = BigNumber.from(10); // CMK
  const feePerSec = dailyFee.mul(DECIMALS).div(24 * 3600);
  const credmarkAccessKey = (await credmarkAccessKeyFactory.deploy(
    stakedCmk.address,
    mockCmk.address,
    mockCmk.address,
    feePerSec,
    500, // 5%
    5000 // 50%
  )) as CredmarkAccessKey;

  console.log('Access Key deployed');

  const credmarkAccessProviderFactory = await ethers.getContractFactory(
    'CredmarkAccessProvider'
  );
  const credmarkAccessProvider = (await credmarkAccessProviderFactory.deploy(
    credmarkAccessKey.address
  )) as CredmarkAccessProvider;

  console.log('Access Provider deployed');

  console.log('Chain ID:', chainId);

  console.table([
    {
      contract: 'Owner',
      address: owner.address,
      cmk: (await mockCmk.balanceOf(owner.address)).toString(),
    },
    {
      contract: 'Mock CMK',
      address: mockCmk.address,
      cmk: (await mockCmk.balanceOf(mockCmk.address)).toString(),
    },
    {
      contract: 'Staked CMK',
      address: stakedCmk.address,
      cmk: (await mockCmk.balanceOf(stakedCmk.address)).toString(),
    },
    {
      contract: 'Rewards Pool',
      address: rewardsPool.address,
      cmk: (await mockCmk.balanceOf(rewardsPool.address)).toString(),
    },
    {
      contract: 'Access Key',
      address: credmarkAccessKey.address,
      cmk: (await mockCmk.balanceOf(credmarkAccessKey.address)).toString(),
    },
    {
      contract: 'Access Provider',
      address: credmarkAccessProvider.address,
      cmk: (await mockCmk.balanceOf(credmarkAccessProvider.address)).toString(),
    },
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

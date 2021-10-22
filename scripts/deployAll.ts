import { ethers } from "hardhat";
import { CredmarkAccessKey } from "../typechain/CredmarkAccessKey";
import { CredmarkAccessProvider } from "../typechain/CredmarkAccessProvider";
import { MockCMK } from "../typechain/MockCMK";
import { RewardsPool } from "../typechain/RewardsPool";
import { StakedCredmark } from "../typechain/StakedCredmark";

async function main() {
  const mockCmkFactory = await ethers.getContractFactory("MockCMK");
  const mockCmk = (await mockCmkFactory.deploy()) as MockCMK;

  const stakedCmkFactory = await ethers.getContractFactory("StakedCredmark");
  const stakedCmk = (await stakedCmkFactory.deploy(mockCmk.address)) as StakedCredmark;

  const rewardsPoolFactory = await ethers.getContractFactory("RewardsPool");
  const rewardsPool = (await rewardsPoolFactory.deploy(mockCmk.address, stakedCmk.address)) as RewardsPool;

  await stakedCmk.setRewardsPool(rewardsPool.address);

  const credmarkAccessKeyFactory = await ethers.getContractFactory("CredmarkAccessKey");
  const credmarkAccessKey = (await credmarkAccessKeyFactory.deploy(
    stakedCmk.address,
    mockCmk.address,
    mockCmk.address,
    100
  )) as CredmarkAccessKey;

  const credmarkAccessProviderFactory = await ethers.getContractFactory("CredmarkAccessProvider");
  const credmarkAccessProvider = (await credmarkAccessProviderFactory.deploy(
    credmarkAccessKey.address
  )) as CredmarkAccessProvider;

  console.log("                Mock CMK:", mockCmk.address);
  console.log("              Staked CMK:", stakedCmk.address);
  console.log("            Rewards Pool:", rewardsPool.address);
  console.log("     Credmark Access Key:", credmarkAccessKey.address);
  console.log("Credmark Access Provider:", credmarkAccessProvider.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

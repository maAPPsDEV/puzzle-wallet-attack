import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";

import { Hacker } from "../typechain";

const deployHacker: DeployFunction = async (hre) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { hacker } = await getNamedAccounts();

  await deploy("Hacker", {
    from: hacker,
    args: [],
    log: true,
  });

  const hackerContract: Hacker = await ethers.getContract("Hacker");
};

export default deployHacker;
deployHacker.tags = ["Hacker"];
deployHacker.dependencies = [];

import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";

import { PuzzleWalletFactory } from "../typechain";

const deployPuzzleWalletFactory: DeployFunction = async (hre) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("PuzzleWalletFactory", {
    from: deployer,
    args: [],
    log: true,
  });

  const factory: PuzzleWalletFactory = await ethers.getContract(
    "PuzzleWalletFactory"
  );
};

export default deployPuzzleWalletFactory;
deployPuzzleWalletFactory.tags = ["PuzzleWalletFactory"];
deployPuzzleWalletFactory.dependencies = [];

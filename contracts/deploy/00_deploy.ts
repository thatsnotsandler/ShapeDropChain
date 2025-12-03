import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  const deployed = await deploy("ShapeDropChain", {
    from: deployer,
    log: true
  });

  log(`ShapeDropChain deployed at ${deployed.address}`);
};

export default func;
func.tags = ["ShapeDropChain"];



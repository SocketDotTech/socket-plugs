
import { Contract, ethers } from "ethers";
import fs from "fs";
import {  run, } from "hardhat";
import path from "path";
import { DeployParams, deployContractWithArgs, getOrDeploy } from "../helpers/utils";
import { CONTRACTS } from "../helpers/types";
const hre = require("hardhat");
const CONTRACT_NAME = "DeployMintableTokenStack";

export const main = async () => {
  try {
    const { deployments, getNamedAccounts, network } = hre;
    const provider = new ethers.providers.JsonRpcProvider(network.config.url);
    const key = process.env.PRIVATE_KEY;
    if (!key) {
        throw new Error("No private key found");
    }
    const signer = new ethers.Wallet(key, provider);
    const deployer = await signer.getAddress();
    const owner = deployer;
    const socketAddress = '0xe37D028a77B4e6fCb05FC75EBa845752cD62A0AA';
    console.log(`deployer: ${deployer}`);
    console.log(`owner: ${owner}`);
    console.log(`socketAddress: ${socketAddress}`);

    const deploymentStack = await deployContractWithArgs(
        CONTRACTS.DeployMintableTokenStack,
        [socketAddress],
        signer,
      );
  
    console.log(`✅ ${CONTRACT_NAME} deployed at ${deploymentStack.address}`);
    await run("verify:verify", {
      address: deploymentStack.address,
      constructorArguments: [socketAddress],
    });
    return {
      success: true,
      address: deploymentStack.address,
    };
  } catch (error) {
    console.log(`Error in deploying ${CONTRACT_NAME}`, error);
    return {
      success: false,
    };
  }
};

main()
  .then(() => {
    console.log(`✅ finished running the deployment of ${CONTRACT_NAME}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

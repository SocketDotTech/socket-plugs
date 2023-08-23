
import { Contract } from "ethers";
import fs from "fs";
import {  run, ethers } from "hardhat";
import path from "path";
import { DeployParams, deployContractWithArgs, getOrDeploy } from "../helpers/utils";
import { CONTRACTS } from "../helpers/types";
import Create3FactoryAbi from './create3/Create3Factory.json';
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
    const socketAddress = '0x718826B533DF29C30f2d3f30E585e405eeF22784';
    const exchangeAddress = '0x9fAAbacBe90da57C672fe23A275Efdf7366482b8';
    const create3Address = '0xF2B6544589ab65E731883A0244cbEFe5735322c5';
    const chainSlug = 80001;
    console.log(`deployer: ${deployer}`);
    console.log(`owner: ${owner}`);
    console.log(`socketAddress: ${socketAddress}`);
    const factory = await ethers.getContractFactory(`DeployMintableTokenStack`);

    const create3FactoryContract = await new ethers.Contract(create3Address, Create3FactoryAbi, signer);
    // find creation code for the contract
    const creationCode = factory.bytecode;
    // add arguments to the creation code
    const creationCodeWithArgs = creationCode + ethers.utils.defaultAbiCoder.encode(['address', 'address', 'uint32', 'address', 'address'], [owner, socketAddress, chainSlug, exchangeAddress, create3Address]).slice(2);
    // find salt for the contract
    const salt = ethers.utils.formatBytes32String("S"+CONTRACT_NAME);
    const tx = await create3FactoryContract.deploy(salt, creationCodeWithArgs );
    const receipt = await tx.wait();
    const deployedAddress = await create3FactoryContract.getDeployed(owner, salt);

    console.log(`✅ ${CONTRACT_NAME} deployed at ${deployedAddress}`);
    return {
      success: true,
      address: deployedAddress,
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

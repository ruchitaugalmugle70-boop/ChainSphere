import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();
  const chainSphere = await viem.deployContract("ChainSphere");
  console.log(`ChainSphere Smart Contract deployed to: ${chainSphere.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


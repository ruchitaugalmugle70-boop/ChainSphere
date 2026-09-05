import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ChainSphereModule", (m) => {
  const chainSphere = m.contract("ChainSphere");

  return { chainSphere };
});

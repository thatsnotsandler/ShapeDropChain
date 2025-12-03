import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { ShapeDropChain, ShapeDropChain__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("ShapeDropChain", function () {
  let contract: ShapeDropChain;
  let addr: string;
  let signer: HardhatEthersSigner;

  beforeEach(async () => {
    if (!fhevm.isMock) {
      // Only run on FHEVM Hardhat node
      console.warn("Skipping tests: not running on FHEVM Hardhat mock node");
      return;
    }

    const [s] = await ethers.getSigners();
    signer = s;
    addr = await s.getAddress();

    const factory = (await ethers.getContractFactory("ShapeDropChain")) as ShapeDropChain__factory;
    contract = (await factory.deploy()) as ShapeDropChain;
    await contract.waitForDeployment();
  });

  it("submitScore should update best record", async function () {
    if (!fhevm.isMock) this.skip();

    await (await contract.submitScore(1000, 10, 1)).wait();
    const r = await contract.getUserRecord(addr, 1);
    expect(r.score).to.eq(1000n);
    expect(r.lines).to.eq(10n);

    // Not updated when lower
    await (await contract.submitScore(900, 8, 1)).wait();
    const r2 = await contract.getUserRecord(addr, 1);
    expect(r2.score).to.eq(1000n);
  });

  it("encrypted mirror can be stored and user-decrypted", async function () {
    if (!fhevm.isMock) this.skip();

    // submit a public score first
    await (await contract.submitScore(1200, 12, 2)).wait();

    const contractAddress = await contract.getAddress();
    // Build 2 encrypted inputs (score and lines)
    const encScore = await fhevm
      .createEncryptedInput(contractAddress, signer.address)
      .add32(1200)
      .encrypt();

    const encLines = await fhevm
      .createEncryptedInput(contractAddress, signer.address)
      .add32(12)
      .encrypt();

    await (await contract.submitScoreEnc(
      encScore.handles[0],
      encScore.inputProof,
      encLines.handles[0],
      encLines.inputProof,
      2
    )).wait();

    const [scoreEnc, linesEnc] = await contract.getUserRecordEnc(signer.address, 2);
    const scoreClear = await fhevm.userDecryptEuint(FhevmType.euint32, scoreEnc, contractAddress, signer);
    const linesClear = await fhevm.userDecryptEuint(FhevmType.euint32, linesEnc, contractAddress, signer);
    expect(scoreClear).to.eq(1200);
    expect(linesClear).to.eq(12);
  });
});



import { ethers } from "ethers";
import { FhevmInstance } from "./internal/fhevm";

function nowTs() { return Math.floor(Date.now() / 1000); }

export type FhevmDecryptionSignature = {
  publicKey: string;
  privateKey: string;
  signature: string;
  contractAddresses: `0x${string}`[];
  userAddress: `0x${string}`;
  startTimestamp: number;
  durationDays: number;
  eip712: any;
};

export async function buildOrLoadDecryptionSignature(
  instance: FhevmInstance,
  signer: ethers.Signer,
  contracts: `0x${string}`[],
  cacheKey?: string
): Promise<FhevmDecryptionSignature | null> {
  const user = (await signer.getAddress()) as `0x${string}`;
  const key = cacheKey ?? `fhevm.decryption.${user}.${contracts.join(",")}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as FhevmDecryptionSignature;
      if (nowTs() < parsed.startTimestamp + parsed.durationDays * 24 * 60 * 60) {
        return parsed;
      }
    }
  } catch {}

  const { publicKey, privateKey } = instance.generateKeypair();
  const startTimestamp = nowTs();
  const durationDays = 365;
  const eip712 = instance.createEIP712(publicKey, contracts, startTimestamp, durationDays);

  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message
  );

  const out: FhevmDecryptionSignature = {
    publicKey,
    privateKey,
    signature,
    contractAddresses: contracts,
    userAddress: user,
    startTimestamp,
    durationDays,
    eip712
  };
  try { localStorage.setItem(key, JSON.stringify(out)); } catch {}
  return out;
}

// Always build a NEW decryption signature (no cache, no persistence).
export async function buildFreshDecryptionSignature(
  instance: FhevmInstance,
  signer: ethers.Signer,
  contracts: `0x${string}`[]
): Promise<FhevmDecryptionSignature | null> {
  try {
    const { publicKey, privateKey } = instance.generateKeypair();
    const user = (await signer.getAddress()) as `0x${string}`;
    const startTimestamp = Math.floor(Date.now() / 1000);
    const durationDays = 365;
    const eip712 = instance.createEIP712(publicKey, contracts, startTimestamp, durationDays);
    const signature = await signer.signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message
    );
    return {
      publicKey,
      privateKey,
      signature,
      contractAddresses: contracts,
      userAddress: user,
      startTimestamp,
      durationDays,
      eip712
    };
  } catch {
    return null;
  }
}



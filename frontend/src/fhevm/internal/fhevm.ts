import { SDK_CDN_URL, SDK_LOCAL_URL, LOCAL_METADATA_URL, LOCAL_RPC_URL_DEFAULT } from "./constants";
import { RelayerSDKLoader } from "./RelayerSDKLoader";
import { ethers } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";

export type FhevmInstance = {
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEncryptedInput: (contract: string, user: string) => {
    add32: (v: number) => void;
    encrypt: () => Promise<{ handles: string[]; inputProof: string }>;
  };
  createEIP712: (
    publicKey: string,
    contracts: string[],
    startTimestamp: number,
    durationDays: number
  ) => { domain: any; types: any; message: any; primaryType: string };
  userDecrypt: (
    list: { handle: string; contractAddress: string }[],
    privateKey: string,
    publicKey: string,
    signature: string,
    contracts: string[],
    user: string,
    startTimestamp: number,
    durationDays: number
  ) => Promise<Record<string, number>>;
};

export async function createFhevmInstance(provider: ethers.Provider | string): Promise<FhevmInstance> {
  // Detect network
  let chainId = 0;
  let rpcUrl = LOCAL_RPC_URL_DEFAULT;
  if (typeof provider === "string") {
    const p = new ethers.JsonRpcProvider(provider);
    const n = await p.getNetwork();
    chainId = Number(n.chainId);
    rpcUrl = provider;
  } else {
    const n = await (provider as ethers.Provider).getNetwork();
    chainId = Number(n.chainId);
    if (provider instanceof ethers.BrowserProvider) {
      rpcUrl = LOCAL_RPC_URL_DEFAULT;
    }
  }

  // Mock mode for local hardhat FHEVM node
  if (chainId === 31337) {
    // Load base metadata from local file first (as fallback/default)
    let localMeta: any = null;
    try {
      localMeta = await fetch(LOCAL_METADATA_URL).then(r => r.json());
      console.log("[FHEVM] Loaded local metadata:", localMeta);
    } catch (err) {
      console.warn("[FHEVM] Failed to load local metadata:", err);
    }

    // Try to get metadata from RPC
    let rpcMeta: any = null;
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "fhevm_relayer_metadata",
          params: []
        })
      }).then(r => r.json());
      rpcMeta = res?.result ?? null;
      console.log("[FHEVM] RPC metadata:", rpcMeta);
    } catch (err) {
      console.warn("[FHEVM] Failed to get RPC metadata:", err);
    }

    // Merge: prefer RPC values, fallback to local
    const meta = {
      ACLAddress: rpcMeta?.ACLAddress || localMeta?.ACLAddress,
      InputVerifierAddress: rpcMeta?.InputVerifierAddress || localMeta?.InputVerifierAddress,
      KMSVerifierAddress: rpcMeta?.KMSVerifierAddress || localMeta?.KMSVerifierAddress
    };

    console.log("[FHEVM] Final merged metadata:", meta);

    if (!meta.InputVerifierAddress || !meta.ACLAddress || !meta.KMSVerifierAddress) {
      throw new Error("FHEVM metadata missing for local mock (check public/fhevm-relayer-metadata.json)");
    }

    // Build required 'properties' (API change in mock-utils 0.3.0-1)
    // We try to read the InputVerifier EIP712 domain from the chain to discover:
    // - verifyingContract for input verification
    // - gateway chain id
    let verifyingContractAddressInputVerification: `0x${string}`;
    let gatewayChainId: number;
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const inputVerifier = new ethers.Contract(
        meta.InputVerifierAddress as `0x${string}`,
        [
          "function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"
        ],
        provider
      );
      const domain = await inputVerifier.eip712Domain();
      // domain[4] = verifyingContract, domain[3] = chainId
      verifyingContractAddressInputVerification = domain[4] as `0x${string}`;
      gatewayChainId = Number(domain[3]);
    } catch {
      // Fallback defaults (compatible with local mock node)
      verifyingContractAddressInputVerification = "0x812b06e1CDCE800494b79fFE4f925A504a9A9810" as `0x${string}`;
      gatewayChainId = 55815;
    }

    // Use provider-based signature compatible with @fhevm/mock-utils 0.3.0-1
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const instance = await MockFhevmInstance.create(
      provider,
      provider,
      {
        aclContractAddress: meta.ACLAddress as `0x${string}`,
        chainId,
        gatewayChainId,
        inputVerifierContractAddress: meta.InputVerifierAddress as `0x${string}`,
        kmsContractAddress: meta.KMSVerifierAddress as `0x${string}`,
        verifyingContractAddressDecryption:
          "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
        verifyingContractAddressInputVerification,
      },
      {
        inputVerifierProperties: {},
        kmsVerifierProperties: {},
      }
    );
    return instance as unknown as FhevmInstance;
  }

  // Real relayer SDK in browser – load UMD via CDN with local fallback
  const loaderCdn = new RelayerSDKLoader({ url: SDK_CDN_URL });
  try {
    await loaderCdn.load();
  } catch {
    const loaderLocal = new RelayerSDKLoader({ url: SDK_LOCAL_URL });
    await loaderLocal.load();
  }

  // @ts-ignore
  const sdk = window.relayerSDK;
  if (!sdk || typeof sdk.createInstance !== "function") {
    throw new Error("Relayer SDK unavailable");
  }

  if (!sdk.__initialized__) {
    await sdk.initSDK();
  }

  const config = {
    ...sdk.SepoliaConfig
  };
  const instance = await sdk.createInstance(config);
  return instance as FhevmInstance;
}



import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ethers } from "ethers";

type WalletContextType = {
  address: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
  connect: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const p = new ethers.BrowserProvider(eth);
    setProvider(p);
    p.send("eth_accounts", []).then(async (accounts) => {
      if (accounts && accounts.length > 0) {
        setAddress(ethers.getAddress(accounts[0]));
        const s = await p.getSigner();
        setSigner(s);
      }
    });
    p.getNetwork().then((n) => setChainId(Number(n.chainId)));
    const onAccounts = (accs: string[]) => setAddress(accs.length ? ethers.getAddress(accs[0]) : null);
    const onChain = (hex: string) => setChainId(parseInt(hex, 16));
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const p = new ethers.BrowserProvider(eth);
    const accs = await p.send("eth_requestAccounts", []);
    setAddress(ethers.getAddress(accs[0]));
    const s = await p.getSigner();
    setSigner(s);
    const n = await p.getNetwork();
    setChainId(Number(n.chainId));
    setProvider(p);
  };

  const isConnected = Boolean(address && provider);

  const value: WalletContextType = {
    address,
    chainId,
    provider,
    signer,
    isConnected,
    connect
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const Wallet = () => {
  const w = useWallet();
  return (
    <button className="btn-neon" onClick={() => w.connect()}>
      {w.address ? `${w.address.slice(0, 6)}...${w.address.slice(-4)}` : "Connect Wallet"}
    </button>
  );
};



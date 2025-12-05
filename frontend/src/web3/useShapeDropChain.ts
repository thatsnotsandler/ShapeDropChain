import { useMemo } from "react";
import { ethers } from "ethers";
import { useWallet } from "../ui/Wallet";
import { ShapeDropChainABI } from "../abi/ShapeDropChainABI";
import { ShapeDropChainAddresses } from "../abi/ShapeDropChainAddresses";
import { createFhevmInstance } from "../fhevm/internal/fhevm";
import { buildOrLoadDecryptionSignature, buildFreshDecryptionSignature } from "../fhevm/FhevmDecryptionSignature";

export const useShapeDropChain = () => {
  const w = useWallet();

  const address = useMemo(() => {
    if (!w.chainId) return undefined;
    const info = ShapeDropChainAddresses[String(w.chainId)];
    return info?.address;
  }, [w.chainId]);

  const read = async () => {
    if (!w.provider || !address) return null;
    return new ethers.Contract(address, ShapeDropChainABI, w.provider);
  };
  const write = async () => {
    if (!w.signer || !address) return null;
    return new ethers.Contract(address, ShapeDropChainABI, w.signer);
  };

  return {
    address,
    async submitScore(score: number, lines: number, difficulty: number) {
      try {
        const c = await write();
        if (!c) return false;
        const tx = await c.submitScore(score, lines, difficulty);
        await tx.wait();
        return true;
      } catch {
        return false;
      }
    },
    async submitScoreEnc(score: number, lines: number, difficulty: number) {
      try {
        if (!w.signer || !w.provider || !address) return false;
        const instance = await createFhevmInstance(w.provider);
        const user = await w.signer.getAddress();
        const inputScore = instance.createEncryptedInput(address, user);
        inputScore.add32(score);
        const encScore = await inputScore.encrypt();
        const inputLines = instance.createEncryptedInput(address, user);
        inputLines.add32(lines);
        const encLines = await inputLines.encrypt();

        const c = await write();
        if (!c) return false;
        const tx = await c.submitScoreEnc(
          encScore.handles[0],
          encScore.inputProof,
          encLines.handles[0],
          encLines.inputProof,
          difficulty
        );
        await tx.wait();
        return true;
      } catch (e) {
        console.error("[submitScoreEnc] failed", e);
        return false;
      }
    },
    async getAllRecords(difficulty: number) {
      const c = await read();
      if (!c) return [];
      const res = await c.getAllRecords(difficulty);
      return (res as any[]).map((r) => ({
        user: r.user as string,
        score: r.score as bigint,
        lines: r.lines as bigint,
        difficulty: Number(r.difficulty),
        timestamp: r.timestamp as bigint
      }));
    },
    async getAllEncRecords(difficulty: number) {
      const c = await read();
      if (!c) return [];
      // returns tuple: (user, scoreEnc, linesEnc, timestamp)[]
      const res = await c.getAllEncRecords(difficulty);
      // ethers flattens structs array to array of objects with named props
      return (res as any[]).map((r) => ({
        user: r.user as string,
        scoreHandle: r.scoreEnc as string,
        linesHandle: r.linesEnc as string,
        timestamp: r.timestamp as bigint
      })) as {
        user: string;
        scoreHandle: string;
        linesHandle: string;
        timestamp: bigint;
      }[];
    },
    async decryptMyMirrors(difficulty: number) {
      try {
        if (!w.signer || !w.provider || !address) return null;
        const instance = await createFhevmInstance(w.provider);
        const user = await w.signer.getAddress() as `0x${string}`;
        const c = await read();
        if (!c) return null;
        const pair = await c.getUserRecordEnc(user, difficulty);
        const handleScore = pair[0];
        const handleLines = pair[1];
        // Always build a fresh signature so MetaMask pops up every time
        const sig = await buildFreshDecryptionSignature(instance, w.signer, [address as `0x${string}`]);
        if (!sig) return null;
        const res = await instance.userDecrypt(
          [
            { handle: handleScore, contractAddress: address },
            { handle: handleLines, contractAddress: address }
          ],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        return {
          score: res[handleScore],
          lines: res[handleLines]
        };
      } catch {
        return null;
      }
    },
    async getMyEncHistory() {
      try {
        if (!w.provider || !address || !w.address) return [];
        const c = await read();
        if (!c) return [];
        const r = await c.getEncHistory(w.address);
        // r is tuple of arrays: [scoreEnc[], linesEnc[], diff[], ts[]]
        const list = [];
        const n = r[0].length as number;
        for (let i = 0; i < n; i++) {
          list.push({
            index: i,
            scoreHandle: r[0][i] as string,
            linesHandle: r[1][i] as string,
            difficulty: Number(r[2][i]),
            timestamp: Number(r[3][i])
          });
        }
        return list as {
          index: number;
          scoreHandle: string;
          linesHandle: string;
          difficulty: number;
          timestamp: number;
        }[];
      } catch (e) {
        console.error("[getMyEncHistory] failed", e);
        return [];
      }
    },
    async decryptHistoryItem(item: { scoreHandle: string; linesHandle: string }) {
      try {
        if (!w.signer || !w.provider || !address) return null;
        const instance = await createFhevmInstance(w.provider);
        // Always build a fresh signature so MetaMask pops up every time
        const sig = await buildFreshDecryptionSignature(instance, w.signer, [address as `0x${string}`]);
        if (!sig) return null;
        const res = await instance.userDecrypt(
          [
            { handle: item.scoreHandle, contractAddress: address },
            { handle: item.linesHandle, contractAddress: address }
          ],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        // Normalize result
        const result: any = res as any;
        // Primary access by exact key
        let score: any = result[item.scoreHandle];
        let lines: any = result[item.linesHandle];
        // Fallback: case-insensitive key match
        if (score === undefined || lines === undefined) {
          const keys = Object.keys(result);
          const scoreKey = keys.find(k => k.toLowerCase() === item.scoreHandle.toLowerCase());
          const linesKey = keys.find(k => k.toLowerCase() === item.linesHandle.toLowerCase());
          if (score === undefined && scoreKey) score = result[scoreKey];
          if (lines === undefined && linesKey) lines = result[linesKey];
        }
        // Array-like fallback
        if ((score === undefined || lines === undefined) && Array.isArray(result)) {
          score = result[0];
          lines = result[1];
        }
        // Numeric-indexed object fallback
        if ((score === undefined || lines === undefined)) {
          const idxKeys = Object.keys(result).filter(k => /^\\d+$/.test(k)).sort((a,b) => Number(a)-Number(b));
          if (idxKeys.length >= 2) {
            if (score === undefined) score = result[idxKeys[0]];
            if (lines === undefined) lines = result[idxKeys[1]];
          }
        }
        // Final fallback: collect numeric-like values and infer
        if ((score === undefined || lines === undefined)) {
          const values = Object.values(result).filter((v) => typeof v === "number" || typeof v === "bigint") as (number|bigint)[];
          if (values.length >= 2) {
            // Heuristic: score is usually larger than lines → sort desc
            const sorted = [...values].sort((a, b) => Number(b) - Number(a));
            if (score === undefined) score = sorted[0];
            if (lines === undefined) {
              // pick next distinct, or the next element
              lines = sorted.find((v) => Number(v) !== Number(score)) ?? sorted[1];
            }
          }
        }
        return { score: Number(score), lines: Number(lines) };
      } catch (e) {
        console.error("[decryptHistoryItem] failed", e);
        return null;
      }
    }
  };
};



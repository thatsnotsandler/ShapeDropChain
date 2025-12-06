import { useState } from "react";
import { useWallet } from "./Wallet";
import { useShapeDropChain } from "../web3/useShapeDropChain";

const difficultyLabels = ["Easy", "Normal", "Hard"];

export const History = () => {
  const { address } = useWallet();
  const [history, setHistory] = useState<any[]>([]);
  const [decrypted, setDecrypted] = useState<Record<number, { score: number; lines: number }>>({});
  const sc = useShapeDropChain();

  const fetchHistory = async () => {
    const res = await sc.getMyEncHistory();
    setHistory(res || []);
    setDecrypted({});
  };

  const decryptItem = async (item: any, index: number) => {
    const value = await sc.decryptHistoryItem(item);
    if (value) {
      setDecrypted(prev => ({ ...prev, [index]: value }));
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return "-";
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 md:p-8 relative z-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black title-glow mb-4">📜 My History</h1>
          <p className="text-white/70 text-lg">
            Your encrypted game sessions - only you can decrypt them
          </p>
          {address && (
            <div className="mt-4 glass rounded-lg inline-block px-6 py-3">
              <span className="text-white/60">Address: </span>
              <span className="font-mono text-primary">{address}</span>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <button className="btn-neon px-8" onClick={fetchHistory}>
            🔄 Refresh History
          </button>
        </div>

        {/* History Cards */}
        {history.length === 0 ? (
          <div className="glass neon-border rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <div className="text-2xl font-bold mb-2 text-white/80">No history yet</div>
            <div className="text-white/60">
              Submit encrypted mirrors from the game to build your history
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, index) => {
              const dec = decrypted[index];
              return (
                <div 
                  key={index} 
                  className="glass neon-border rounded-2xl p-6 card-hover"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-[300px] space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="badge glass">
                          #{history.length - index}
                        </span>
                        <span className="badge glass">
                          {difficultyLabels[item.difficulty] || "Unknown"}
                        </span>
                        <span className="text-sm text-white/60">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <div className="text-xs text-white/50 mb-1">Score Handle</div>
                          <div className="font-mono text-xs text-primary">
                            {item.scoreHandle ? `${item.scoreHandle.slice(0, 16)}...` : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50 mb-1">Lines Handle</div>
                          <div className="font-mono text-xs text-secondary">
                            {item.linesHandle ? `${item.linesHandle.slice(0, 16)}...` : "-"}
                          </div>
                        </div>
                      </div>

                      {/* Decrypted summary row */}
                      {dec && (
                        <div className="mt-4 glass rounded-lg p-3 text-white/90">
                          <span className="text-sm text-white/60 mr-2">Decrypted →</span>
                          <span className="font-black text-primary mr-4">score={dec.score}</span>
                          <span className="font-black text-secondary">lines={dec.lines}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Decrypt Button */}
                    <div>
                      {!dec ? (
                        <button
                          className="btn-neon px-6"
                          onClick={() => decryptItem(item, index)}
                        >
                          🔓 Decrypt
                        </button>
                      ) : (
                        <div className="glass rounded-lg px-6 py-3 text-success font-semibold">
                          ✅ Decrypted
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-12 glass neon-border rounded-xl p-6 text-center text-sm text-white/60">
          <p>
            💡 Each time you submit <span className="text-accent font-semibold">Encrypted Mirrors</span>, 
            a new encrypted record is added to your history.
          </p>
          <p className="mt-2">
            🔐 Only you can decrypt these records using your wallet signature.
          </p>
        </div>
      </div>
    </div>
  );
};

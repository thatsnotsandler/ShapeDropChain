import { useEffect, useState } from "react";
import { useWallet } from "./Wallet";
import { useShapeDropChain } from "../web3/useShapeDropChain";

type Mode = "plain" | "encrypted";

const difficulties = [
  { label: "Easy", value: 0 },
  { label: "Normal", value: 1 },
  { label: "Hard", value: 2 }
];

export const Leaderboard = () => {
  const { address } = useWallet();
  const [mode, setMode] = useState<Mode>("plain");
  const [difficulty, setDifficulty] = useState(1);
  const [records, setRecords] = useState<any[]>([]);
  const [encRecords, setEncRecords] = useState<any[]>([]);
  const [decrypted, setDecrypted] = useState<Record<string, { score: number; lines: number }>>({});
  
  const sc = useShapeDropChain();

  const fetchPlain = async () => {
    const res = await sc.getAllRecords(difficulty);
    setRecords(res || []);
  };

  const fetchEnc = async () => {
    const res = await sc.getAllEncRecords(difficulty);
    setEncRecords(res || []);
  };

  useEffect(() => {
    if (mode === "plain") fetchPlain();
    else fetchEnc();
  }, [mode, difficulty]);

  const decryptRow = async (item: any) => {
    const key = `${item.user}-${difficulty}`;
    const value = await sc.decryptHistoryItem({
      scoreHandle: item.scoreHandle,
      linesHandle: item.linesHandle,
      difficulty
    });
    if (value) {
      setDecrypted(prev => ({ ...prev, [key]: value }));
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return "-";
    return new Date(ts * 1000).toLocaleString();
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <span className="badge badge-gold">🥇 1st</span>;
    if (index === 1) return <span className="badge badge-silver">🥈 2nd</span>;
    if (index === 2) return <span className="badge badge-bronze">🥉 3rd</span>;
    return <span className="text-white/60">#{index + 1}</span>;
  };

  const currentRecords = mode === "plain" ? records : encRecords;

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 md:p-8 relative z-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black title-glow mb-4">🏆 Leaderboard</h1>
          <p className="text-white/70 text-lg">
            {mode === "plain" 
              ? "Public high scores - compete with everyone"
              : "Encrypted scores - decrypt yours to verify"
            }
          </p>
        </div>

        {/* Controls */}
        <div className="glass neon-border rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <button
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  mode === "plain"
                    ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
                    : "glass text-white/60 hover:text-white"
                }`}
                onClick={() => setMode("plain")}
              >
                📊 Plain
              </button>
              <button
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  mode === "encrypted"
                    ? "bg-gradient-to-r from-secondary to-accent text-white shadow-lg"
                    : "glass text-white/60 hover:text-white"
                }`}
                onClick={() => setMode("encrypted")}
              >
                🔐 Encrypted
              </button>
            </div>

            {/* Difficulty Tabs */}
            <div className="flex gap-2">
              {difficulties.map((d) => (
                <button
                  key={d.value}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    d.value === difficulty
                      ? "bg-warning text-black"
                      : "glass text-white/60 hover:text-white"
                  }`}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              className="btn-neon px-6"
              onClick={() => mode === "plain" ? fetchPlain() : fetchEnc()}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass neon-border rounded-2xl overflow-hidden">
          {currentRecords.length === 0 ? (
            <div className="p-12 text-center text-white/50">
              <div className="text-6xl mb-4">🎯</div>
              <div className="text-xl">No records yet</div>
              <div className="text-sm mt-2">Be the first to submit a score!</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-gradient-to-r from-primary/10 to-secondary/10">
                  <th className="text-left p-4 font-bold text-white/90">Rank</th>
                  <th className="text-left p-4 font-bold text-white/90">User</th>
                  {mode === "plain" ? (
                    <>
                      <th className="text-right p-4 font-bold text-white/90">Score</th>
                      <th className="text-right p-4 font-bold text-white/90">Lines</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left p-4 font-bold text-white/90">Score (enc)</th>
                      <th className="text-left p-4 font-bold text-white/90">Lines (enc)</th>
                    </>
                  )}
                  <th className="text-left p-4 font-bold text-white/90">Time</th>
                  <th className="text-center p-4 font-bold text-white/90">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((record, index) => {
                  const isMine = record.user?.toLowerCase() === address?.toLowerCase();
                  const key = `${record.user}-${difficulty}`;
                  const dec = decrypted[key];

                  return (
                    <tr 
                      key={index} 
                      className={`table-row border-b border-white/5 ${isMine ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-4">{getRankBadge(index)}</td>
                      <td className="p-4 font-mono text-sm">
                        {record.user ? `${record.user.slice(0, 6)}...${record.user.slice(-4)}` : "-"}
                        {isMine && <span className="ml-2 text-xs text-success">👈 You</span>}
                      </td>
                      {mode === "plain" ? (
                        <>
                          <td className="p-4 text-right font-bold text-primary text-xl">
                            {record.score?.toString() || "-"}
                          </td>
                          <td className="p-4 text-right font-bold text-secondary text-xl">
                            {record.lines?.toString() || "-"}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4">
                            <div className="font-mono text-xs text-white/50">
                              {record.scoreHandle ? `${record.scoreHandle.slice(0, 10)}...` : "-"}
                            </div>
                            {dec && <div className="text-primary font-bold mt-1">🔓 {dec.score}</div>}
                          </td>
                          <td className="p-4">
                            <div className="font-mono text-xs text-white/50">
                              {record.linesHandle ? `${record.linesHandle.slice(0, 10)}...` : "-"}
                            </div>
                            {dec && <div className="text-secondary font-bold mt-1">🔓 {dec.lines}</div>}
                          </td>
                        </>
                      )}
                      <td className="p-4 text-sm text-white/70">
                        {formatTime(record.timestamp)}
                      </td>
                      <td className="p-4 text-center">
                        {mode === "encrypted" && isMine && !dec && (
                          <button
                            className="btn-neon text-sm px-4 py-2"
                            onClick={() => decryptRow(record)}
                          >
                            🔓 Decrypt mine
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

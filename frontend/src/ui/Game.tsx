import { useEffect, useRef, useState } from "react";
import { useWallet } from "./Wallet";
import { useShapeDropChain } from "../web3/useShapeDropChain";
import {
  createInitialState,
  computeDropIntervalMs,
  Difficulty,
  move,
  rotateCurrent,
  step,
  hardDrop,
  updateAnimation
} from "../game/tetris";
import { TetrisBoard } from "./TetrisBoard";
import { NextPiece } from "./NextPiece";

const difficulties = [
  { label: "Easy", value: 0, desc: "Relaxed pace" },
  { label: "Normal", value: 1, desc: "Standard speed" },
  { label: "Hard", value: 2, desc: "Challenge mode" }
];

export const Game = () => {
  const { address, chainId, isConnected } = useWallet();
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [state, setState] = useState(() => createInitialState(Math.random, difficulty));
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastTimeRef = useRef<number>(0);
  const dropTimerRef = useRef<number>(0);

  // Auto-stop when game over
  useEffect(() => {
    if (state.over && running) {
      setRunning(false);
      setMessage("🎮 Game Over! Submit your score to compete.");
    }
  }, [state.over, running]);

  // Smooth animation loop
  useEffect(() => {
    if (!running || state.over) return;
    let animFrameId: number;
    
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const deltaMs = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const s = { ...stateRef.current };
      const dropIntervalMs = computeDropIntervalMs(difficulty, s.lines);
      
      dropTimerRef.current += deltaMs;
      if (dropTimerRef.current >= dropIntervalMs) {
        dropTimerRef.current = 0;
        step(s, timestamp);
      }
      
      updateAnimation(s, deltaMs, dropIntervalMs, timestamp);
      setState(s);

      if (!s.over) {
        animFrameId = requestAnimationFrame(animate);
      }
    };
    
    animFrameId = requestAnimationFrame(animate);
    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      lastTimeRef.current = 0;
      dropTimerRef.current = 0;
    };
  }, [running, difficulty, state.over]);

  // Keyboard controls
  const keyRepeatRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running || state.over) return;
      const now = Date.now();
      const key = e.key;
      
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowDown") {
        if (keyRepeatRef.current[key] && now - keyRepeatRef.current[key] < 50) {
          return;
        }
        keyRepeatRef.current[key] = now;
      }

      const s = { ...stateRef.current };
      if (key === "ArrowLeft") {
        move(s, -1);
        s.current.fx = s.current.x;
      } else if (key === "ArrowRight") {
        move(s, 1);
        s.current.fx = s.current.x;
      } else if (key === "ArrowDown") {
        const now = Date.now();
        step(s, now);
        s.current.fy = s.current.y;
      } else if (key === " " || key === "ArrowUp") {
        e.preventDefault();
        const now = Date.now();
        hardDrop(s, now);
      } else if (key === "z" || key === "Z") {
        rotateCurrent(s, -1);
      } else if (key === "x" || key === "X") {
        rotateCurrent(s, 1);
      }
      setState(s);
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
      delete keyRepeatRef.current[e.key];
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [running, state.over]);

  const sc = useShapeDropChain();

  const submitPlain = async () => {
    setMessage("📤 Submitting plain score...");
    const ok = await sc.submitScore(state.score, state.lines, difficulty);
    setMessage(ok ? "✅ Plain score submitted!" : "❌ Submit failed");
  };

  const submitEncrypted = async () => {
    setMessage("🔐 Encrypting and submitting...");
    const ok = await sc.submitScoreEnc(state.score, state.lines, difficulty);
    setMessage(ok ? "✅ Encrypted mirrors submitted!" : "❌ Submit failed");
  };

  const decryptMine = async () => {
    setMessage("🔓 Decrypting...");
    const value = await sc.decryptMyMirrors(difficulty);
    if (value) {
      setMessage(`✅ Decrypted → score=${value.score}, lines=${value.lines}`);
    } else {
      setMessage("❌ Decrypt failed");
    }
  };

  const resetGame = () => {
    const newState = createInitialState(Math.random, difficulty);
    setState(newState);
    stateRef.current = newState;
    setRunning(false);
    lastTimeRef.current = 0;
    dropTimerRef.current = 0;
    setMessage("");
  };

  const currentSpeed = computeDropIntervalMs(difficulty, state.lines);

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 md:p-8 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[380px_1fr_380px] gap-6">
          {/* Left Sidebar - Player Info & Controls */}
          <div className="space-y-6">
            {/* Player Card */}
            <div className="glass neon-border rounded-2xl p-6 space-y-4">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <span>👤</span>
                <span>Player</span>
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Address:</span>
                  <span className="font-mono text-xs">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Chain:</span>
                  <span className="font-semibold">{chainId ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Status:</span>
                  <span className={isConnected ? "text-success" : "text-warning"}>
                    {isConnected ? "🟢 Connected" : "🟡 Disconnected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Difficulty Selection */}
            <div className="glass neon-border rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-secondary">⚙️ Difficulty</h3>
              <div className="space-y-3">
                {difficulties.map((d) => (
                  <button
                    key={d.value}
                    disabled={running}
                    className={`w-full p-4 rounded-xl transition-all duration-300 ${
                      d.value === difficulty
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg scale-105'
                        : 'glass text-white/70 hover:text-white hover:scale-102'
                    }`}
                    onClick={() => {
                      setDifficulty(d.value as Difficulty);
                      resetGame();
                    }}
                  >
                    <div className="font-bold text-lg">{d.label}</div>
                    <div className="text-xs mt-1 opacity-80">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Game Stats */}
            <div className="glass neon-border rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-accent">📊 Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 glass rounded-lg">
                  <span className="text-white/70">Speed</span>
                  <span className="font-bold text-primary">{currentSpeed}ms</span>
                </div>
                <div className="flex justify-between items-center p-3 glass rounded-lg">
                  <span className="text-white/70">Lines/10</span>
                  <span className="font-bold text-secondary">{Math.floor(state.lines / 10)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Game Board */}
          <div className="flex flex-col items-center justify-start space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-black title-glow mb-2">Game Canvas</h1>
              <p className="text-white/60 text-sm">
                Use ← → ↓, Z/X rotate, Space hard drop
              </p>
            </div>

            <TetrisBoard board={state.board} current={state.current} />

            {/* Score Display */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
              <div className="glass neon-border rounded-xl p-4 text-center">
                <div className="text-sm text-white/60 mb-1">Score</div>
                <div className="text-3xl font-black text-primary">{state.score}</div>
              </div>
              <div className="glass neon-border rounded-xl p-4 text-center">
                <div className="text-sm text-white/60 mb-1">Lines</div>
                <div className="text-3xl font-black text-secondary">{state.lines}</div>
              </div>
              <div className="glass neon-border rounded-xl p-4 text-center">
                <div className="text-sm text-white/60 mb-1">Combo</div>
                <div className="text-3xl font-black text-accent">{state.combo}</div>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex gap-4">
              {!running ? (
                <button 
                  className="btn-neon px-8 py-4 text-lg"
                  disabled={state.over}
                  onClick={() => {
                    setRunning(true);
                    lastTimeRef.current = 0;
                    dropTimerRef.current = 0;
                    setMessage("🎮 Game started!");
                  }}
                >
                  {state.over ? "🏁 Game Over" : "▶️ Start"}
                </button>
              ) : (
                <button 
                  className="btn-neon px-8 py-4 text-lg"
                  onClick={() => setRunning(false)}
                >
                  ⏸️ Pause
                </button>
              )}
              <button
                className="btn-neon px-8 py-4 text-lg"
                onClick={resetGame}
              >
                🔄 Reset
              </button>
            </div>

            {/* Game Over Message */}
            {state.over && (
              <div className="glass neon-border rounded-xl p-6 text-center animate-pulse">
                <div className="text-2xl font-bold text-warning mb-2">🏁 Game Over!</div>
                <div className="text-white/80">Final Score: <span className="text-primary font-black">{state.score}</span></div>
                <div className="text-white/80">Lines Cleared: <span className="text-secondary font-black">{state.lines}</span></div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Next Piece & Actions */}
          <div className="space-y-6">
            {/* Next Piece Preview */}
            <div className="glass neon-border rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-warning flex items-center gap-2">
                <span>🔮</span>
                <span>Next</span>
              </h3>
              <div className="flex justify-center">
                <NextPiece matrix={state.next.matrix} />
              </div>
            </div>

            {/* Upload Actions */}
            <div className="glass neon-border rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold mb-4 text-success">🚀 Upload & Verify</h3>
              
              <button 
                className="btn-neon w-full"
                onClick={submitPlain}
                disabled={!isConnected || state.score === 0}
              >
                📊 Submit Best (Plain)
              </button>
              
              <button 
                className="btn-neon w-full"
                onClick={submitEncrypted}
                disabled={!isConnected || state.score === 0}
              >
                🔐 Submit Encrypted Mirrors
              </button>
              
              <button 
                className="btn-neon w-full"
                onClick={decryptMine}
                disabled={!isConnected}
              >
                🔓 Decrypt My Mirrors
              </button>

              {message && (
                <div className="glass rounded-lg p-4 text-sm text-white/90 min-h-[4rem] flex items-center">
                  {message}
                </div>
              )}
            </div>

            {/* Instructions Card */}
            <div className="glass neon-border rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-accent">📖 How to Play</h3>
              <div className="space-y-2 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <span className="text-primary">←→</span>
                  <span>Move left/right</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">↓</span>
                  <span>Soft drop</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">Z/X</span>
                  <span>Rotate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">Space</span>
                  <span>Hard drop</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

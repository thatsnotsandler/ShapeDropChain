import { useWallet } from "./Wallet";

export const Home = () => {
  const { isConnected } = useWallet();

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-8 relative z-10">
      {/* Hero Section */}
      <div className="text-center mb-16 space-y-6">
        <h1 className="text-7xl font-black title-glow mb-4 tracking-tight">
          ShapeDropChain
        </h1>
        <p className="text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed">
          Classic Tetris meets blockchain privacy.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
            Play • Compete • Encrypt
          </span>
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full mb-16">
        {/* Card 1: Play */}
        <div className="glass neon-border rounded-2xl p-8 card-hover">
          <div className="text-5xl mb-4">🎮</div>
          <h3 className="text-2xl font-bold mb-3 text-primary">Play Classic Tetris</h3>
          <p className="text-white/70 leading-relaxed">
            Experience the timeless puzzle game with smooth animations, ghost piece preview, and multiple difficulty levels.
          </p>
        </div>

        {/* Card 2: Compete */}
        <div className="glass neon-border rounded-2xl p-8 card-hover">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-2xl font-bold mb-3 text-secondary">Compete on-chain</h3>
          <p className="text-white/70 leading-relaxed">
            Submit your high scores to the immutable blockchain leaderboard. Prove your skills forever.
          </p>
        </div>

        {/* Card 3: Privacy */}
        <div className="glass neon-border rounded-2xl p-8 card-hover">
          <div className="text-5xl mb-4">🔐</div>
          <h3 className="text-2xl font-bold mb-3 text-accent">FHE Privacy</h3>
          <p className="text-white/70 leading-relaxed">
            Your encrypted scores live on-chain. Only you can decrypt and verify them using FHEVM technology.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-6">
        {!isConnected ? (
          <div className="glass neon-border rounded-xl p-8 max-w-md">
            <p className="text-xl mb-4 text-white/90">
              Connect your wallet to start playing
            </p>
            <p className="text-sm text-white/60">
              Make sure MetaMask is set to localhost:8545 (chainId 31337)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xl text-success font-semibold flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 bg-success rounded-full animate-pulse"></span>
              Wallet Connected
            </div>
            <p className="text-white/70">
              Navigate to <span className="text-primary font-bold">Start Game</span> to begin
            </p>
          </div>
        )}
      </div>

      {/* Tech Stack Footer */}
      <div className="mt-20 text-center text-white/40 text-sm space-y-2">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className="badge glass">FHEVM v0.9</span>
          <span className="badge glass">React 18</span>
          <span className="badge glass">Ethers v6</span>
          <span className="badge glass">Mock Utils 0.3.0</span>
        </div>
        <p className="mt-4">
          Built with ❤️ using Zama's Fully Homomorphic Encryption technology
        </p>
      </div>
    </div>
  );
};

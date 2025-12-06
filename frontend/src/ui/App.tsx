import { useState } from "react";
import { Home } from "./Home";
import { Game } from "./Game";
import { Leaderboard } from "./Leaderboard";
import { History } from "./History";
import { WalletProvider, useWallet } from "./Wallet";

type Page = "home" | "game" | "leaderboard" | "history";

const NavButton = (props: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) => (
  <button
    onClick={props.onClick}
    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
      props.active
        ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg scale-105"
        : "glass text-white/70 hover:text-white hover:scale-105"
    }`}
  >
    <span className="mr-2">{props.icon}</span>
    {props.label}
  </button>
);

const Navigation = (props: { page: Page; setPage: (p: Page) => void }) => {
  const { address, isConnected, connect } = useWallet();

  return (
    <nav className="glass border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Logo */}
          <div className="text-2xl font-black title-glow cursor-pointer" onClick={() => props.setPage("home")}>
            🎮 ShapeDropChain
          </div>

          {/* Nav Links */}
          <div className="flex gap-3 flex-wrap">
            <NavButton
              active={props.page === "home"}
              onClick={() => props.setPage("home")}
              icon="🏠"
              label="Home"
            />
            <NavButton
              active={props.page === "game"}
              onClick={() => props.setPage("game")}
              icon="🎮"
              label="Start Game"
            />
            <NavButton
              active={props.page === "leaderboard"}
              onClick={() => props.setPage("leaderboard")}
              icon="🏆"
              label="Leaderboard"
            />
            <NavButton
              active={props.page === "history"}
              onClick={() => props.setPage("history")}
              icon="📜"
              label="History"
            />
          </div>

          {/* Wallet Button */}
          <div>
            {!isConnected ? (
              <button className="btn-neon px-6" onClick={connect}>
                🔗 Connect Wallet
              </button>
            ) : (
              <div className="glass rounded-xl px-6 py-3 flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="font-mono text-sm">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const AppContent = () => {
  const [page, setPage] = useState<Page>("home");

  return (
    <div className="min-h-screen relative">
      <Navigation page={page} setPage={setPage} />
      <main>
        {page === "home" && <Home />}
        {page === "game" && <Game />}
        {page === "leaderboard" && <Leaderboard />}
        {page === "history" && <History />}
      </main>
    </div>
  );
};

export const App = () => {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
};

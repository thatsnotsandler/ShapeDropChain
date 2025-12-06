import { Board, WIDTH, HEIGHT, Cell, Piece, getGhostY } from "../game/tetris";
import { useMemo } from "react";

const COLORS: Record<Cell, string> = {
  0: "rgba(15, 21, 38, 0.3)",
  1: "#01CDFA", // Cyan - I piece
  2: "#F9C80E", // Yellow - O piece
  3: "#7A5FFF", // Purple - T piece
  4: "#2EE59D", // Green - S piece
  5: "#FF4DDE", // Pink - Z piece
  6: "#FF6F91", // Coral - J piece
  7: "#6EE7F9"  // Light Cyan - L piece
};

const GLOW_COLORS: Record<Cell, string> = {
  0: "",
  1: "0 0 15px rgba(1, 205, 250, 0.6), 0 0 30px rgba(1, 205, 250, 0.3)",
  2: "0 0 15px rgba(249, 200, 14, 0.6), 0 0 30px rgba(249, 200, 14, 0.3)",
  3: "0 0 15px rgba(122, 95, 255, 0.6), 0 0 30px rgba(122, 95, 255, 0.3)",
  4: "0 0 15px rgba(46, 229, 157, 0.6), 0 0 30px rgba(46, 229, 157, 0.3)",
  5: "0 0 15px rgba(255, 77, 222, 0.6), 0 0 30px rgba(255, 77, 222, 0.3)",
  6: "0 0 15px rgba(255, 111, 145, 0.6), 0 0 30px rgba(255, 111, 145, 0.3)",
  7: "0 0 15px rgba(110, 231, 249, 0.6), 0 0 30px rgba(110, 231, 249, 0.3)"
};

export const TetrisBoard = (props: {
  board: Board;
  current: Piece;
  cellSize?: number;
}) => {
  const size = props.cellSize ?? 28;
  const gap = 2;

  const ghostY = useMemo(() => {
    const state = { board: props.board, current: props.current } as any;
    return getGhostY(state);
  }, [props.board, props.current]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        width: WIDTH * (size + gap) + 16,
        height: HEIGHT * (size + gap) + 16,
        background: 'linear-gradient(135deg, rgba(10, 14, 26, 0.95), rgba(5, 8, 16, 0.95))',
        border: '3px solid rgba(1, 205, 250, 0.3)',
        boxShadow: '0 0 40px rgba(1, 205, 250, 0.2), inset 0 0 60px rgba(122, 95, 255, 0.05)'
      }}
    >
      {/* Grid lines background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(1, 205, 250, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(1, 205, 250, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${size + gap}px ${size + gap}px`,
          backgroundPosition: '8px 8px'
        }}
      />

      {/* Board cells */}
      <div
        className="absolute"
        style={{
          left: 8,
          top: 8,
          display: "grid",
          gridTemplateColumns: `repeat(${WIDTH}, ${size}px)`,
          gridTemplateRows: `repeat(${HEIGHT}, ${size}px)`,
          gap: gap
        }}
      >
        {props.board.map((row, y) =>
          row.map((c, x) => (
            <div
              key={`${x}-${y}`}
              className="tetris-block"
              style={{
                width: size,
                height: size,
                background: c ? COLORS[c] : 'rgba(15, 21, 38, 0.2)',
                borderRadius: 4,
                boxShadow: c ? GLOW_COLORS[c] : 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
                border: c ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)'
              }}
            />
          ))
        )}
      </div>

      {/* Ghost piece (preview where piece will land) */}
      {ghostY !== props.current.y && ghostY >= 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: 8 + props.current.fx * (size + gap),
            top: 8 + ghostY * (size + gap),
            transition: 'left 0.1s ease-out'
          }}
        >
          {props.current.matrix.map((row, y) =>
            row.map((cell, x) => {
              if (!cell) return null;
              return (
                <div
                  key={`ghost-${x}-${y}`}
                  style={{
                    position: "absolute",
                    left: x * (size + gap),
                    top: y * (size + gap),
                    width: size,
                    height: size,
                    background: 'transparent',
                    border: `2px dashed ${COLORS[cell as Cell]}60`,
                    borderRadius: 4
                  }}
                />
              );
            })
          )}
        </div>
      )}

      {/* Current falling piece with smooth animation */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 8 + props.current.fx * (size + gap),
          top: 8 + props.current.fy * (size + gap),
          transform: `rotate(${props.current.rotation * 90}deg)`,
          transformOrigin: `${size * 1.5}px ${size * 1.5}px`,
          willChange: 'transform, left, top',
          filter: 'brightness(1.2)'
        }}
      >
        {props.current.matrix.map((row, y) =>
          row.map((cell, x) => {
            if (!cell) return null;
            const color = COLORS[cell as Cell];
            return (
              <div
                key={`piece-${x}-${y}`}
                className="tetris-block"
                style={{
                  position: "absolute",
                  left: x * (size + gap),
                  top: y * (size + gap),
                  width: size,
                  height: size,
                  background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                  borderRadius: 4,
                  boxShadow: `
                    ${GLOW_COLORS[cell as Cell]},
                    inset 2px 2px 4px rgba(255, 255, 255, 0.3),
                    inset -2px -2px 4px rgba(0, 0, 0, 0.3)
                  `,
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  transform: 'translateZ(0)',
                  animation: 'pieceGlow 1s ease-in-out infinite'
                }}
              />
            );
          })
        )}
      </div>

      {/* Subtle scan lines effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(1, 205, 250, 0.03) 2px, rgba(1, 205, 250, 0.03) 4px)',
          animation: 'scanlines 8s linear infinite'
        }}
      />

      <style>{`
        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        
        @keyframes pieceGlow {
          0%, 100% { 
            filter: brightness(1.2);
          }
          50% { 
            filter: brightness(1.4);
          }
        }
      `}</style>
    </div>
  );
};

import { Matrix, Cell } from "../game/tetris";

const COLORS: Record<Cell, string> = {
  0: "transparent",
  1: "#01CDFA",
  2: "#F9C80E",
  3: "#7A5FFF",
  4: "#2EE59D",
  5: "#FF4DDE",
  6: "#FF6F91",
  7: "#6EE7F9"
};

const GLOW: Record<Cell, string> = {
  0: "",
  1: "0 0 12px rgba(1, 205, 250, 0.8)",
  2: "0 0 12px rgba(249, 200, 14, 0.8)",
  3: "0 0 12px rgba(122, 95, 255, 0.8)",
  4: "0 0 12px rgba(46, 229, 157, 0.8)",
  5: "0 0 12px rgba(255, 77, 222, 0.8)",
  6: "0 0 12px rgba(255, 111, 145, 0.8)",
  7: "0 0 12px rgba(110, 231, 249, 0.8)"
};

export const NextPiece = (props: { matrix: Matrix }) => {
  const size = 24;
  const gap = 2;

  return (
    <div
      className="glass neon-border rounded-xl p-4 inline-flex items-center justify-center"
      style={{
        minWidth: 120,
        minHeight: 120,
        background: 'linear-gradient(135deg, rgba(10, 14, 26, 0.9), rgba(5, 8, 16, 0.9))'
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${props.matrix[0].length}, ${size}px)`,
          gridTemplateRows: `repeat(${props.matrix.length}, ${size}px)`,
          gap: gap
        }}
      >
        {props.matrix.map((row, y) =>
          row.map((c, x) => {
            const cellValue = c as Cell;
            return (
              <div
                key={`${x}-${y}`}
                className="tetris-block"
                style={{
                  width: size,
                  height: size,
                  background: cellValue ? COLORS[cellValue] : 'transparent',
                  borderRadius: 4,
                  boxShadow: cellValue ? GLOW[cellValue] : 'none',
                  border: cellValue ? '1px solid rgba(255, 255, 255, 0.3)' : 'none'
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

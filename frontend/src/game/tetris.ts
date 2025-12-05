export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0 empty, 1-7 tetromino ids
export type Board = Cell[][];

export type PieceId = 1 | 2 | 3 | 4 | 5 | 6 | 7; // I O T S Z J L
export type Matrix = number[][];

export const WIDTH = 10;
export const HEIGHT = 20;

export type Difficulty = 0 | 1 | 2; // 0=Easy,1=Normal,2=Hard

export type SpeedProfile = {
  initialMs: number;
  per10LinesDeltaMs: number;
  minMs: number;
};

export const SPEEDS: Record<Difficulty, SpeedProfile> = {
  0: { initialMs: 1000, per10LinesDeltaMs: -50, minMs: 120 },
  1: { initialMs: 700, per10LinesDeltaMs: -40, minMs: 100 },
  2: { initialMs: 500, per10LinesDeltaMs: -30, minMs: 80 }
};

const SHAPES: Record<PieceId, Matrix> = {
  // I
  1: [
    [1, 1, 1, 1]
  ],
  // O
  2: [
    [2, 2],
    [2, 2]
  ],
  // T
  3: [
    [0, 3, 0],
    [3, 3, 3]
  ],
  // S
  4: [
    [0, 4, 4],
    [4, 4, 0]
  ],
  // Z
  5: [
    [5, 5, 0],
    [0, 5, 5]
  ],
  // J
  6: [
    [6, 0, 0],
    [6, 6, 6]
  ],
  // L
  7: [
    [0, 0, 7],
    [7, 7, 7]
  ]
};

export function createBoard(): Board {
  return Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => 0 as Cell));
}

export function cloneBoard(b: Board): Board {
  return b.map((row) => row.slice());
}

export type Piece = {
  id: PieceId;
  matrix: Matrix;
  x: number;
  y: number;
  fx: number; // floating point x for smooth animation
  fy: number; // floating point y for smooth animation
  rotation: number; // rotation state for animation
};

export function rotate(matrix: Matrix, dir: 1 | -1): Matrix {
  const N = matrix.length;
  const M = matrix[0].length;
  const res: Matrix = Array.from({ length: M }, () => Array.from({ length: N }, () => 0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < M; x++) {
      if (dir === 1) res[x][N - 1 - y] = matrix[y][x];
      else res[M - 1 - x][y] = matrix[y][x];
    }
  }
  return res;
}

export function randomPiece(rng: () => number): Piece {
  const id = (Math.floor(rng() * 7) + 1) as PieceId;
  const matrix = SHAPES[id].map((row) => row.slice());
  const centerX = Math.floor((WIDTH - matrix[0].length) / 2);
  return { id, matrix, x: centerX, y: -1, fx: centerX, fy: -1, rotation: 0 };
}

export function collide(board: Board, p: Piece): boolean {
  for (let y = 0; y < p.matrix.length; y++) {
    for (let x = 0; x < p.matrix[y].length; x++) {
      if (!p.matrix[y][x]) continue;
      const bx = p.x + x;
      const by = p.y + y;
      if (bx < 0 || bx >= WIDTH || by >= HEIGHT) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

export function merge(board: Board, p: Piece) {
  for (let y = 0; y < p.matrix.length; y++) {
    for (let x = 0; x < p.matrix[y].length; x++) {
      const v = p.matrix[y][x];
      if (!v) continue;
      const by = p.y + y;
      if (by >= 0) board[by][p.x + x] = v as Cell;
    }
  }
}

export function findLinesToClear(board: Board): number[] {
  const lines: number[] = [];
  for (let y = board.length - 1; y >= 0; y--) {
    if (board[y].every((c) => c !== 0)) {
      lines.push(y);
    }
  }
  return lines;
}

export function clearLines(board: Board): number {
  let cleared = 0;
  for (let y = board.length - 1; y >= 0; y--) {
    if (board[y].every((c) => c !== 0)) {
      board.splice(y, 1);
      board.unshift(Array.from({ length: WIDTH }, () => 0 as Cell));
      cleared++;
      y++;
    }
  }
  return cleared;
}

export function computeDropIntervalMs(difficulty: Difficulty, totalClearedLines: number): number {
  const s = SPEEDS[difficulty];
  const steps = Math.floor(totalClearedLines / 10);
  const ms = s.initialMs + steps * s.per10LinesDeltaMs;
  return Math.max(ms, s.minMs);
}

export type GameState = {
  board: Board;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  combo: number;
  over: boolean;
  clearingLines: number[]; // lines being cleared (for animation)
  clearingTime: number; // time when clearing started (0 = not clearing)
};

export function createInitialState(rng: () => number, difficulty: Difficulty): GameState {
  const board = createBoard();
  const current = randomPiece(rng);
  const next = randomPiece(rng);
  return { board, current, next, score: 0, lines: 0, combo: 0, over: false, clearingLines: [], clearingTime: 0 };
}

export function hardDrop(state: GameState, currentTime: number = Date.now()): void {
  while (true) {
    state.current.y++;
    if (collide(state.board, state.current)) {
      state.current.y--;
      state.current.fy = state.current.y;
      lockPiece(state, currentTime);
      return;
    }
  }
}

export function getGhostY(state: GameState): number {
  let ghostY = state.current.y;
  while (true) {
    const testPiece = { ...state.current, y: ghostY + 1 };
    if (collide(state.board, testPiece)) break;
    ghostY++;
  }
  return ghostY;
}

export function step(state: GameState, currentTime: number = Date.now()): void {
  if (state.over || state.clearingTime > 0) return;
  state.current.y++;
  if (collide(state.board, state.current)) {
    state.current.y--;
    lockPiece(state, currentTime);
  }
}

export function updateAnimation(state: GameState, deltaMs: number, dropIntervalMs: number, currentTime: number): void {
  if (state.over) return;
  
  // Smooth fall animation: linear interpolation based on actual drop speed
  // This ensures piece visually falls at a constant rate matching game logic
  const fallPixelsPerMs = 1 / dropIntervalMs; // How many cells per millisecond
  const fallDelta = fallPixelsPerMs * deltaMs;
  
  const targetY = state.current.y;
  
  // Always move towards target
  if (state.current.fy < targetY - 0.01) {
    // Falling down - use constant speed
    state.current.fy += fallDelta;
    // Don't overshoot
    if (state.current.fy > targetY) {
      state.current.fy = targetY;
    }
  } else if (state.current.fy > targetY + 0.01) {
    // Jumped up (after hard drop reset) - snap quickly
    state.current.fy = targetY;
  } else {
    // Close enough - snap
    state.current.fy = targetY;
  }
  
  // Smooth x interpolation (faster for responsive feel)
  const moveSpeed = 0.5;
  const xDiff = state.current.x - state.current.fx;
  if (Math.abs(xDiff) > 0.01) {
    state.current.fx += xDiff * moveSpeed;
  } else {
    state.current.fx = state.current.x;
  }
  
  // Rotation interpolation
  if (Math.abs(state.current.rotation) > 0.01) {
    state.current.rotation *= 0.85;
  } else {
    state.current.rotation = 0;
  }
}

export function move(state: GameState, dx: number): void {
  if (state.over) return;
  state.current.x += dx;
  if (collide(state.board, state.current)) {
    state.current.x -= dx;
  }
}

export function rotateCurrent(state: GameState, dir: 1 | -1): void {
  if (state.over) return;
  const prev = state.current.matrix;
  state.current.matrix = rotate(prev, dir);
  state.current.rotation = dir * 0.3; // visual rotation effect
  // wall kick naive
  if (collide(state.board, state.current)) {
    state.current.x++;
    if (collide(state.board, state.current)) {
      state.current.x -= 2;
      if (collide(state.board, state.current)) {
        state.current.x++;
        state.current.matrix = prev;
        state.current.rotation = 0;
      }
    }
  }
}

function lockPiece(state: GameState, currentTime: number): void {
  merge(state.board, state.current);
  
  console.log('[Tetris] Before clearing, board:', state.board.map(row => row.join('')));
  
  // Immediately clear lines and update score
  const cleared = clearLines(state.board);
  
  console.log('[Tetris] Lines cleared:', cleared);
  
  if (cleared > 0) {
    state.lines += cleared;
    state.score += cleared * 100;
    state.score += state.combo * 20;
    state.combo += 1;
    console.log('[Tetris] Score updated:', state.score, 'Lines:', state.lines, 'Combo:', state.combo);
  } else {
    state.combo = 0;
  }
  
  console.log('[Tetris] After clearing, board:', state.board.map(row => row.join('')));
  
  // Spawn next piece
  spawnNextPiece(state);
}

function spawnNextPiece(state: GameState): void {
  const centerX = Math.floor((WIDTH - state.next.matrix[0].length) / 2);
  state.current = state.next;
  state.current.x = centerX;
  state.current.y = -1;
  state.current.fx = centerX;
  state.current.fy = -1;
  state.current.rotation = 0;
  state.next = randomPiece(Math.random);
  if (collide(state.board, state.current)) {
    state.over = true;
  }
}

export function checkClearingComplete(state: GameState, currentTime: number): void {
  // No longer needed - clearing happens immediately in lockPiece
}



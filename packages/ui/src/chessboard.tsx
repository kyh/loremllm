'use client';

import * as React from 'react';
import clsx from 'clsx';

const FILE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const RANK = [8, 7, 6, 5, 4, 3, 2, 1];

const getPieceSymbol = (piece: string) => {
  const mapping: Record<string, string> = {
    K: '♔',
    Q: '♕',
    R: '♖',
    B: '♗',
    N: '♘',
    P: '♙',
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟',
  };
  return mapping[piece] || '';
};

interface ChessboardProps {
  board: string[][];
}

const Chessboard: React.FC<ChessboardProps> = ({ board }) => {
  const cellClasses = 'w-[1ch] h-[calc(var(--theme-line-height-base)*1rem)] bg-[var(--theme-border-subdued)] text-center align-middle';
  const squareClasses = 'h-[calc(var(--theme-line-height-base)*2rem)] text-center align-middle w-[3ch]';
  const symbolClasses = 'text-[40px] leading-[calc(var(--theme-line-height-base)*2rem)]';

  return (
    <table className="inline-table border-collapse">
      <tbody>
        <tr>
          <td className="w-[1ch] h-[calc(var(--theme-line-height-base)*1rem)]"></td>
          {FILE.map((file) => (
            <td key={file} className={cellClasses}>
              {file}
            </td>
          ))}
        </tr>
        {RANK.map((rank, rowIndex) => (
          <tr key={rank}>
            <td className={cellClasses}>{rank}</td>
            {FILE.map((_, colIndex) => {
              const isDark = (rowIndex + colIndex) % 2 === 0;
              const squareClass = isDark ? 'bg-[var(--theme-focused-foreground)]' : 'bg-[var(--theme-focused-foreground-subdued)]';
              return (
                <td key={colIndex} className={clsx(squareClasses, squareClass)}>
                  <span className={symbolClasses}>{getPieceSymbol(board[rowIndex][colIndex])}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export { Chessboard };

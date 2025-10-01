'use client';

import * as React from 'react';

interface DataTableProps {
  data: string[][];
}

interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const BASE_FOREGROUND_RGBA: RGBAColor = { r: 98, g: 98, b: 98, a: 0.5 };
const BASE_BACKGROUND_RGBA: RGBAColor = { r: 168, g: 168, b: 168, a: 0.5 };
const ALPHA = 0.45;

function interpolateColor(color1: RGBAColor, color2: RGBAColor, factor: number): RGBAColor {
  return {
    r: Math.round(color1.r + factor * (color2.r - color1.r)),
    g: Math.round(color1.g + factor * (color2.g - color1.g)),
    b: Math.round(color1.b + factor * (color2.b - color1.b)),
    a: color1.a + factor * (color2.a - color1.a),
  };
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const tableRef = React.useRef<HTMLTableElement>(null);
  const prevDataRef = React.useRef<string[][]>(data);

  React.useEffect(() => {
    const rows = tableRef.current?.querySelectorAll<HTMLTableRowElement>('tr') || [];
    for (let i = 1; i < data.length; i++) {
      const cells = rows[i]?.querySelectorAll<HTMLTableCellElement>('td');
      if (!cells) continue;
      for (let j = 0; j < data[i].length; j++) {
        const cell = cells[j];
        const changed = prevDataRef.current[i]?.[j] !== data[i][j];
        if (cell && changed) {
          cell.classList.remove('animate-[flash_2s_ease]');
          void cell.offsetWidth;
          cell.classList.add('animate-[flash_2s_ease]');
        }
      }
    }
    prevDataRef.current = data;
  }, [data]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableElement>) => {
    const activeElement = document.activeElement;
    if (!activeElement) return;
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (activeElement instanceof HTMLTableCellElement) {
          activeElement.click();
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault();
        if (!(activeElement instanceof HTMLTableCellElement)) return;
        const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? 'previous' : 'next';
        const allCells = Array.from(tableRef.current?.querySelectorAll<HTMLTableCellElement>('td') || []);
        const currentIndex = allCells.indexOf(activeElement);
        if (currentIndex === -1) return;
        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (direction === 'previous') {
          if (nextIndex < 0) nextIndex = allCells.length - 1;
        } else {
          if (nextIndex >= allCells.length) nextIndex = 0;
        }
        allCells[nextIndex].focus();
        break;
    }
  };

  const targetColorHeader: RGBAColor = { r: 255, g: 255, b: 255, a: ALPHA };
  const targetColorData: RGBAColor = { r: 255, g: 255, b: 255, a: ALPHA };

  return (
    <table className="relative w-full border-spacing-0 max-w-[64ch]" ref={tableRef} onKeyDown={handleKeyDown}>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex} className="transition-transform duration-500 ease-in-out border-spacing-0 focus:bg-[var(--theme-focused-foreground)] focus:outline-0 first:font-normal" tabIndex={0} onClick={() => alert('testing')}>
            {row.map((cellContent, colIndex) => {
              let backgroundColor: string;
              if (rowIndex === 0) {
                const lightnessFactor = row.length > 1 ? colIndex / (row.length - 1) : 0;
                const newColor = interpolateColor(BASE_FOREGROUND_RGBA, targetColorHeader, lightnessFactor);
                backgroundColor = `rgba(${newColor.r}, ${newColor.g}, ${newColor.b}, ${newColor.a.toFixed(2)})`;
              } else {
                const numRows = data.length - 1;
                const maxIndexSum = numRows - 1 + (row.length - 1) || 1;
                const indexSum = rowIndex - 1 + colIndex;
                const lightnessFactor = indexSum / maxIndexSum;
                const newColor = interpolateColor(BASE_BACKGROUND_RGBA, targetColorData, lightnessFactor);
                backgroundColor = `rgba(${newColor.r}, ${newColor.g}, ${newColor.b}, ${newColor.a.toFixed(2)})`;
              }
              return (
                <td key={colIndex} className="border-0 outline-0 pr-[1ch] transition-colors duration-500 ease-in-out" style={{ backgroundColor }}>
                  {cellContent}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export { DataTable };

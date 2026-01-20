import pc from 'picocolors';
import { accent } from './colors.js';

export { accent };

interface Column {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  color?: (value: string) => string;
}

interface TableOptions {
  columns: Column[];
  data: Record<string, string>[];
  title?: string;
}

const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  topMid: '┬',
  bottomMid: '┴',
  leftMid: '├',
  rightMid: '┤',
  midMid: '┼',
};

function padString(
  str: string,
  width: number,
  align: 'left' | 'right' | 'center' = 'left',
): string {
  const strippedLength = stripAnsi(str).length;
  const padding = Math.max(0, width - strippedLength);

  if (align === 'right') {
    return ' '.repeat(padding) + str;
  }
  if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  }
  return str + ' '.repeat(padding);
}

function stripAnsi(str: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Required for ANSI escape code stripping
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (stripAnsi(testLine).length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If single word is longer than maxWidth, truncate it
      if (stripAnsi(word).length > maxWidth) {
        currentLine = `${word.slice(0, maxWidth - 3)}...`;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

export function renderTable(options: TableOptions): void {
  const { columns, data, title } = options;

  // Print title if provided
  if (title) {
    console.log(pc.bold(`\n  ${title}\n`));
  }

  // Top border
  let topBorder = `  ${BOX.topLeft}`;
  for (let i = 0; i < columns.length; i++) {
    topBorder += BOX.horizontal.repeat(columns[i].width + 2);
    topBorder += i < columns.length - 1 ? BOX.topMid : BOX.topRight;
  }
  console.log(pc.dim(topBorder));

  // Header row
  let headerRow = `  ${BOX.vertical}`;
  for (const col of columns) {
    headerRow += ` ${pc.bold(padString(col.header, col.width, col.align))} ${BOX.vertical}`;
  }
  console.log(
    pc.dim(headerRow.slice(0, 2)) +
      headerRow.slice(2, -1) +
      pc.dim(BOX.vertical),
  );

  // Header separator
  let headerSep = `  ${BOX.leftMid}`;
  for (let i = 0; i < columns.length; i++) {
    headerSep += BOX.horizontal.repeat(columns[i].width + 2);
    headerSep += i < columns.length - 1 ? BOX.midMid : BOX.rightMid;
  }
  console.log(pc.dim(headerSep));

  // Data rows
  for (const row of data) {
    // Wrap text for each column that needs it
    const wrappedColumns: string[][] = columns.map((col) => {
      const value = row[col.key] || '';
      return wrapText(value, col.width);
    });

    // Find max lines needed for this row
    const maxLines = Math.max(...wrappedColumns.map((lines) => lines.length));

    // Print each line of the row
    for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
      let dataRow = `  ${BOX.vertical}`;

      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const col = columns[colIdx];
        const lines = wrappedColumns[colIdx];
        const lineValue = lines[lineIdx] || '';

        let cellValue = padString(lineValue, col.width, col.align);

        // Apply color if provided and this is not an empty continuation line
        if (col.color && lineValue) {
          cellValue = col.color(cellValue);
        }

        dataRow += ` ${cellValue} ${BOX.vertical}`;
      }

      console.log(
        pc.dim(dataRow.slice(0, 2)) +
          dataRow.slice(2, -1) +
          pc.dim(BOX.vertical),
      );
    }
  }

  // Bottom border
  let bottomBorder = `  ${BOX.bottomLeft}`;
  for (let i = 0; i < columns.length; i++) {
    bottomBorder += BOX.horizontal.repeat(columns[i].width + 2);
    bottomBorder += i < columns.length - 1 ? BOX.bottomMid : BOX.bottomRight;
  }
  console.log(pc.dim(bottomBorder));
}

export function renderSimpleTable(
  headers: string[],
  rows: string[][],
  title?: string,
): void {
  const columns: Column[] = headers.map((header, idx) => {
    const maxDataWidth = Math.max(
      ...rows.map((row) => stripAnsi(row[idx] || '').length),
    );
    const width = Math.max(header.length, maxDataWidth, 5);
    return { header, key: `col${idx}`, width: Math.min(width, 40) };
  });

  const data = rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((_, idx) => {
      obj[`col${idx}`] = row[idx] || '';
    });
    return obj;
  });

  renderTable({ columns, data, title });
}

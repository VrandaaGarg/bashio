import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

interface InputBoxProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function InputBox({ onSubmit, disabled = false }: InputBoxProps) {
  const [value, setValue] = useState('');
  const [cursorPos, setCursorPos] = useState(0);

  useInput(
    (input, key) => {
      if (disabled) return;

      // Submit on Enter (without shift)
      if (key.return && !key.shift) {
        if (value.trim()) {
          onSubmit(value);
          setValue('');
          setCursorPos(0);
        }
        return;
      }

      // New line on Shift+Enter or Ctrl+J
      if ((key.return && key.shift) || (key.ctrl && input === 'j')) {
        setValue((v) => `${v.slice(0, cursorPos)}\n${v.slice(cursorPos)}`);
        setCursorPos((p) => p + 1);
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          setValue((v) => v.slice(0, cursorPos - 1) + v.slice(cursorPos));
          setCursorPos((p) => p - 1);
        }
        return;
      }

      // Arrow keys
      if (key.leftArrow) {
        if (key.ctrl) {
          const before = value.slice(0, cursorPos);
          const match = before.match(/\S+\s*$/);
          setCursorPos((p) => (match ? p - match[0].length : 0));
        } else {
          setCursorPos((p) => Math.max(0, p - 1));
        }
        return;
      }

      if (key.rightArrow) {
        if (key.ctrl) {
          const after = value.slice(cursorPos);
          const match = after.match(/^\s*\S+/);
          setCursorPos((p) => (match ? p + match[0].length : value.length));
        } else {
          setCursorPos((p) => Math.min(value.length, p + 1));
        }
        return;
      }

      // Home (Ctrl+A)
      if (key.ctrl && input === 'a') {
        setCursorPos(0);
        return;
      }

      // End (Ctrl+E)
      if (key.ctrl && input === 'e') {
        setCursorPos(value.length);
        return;
      }

      // Clear line (Ctrl+U)
      if (key.ctrl && input === 'u') {
        setValue('');
        setCursorPos(0);
        return;
      }

      // Regular character input - filter out control characters
      if (input && !key.ctrl && !key.meta && input.length === 1) {
        const charCode = input.charCodeAt(0);
        // Only allow printable characters (space and above)
        if (charCode >= 32) {
          setValue((v) => v.slice(0, cursorPos) + input + v.slice(cursorPos));
          setCursorPos((p) => p + 1);
        }
      }
    },
    { isActive: !disabled },
  );

  // Render the input line
  const displayValue = value || '';
  const beforeCursor = displayValue.slice(0, cursorPos);
  const atCursor = displayValue[cursorPos] || ' ';
  const afterCursor = displayValue.slice(cursorPos + 1);

  // For multiline, show line count
  const lineCount = displayValue.split('\n').length;
  const showLineCount = lineCount > 1;

  return (
    <Box paddingX={1}>
      <Text color={disabled ? 'gray' : 'green'}>{disabled ? '...' : '>'} </Text>
      <Text color={disabled ? 'gray' : 'white'}>
        {beforeCursor}
        {!disabled && <Text inverse>{atCursor === '\n' ? '↵' : atCursor}</Text>}
        {afterCursor.replace(/\n/g, '↵')}
      </Text>
      {showLineCount && <Text dimColor> ({lineCount} lines)</Text>}
    </Box>
  );
}

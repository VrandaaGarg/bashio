import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  filterCommands,
  type SlashCommandAction,
} from '../utils/slashCommands.js';
import { SlashCommandMenu } from './SlashCommandMenu.js';

interface InputBoxProps {
  onSubmit: (value: string) => void;
  onSlashCommand: (action: SlashCommandAction) => void;
  slashModeRef: React.MutableRefObject<boolean>;
  modelName: string;
  disabled?: boolean;
  width?: number;
  placeholder?: string;
}

export const InputBox = memo(function InputBox({
  onSubmit,
  onSlashCommand,
  slashModeRef,
  modelName,
  disabled = false,
  width = 50,
  placeholder = 'Ask anything...',
}: InputBoxProps) {
  const [value, setValue] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [menuIndex, setMenuIndex] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    if (disabled) return;
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(interval);
  }, [disabled]);

  const isSlashMode = value.startsWith('/') && !value.includes('\n');
  const filteredCommands = useMemo(
    () => (isSlashMode ? filterCommands(value) : []),
    [isSlashMode, value],
  );

  const prevSlashMode = useRef(false);
  if (prevSlashMode.current !== isSlashMode) {
    prevSlashMode.current = isSlashMode;
    slashModeRef.current = isSlashMode;
  }

  useInput(
    (input, key) => {
      if (disabled) return;

      if (isSlashMode && filteredCommands.length > 0) {
        if (key.upArrow) {
          setMenuIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (key.downArrow) {
          setMenuIndex((i) => Math.min(filteredCommands.length - 1, i + 1));
          return;
        }
        if (key.tab) {
          const selected = filteredCommands[menuIndex];
          if (selected) {
            setValue(`/${selected.name}`);
            setCursorPos(selected.name.length + 1);
          }
          return;
        }
        if (key.return && !key.shift) {
          const selected = filteredCommands[menuIndex];
          if (selected) {
            onSlashCommand(selected.action);
            setValue('');
            setCursorPos(0);
            setMenuIndex(0);
          }
          return;
        }
      }

      if (key.return && !key.shift) {
        if (value.trim()) {
          onSubmit(value);
          setValue('');
          setCursorPos(0);
          setMenuIndex(0);
        }
        return;
      }

      if (key.escape && isSlashMode) {
        setValue('');
        setCursorPos(0);
        setMenuIndex(0);
        return;
      }

      if ((key.return && key.shift) || (key.ctrl && input === 'j')) {
        setValue((v) => `${v.slice(0, cursorPos)}\n${v.slice(cursorPos)}`);
        setCursorPos((p) => p + 1);
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          setValue((v) => v.slice(0, cursorPos - 1) + v.slice(cursorPos));
          setCursorPos((p) => p - 1);
          setMenuIndex(0);
        }
        return;
      }

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

      if (key.ctrl && input === 'a') {
        setCursorPos(0);
        return;
      }

      if (key.ctrl && input === 'e') {
        setCursorPos(value.length);
        return;
      }

      if (key.ctrl && input === 'u') {
        setValue('');
        setCursorPos(0);
        setMenuIndex(0);
        return;
      }

      if (input && !key.ctrl && !key.meta && input.length === 1) {
        const charCode = input.charCodeAt(0);
        if (charCode >= 32) {
          setValue((v) => v.slice(0, cursorPos) + input + v.slice(cursorPos));
          setCursorPos((p) => p + 1);
          setMenuIndex(0);
        }
      }
    },
    { isActive: !disabled },
  );

  const beforeCursor = value.slice(0, cursorPos);
  const atCursor = value[cursorPos] || ' ';
  const afterCursor = value.slice(cursorPos + 1);
  const isEmpty = value.length === 0;

  const menuHeight =
    filteredCommands.length > 0 ? Math.min(filteredCommands.length, 5) + 2 : 3;

  // Blinking cursor character
  const cursor = cursorVisible ? '▋' : ' ';

  return (
    <Box flexDirection="column" width={width}>
      {isSlashMode && (
        <Box position="absolute" marginTop={-menuHeight} marginLeft={0}>
          <SlashCommandMenu
            commands={filteredCommands}
            selectedIndex={menuIndex}
            width={width - 2}
          />
        </Box>
      )}
      {/* Input area with border on all sides */}
      <Box
        flexDirection="column"
        marginTop={1}
        borderStyle="round"
        borderColor="#eea154ff"
        backgroundColor="#2a2a2a"
        paddingX={2}
        paddingY={1}
      >
        {/* Input line */}
        <Box>
          {isEmpty && !disabled ? (
            <Text>
              <Text color="white">{cursor}</Text>
              <Text dimColor>{placeholder}</Text>
            </Text>
          ) : (
            <Text
              color={disabled ? 'gray' : isSlashMode ? '#eea154ff' : 'white'}
            >
              {beforeCursor}
              {!disabled && <Text color="white">{cursor}</Text>}
              {atCursor !== ' ' && atCursor}
              {afterCursor.replace(/\n/g, '↵')}
            </Text>
          )}
        </Box>
      </Box>
      {/* Footer: Model name on left, shortcuts on right */}
      <Box justifyContent="space-between" paddingX={1} marginTop={0}>
        <Box>
          <Text color="#eea154ff">◆ </Text>
          <Text color="white">{modelName}</Text>
        </Box>
        <Box>
          <Text color="white" bold>
            /
          </Text>
          <Text dimColor> commands </Text>
          <Text color="white" bold>
            ctrl+c
          </Text>
          <Text dimColor> exit</Text>
        </Box>
      </Box>
    </Box>
  );
});

import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { memo, useMemo, useReducer, useRef } from 'react';
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

// Static cursor character
const CURSOR = '▋';

// Batched state to reduce re-renders
interface InputState {
  value: string;
  cursorPos: number;
  menuIndex: number;
}

type InputAction =
  | { type: 'SET_VALUE'; value: string; cursorPos: number }
  | { type: 'SET_CURSOR'; cursorPos: number }
  | { type: 'SET_MENU_INDEX'; menuIndex: number }
  | { type: 'RESET' }
  | { type: 'INSERT_CHAR'; char: string }
  | { type: 'DELETE_CHAR' }
  | { type: 'INSERT_NEWLINE' };

function inputReducer(state: InputState, action: InputAction): InputState {
  switch (action.type) {
    case 'SET_VALUE':
      return { ...state, value: action.value, cursorPos: action.cursorPos };
    case 'SET_CURSOR':
      return { ...state, cursorPos: action.cursorPos };
    case 'SET_MENU_INDEX':
      return { ...state, menuIndex: action.menuIndex };
    case 'RESET':
      return { value: '', cursorPos: 0, menuIndex: 0 };
    case 'INSERT_CHAR': {
      const newValue =
        state.value.slice(0, state.cursorPos) +
        action.char +
        state.value.slice(state.cursorPos);
      return {
        value: newValue,
        cursorPos: state.cursorPos + 1,
        menuIndex: 0,
      };
    }
    case 'DELETE_CHAR': {
      if (state.cursorPos <= 0) return state;
      const newValue =
        state.value.slice(0, state.cursorPos - 1) +
        state.value.slice(state.cursorPos);
      return {
        value: newValue,
        cursorPos: state.cursorPos - 1,
        menuIndex: 0,
      };
    }
    case 'INSERT_NEWLINE': {
      const newValue =
        state.value.slice(0, state.cursorPos) +
        '\n' +
        state.value.slice(state.cursorPos);
      return {
        ...state,
        value: newValue,
        cursorPos: state.cursorPos + 1,
      };
    }
    default:
      return state;
  }
}

const initialState: InputState = {
  value: '',
  cursorPos: 0,
  menuIndex: 0,
};

export const InputBox = memo(function InputBox({
  onSubmit,
  onSlashCommand,
  slashModeRef,
  modelName,
  disabled = false,
  width = 50,
  placeholder = 'Ask anything...',
}: InputBoxProps) {
  const [state, dispatch] = useReducer(inputReducer, initialState);
  const { value, cursorPos, menuIndex } = state;

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
          dispatch({
            type: 'SET_MENU_INDEX',
            menuIndex: Math.max(0, menuIndex - 1),
          });
          return;
        }
        if (key.downArrow) {
          dispatch({
            type: 'SET_MENU_INDEX',
            menuIndex: Math.min(filteredCommands.length - 1, menuIndex + 1),
          });
          return;
        }
        if (key.tab) {
          const selected = filteredCommands[menuIndex];
          if (selected) {
            dispatch({
              type: 'SET_VALUE',
              value: `/${selected.name}`,
              cursorPos: selected.name.length + 1,
            });
          }
          return;
        }
        if (key.return && !key.shift) {
          const selected = filteredCommands[menuIndex];
          if (selected) {
            onSlashCommand(selected.action);
            dispatch({ type: 'RESET' });
          }
          return;
        }
      }

      if (key.return && !key.shift) {
        if (value.trim()) {
          onSubmit(value);
          dispatch({ type: 'RESET' });
        }
        return;
      }

      if (key.escape && isSlashMode) {
        dispatch({ type: 'RESET' });
        return;
      }

      if ((key.return && key.shift) || (key.ctrl && input === 'j')) {
        dispatch({ type: 'INSERT_NEWLINE' });
        return;
      }

      if (key.backspace || key.delete) {
        dispatch({ type: 'DELETE_CHAR' });
        return;
      }

      if (key.leftArrow) {
        if (key.ctrl) {
          const before = value.slice(0, cursorPos);
          const match = before.match(/\S+\s*$/);
          dispatch({
            type: 'SET_CURSOR',
            cursorPos: match ? cursorPos - match[0].length : 0,
          });
        } else {
          dispatch({
            type: 'SET_CURSOR',
            cursorPos: Math.max(0, cursorPos - 1),
          });
        }
        return;
      }

      if (key.rightArrow) {
        if (key.ctrl) {
          const after = value.slice(cursorPos);
          const match = after.match(/^\s*\S+/);
          dispatch({
            type: 'SET_CURSOR',
            cursorPos: match ? cursorPos + match[0].length : value.length,
          });
        } else {
          dispatch({
            type: 'SET_CURSOR',
            cursorPos: Math.min(value.length, cursorPos + 1),
          });
        }
        return;
      }

      if (key.ctrl && input === 'a') {
        dispatch({ type: 'SET_CURSOR', cursorPos: 0 });
        return;
      }

      if (key.ctrl && input === 'e') {
        dispatch({ type: 'SET_CURSOR', cursorPos: value.length });
        return;
      }

      if (key.ctrl && input === 'u') {
        dispatch({ type: 'RESET' });
        return;
      }

      if (input && !key.ctrl && !key.meta && input.length === 1) {
        const charCode = input.charCodeAt(0);
        if (charCode >= 32) {
          dispatch({ type: 'INSERT_CHAR', char: input });
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
              <Text color="white">{CURSOR}</Text>
              <Text dimColor>{placeholder}</Text>
            </Text>
          ) : (
            <Text
              color={disabled ? 'gray' : isSlashMode ? '#eea154ff' : 'white'}
            >
              {beforeCursor}
              {!disabled && <Text color="white">{CURSOR}</Text>}
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

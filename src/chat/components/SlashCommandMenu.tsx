import { useOnClick, useOnMouseMove } from '@ink-tools/ink-mouse';
import { Box, type DOMElement, Text } from 'ink';
import { memo, useMemo, useRef } from 'react';
import type { SlashCommand } from '../utils/slashCommands.js';
import { useTheme } from '../utils/ThemeContext.js';

const VISIBLE_ROWS = 5;

interface MenuItemProps {
  cmd: SlashCommand;
  isSelected: boolean;
  width: number;
  index: number;
  accent: string;
  textPrimary: string;
  onHover: (index: number) => void;
  onClick: (index: number) => void;
}

const MenuItem = memo(function MenuItem({
  cmd,
  isSelected,
  width,
  index,
  accent,
  textPrimary,
  onHover,
  onClick,
}: MenuItemProps) {
  const rowRef = useRef<DOMElement>(null);
  const nameColWidth = 15;
  const shortcutWidth = cmd.shortcut ? cmd.shortcut.length + 2 : 0;
  const nameText = `/${cmd.name}`.padEnd(nameColWidth);
  const descWidth = width - nameColWidth - shortcutWidth - 6;
  const descText =
    cmd.description.length > descWidth
      ? `${cmd.description.slice(0, descWidth - 3)}...`
      : cmd.description.padEnd(descWidth);

  useOnMouseMove(rowRef, () => {
    onHover(index);
  });

  useOnClick(rowRef, () => {
    onClick(index);
  });

  if (isSelected) {
    return (
      <Box ref={rowRef} backgroundColor={accent} paddingX={1}>
        <Text color="white" bold>
          {nameText}
        </Text>
        <Text color="white" bold>
          {descText}
        </Text>
        {cmd.shortcut && (
          <Text color="white" bold>
            {cmd.shortcut}
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box ref={rowRef} paddingX={1}>
      <Text color={textPrimary}>{nameText}</Text>
      <Text dimColor>{descText}</Text>
      {cmd.shortcut && <Text dimColor>{cmd.shortcut}</Text>}
    </Box>
  );
});

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
  width: number;
  onHover?: (index: number) => void;
  onSelect?: (index: number) => void;
}

export const SlashCommandMenu = memo(function SlashCommandMenu({
  commands,
  selectedIndex,
  width,
  onHover,
  onSelect,
}: SlashCommandMenuProps) {
  const theme = useTheme();
  const menuWidth = width;

  const { visibleCommands, startIndex } = useMemo(() => {
    let start = 0;
    if (commands.length > VISIBLE_ROWS) {
      start = Math.max(
        0,
        Math.min(
          selectedIndex - Math.floor(VISIBLE_ROWS / 2),
          commands.length - VISIBLE_ROWS,
        ),
      );
    }
    return {
      visibleCommands: commands.slice(start, start + VISIBLE_ROWS),
      startIndex: start,
    };
  }, [commands, selectedIndex]);

  const handleHover = (index: number) => {
    onHover?.(index);
  };

  const handleClick = (index: number) => {
    onSelect?.(index);
  };

  if (commands.length === 0) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        width={menuWidth}
        flexDirection="column"
      >
        <Text dimColor>No matching commands</Text>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor={theme.accent}
      backgroundColor={theme.secondaryBg}
      flexDirection="column"
      width={menuWidth}
    >
      {visibleCommands.map((cmd, i) => (
        <MenuItem
          key={cmd.name}
          cmd={cmd}
          isSelected={startIndex + i === selectedIndex}
          width={menuWidth}
          index={startIndex + i}
          accent={theme.accent}
          textPrimary={theme.textPrimary}
          onHover={handleHover}
          onClick={handleClick}
        />
      ))}
    </Box>
  );
});

import { useOnClick, useOnMouseMove } from '@ink-tools/ink-mouse';
import { Box, type DOMElement, Text } from 'ink';
import { memo, useMemo, useRef } from 'react';
import type { SlashCommand } from '../utils/slashCommands.js';

const VISIBLE_ROWS = 5;

interface MenuItemProps {
  cmd: SlashCommand;
  isSelected: boolean;
  width: number;
  index: number;
  onHover: (index: number) => void;
  onClick: (index: number) => void;
}

const MenuItem = memo(function MenuItem({
  cmd,
  isSelected,
  width,
  index,
  onHover,
  onClick,
}: MenuItemProps) {
  const rowRef = useRef<DOMElement>(null);
  const nameColWidth = 15;
  const nameText = `/${cmd.name}`.padEnd(nameColWidth);
  const descWidth = width - nameColWidth - 6;
  const descText =
    cmd.description.length > descWidth
      ? `${cmd.description.slice(0, descWidth - 3)}...`
      : cmd.description;

  useOnMouseMove(rowRef, () => {
    onHover(index);
  });

  useOnClick(rowRef, () => {
    onClick(index);
  });

  if (isSelected) {
    return (
      <Box ref={rowRef} backgroundColor="#eea154ff" paddingX={1}>
        <Text color="white" bold>
          {nameText}
          {descText}
        </Text>
      </Box>
    );
  }

  return (
    <Box ref={rowRef} paddingX={1}>
      <Text color="white">{nameText}</Text>
      <Text dimColor>{descText}</Text>
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
      borderColor="#eea154ff"
      backgroundColor="#2a2a2a"
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
          onHover={handleHover}
          onClick={handleClick}
        />
      ))}
    </Box>
  );
});

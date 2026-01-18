import { Box, Text } from 'ink';
import { memo, useMemo } from 'react';
import type { SlashCommand } from '../utils/slashCommands.js';

const VISIBLE_ROWS = 5;

interface MenuItemProps {
  cmd: SlashCommand;
  isSelected: boolean;
  width: number;
}

const MenuItem = memo(function MenuItem({
  cmd,
  isSelected,
  width,
}: MenuItemProps) {
  const nameColWidth = 15;
  const nameText = `/${cmd.name}`.padEnd(nameColWidth);
  const descWidth = width - nameColWidth - 4;
  const descText =
    cmd.description.length > descWidth
      ? `${cmd.description.slice(0, descWidth - 3)}...`
      : cmd.description.padEnd(descWidth);

  if (isSelected) {
    return (
      <Box backgroundColor="#eea154ff" paddingX={1}>
        <Text color="black" bold>
          {nameText}
          {descText}
        </Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text color="white">{nameText}</Text>
      <Text dimColor>{descText}</Text>
    </Box>
  );
});

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
  width: number;
}

export const SlashCommandMenu = memo(function SlashCommandMenu({
  commands,
  selectedIndex,
  width,
}: SlashCommandMenuProps) {
  const menuWidth = Math.min(width, 60);

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
      flexDirection="column"
      width={menuWidth}
    >
      {visibleCommands.map((cmd, i) => (
        <MenuItem
          key={cmd.name}
          cmd={cmd}
          isSelected={startIndex + i === selectedIndex}
          width={menuWidth}
        />
      ))}
    </Box>
  );
});

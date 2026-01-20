import { useOnClick, useOnMouseMove } from '@ink-tools/ink-mouse';
import { Box, type DOMElement, Text, useInput } from 'ink';
import { memo, useRef, useState } from 'react';

interface MenuItem {
  label: string;
  description: string;
  action: string;
}

interface MessageContextMenuProps {
  onSelect: (action: string) => void;
  onClose: () => void;
  width?: number;
}

const menuItems: MenuItem[] = [
  { label: 'Copy', description: 'message text to clipboard', action: 'copy' },
  { label: 'Exit', description: 'close this menu', action: 'exit' },
];

interface MenuItemRowProps {
  item: MenuItem;
  index: number;
  isSelected: boolean;
  rowWidth: number;
  onHover: (index: number) => void;
  onClick: (action: string) => void;
}

const MenuItemRow = memo(function MenuItemRow({
  item,
  index,
  isSelected,
  rowWidth,
  onHover,
  onClick,
}: MenuItemRowProps) {
  const rowRef = useRef<DOMElement>(null);

  useOnMouseMove(rowRef, () => {
    onHover(index);
  });

  useOnClick(rowRef, () => {
    onClick(item.action);
  });

  return (
    <Box
      ref={rowRef}
      backgroundColor={isSelected ? '#eea154ff' : undefined}
      width={rowWidth}
      justifyContent="space-between"
      paddingX={1}
    >
      <Text color={isSelected ? 'white' : 'white'} bold={isSelected}>
        {item.label}
      </Text>
      {isSelected ? (
        <Text color="white">{item.description}</Text>
      ) : (
        <Text dimColor>{item.description}</Text>
      )}
    </Box>
  );
});

export const MessageContextMenu = memo(function MessageContextMenu({
  onSelect,
  onClose,
  width = 50,
}: MessageContextMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const selected = menuItems[selectedIndex];
      if (selected) {
        if (selected.action === 'exit') {
          onClose();
        } else {
          onSelect(selected.action);
        }
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(menuItems.length - 1, i + 1));
    }
  });

  const handleHover = (index: number) => {
    setSelectedIndex(index);
  };

  const handleClick = (action: string) => {
    if (action === 'exit') {
      onClose();
    } else {
      onSelect(action);
    }
  };

  const bgColor = '#1e1e1e';
  const menuWidth = Math.min(width, 50);

  return (
    <Box
      flexDirection="column"
      width={menuWidth}
      borderStyle="round"
      borderColor="#eea154ff"
      backgroundColor={bgColor}
    >
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="white">
          Message Actions
        </Text>
        <Text dimColor>esc</Text>
      </Box>

      {/* Divider */}
      <Box paddingX={1}>
        <Text dimColor>{'─'.repeat(menuWidth - 4)}</Text>
      </Box>

      {/* Menu items */}
      <Box flexDirection="column" paddingBottom={1}>
        {menuItems.map((item, index) => (
          <MenuItemRow
            key={item.action}
            item={item}
            index={index}
            isSelected={index === selectedIndex}
            rowWidth={menuWidth - 2}
            onHover={handleHover}
            onClick={handleClick}
          />
        ))}
      </Box>
    </Box>
  );
});

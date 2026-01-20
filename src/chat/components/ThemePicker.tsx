import { useOnClick, useOnMouseMove, useOnWheel } from '@ink-tools/ink-mouse';
import { Box, type DOMElement, Text, useInput, useStdout } from 'ink';
import { memo, useRef, useState } from 'react';
import { THEMES, type Theme } from '../utils/themes.js';

const MAX_VISIBLE_THEMES = 12;

interface ThemePickerProps {
  currentTheme: string;
  onSelect: (themeName: string) => void;
  onClose: () => void;
}

interface ThemeRowProps {
  theme: Theme;
  isSelected: boolean;
  isCurrent: boolean;
  rowWidth: number;
  selectedTheme: Theme;
  onHover: () => void;
  onClick: () => void;
}

const ThemeRow = memo(function ThemeRow({
  theme,
  isSelected,
  isCurrent,
  rowWidth,
  selectedTheme,
  onHover,
  onClick,
}: ThemeRowProps) {
  const rowRef = useRef<DOMElement>(null);

  useOnMouseMove(rowRef, onHover);
  useOnClick(rowRef, onClick);

  return (
    <Box
      ref={rowRef}
      backgroundColor={isSelected ? selectedTheme.accent : undefined}
      width={rowWidth}
      paddingX={1}
    >
      <Text color={isSelected ? 'white' : undefined} bold={isSelected}>
        {isCurrent && !isSelected && (
          <Text color={selectedTheme.accent}>● </Text>
        )}
        {isCurrent && isSelected && <Text color="white">● </Text>}
        {!isCurrent && '  '}
        {theme.displayName}
      </Text>
    </Box>
  );
});

export function ThemePicker({
  currentTheme,
  onSelect,
  onClose,
}: ThemePickerProps) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;
  const listRef = useRef<DOMElement>(null);

  const currentIndex = THEMES.findIndex((t) => t.name === currentTheme);
  const [selectedIndex, setSelectedIndex] = useState(
    currentIndex >= 0 ? currentIndex : 0,
  );

  const visibleCount = Math.min(MAX_VISIBLE_THEMES, height - 10);

  const handleHover = (actualIndex: number) => {
    setSelectedIndex(actualIndex);
  };

  const handleClick = (actualIndex: number) => {
    const selected = THEMES[actualIndex];
    if (selected) {
      onSelect(selected.name);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const selected = THEMES[selectedIndex];
      if (selected) {
        onSelect(selected.name);
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(THEMES.length - 1, i + 1));
    }

    if (key.pageUp) {
      setSelectedIndex((i) => Math.max(0, i - visibleCount));
    }

    if (key.pageDown) {
      setSelectedIndex((i) => Math.min(THEMES.length - 1, i + visibleCount));
    }
  });

  useOnWheel(listRef, (event) => {
    if (event.button === 'wheel-up') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (event.button === 'wheel-down') {
      setSelectedIndex((i) => Math.min(THEMES.length - 1, i + 1));
    }
  });

  let startIndex = 0;
  if (selectedIndex >= visibleCount) {
    startIndex = Math.min(
      selectedIndex - Math.floor(visibleCount / 2),
      THEMES.length - visibleCount,
    );
  }
  startIndex = Math.max(0, startIndex);

  const visibleThemes = THEMES.slice(startIndex, startIndex + visibleCount);
  const selectedTheme = THEMES[selectedIndex] ?? THEMES[0];
  const rowWidth = Math.min(60, width - 8);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      justifyContent="center"
      alignItems="center"
      backgroundColor={selectedTheme.background}
    >
      <Box
        flexDirection="column"
        width={Math.min(64, width - 4)}
        borderStyle="round"
        borderColor={selectedTheme.accent}
      >
        {/* Header */}
        <Box paddingX={2} paddingTop={1} justifyContent="space-between">
          <Text bold color={selectedTheme.textPrimary}>
            Themes
          </Text>
          <Text dimColor>esc</Text>
        </Box>

        {/* Divider */}
        <Box paddingX={1}>
          <Text dimColor>{'─'.repeat(Math.min(60, width - 8))}</Text>
        </Box>

        {/* Theme list with scroll */}
        <Box ref={listRef} flexDirection="column" paddingY={1}>
          {visibleThemes.map((theme, i) => {
            const actualIndex = startIndex + i;
            return (
              <ThemeRow
                key={theme.name}
                theme={theme}
                isSelected={actualIndex === selectedIndex}
                isCurrent={theme.name === currentTheme}
                rowWidth={rowWidth}
                selectedTheme={selectedTheme}
                onHover={() => handleHover(actualIndex)}
                onClick={() => handleClick(actualIndex)}
              />
            );
          })}
        </Box>

        {/* Footer with scroll indicator */}
        <Box paddingX={2} paddingBottom={1} justifyContent="space-between">
          <Text dimColor>j/k or arrows to navigate</Text>
          {THEMES.length > visibleCount && (
            <Text dimColor>
              {startIndex + 1}-
              {Math.min(startIndex + visibleCount, THEMES.length)}/
              {THEMES.length}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

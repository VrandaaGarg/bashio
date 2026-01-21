import { Box, Text } from 'ink';
import { memo } from 'react';
import { useTheme } from '../utils/ThemeContext.js';

interface SessionHeaderProps {
  sessionTitle: string;
  width: number;
}

export const SessionHeader = memo(function SessionHeader({
  sessionTitle,
  width,
}: SessionHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      borderStyle="single"
      borderLeft={false}
      borderRight={false}
      borderTop={false}
      borderBottom
      borderColor={theme.accent}
      backgroundColor={theme.secondaryBg}
      paddingX={1}
      paddingY={1}
      gap={1}
      width={width}
    >
      <Text color={theme.accent}>#</Text>
      <Text color={theme.textPrimary}>{sessionTitle}</Text>
    </Box>
  );
});

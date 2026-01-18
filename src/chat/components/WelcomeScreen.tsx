import { Box, Text } from 'ink';
import type { ReactNode } from 'react';
import { memo } from 'react';
import { CatIcon } from './CatIcon.js';

const BASHIO_ASCII = `
██████╗  █████╗ ███████╗██╗  ██╗██╗ ██████╗ 
██╔══██╗██╔══██╗██╔════╝██║  ██║██║██╔═══██╗
██████╔╝███████║███████╗███████║██║██║   ██║
██╔══██╗██╔══██║╚════██║██╔══██║██║██║   ██║
██████╔╝██║  ██║███████║██║  ██║██║╚██████╔╝
╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝ 
`.trim();

interface WelcomeScreenProps {
  width: number;
  height: number;
  children?: ReactNode;
}

export const WelcomeScreen = memo(function WelcomeScreen({
  width,
  height,
  children,
}: WelcomeScreenProps) {
  const lines = BASHIO_ASCII.split('\n');

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      justifyContent="center"
      alignItems="center"
    >
      <Box flexDirection="column" alignItems="center">
        {/* Cat Icon */}
        <CatIcon />
        {/* Gap between cat and text */}
        <Box marginTop={1} />
        {/* BASHIO text */}
        {lines.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static ASCII art lines
          <Text key={`ascii-${i}`} color="white" bold>
            {line}
          </Text>
        ))}
        {/* Input box below ASCII art */}
        {children && <Box marginTop={2}>{children}</Box>}
      </Box>
    </Box>
  );
});

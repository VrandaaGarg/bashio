import { Box, Text } from 'ink';
import { memo, useMemo } from 'react';
import { useTheme } from '../utils/ThemeContext.js';

// Cat ASCII art with colors:
// Theme accent - face/body
// #241F33 - Dark purple (inner dark areas like eyes)
// #FEFEFE - White (muzzle/mouth)
// #000 or black - Border/outline

// Character mapping:
// █ = black border
// ░ = face fill (theme accent)
// ▓ = dark areas (dark purple #241F33)
// ▒ = white muzzle (#FEFEFE)

// Compact cat face - manually designed for clarity
const CAT_LINES = [
  '  ██      ██  ',
  ' ██░░████░░██ ',
  '██░░░░░░░░░░██',
  '██░▓░░░░░░▓░██',
  '██░░░▒▒▒▒░░░██',
  '██░░▒▒▓▓▒▒░░██',
  ' ██░▒▒▒▒▒▒░██ ',
  '  ██████████  ',
];

export const CatIcon = memo(function CatIcon() {
  const theme = useTheme();

  const colors = useMemo(
    () => ({
      '█': 'black',
      '░': theme.accent,
      '▓': '#33221fff',
      '▒': '#fbfaf7ff',
    }),
    [theme.accent],
  );

  return (
    <Box flexDirection="column" alignItems="center">
      {CAT_LINES.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static ASCII art
        <Text key={`line-${i}`}>
          {line.split('').map((char, j) => {
            const color = colors[char as keyof typeof colors];
            if (color) {
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static char
                <Text key={`char-${i}-${j}`} color={color}>
                  █
                </Text>
              );
            }
            // Space - transparent
            // biome-ignore lint/suspicious/noArrayIndexKey: Static char
            return <Text key={`char-${i}-${j}`}> </Text>;
          })}
        </Text>
      ))}
    </Box>
  );
});

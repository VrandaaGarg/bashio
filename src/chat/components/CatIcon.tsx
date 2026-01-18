import { Box, Text } from 'ink';
import { memo } from 'react';

// Cat ASCII art with colors:
// #eea154ff - Grayish purple (face/body)
// #241F33 - Dark purple (inner dark areas like eyes)
// #FEFEFE - White (muzzle/mouth)
// #000 or black - Border/outline

// Character mapping:
// █ = black border
// ░ = face fill (gray/purple #eea154ff)
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

// Color mapping
const COLORS: Record<string, string> = {
  '█': 'black',
  '░': '#eea154ff',
  '▓': '#33221fff',
  '▒': '#fbfaf7ff',
};

export const CatIcon = memo(function CatIcon() {
  return (
    <Box flexDirection="column" alignItems="center">
      {CAT_LINES.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static ASCII art
        <Text key={`line-${i}`}>
          {line.split('').map((char, j) => {
            const color = COLORS[char];
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

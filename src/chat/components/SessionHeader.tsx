import { Box, Text } from 'ink';
import { memo } from 'react';

interface SessionHeaderProps {
  sessionTitle: string;
  width: number;
}

export const SessionHeader = memo(function SessionHeader({
  sessionTitle,
  width,
}: SessionHeaderProps) {
  return (
    <Box
      borderStyle="single"
      borderLeft
      borderRight={false}
      borderTop={false}
      borderBottom={false}
      borderColor="#eea154ff"
      backgroundColor="#2a2a2a"
      paddingX={1}
      paddingY={1}
      gap={1}
      width={width}
    >
      <Text color="#eea154ff">#</Text>
      <Text color="white">{sessionTitle}</Text>
    </Box>
  );
});

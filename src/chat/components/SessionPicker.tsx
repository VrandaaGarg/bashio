import { Box, Text, useInput, useStdout } from 'ink';
import { useState } from 'react';
import {
  deleteSession,
  listSessions,
  type SessionMeta,
} from '../utils/sessions.js';

interface SessionPickerProps {
  onSelect: (sessionId: string | null) => void; // null means new session
  onClose: () => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SessionPicker({ onSelect, onClose }: SessionPickerProps) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;

  const [sessions, setSessions] = useState<SessionMeta[]>(() => listSessions());
  const [selectedIndex, setSelectedIndex] = useState(0);

  // +1 for "New Chat" option at the top
  const totalItems = sessions.length + 1;

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      if (selectedIndex === 0) {
        onSelect(null); // New session
      } else {
        const session = sessions[selectedIndex - 1];
        if (session) {
          onSelect(session.id);
        }
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(totalItems - 1, i + 1));
    }

    // Ctrl+D to delete selected session
    if (key.ctrl && input === 'd') {
      if (selectedIndex > 0) {
        const session = sessions[selectedIndex - 1];
        if (session) {
          deleteSession(session.id);
          setSessions(listSessions());
          // Adjust selection if needed
          if (selectedIndex >= sessions.length) {
            setSelectedIndex(Math.max(0, sessions.length - 1));
          }
        }
      }
    }
  });

  const listHeight = height - 8;
  const visibleCount = Math.max(1, listHeight);

  let startIndex = 0;
  if (selectedIndex >= visibleCount) {
    startIndex = selectedIndex - visibleCount + 1;
  }

  const allItems: Array<
    { type: 'new' } | { type: 'session'; session: SessionMeta }
  > = [
    { type: 'new' },
    ...sessions.map((session) => ({ type: 'session' as const, session })),
  ];

  const visibleItems = allItems.slice(startIndex, startIndex + visibleCount);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      justifyContent="center"
      alignItems="center"
    >
      <Box
        flexDirection="column"
        width={Math.min(80, width - 4)}
        borderStyle="double"
        borderColor="cyan"
      >
        {/* Header */}
        <Box paddingX={2} paddingY={1} justifyContent="space-between">
          <Text bold color="cyan">
            Chat Sessions
          </Text>
          <Text dimColor>Esc: close | Enter: select | Ctrl+D: delete</Text>
        </Box>

        {/* Divider */}
        <Box paddingX={1}>
          <Text dimColor>{'─'.repeat(Math.min(76, width - 8))}</Text>
        </Box>

        {/* Session list */}
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          {visibleItems.map((item, i) => {
            const actualIndex = startIndex + i;
            const isSelected = actualIndex === selectedIndex;

            if (item.type === 'new') {
              return (
                <Box key="new-chat">
                  <Text
                    color={isSelected ? 'cyan' : 'green'}
                    bold={isSelected}
                    inverse={isSelected}
                  >
                    {isSelected ? ' > ' : '   '}+ New Chat
                  </Text>
                </Box>
              );
            }

            const { session } = item;
            const titleWidth = Math.min(40, width - 30);
            const title =
              session.title.length > titleWidth
                ? `${session.title.slice(0, titleWidth - 3)}...`
                : session.title.padEnd(titleWidth);

            return (
              <Box key={session.id}>
                <Text
                  color={isSelected ? 'cyan' : undefined}
                  bold={isSelected}
                  inverse={isSelected}
                >
                  {isSelected ? ' > ' : '   '}
                  {title}
                </Text>
                <Text dimColor={!isSelected}>
                  {' '}
                  {session.messageCount} msgs | {formatDate(session.updatedAt)}
                </Text>
              </Box>
            );
          })}

          {sessions.length === 0 && (
            <Box paddingY={1}>
              <Text dimColor>No previous sessions</Text>
            </Box>
          )}
        </Box>

        {/* Footer with scroll indicator */}
        {totalItems > visibleCount && (
          <Box paddingX={2} paddingBottom={1}>
            <Text dimColor>
              Showing {startIndex + 1}-
              {Math.min(startIndex + visibleCount, totalItems)} of {totalItems}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

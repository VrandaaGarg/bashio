import { useOnClick, useOnMouseMove } from '@ink-tools/ink-mouse';
import { Box, type DOMElement, Text, useInput, useStdout } from 'ink';
import { memo, useRef, useState } from 'react';
import {
  deleteSession,
  listSessions,
  type SessionMeta,
} from '../utils/sessions.js';
import { useTheme } from '../utils/ThemeContext.js';

interface SessionPickerProps {
  onSelect: (sessionId: string | null) => void;
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

interface SessionRowProps {
  isNew?: boolean;
  session?: SessionMeta;
  isSelected: boolean;
  rowWidth: number;
  titleWidth: number;
  index: number;
  accent: string;
  onHover: (index: number) => void;
  onClick: (index: number) => void;
}

const SessionRow = memo(function SessionRow({
  isNew,
  session,
  isSelected,
  rowWidth,
  titleWidth,
  index,
  accent,
  onHover,
  onClick,
}: SessionRowProps) {
  const rowRef = useRef<DOMElement>(null);

  useOnMouseMove(rowRef, () => {
    onHover(index);
  });

  useOnClick(rowRef, () => {
    onClick(index);
  });

  if (isNew) {
    return (
      <Box
        ref={rowRef}
        backgroundColor={isSelected ? accent : undefined}
        width={rowWidth}
        paddingX={1}
      >
        <Text color={isSelected ? 'white' : 'green'} bold={isSelected}>
          {isSelected ? ' > ' : '   '}+ New Chat
        </Text>
      </Box>
    );
  }

  if (!session) return null;

  const title =
    session.title.length > titleWidth
      ? `${session.title.slice(0, titleWidth - 3)}...`
      : session.title.padEnd(titleWidth);

  return (
    <Box
      ref={rowRef}
      backgroundColor={isSelected ? accent : undefined}
      width={rowWidth}
      paddingX={1}
    >
      <Text color={isSelected ? 'white' : undefined} bold={isSelected}>
        {isSelected ? ' > ' : '   '}
        {title}
      </Text>
      <Text color={isSelected ? 'white' : undefined} dimColor={!isSelected}>
        {' '}
        {session.messageCount} msgs | {formatDate(session.updatedAt)}
      </Text>
    </Box>
  );
});

export function SessionPicker({ onSelect, onClose }: SessionPickerProps) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;

  const [sessions, setSessions] = useState<SessionMeta[]>(() => listSessions());
  const [selectedIndex, setSelectedIndex] = useState(0);

  const totalItems = sessions.length + 1;

  const handleSelect = (index: number) => {
    if (index === 0) {
      onSelect(null);
    } else {
      const session = sessions[index - 1];
      if (session) {
        onSelect(session.id);
      }
    }
  };

  const handleHover = (index: number) => {
    setSelectedIndex(index);
  };

  const handleClick = (index: number) => {
    handleSelect(index);
  };

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      handleSelect(selectedIndex);
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(totalItems - 1, i + 1));
    }

    if (key.ctrl && input === 'd') {
      if (selectedIndex > 0) {
        const session = sessions[selectedIndex - 1];
        if (session) {
          deleteSession(session.id);
          setSessions(listSessions());
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

  const theme = useTheme();
  const rowWidth = Math.min(76, width - 6);
  const titleWidth = Math.min(40, width - 30);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      justifyContent="center"
      alignItems="center"
      backgroundColor={theme.background}
    >
      <Box
        flexDirection="column"
        width={Math.min(80, width - 4)}
        borderStyle="double"
        borderColor={theme.accent}
      >
        {/* Header */}
        <Box paddingX={2} paddingY={1} justifyContent="space-between">
          <Text bold color={theme.accent}>
            Chat Sessions
          </Text>
          <Text dimColor>Esc: close | Enter: select | Ctrl+D: delete</Text>
        </Box>

        {/* Divider */}
        <Box paddingX={1}>
          <Text dimColor>{'─'.repeat(Math.min(76, width - 8))}</Text>
        </Box>

        {/* Session list */}
        <Box flexDirection="column" paddingX={1} paddingY={1}>
          {visibleItems.map((item, i) => {
            const actualIndex = startIndex + i;
            const isSelected = actualIndex === selectedIndex;

            if (item.type === 'new') {
              return (
                <SessionRow
                  key="new-chat"
                  isNew
                  isSelected={isSelected}
                  rowWidth={rowWidth}
                  titleWidth={titleWidth}
                  index={actualIndex}
                  accent={theme.accent}
                  onHover={handleHover}
                  onClick={handleClick}
                />
              );
            }

            return (
              <SessionRow
                key={item.session.id}
                session={item.session}
                isSelected={isSelected}
                rowWidth={rowWidth}
                titleWidth={titleWidth}
                index={actualIndex}
                accent={theme.accent}
                onHover={handleHover}
                onClick={handleClick}
              />
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

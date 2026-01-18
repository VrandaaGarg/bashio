import { highlight } from 'cli-highlight';
import { Box, Text, useInput } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import type React from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ChatMessage } from '../../providers/base.js';

interface MessageListProps {
  messages: ChatMessage[];
  currentResponse: string;
  isLoading: boolean;
  height: number;
  width: number;
}

export interface MessageListHandle {
  scrollBy: (delta: number) => void;
  scrollToBottom: () => void;
}

function parseContent(content: string, maxWidth: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  match = codeBlockRegex.exec(content);
  while (match !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      parts.push(
        <Text key={keyIndex++} wrap="wrap">
          {text}
        </Text>,
      );
    }

    const language = match[1] || 'bash';
    const code = match[2].trim();

    try {
      const highlighted = highlight(code, { language, ignoreIllegals: true });
      parts.push(
        <Box
          key={keyIndex++}
          flexDirection="column"
          marginY={1}
          width={maxWidth - 4}
        >
          <Box
            borderStyle="single"
            borderColor="gray"
            paddingX={1}
            flexDirection="column"
          >
            <Text dimColor>{language}</Text>
            <Text>{highlighted}</Text>
          </Box>
        </Box>,
      );
    } catch {
      parts.push(
        <Box
          key={keyIndex++}
          flexDirection="column"
          marginY={1}
          width={maxWidth - 4}
        >
          <Box
            borderStyle="single"
            borderColor="gray"
            paddingX={1}
            flexDirection="column"
          >
            <Text dimColor>{language}</Text>
            <Text>{code}</Text>
          </Box>
        </Box>,
      );
    }

    lastIndex = match.index + match[0].length;
    match = codeBlockRegex.exec(content);
  }

  if (lastIndex < content.length) {
    parts.push(
      <Text key={keyIndex++} wrap="wrap">
        {content.slice(lastIndex)}
      </Text>,
    );
  }

  return parts.length > 0
    ? parts
    : [
        <Text key={0} wrap="wrap">
          {content}
        </Text>,
      ];
}

function Message({ message, width }: { message: ChatMessage; width: number }) {
  const isUser = message.role === 'user';

  return (
    <Box flexDirection="column" marginY={1} width={width}>
      <Box>
        <Text bold color={isUser ? 'cyan' : 'green'}>
          {isUser ? 'You' : 'Assistant'}:
        </Text>
      </Box>
      <Box flexDirection="column" paddingLeft={2}>
        {parseContent(message.content, width - 4)}
      </Box>
    </Box>
  );
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList(
    { messages, currentResponse, isLoading, height, width },
    ref,
  ) {
    const scrollRef = useRef<ScrollViewRef>(null);

    // Bounded scroll helper
    const boundedScrollBy = (delta: number) => {
      const sv = scrollRef.current;
      if (!sv) return;

      const currentOffset = sv.getScrollOffset();
      const maxOffset = sv.getBottomOffset();

      // Calculate new offset with bounds
      const newOffset = Math.max(0, Math.min(maxOffset, currentOffset + delta));
      sv.scrollTo(newOffset);
    };

    const boundedScrollToBottom = () => {
      const sv = scrollRef.current;
      if (!sv) return;

      const maxOffset = sv.getBottomOffset();
      sv.scrollTo(Math.max(0, maxOffset));
    };

    useImperativeHandle(ref, () => ({
      scrollBy: boundedScrollBy,
      scrollToBottom: boundedScrollToBottom,
    }));

    // Auto-scroll to bottom when new content arrives
    const messagesCount = messages.length;
    const hasResponse = Boolean(currentResponse);
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run on content changes
    useEffect(() => {
      const timer = setTimeout(() => {
        boundedScrollToBottom();
      }, 10);
      return () => clearTimeout(timer);
    }, [messagesCount, hasResponse]);

    // Handle keyboard scroll input
    useInput((input, key) => {
      if (key.upArrow) {
        boundedScrollBy(-1);
      }
      if (key.downArrow) {
        boundedScrollBy(1);
      }
      if (key.pageUp) {
        boundedScrollBy(-Math.floor(height / 2));
      }
      if (key.pageDown) {
        boundedScrollBy(Math.floor(height / 2));
      }
      if (input === 'k' && key.ctrl) {
        boundedScrollBy(-3);
      }
      if (input === 'j' && key.ctrl) {
        boundedScrollBy(3);
      }
    });

    if (messages.length === 0 && !currentResponse) {
      return (
        <Box
          flexDirection="column"
          height={height}
          paddingX={1}
          justifyContent="center"
          alignItems="center"
        >
          <Text dimColor>Start a conversation by typing a message below.</Text>
          <Text dimColor>Press Ctrl+P to switch models.</Text>
        </Box>
      );
    }

    return (
      <Box height={height} paddingX={1} overflow="hidden">
        <ScrollView ref={scrollRef}>
          {messages.map((msg, i) => (
            <Message key={`msg-${i}-${msg.role}`} message={msg} width={width} />
          ))}

          {currentResponse && (
            <Box
              key="streaming"
              flexDirection="column"
              marginY={1}
              width={width}
            >
              <Box>
                <Text bold color="green">
                  Assistant:
                </Text>
              </Box>
              <Box flexDirection="column" paddingLeft={2}>
                {parseContent(currentResponse, width - 4)}
                <Text color="yellow">|</Text>
              </Box>
            </Box>
          )}

          {isLoading && !currentResponse && (
            <Box key="loading" marginY={1}>
              <Text color="yellow">Thinking...</Text>
            </Box>
          )}
        </ScrollView>
      </Box>
    );
  },
);

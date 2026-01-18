import { useOnWheel } from '@ink-tools/ink-mouse';
import { highlight } from 'cli-highlight';
import { Box, type DOMElement, Text, useInput } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import Spinner from 'ink-spinner';
import type React from 'react';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { ChatMessage } from '../../providers/base.js';

interface MessageListProps {
  messages: ChatMessage[];
  currentResponse: string;
  isLoading: boolean;
  height: number;
  width: number;
  slashModeRef: React.MutableRefObject<boolean>;
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

const Message = memo(function Message({
  message,
  width,
}: {
  message: ChatMessage;
  width: number;
}) {
  const isUser = message.role === 'user';
  const parsedContent = useMemo(
    () => parseContent(message.content, width - 4),
    [message.content, width],
  );

  return (
    <Box flexDirection="column" marginY={1} width={width}>
      <Box>
        <Text bold color={isUser ? '#eea154ff' : 'yellow'}>
          {isUser ? 'You' : 'Bashio'}:
        </Text>
      </Box>
      <Box flexDirection="column" paddingLeft={2}>
        {parsedContent}
      </Box>
    </Box>
  );
});

const EmptyState = memo(function EmptyState({ height }: { height: number }) {
  return (
    <Box
      flexDirection="column"
      height={height}
      paddingX={1}
      justifyContent="center"
      alignItems="center"
    >
      <Text dimColor>Start a conversation by typing a message below.</Text>
      <Text dimColor>Type / for commands or Ctrl+P to switch models.</Text>
    </Box>
  );
});

export const MessageList = memo(
  forwardRef<MessageListHandle, MessageListProps>(function MessageList(
    { messages, currentResponse, isLoading, height, width, slashModeRef },
    ref,
  ) {
    const scrollRef = useRef<ScrollViewRef>(null);
    const mouseRef = useRef<DOMElement>(null);

    const boundedScrollBy = useCallback((delta: number) => {
      const sv = scrollRef.current;
      if (!sv) return;
      const currentOffset = sv.getScrollOffset();
      const maxOffset = sv.getBottomOffset();
      const newOffset = Math.max(0, Math.min(maxOffset, currentOffset + delta));
      sv.scrollTo(newOffset);
    }, []);

    const boundedScrollToBottom = useCallback(() => {
      const sv = scrollRef.current;
      if (!sv) return;
      const maxOffset = sv.getBottomOffset();
      sv.scrollTo(Math.max(0, maxOffset));
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        scrollBy: boundedScrollBy,
        scrollToBottom: boundedScrollToBottom,
      }),
      [boundedScrollBy, boundedScrollToBottom],
    );

    const messagesCount = messages.length;
    const hasResponse = Boolean(currentResponse);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run on content changes
    useEffect(() => {
      const timer = setTimeout(() => {
        boundedScrollToBottom();
      }, 10);
      return () => clearTimeout(timer);
    }, [messagesCount, hasResponse, boundedScrollToBottom]);

    // Scroll input - reads ref directly, no re-render when slash mode changes
    useInput((input, key) => {
      // Skip scrolling when slash menu is open (read from ref)
      if (slashModeRef.current) return;

      // Arrow keys for scrolling
      if (key.upArrow) boundedScrollBy(-1);
      if (key.downArrow) boundedScrollBy(1);

      // Page up/down for faster scrolling
      if (key.pageUp) boundedScrollBy(-Math.floor(height / 2));
      if (key.pageDown) boundedScrollBy(Math.floor(height / 2));

      // Vim-style: Ctrl+K/J for scrolling (3 lines at a time)
      if (input === 'k' && key.ctrl) boundedScrollBy(-3);
      // Note: Ctrl+J is used for newline in InputBox, so use Alt or just k/j

      // Simple j/k for scrolling when not typing (meta key as modifier)
      if (input === 'k' && key.meta) boundedScrollBy(-3);
      if (input === 'j' && key.meta) boundedScrollBy(3);
    });

    // Mouse wheel scrolling
    useOnWheel(mouseRef, (event) => {
      if (event.button === 'wheel-up') {
        boundedScrollBy(-3);
      } else if (event.button === 'wheel-down') {
        boundedScrollBy(3);
      }
    });

    const streamingContent = useMemo(
      () => (currentResponse ? parseContent(currentResponse, width - 4) : null),
      [currentResponse, width],
    );

    if (messages.length === 0 && !currentResponse) {
      return <EmptyState height={height} />;
    }

    return (
      <Box ref={mouseRef} height={height} paddingX={1} overflow="hidden">
        <ScrollView ref={scrollRef} height={height}>
          {messages.map((msg, i) => (
            <Message key={`msg-${i}-${msg.role}`} message={msg} width={width} />
          ))}

          {streamingContent && (
            <Box
              key="streaming"
              flexDirection="column"
              marginY={1}
              width={width}
            >
              <Box>
                <Text bold color="yellow">
                  Bashio:
                </Text>
              </Box>
              <Box flexDirection="column" paddingLeft={2}>
                {streamingContent}
                <Text color="yellow">|</Text>
              </Box>
            </Box>
          )}

          {isLoading && !currentResponse && (
            <Box key="loading" marginY={1}>
              <Text color="#eea154ff">
                <Spinner type="dots" />
              </Text>
              <Text color="#eea154ff"> Thinking...</Text>
            </Box>
          )}
        </ScrollView>
      </Box>
    );
  }),
);

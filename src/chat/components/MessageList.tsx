import { useOnClick, useOnWheel } from '@ink-tools/ink-mouse';
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
  useState,
} from 'react';
import type { ChatMessage } from '../../providers/base.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { MessageContextMenu } from './MessageContextMenu.js';

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

// Parse inline markdown (bold, italic, code) within a line
function parseInlineMarkdown(
  text: string,
  keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match: **bold**, *italic*, `code`, __bold__, _italic_
  const inlineRegex = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  match = inlineRegex.exec(text);
  while (match !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold** or __bold__
      nodes.push(
        <Text key={`${keyPrefix}-b-${idx++}`} bold>
          {match[2]}
        </Text>,
      );
    } else if (match[4]) {
      // *italic* or _italic_
      nodes.push(
        <Text key={`${keyPrefix}-i-${idx++}`} dimColor>
          {match[4]}
        </Text>,
      );
    } else if (match[5]) {
      // `inline code`
      nodes.push(
        <Text key={`${keyPrefix}-c-${idx++}`} color="yellow">
          {match[5]}
        </Text>,
      );
    }

    lastIndex = match.index + match[0].length;
    match = inlineRegex.exec(text);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

// Parse a single line and return appropriate React node
function parseLine(
  line: string,
  keyIndex: number,
  _maxWidth: number,
): React.ReactNode {
  const trimmed = line.trimStart();
  const indent = line.length - trimmed.length;

  // Horizontal rule: --- or *** or ___ - skip completely (no extra space)
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
    return null;
  }

  // Headers: # H1, ## H2, ### H3, etc.
  const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (headerMatch) {
    const level = headerMatch[1].length;
    const headerText = headerMatch[2];
    const parsed = parseInlineMarkdown(headerText, `h-${keyIndex}`);

    if (level === 1) {
      return (
        <Text key={keyIndex} bold color="yellow">
          {parsed}
        </Text>
      );
    }
    if (level === 2) {
      return (
        <Text key={keyIndex} bold color="white">
          {parsed}
        </Text>
      );
    }
    // H3 and below
    return (
      <Text key={keyIndex} bold>
        {parsed}
      </Text>
    );
  }

  // Bullet list: - item or * item
  const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) {
    const bulletText = bulletMatch[1];
    const parsed = parseInlineMarkdown(bulletText, `li-${keyIndex}`);
    return (
      <Box key={keyIndex} paddingLeft={indent}>
        <Text>
          <Text color="yellow">•</Text> {parsed}
        </Text>
      </Box>
    );
  }

  // Numbered list: 1. item, 2. item, etc.
  const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
  if (numberedMatch) {
    const num = numberedMatch[1];
    const itemText = numberedMatch[2];
    const parsed = parseInlineMarkdown(itemText, `ol-${keyIndex}`);
    return (
      <Box key={keyIndex} paddingLeft={indent}>
        <Text>
          <Text color="yellow">{num}.</Text> {parsed}
        </Text>
      </Box>
    );
  }

  // Blockquote: > text
  const quoteMatch = trimmed.match(/^>\s*(.*)$/);
  if (quoteMatch) {
    const quoteText = quoteMatch[1];
    const parsed = parseInlineMarkdown(quoteText, `q-${keyIndex}`);
    return (
      <Box key={keyIndex} paddingLeft={1}>
        <Text>
          <Text color="gray">│</Text> <Text dimColor>{parsed}</Text>
        </Text>
      </Box>
    );
  }

  // Regular text with inline markdown
  if (trimmed.length === 0) {
    return <Text key={keyIndex}> </Text>;
  }

  const parsed = parseInlineMarkdown(line, `p-${keyIndex}`);
  return (
    <Text key={keyIndex} wrap="wrap">
      {parsed}
    </Text>
  );
}

// Box drawing characters
const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  topMid: '┬',
  bottomMid: '┴',
  leftMid: '├',
  rightMid: '┤',
  midMid: '┼',
};

// Wrap text to fit within a given width
function wrapText(text: string, maxWidth: number): string[] {
  if (text.length <= maxWidth) {
    return [text];
  }

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If single word is longer than maxWidth, split it
      if (word.length > maxWidth) {
        let remaining = word;
        while (remaining.length > maxWidth) {
          lines.push(remaining.slice(0, maxWidth));
          remaining = remaining.slice(maxWidth);
        }
        currentLine = remaining;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

// Parse markdown table and render it
function parseTable(
  lines: string[],
  startKey: number,
  maxWidth: number,
): { node: React.ReactNode; linesConsumed: number } {
  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  if (headers.length === 0) {
    return { node: null, linesConsumed: 0 };
  }

  // Skip separator line (|---|---|)
  const separatorLine = lines[1];
  if (!separatorLine || !/^\|?[\s-:|]+\|?$/.test(separatorLine)) {
    return { node: null, linesConsumed: 0 };
  }

  // Parse data rows
  const dataRows: string[][] = [];
  let i = 2;
  while (i < lines.length && lines[i].includes('|')) {
    const row = lines[i]
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx, arr) => {
        // Filter out empty first/last elements from | at start/end
        if (idx === 0 && arr[idx] === '') return false;
        if (idx === arr.length - 1 && arr[idx] === '') return false;
        return true;
      });
    if (row.length > 0) {
      dataRows.push(row);
    }
    i++;
  }

  // Calculate column widths - distribute available space
  const numCols = headers.length;
  const availableWidth = maxWidth - (numCols + 1) - numCols * 2; // borders and padding
  const colWidth = Math.max(Math.floor(availableWidth / numCols), 15);

  const colWidths = headers.map(() => colWidth);

  // Render table
  const tableRows: React.ReactNode[] = [];
  let keyIdx = startKey;

  // Top border: ┌───┬───┬───┐
  let topBorder = BOX.topLeft;
  for (let c = 0; c < numCols; c++) {
    topBorder += BOX.horizontal.repeat(colWidths[c] + 2);
    topBorder += c < numCols - 1 ? BOX.topMid : BOX.topRight;
  }
  tableRows.push(
    <Box key={`top-${keyIdx++}`}>
      <Text dimColor>{topBorder}</Text>
    </Box>,
  );

  // Header row (with wrapping): │ Col1 │ Col2 │
  const wrappedHeaders = headers.map((h, idx) => wrapText(h, colWidths[idx]));
  const headerLineCount = Math.max(...wrappedHeaders.map((w) => w.length));

  for (let lineIdx = 0; lineIdx < headerLineCount; lineIdx++) {
    tableRows.push(
      <Box key={`header-${keyIdx++}-${lineIdx}`}>
        <Text dimColor>{BOX.vertical}</Text>
        {headers.map((_, colIdx) => {
          const wrappedLines = wrappedHeaders[colIdx];
          const lineText = wrappedLines[lineIdx] || '';
          return (
            <Text key={`h-${colIdx}-${lineIdx}`}>
              <Text bold color="yellow">
                {' '}
                {lineText.padEnd(colWidths[colIdx])}{' '}
              </Text>
              <Text dimColor>{BOX.vertical}</Text>
            </Text>
          );
        })}
      </Box>,
    );
  }

  // Header separator: ├───┼───┼───┤
  let headerSep = BOX.leftMid;
  for (let c = 0; c < numCols; c++) {
    headerSep += BOX.horizontal.repeat(colWidths[c] + 2);
    headerSep += c < numCols - 1 ? BOX.midMid : BOX.rightMid;
  }
  tableRows.push(
    <Box key={`sep-${keyIdx++}`}>
      <Text dimColor>{headerSep}</Text>
    </Box>,
  );

  // Data rows with text wrapping: │ val1 │ val2 │
  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const row = dataRows[rowIdx];

    // Wrap each cell
    const wrappedCells = headers.map((_, colIdx) => {
      const cell = row[colIdx] || '';
      return wrapText(cell, colWidths[colIdx]);
    });

    // Find max lines needed for this row
    const maxLines = Math.max(...wrappedCells.map((w) => w.length));

    // Render each line of the row
    for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
      tableRows.push(
        <Box key={`row-${keyIdx++}-${rowIdx}-${lineIdx}`}>
          <Text dimColor>{BOX.vertical}</Text>
          {headers.map((_, colIdx) => {
            const wrappedLines = wrappedCells[colIdx];
            const lineText = wrappedLines[lineIdx] || '';
            const paddedText = lineText.padEnd(colWidths[colIdx]);
            const parsed = parseInlineMarkdown(
              paddedText,
              `cell-${rowIdx}-${colIdx}-${lineIdx}`,
            );
            return (
              <Text key={`c-${colIdx}-${rowIdx}-${lineIdx}`}>
                {' '}
                {parsed} <Text dimColor>{BOX.vertical}</Text>
              </Text>
            );
          })}
        </Box>,
      );
    }
  }

  // Bottom border: └───┴───┴───┘
  let bottomBorder = BOX.bottomLeft;
  for (let c = 0; c < numCols; c++) {
    bottomBorder += BOX.horizontal.repeat(colWidths[c] + 2);
    bottomBorder += c < numCols - 1 ? BOX.bottomMid : BOX.bottomRight;
  }
  tableRows.push(
    <Box key={`bottom-${keyIdx++}`}>
      <Text dimColor>{bottomBorder}</Text>
    </Box>,
  );

  return {
    node: (
      <Box key={startKey} flexDirection="column">
        {tableRows}
      </Box>
    ),
    linesConsumed: i,
  };
}

// Check if a line looks like a table row
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
}

// Process lines, detecting tables
function processLines(
  lines: string[],
  startKeyIndex: number,
  maxWidth: number,
): { parts: React.ReactNode[]; keyIndex: number } {
  const parts: React.ReactNode[] = [];
  let keyIndex = startKeyIndex;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this could be the start of a table
    if (isTableRow(line) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      // Check if next line is a separator (|---|---|)
      if (/^\|?[\s-:|]+\|?$/.test(nextLine.trim())) {
        // This is a table, parse it
        const tableLines = lines.slice(i);
        const { node, linesConsumed } = parseTable(
          tableLines,
          keyIndex,
          maxWidth,
        );
        if (node && linesConsumed > 0) {
          parts.push(node);
          keyIndex++;
          i += linesConsumed;
          continue;
        }
      }
    }

    // Regular line
    parts.push(parseLine(line, keyIndex++, maxWidth));
    i++;
  }

  return { parts, keyIndex };
}

function parseContent(content: string, maxWidth: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  match = codeBlockRegex.exec(content);
  while (match !== null) {
    // Process text before code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      const lines = text.split('\n');
      const result = processLines(lines, keyIndex, maxWidth);
      parts.push(...result.parts);
      keyIndex = result.keyIndex;
    }

    // Process code block
    const language = match[1] || 'bash';
    const code = match[2].trim();

    try {
      const highlighted = highlight(code, { language, ignoreIllegals: true });
      parts.push(
        <Box key={keyIndex++} flexDirection="column" width={maxWidth - 4}>
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
        <Box key={keyIndex++} flexDirection="column" width={maxWidth - 4}>
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

  // Process remaining text after last code block
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    const lines = text.split('\n');
    const result = processLines(lines, keyIndex, maxWidth);
    parts.push(...result.parts);
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
  messageIndex,
  onMessageClick,
}: {
  message: ChatMessage;
  width: number;
  messageIndex: number;
  onMessageClick?: (messageIndex: number, content: string) => void;
}) {
  const isUser = message.role === 'user';
  const messageRef = useRef<DOMElement>(null);
  const parsedContent = useMemo(
    () => parseContent(message.content, width - 4),
    [message.content, width],
  );

  // Handle click on assistant messages only
  useOnClick(
    messageRef,
    !isUser && onMessageClick
      ? () => {
          onMessageClick(messageIndex, message.content);
        }
      : null,
  );

  return (
    <Box ref={messageRef} flexDirection="column" marginY={1} width={width}>
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
    const [followOutput, setFollowOutput] = useState(true);
    const [contextMenu, setContextMenu] = useState<{
      messageIndex: number;
      content: string;
    } | null>(null);

    const handleMessageClick = useCallback(
      (messageIndex: number, content: string) => {
        setContextMenu({ messageIndex, content });
      },
      [],
    );

    const handleContextMenuSelect = useCallback(
      async (action: string) => {
        if (action === 'copy' && contextMenu) {
          // Only copy to clipboard - do NOT execute anything
          await copyToClipboard(contextMenu.content);
        }
        setContextMenu(null);
      },
      [contextMenu],
    );

    const handleContextMenuClose = useCallback(() => {
      setContextMenu(null);
    }, []);

    const boundedScrollBy = useCallback((delta: number) => {
      const sv = scrollRef.current;
      if (!sv) return;
      const currentOffset = sv.getScrollOffset();
      const maxOffset = sv.getBottomOffset();
      const newOffset = Math.max(0, Math.min(maxOffset, currentOffset + delta));
      sv.scrollTo(newOffset);
      setFollowOutput(newOffset >= maxOffset);
    }, []);

    const boundedScrollToBottom = useCallback(() => {
      const sv = scrollRef.current;
      if (!sv) return;
      const maxOffset = sv.getBottomOffset();
      sv.scrollTo(Math.max(0, maxOffset));
      setFollowOutput(true);
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
      if (!followOutput) return;
      const timer = setTimeout(() => {
        boundedScrollToBottom();
      }, 10);
      return () => clearTimeout(timer);
    }, [messagesCount, hasResponse, boundedScrollToBottom, followOutput]);

    // Scroll input - reads ref directly, no re-render when slash mode changes
    useInput((input, key) => {
      // Skip scrolling when slash menu is open (read from ref)
      if (slashModeRef.current) return;

      if (input.startsWith('\u001b[<')) {
        return;
      }

      const isUpSequence = input === '\u001b[A';
      const isDownSequence = input === '\u001b[B';
      const isPageUpSequence = input === '\u001b[5~';
      const isPageDownSequence = input === '\u001b[6~';

      if (key.ctrl && input === 'l') {
        boundedScrollToBottom();
        return;
      }

      // Arrow keys for scrolling
      if (key.upArrow || isUpSequence) boundedScrollBy(-1);
      if (key.downArrow || isDownSequence) boundedScrollBy(1);

      // Page up/down for faster scrolling
      if (key.pageUp || isPageUpSequence) {
        boundedScrollBy(-Math.floor(height / 2));
      }
      if (key.pageDown || isPageDownSequence) {
        boundedScrollBy(Math.floor(height / 2));
      }

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

    useEffect(() => {
      if (followOutput) return;
      const sv = scrollRef.current;
      if (!sv) return;
      const currentOffset = sv.getScrollOffset();
      const maxOffset = sv.getBottomOffset();
      if (maxOffset === 0 || currentOffset >= maxOffset) {
        setFollowOutput(true);
      }
    }, [followOutput]);

    const streamingContent = useMemo(
      () => (currentResponse ? parseContent(currentResponse, width - 4) : null),
      [currentResponse, width],
    );

    if (messages.length === 0 && !currentResponse) {
      return <EmptyState height={height} />;
    }

    return (
      <Box flexDirection="column" height={height} width={width}>
        {/* Messages list */}
        <Box ref={mouseRef} height={height} paddingX={1} overflow="hidden">
          <ScrollView ref={scrollRef} height={height}>
            {messages.map((msg, i) => (
              <Message
                key={`msg-${i}-${msg.role}`}
                message={msg}
                width={width}
                messageIndex={i}
                onMessageClick={
                  contextMenu === null ? handleMessageClick : undefined
                }
              />
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

        {/* Context menu overlay - positioned absolutely on top, centered */}
        {contextMenu !== null && (
          <Box
            position="absolute"
            width={width}
            height={height}
            justifyContent="center"
            alignItems="center"
          >
            <MessageContextMenu
              onSelect={handleContextMenuSelect}
              onClose={handleContextMenuClose}
              width={Math.min(width - 4, 50)}
            />
          </Box>
        )}
      </Box>
    );
  }),
);

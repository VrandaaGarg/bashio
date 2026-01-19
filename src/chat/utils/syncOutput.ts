import { Writable } from 'node:stream';

interface WriteStreamProxy extends NodeJS.WriteStream {
  _flushSyncOutput?: () => void;
}

export interface SyncOutputStream extends NodeJS.WriteStream {
  _flushSyncOutput?: () => void;
}

// Synchronized output escape sequences (supported by iTerm2, kitty, and others)
// This prevents screen tearing/flickering by batching terminal updates
const SYNC_START = '\x1b[?2026h'; // Begin synchronized update
const SYNC_END = '\x1b[?2026l'; // End synchronized update

/**
 * Creates a writable stream that wraps stdout with synchronized output.
 * This batches terminal updates to prevent flickering in terminals like iTerm2.
 *
 * The wrapper:
 * 1. Buffers writes during a short window
 * 2. Wraps the buffered output with sync start/end sequences
 * 3. Flushes to the real stdout
 */
export function createSyncOutputStream(
  stdout: NodeJS.WriteStream,
): SyncOutputStream {
  let buffer = '';
  let flushTimeout: ReturnType<typeof setTimeout> | null = null;
  const FLUSH_DELAY = 4; // 4ms batching window (slightly less than one frame at 60fps)

  const flush = () => {
    if (buffer.length > 0) {
      // Wrap the buffered output with synchronized update sequences
      stdout.write(SYNC_START + buffer + SYNC_END);
      buffer = '';
    }
    flushTimeout = null;
  };

  const stream = new Writable({
    write(
      chunk: Buffer | string,
      _encoding: BufferEncoding,
      callback: (error?: Error | null) => void,
    ) {
      // Convert chunk to string - use utf8 for Buffer, direct for string
      const str = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      buffer += str;

      // Schedule flush if not already scheduled
      if (!flushTimeout) {
        flushTimeout = setTimeout(flush, FLUSH_DELAY);
      }

      callback();
    },
    final(callback: (error?: Error | null) => void) {
      if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
      }
      flush();
      callback();
    },
  });

  // Proxy important properties from stdout
  Object.defineProperty(stream, 'columns', {
    get: () => stdout.columns,
  });
  Object.defineProperty(stream, 'rows', {
    get: () => stdout.rows,
  });
  Object.defineProperty(stream, 'isTTY', {
    get: () => stdout.isTTY,
  });

  // Proxy resize events
  stdout.on('resize', () => {
    stream.emit('resize');
  });

  const proxy = Object.create(
    stdout,
    Object.getOwnPropertyDescriptors(stream),
  ) as WriteStreamProxy;

  proxy._flushSyncOutput = flush;

  return proxy;
}

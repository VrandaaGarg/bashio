import { Box, render, Text, useApp, useInput, useStdout } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { runAuthSetup } from '../core/auth.js';
import { configExists, loadConfig } from '../core/config.js';
import type { ConfigV2, ProviderName } from '../core/types.js';
import type { AIProvider, ChatMessage } from '../providers/base.js';
import { createProvider } from '../providers/index.js';
import { InputBox } from './components/InputBox.js';
import {
  MessageList,
  type MessageListHandle,
} from './components/MessageList.js';
import { ModelSwitcher } from './components/ModelSwitcher.js';
import { SessionPicker } from './components/SessionPicker.js';
import {
  createSession,
  loadSession,
  type Session,
  saveSession,
} from './utils/sessions.js';

export type { ChatMessage };

interface AppState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentResponse: string;
  showModelSwitcher: boolean;
  showSessionPicker: boolean;
  error: string | null;
}

function ChatApp() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [height, setHeight] = useState(stdout?.rows ?? 24);
  const [width, setWidth] = useState(stdout?.columns ?? 80);
  const messageListRef = useRef<MessageListHandle>(null);

  const [config, setConfig] = useState<ConfigV2 | null>(null);
  const [provider, setProvider] = useState<AIProvider | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [state, setState] = useState<AppState>({
    messages: [],
    isLoading: false,
    currentResponse: '',
    showModelSwitcher: false,
    showSessionPicker: false,
    error: null,
  });

  // Track terminal size
  useEffect(() => {
    const handleResize = () => {
      if (stdout) {
        setHeight(stdout.rows);
        setWidth(stdout.columns);
      }
    };
    stdout?.on('resize', handleResize);
    return () => {
      stdout?.off('resize', handleResize);
    };
  }, [stdout]);

  // Initialize config, provider, and create new session
  useEffect(() => {
    const init = async () => {
      if (!configExists()) {
        const success = await runAuthSetup();
        if (!success) {
          exit();
          return;
        }
      }
      const loadedConfig = loadConfig();
      if (loadedConfig) {
        setConfig(loadedConfig);
        setProvider(createProvider(loadedConfig));

        // Create a new session on startup
        const activeProvider = loadedConfig.activeProvider;
        const model =
          loadedConfig.providers[activeProvider]?.model ?? 'unknown';
        const session = createSession(model, activeProvider);
        setCurrentSession(session);
      }
    };
    init();
  }, [exit]);

  // Save session whenever messages change (after loading completes)
  const messagesLength = state.messages.length;
  const isLoading = state.isLoading;
  // biome-ignore lint/correctness/useExhaustiveDependencies: save only when message count changes and not loading
  useEffect(() => {
    if (currentSession && messagesLength > 0 && !isLoading) {
      const updatedSession: Session = {
        ...currentSession,
        messages: state.messages,
        messageCount: messagesLength,
      };
      saveSession(updatedSession);
      setCurrentSession(updatedSession);
    }
  }, [messagesLength, isLoading]);

  // Handle global keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
    if ((key.ctrl && input === 'm') || (key.ctrl && input === 'p')) {
      if (!state.showModelSwitcher && !state.showSessionPicker) {
        setState((s: AppState) => ({ ...s, showModelSwitcher: true }));
      }
    }
    // Ctrl+O to open session picker
    if (key.ctrl && input === 'o') {
      if (!state.showModelSwitcher && !state.showSessionPicker) {
        setState((s: AppState) => ({ ...s, showSessionPicker: true }));
      }
    }
    if (key.escape) {
      if (state.showModelSwitcher) {
        setState((s: AppState) => ({ ...s, showModelSwitcher: false }));
      }
      if (state.showSessionPicker) {
        setState((s: AppState) => ({ ...s, showSessionPicker: false }));
      }
    }
  });

  const handleSubmit = useCallback(
    async (message: string) => {
      if (!provider || !message.trim() || state.isLoading) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: message.trim(),
      };
      const newMessages = [...state.messages, userMessage];

      setState((s: AppState) => ({
        ...s,
        messages: newMessages,
        isLoading: true,
        currentResponse: '',
        error: null,
      }));

      try {
        if (provider.streamChat) {
          await provider.streamChat(newMessages, (chunk: string) => {
            setState((s: AppState) => ({
              ...s,
              currentResponse: s.currentResponse + chunk,
            }));
          });
          setState((s: AppState) => ({
            ...s,
            messages: [
              ...s.messages,
              { role: 'assistant', content: s.currentResponse },
            ],
            isLoading: false,
            currentResponse: '',
          }));
        } else {
          setState((s: AppState) => ({
            ...s,
            messages: [
              ...s.messages,
              {
                role: 'assistant',
                content: 'Streaming not supported for this provider.',
              },
            ],
            isLoading: false,
          }));
        }
      } catch (err) {
        setState((s: AppState) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    },
    [provider, state.messages, state.isLoading],
  );

  const handleModelSelect = useCallback(
    (providerName: ProviderName, model: string) => {
      if (!config) return;
      const newConfig = { ...config, activeProvider: providerName };
      const providerSettings = newConfig.providers[providerName];
      if (providerSettings) {
        providerSettings.model = model;
      }
      setConfig(newConfig);
      setProvider(createProvider(newConfig));
      setState((s: AppState) => ({ ...s, showModelSwitcher: false }));

      // Update current session with new model
      if (currentSession) {
        setCurrentSession({
          ...currentSession,
          model,
          provider: providerName,
        });
      }
    },
    [config, currentSession],
  );

  const handleModelSwitcherClose = useCallback(() => {
    setState((s: AppState) => ({ ...s, showModelSwitcher: false }));
  }, []);

  const handleSessionSelect = useCallback(
    (sessionId: string | null) => {
      if (!config) return;

      if (sessionId === null) {
        // Create new session
        const activeProvider = config.activeProvider;
        const model = config.providers[activeProvider]?.model ?? 'unknown';
        const session = createSession(model, activeProvider);
        setCurrentSession(session);
        setState((s: AppState) => ({
          ...s,
          messages: [],
          showSessionPicker: false,
          error: null,
        }));
      } else {
        // Load existing session
        const session = loadSession(sessionId);
        if (session) {
          setCurrentSession(session);
          setState((s: AppState) => ({
            ...s,
            messages: session.messages,
            showSessionPicker: false,
            error: null,
          }));
        }
      }
    },
    [config],
  );

  const handleSessionPickerClose = useCallback(() => {
    setState((s: AppState) => ({ ...s, showSessionPicker: false }));
  }, []);

  if (!config || !provider) {
    return (
      <Box
        width={width}
        height={height}
        justifyContent="center"
        alignItems="center"
      >
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (state.showSessionPicker) {
    return (
      <SessionPicker
        onSelect={handleSessionSelect}
        onClose={handleSessionPickerClose}
      />
    );
  }

  if (state.showModelSwitcher) {
    return (
      <ModelSwitcher
        config={config}
        onSelect={handleModelSelect}
        onClose={handleModelSwitcherClose}
      />
    );
  }

  const activeProvider = config.activeProvider;
  const currentModel = config.providers[activeProvider]?.model ?? 'unknown';

  const headerHeight = 3;
  const inputHeight = 3;
  const statusHeight = 1;
  const messageListHeight = Math.max(
    5,
    height - headerHeight - inputHeight - statusHeight - 2,
  );

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        height={headerHeight}
      >
        <Text bold color="cyan">
          Bashio Chat
        </Text>
        <Text> | </Text>
        <Text color="yellow">{currentModel}</Text>
        <Text dimColor> | Ctrl+O: sessions | Ctrl+P: model | Ctrl+C: exit</Text>
      </Box>

      {/* Message List */}
      <Box flexDirection="column" height={messageListHeight}>
        <MessageList
          ref={messageListRef}
          messages={state.messages}
          currentResponse={state.currentResponse}
          isLoading={state.isLoading}
          height={messageListHeight}
          width={width - 2}
        />
      </Box>

      {/* Error display */}
      {state.error && (
        <Box paddingX={1}>
          <Text color="red">Error: {state.error}</Text>
        </Box>
      )}

      {/* Input Box */}
      <Box borderStyle="round" borderColor="gray">
        <InputBox onSubmit={handleSubmit} disabled={state.isLoading} />
      </Box>

      {/* Status bar */}
      <Box paddingX={1}>
        <Text dimColor>
          Enter: send | Arrows/PgUp/PgDn: scroll | Select text to copy | Ctrl+O:
          sessions | Ctrl+C: exit
        </Text>
      </Box>
    </Box>
  );
}

export async function runChat(): Promise<number> {
  // Enter alternate screen buffer (like vim/nano)
  process.stdout.write('\x1b[?1049h');
  // Hide cursor initially
  process.stdout.write('\x1b[?25l');
  // Clear screen and move to top-left
  process.stdout.write('\x1b[2J\x1b[H');

  const instance = render(<ChatApp />, {
    exitOnCtrlC: false,
  });

  await instance.waitUntilExit();

  // Show cursor again
  process.stdout.write('\x1b[?25h');
  // Exit alternate screen buffer (restore previous screen)
  process.stdout.write('\x1b[?1049l');

  return 0;
}

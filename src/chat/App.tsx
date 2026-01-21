import { MouseProvider } from '@ink-tools/ink-mouse';
import { Box, render, Text, useApp, useInput, useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runAuthSetup } from '../core/auth.js';
import { configExists, loadConfig, saveConfig } from '../core/config.js';
import type { ConfigV2, ProviderName } from '../core/types.js';
import type { AIProvider, ChatMessage } from '../providers/base.js';
import { createProvider } from '../providers/index.js';
import { InputBox } from './components/InputBox.js';
import {
  MessageList,
  type MessageListHandle,
} from './components/MessageList.js';
import { ModelSwitcher } from './components/ModelSwitcher.js';
import { SessionHeader } from './components/SessionHeader.js';
import { SessionPicker } from './components/SessionPicker.js';
import { ThemePicker } from './components/ThemePicker.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import {
  createSession,
  loadSession,
  type Session,
  saveSession,
} from './utils/sessions.js';
import type { SlashCommandAction } from './utils/slashCommands.js';
import { createSyncOutputStream } from './utils/syncOutput.js';
import { ThemeProvider } from './utils/ThemeContext.js';
import { getThemeByName } from './utils/themes.js';

export type { ChatMessage };

interface AppState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentResponse: string;
  showModelSwitcher: boolean;
  showSessionPicker: boolean;
  showThemePicker: boolean;
  error: string | null;
}

function ChatApp() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [height, setHeight] = useState(stdout?.rows ?? 24);
  const [width, setWidth] = useState(stdout?.columns ?? 80);
  const messageListRef = useRef<MessageListHandle>(null);
  const slashModeRef = useRef(false);

  const [config, setConfig] = useState<ConfigV2 | null>(null);
  const [provider, setProvider] = useState<AIProvider | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [state, setState] = useState<AppState>({
    messages: [],
    isLoading: false,
    currentResponse: '',
    showModelSwitcher: false,
    showSessionPicker: false,
    showThemePicker: false,
    error: null,
  });

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

  useEffect(() => {
    // Auth is already checked in runChat() before entering alternate screen
    // So config should always exist at this point
    const loadedConfig = loadConfig();
    if (loadedConfig) {
      setConfig(loadedConfig);
      setProvider(createProvider(loadedConfig));

      const activeProvider = loadedConfig.activeProvider;
      const model = loadedConfig.providers[activeProvider]?.model ?? 'unknown';
      const session = createSession(model, activeProvider);
      setCurrentSession(session);
    } else {
      // This shouldn't happen, but handle gracefully
      exit();
    }
  }, [exit]);

  const messagesLength = state.messages.length;
  const isLoading = state.isLoading;
  // biome-ignore lint/correctness/useExhaustiveDependencies: save only when message count changes
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

  const noPickerOpen =
    !state.showModelSwitcher &&
    !state.showSessionPicker &&
    !state.showThemePicker;

  const handleGlobalInput = useCallback(
    (input: string, key: { ctrl: boolean; escape: boolean }) => {
      if (key.ctrl && input === 'c') {
        exit();
      }
      if (!slashModeRef.current && noPickerOpen && !state.isLoading) {
        if (key.ctrl && input === 'p') {
          setState((s) => ({ ...s, showModelSwitcher: true }));
        }
        if (key.ctrl && input === 'o') {
          setState((s) => ({ ...s, showSessionPicker: true }));
        }
        if (key.ctrl && input === 't') {
          setState((s) => ({ ...s, showThemePicker: true }));
        }
        if (key.ctrl && input === 'n') {
          // New session - handled via handleSessionSelect(null) equivalent
          if (config) {
            const activeProvider = config.activeProvider;
            const model = config.providers[activeProvider]?.model ?? 'unknown';
            const session = createSession(model, activeProvider);
            setCurrentSession(session);
            setState((s) => ({
              ...s,
              messages: [],
              error: null,
            }));
          }
        }
        if (key.ctrl && input === 'l') {
          // Clear chat
          setState((s) => ({ ...s, messages: [], error: null }));
          if (currentSession) {
            const clearedSession: Session = {
              ...currentSession,
              messages: [],
              messageCount: 0,
            };
            saveSession(clearedSession);
            setCurrentSession(clearedSession);
          }
        }
      }
      if (key.escape) {
        if (state.showModelSwitcher) {
          setState((s) => ({ ...s, showModelSwitcher: false }));
        }
        if (state.showSessionPicker) {
          setState((s) => ({ ...s, showSessionPicker: false }));
        }
        if (state.showThemePicker) {
          setState((s) => ({ ...s, showThemePicker: false }));
        }
      }
    },
    [
      exit,
      noPickerOpen,
      state.showModelSwitcher,
      state.showSessionPicker,
      state.showThemePicker,
      state.isLoading,
      config,
      currentSession,
    ],
  );

  useInput(handleGlobalInput);

  const handleSubmit = useCallback(
    async (message: string) => {
      if (!provider || !message.trim()) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: message.trim(),
      };

      // Get current messages and add user message
      let messagesWithUser: ChatMessage[] = [];
      setState((s) => {
        if (s.isLoading) return s;
        messagesWithUser = [...s.messages, userMessage];
        return {
          ...s,
          messages: messagesWithUser,
          isLoading: true,
          currentResponse: '',
          error: null,
        };
      });

      // If already loading, messagesWithUser will be empty, so return
      if (messagesWithUser.length === 0) return;

      try {
        if (provider.streamChat) {
          await provider.streamChat(messagesWithUser, (chunk: string) => {
            setState((s) => ({
              ...s,
              currentResponse: s.currentResponse + chunk,
            }));
          });
          setState((s) => ({
            ...s,
            messages: [
              ...s.messages,
              { role: 'assistant', content: s.currentResponse },
            ],
            isLoading: false,
            currentResponse: '',
          }));
        } else {
          setState((s) => ({
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
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    },
    [provider],
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
      setState((s) => ({ ...s, showModelSwitcher: false }));

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
    setState((s) => ({ ...s, showModelSwitcher: false }));
  }, []);

  const handleSessionSelect = useCallback(
    (sessionId: string | null) => {
      if (!config) return;

      if (sessionId === null) {
        const activeProvider = config.activeProvider;
        const model = config.providers[activeProvider]?.model ?? 'unknown';
        const session = createSession(model, activeProvider);
        setCurrentSession(session);
        setState((s) => ({
          ...s,
          messages: [],
          showSessionPicker: false,
          error: null,
        }));
      } else {
        const session = loadSession(sessionId);
        if (session) {
          setCurrentSession(session);
          setState((s) => ({
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
    setState((s) => ({ ...s, showSessionPicker: false }));
  }, []);

  const handleThemeSelect = useCallback(
    (themeName: string) => {
      if (!config) return;
      const cs = config.settings;
      const newConfig: ConfigV2 = {
        ...config,
        settings: {
          confirmBeforeExecute: cs?.confirmBeforeExecute ?? true,
          historyEnabled: cs?.historyEnabled ?? true,
          historyRetentionDays: cs?.historyRetentionDays ?? 30,
          historyMaxEntries: cs?.historyMaxEntries ?? 2000,
          autoConfirmShortcuts: cs?.autoConfirmShortcuts ?? false,
          theme: themeName,
        },
      };
      setConfig(newConfig);
      saveConfig(newConfig);
      setState((s) => ({ ...s, showThemePicker: false }));
    },
    [config],
  );

  const handleThemePickerClose = useCallback(() => {
    setState((s) => ({ ...s, showThemePicker: false }));
  }, []);

  const handleSlashCommand = useCallback(
    (action: SlashCommandAction) => {
      switch (action) {
        case 'openModelSwitcher':
          setState((s) => ({ ...s, showModelSwitcher: true }));
          break;
        case 'openSessionPicker':
          setState((s) => ({ ...s, showSessionPicker: true }));
          break;
        case 'openThemePicker':
          setState((s) => ({ ...s, showThemePicker: true }));
          break;
        case 'newSession':
          handleSessionSelect(null);
          break;
        case 'clearChat':
          setState((s) => ({ ...s, messages: [], error: null }));
          if (currentSession) {
            const clearedSession: Session = {
              ...currentSession,
              messages: [],
              messageCount: 0,
            };
            saveSession(clearedSession);
            setCurrentSession(clearedSession);
          }
          break;
        case 'exitChat':
          exit();
          break;
      }
    },
    [handleSessionSelect, currentSession, exit],
  );

  const currentThemeName = config?.settings?.theme ?? 'bashio';
  const theme = useMemo(
    () => getThemeByName(currentThemeName),
    [currentThemeName],
  );

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

  if (state.showThemePicker) {
    return (
      <ThemePicker
        currentTheme={currentThemeName}
        onSelect={handleThemeSelect}
        onClose={handleThemePickerClose}
      />
    );
  }

  if (state.showSessionPicker) {
    return (
      <ThemeProvider value={theme}>
        <SessionPicker
          onSelect={handleSessionSelect}
          onClose={handleSessionPickerClose}
        />
      </ThemeProvider>
    );
  }

  if (state.showModelSwitcher) {
    return (
      <ThemeProvider value={theme}>
        <ModelSwitcher
          config={config}
          onSelect={handleModelSelect}
          onClose={handleModelSwitcherClose}
        />
      </ThemeProvider>
    );
  }

  const activeProvider = config.activeProvider;
  const currentModel = config.providers[activeProvider]?.model ?? 'unknown';
  const isEmptyChat = state.messages.length === 0 && !state.currentResponse;

  // Welcome screen layout (centered)
  if (isEmptyChat) {
    return (
      <ThemeProvider value={theme}>
        <Box
          flexDirection="column"
          width={width}
          height={height}
          backgroundColor={theme.background}
        >
          <WelcomeScreen width={width} height={height}>
            <InputBox
              onSubmit={handleSubmit}
              onSlashCommand={handleSlashCommand}
              slashModeRef={slashModeRef}
              modelName={currentModel}
              disabled={state.isLoading}
              width={Math.min(width - 4, 80)}
              placeholder="Ask anything..."
            />
          </WelcomeScreen>
        </Box>
      </ThemeProvider>
    );
  }

  // Chat view layout (with messages)
  const inputBoxHeight = 6; // Input box + footer + margins
  const sessionHeaderHeight = 4; // Header with paddingY + margins
  const messageListHeight = Math.max(
    5,
    height - inputBoxHeight - sessionHeaderHeight - 2,
  );

  return (
    <ThemeProvider value={theme}>
      <Box
        flexDirection="column"
        width={width}
        height={height}
        backgroundColor={theme.background}
      >
        {/* Session Header */}
        <Box paddingX={1} marginTop={1}>
          <SessionHeader
            sessionTitle={currentSession?.title ?? 'New Chat'}
            width={width - 2}
          />
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
            slashModeRef={slashModeRef}
          />
        </Box>

        {/* Error display */}
        {state.error && (
          <Box paddingX={1}>
            <Text color="red">Error: {state.error}</Text>
          </Box>
        )}

        {/* Input Box */}
        <Box paddingX={1}>
          <InputBox
            onSubmit={handleSubmit}
            onSlashCommand={handleSlashCommand}
            slashModeRef={slashModeRef}
            modelName={currentModel}
            disabled={state.isLoading}
            width={width - 2}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export async function runChat(): Promise<number> {
  // Check auth BEFORE entering alternate screen buffer
  // This allows the welcome banner and auth prompts to display properly
  if (!configExists()) {
    const success = await runAuthSetup();
    if (!success) {
      return 1;
    }
    console.log(); // Add spacing before entering chat
  }

  const syncOutput = createSyncOutputStream(process.stdout);

  // Now enter alternate screen buffer for the chat UI
  process.stdout.write('\x1b[?1049h');
  process.stdout.write('\x1b[?25l');
  process.stdout.write('\x1b[2J\x1b[H');

  const instance = render(
    <MouseProvider autoEnable={false}>
      <ChatApp />
    </MouseProvider>,
    {
      exitOnCtrlC: false,
      stdout: syncOutput,
    },
  );

  await instance.waitUntilExit();

  syncOutput._flushSyncOutput?.();

  process.stdout.write('\x1b[?25h');
  process.stdout.write('\x1b[?1049l');

  return 0;
}

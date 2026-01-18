import { Box, Text, useInput, useStdout } from 'ink';
import { useState } from 'react';
import type { ConfigV2, ProviderName } from '../../core/types.js';
import {
  CHATGPT_SUBSCRIPTION_MODELS,
  CLAUDE_MODELS,
  CLAUDE_SUBSCRIPTION_MODELS,
  COPILOT_MODELS,
  OLLAMA_RECOMMENDED_MODELS,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
} from '../../providers/index.js';

interface ModelSwitcherProps {
  config: ConfigV2;
  onSelect: (provider: ProviderName, model: string) => void;
  onClose: () => void;
}

interface ModelOption {
  provider: ProviderName;
  model: string;
  label: string;
}

function getModelsForProvider(
  provider: ProviderName,
): Array<{ value: string; label: string }> {
  switch (provider) {
    case 'claude':
      return CLAUDE_MODELS;
    case 'claude-subscription':
      return CLAUDE_SUBSCRIPTION_MODELS;
    case 'openai':
      return OPENAI_MODELS;
    case 'chatgpt-subscription':
      return CHATGPT_SUBSCRIPTION_MODELS;
    case 'copilot':
      return COPILOT_MODELS;
    case 'ollama':
      return OLLAMA_RECOMMENDED_MODELS.map((m) => ({ value: m, label: m }));
    case 'openrouter':
      return OPENROUTER_MODELS;
    default:
      return [];
  }
}

export function ModelSwitcher({
  config,
  onSelect,
  onClose,
}: ModelSwitcherProps) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;

  const options: ModelOption[] = [];
  const providers = Object.keys(config.providers) as ProviderName[];

  for (const provider of providers) {
    const models = getModelsForProvider(provider);
    for (const model of models) {
      options.push({
        provider,
        model: model.value,
        label: `[${provider}] ${model.label}`,
      });
    }
  }

  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const selected = options[selectedIndex];
      if (selected) {
        onSelect(selected.provider, selected.model);
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(options.length - 1, i + 1));
    }
  });

  const listHeight = height - 8;
  const visibleCount = Math.max(1, listHeight);

  let startIndex = 0;
  if (selectedIndex >= visibleCount) {
    startIndex = selectedIndex - visibleCount + 1;
  }
  const visibleOptions = options.slice(startIndex, startIndex + visibleCount);

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
        width={Math.min(70, width - 4)}
        borderStyle="double"
        borderColor="#eea154ff"
      >
        {/* Header */}
        <Box paddingX={2} paddingY={1} justifyContent="space-between">
          <Text bold color="#eea154ff">
            Select Model
          </Text>
          <Text dimColor>Esc to close | j/k or arrows to navigate</Text>
        </Box>

        {/* Divider */}
        <Box paddingX={1}>
          <Text dimColor>{'─'.repeat(Math.min(66, width - 8))}</Text>
        </Box>

        {/* Model list */}
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          {visibleOptions.map((option, i) => {
            const actualIndex = startIndex + i;
            const isSelected = actualIndex === selectedIndex;
            return (
              <Box key={`${option.provider}-${option.model}`}>
                <Text
                  color={isSelected ? '#eea154ff' : undefined}
                  bold={isSelected}
                  inverse={isSelected}
                >
                  {isSelected ? ' > ' : '   '}
                  {option.label}
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* Footer with scroll indicator */}
        {options.length > visibleCount && (
          <Box paddingX={2} paddingBottom={1}>
            <Text dimColor>
              Showing {startIndex + 1}-
              {Math.min(startIndex + visibleCount, options.length)} of{' '}
              {options.length}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

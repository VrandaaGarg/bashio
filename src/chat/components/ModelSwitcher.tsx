import { useOnClick, useOnMouseMove } from '@ink-tools/ink-mouse';
import { Box, type DOMElement, Text, useInput, useStdout } from 'ink';
import { memo, useRef, useState } from 'react';
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
import { useTheme } from '../utils/ThemeContext.js';

interface ModelSwitcherProps {
  config: ConfigV2;
  onSelect: (provider: ProviderName, model: string) => void;
  onClose: () => void;
}

interface ModelOption {
  provider: ProviderName;
  providerLabel: string;
  model: string;
  label: string;
}

interface ModelRowProps {
  option: ModelOption;
  isSelected: boolean;
  isCurrent: boolean;
  rowWidth: number;
  accent: string;
  onHover: () => void;
  onClick: () => void;
}

const PROVIDER_LABELS: Record<ProviderName, string> = {
  'claude-subscription': 'Claude Pro/Max',
  'chatgpt-subscription': 'ChatGPT Plus/Pro',
  copilot: 'GitHub Copilot',
  claude: 'Claude API',
  openai: 'OpenAI API',
  ollama: 'Ollama',
  openrouter: 'OpenRouter',
};

const ModelRow = memo(function ModelRow({
  option,
  isSelected,
  isCurrent,
  rowWidth,
  accent,
  onHover,
  onClick,
}: ModelRowProps) {
  const rowRef = useRef<DOMElement>(null);

  useOnMouseMove(rowRef, onHover);
  useOnClick(rowRef, onClick);

  const prefix = isSelected ? '>' : isCurrent ? '✓' : ' ';
  const labelWithPrefix = ` ${prefix} ${option.label}`;
  const padding = Math.max(0, rowWidth - labelWithPrefix.length);
  const fullLine = labelWithPrefix + ' '.repeat(padding);

  return (
    <Box ref={rowRef}>
      <Text
        backgroundColor={isSelected ? accent : undefined}
        color={isSelected ? '#000000' : undefined}
      >
        {fullLine}
      </Text>
    </Box>
  );
});

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
  const theme = useTheme();

  const currentProvider = config.activeProvider;
  const currentModel = config.providers[currentProvider]?.model;

  const options: ModelOption[] = [];
  const providers = Object.keys(config.providers) as ProviderName[];

  for (const provider of providers) {
    const models = getModelsForProvider(provider);
    const providerLabel = PROVIDER_LABELS[provider] || provider;

    for (const model of models) {
      options.push({
        provider,
        providerLabel,
        model: model.value,
        label: model.label,
      });
    }
  }

  const currentIndex = options.findIndex(
    (o) => o.provider === currentProvider && o.model === currentModel,
  );
  const [selectedIndex, setSelectedIndex] = useState(
    currentIndex >= 0 ? currentIndex : 0,
  );

  const handleHover = (index: number) => {
    setSelectedIndex(index);
  };

  const handleClick = (index: number) => {
    const selected = options[index];
    if (selected) {
      onSelect(selected.provider, selected.model);
    }
  };

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

  const boxWidth = Math.min(60, width - 4);
  const maxListHeight = 12; // Maximum visible items
  const listHeight = Math.min(options.length, maxListHeight, height - 8);

  let startIndex = 0;
  if (selectedIndex >= listHeight) {
    startIndex = selectedIndex - listHeight + 1;
  }
  const visibleOptions = options.slice(startIndex, startIndex + listHeight);

  let lastProvider: ProviderName | null = null;

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
        width={boxWidth}
        borderStyle="round"
        borderColor={theme.accent}
        paddingX={1}
      >
        {/* Header */}
        <Box marginBottom={1} justifyContent="space-between">
          <Text bold color={theme.accent}>
            Model Selector
          </Text>
          <Text dimColor>esc to exit</Text>
        </Box>

        {/* Current model info */}
        <Box>
          <Text color={theme.accent}>Current: </Text>
          <Text>
            {PROVIDER_LABELS[currentProvider]} / {currentModel}
          </Text>
        </Box>

        {/* Top divider */}
        <Text dimColor>{'─'.repeat(boxWidth - 4)}</Text>

        {/* Model list */}
        <Box flexDirection="column">
          {visibleOptions.map((option, i) => {
            const actualIndex = startIndex + i;
            const isSelected = actualIndex === selectedIndex;
            const isCurrent =
              option.provider === currentProvider &&
              option.model === currentModel;
            const showProviderHeader = option.provider !== lastProvider;
            lastProvider = option.provider;

            return (
              <Box
                key={`${option.provider}-${option.model}`}
                flexDirection="column"
              >
                {showProviderHeader && (
                  <Text bold color={theme.accent}>
                    {i > 0 ? '\n' : ''}
                    {option.providerLabel}
                  </Text>
                )}
                <ModelRow
                  option={option}
                  isSelected={isSelected}
                  isCurrent={isCurrent}
                  rowWidth={boxWidth - 4}
                  accent={theme.accent}
                  onHover={() => handleHover(actualIndex)}
                  onClick={() => handleClick(actualIndex)}
                />
              </Box>
            );
          })}
        </Box>

        {/* Bottom divider */}
        <Text dimColor>{'─'.repeat(boxWidth - 4)}</Text>

        {/* Footer */}
        <Box justifyContent="space-between">
          <Text dimColor>↑↓ navigate</Text>
          {options.length > listHeight && (
            <Text dimColor>
              {startIndex + 1}-
              {Math.min(startIndex + listHeight, options.length)}/
              {options.length}
            </Text>
          )}
          <Text dimColor>↵ select</Text>
        </Box>
      </Box>
    </Box>
  );
}

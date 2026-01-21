export type SlashCommandAction =
  | 'openModelSwitcher'
  | 'openSessionPicker'
  | 'openThemePicker'
  | 'newSession'
  | 'clearChat'
  | 'exitChat';

export interface SlashCommand {
  name: string;
  description: string;
  action: SlashCommandAction;
  shortcut?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'models',
    description: 'Switch AI model',
    action: 'openModelSwitcher',
    shortcut: 'Ctrl+P',
  },
  {
    name: 'sessions',
    description: 'Browse chat sessions',
    action: 'openSessionPicker',
    shortcut: 'Ctrl+O',
  },
  {
    name: 'theme',
    description: 'Change color theme',
    action: 'openThemePicker',
    shortcut: 'Ctrl+T',
  },
  {
    name: 'new',
    description: 'Start new chat session',
    action: 'newSession',
    shortcut: 'Ctrl+N',
  },
  {
    name: 'clear',
    description: 'Clear current chat',
    action: 'clearChat',
    shortcut: 'Ctrl+L',
  },
  {
    name: 'exit',
    description: 'Exit chat',
    action: 'exitChat',
    shortcut: 'Ctrl+C',
  },
];

export function filterCommands(query: string): SlashCommand[] {
  const normalizedQuery = query.toLowerCase().replace(/^\//, '');
  if (!normalizedQuery) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().startsWith(normalizedQuery) ||
      cmd.description.toLowerCase().includes(normalizedQuery),
  );
}

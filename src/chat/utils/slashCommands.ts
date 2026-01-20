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
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'models',
    description: 'Switch AI model',
    action: 'openModelSwitcher',
  },
  {
    name: 'sessions',
    description: 'Browse chat sessions',
    action: 'openSessionPicker',
  },
  {
    name: 'theme',
    description: 'Change color theme',
    action: 'openThemePicker',
  },
  { name: 'new', description: 'Start new chat session', action: 'newSession' },
  { name: 'clear', description: 'Clear current chat', action: 'clearChat' },
  { name: 'exit', description: 'Exit chat', action: 'exitChat' },
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

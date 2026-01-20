import chalk from 'chalk';

// Bashio brand orange color (deprecated - use accent from cliTheme.ts)
export const orange = chalk.hex('#eea154');

// Re-export accent for convenience
export { accent, getCliTheme } from './cliTheme.js';

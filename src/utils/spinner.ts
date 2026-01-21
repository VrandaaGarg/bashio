import ora, { type Ora } from 'ora';
import { accent } from './colors.js';

export function createSpinner(text: string): Ora {
  const accentColor = accent;
  const themedSpinner = {
    interval: 80,
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((f) =>
      accentColor(f),
    ),
  };

  return ora({
    text: accentColor(text),
    spinner: themedSpinner,
  });
}

import ora, { type Ora } from 'ora';
import { orange } from './colors.js';

// Custom spinner with orange-colored frames
const orangeSpinner = {
  interval: 80,
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((f) =>
    orange(f),
  ),
};

export function createSpinner(text: string): Ora {
  return ora({
    text: orange(text),
    spinner: orangeSpinner,
  });
}

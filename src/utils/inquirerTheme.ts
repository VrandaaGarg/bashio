import chalk from 'chalk';
import { orange } from './colors.js';

export const bashioTheme = {
  prefix: {
    idle: orange('?'),
    done: orange('✔'),
  },
  style: {
    answer: (text: string) => orange(text),
    highlight: (text: string) => orange(text),
    description: (text: string) => chalk.dim(text),
  },
  icon: {
    cursor: orange('❯'),
  },
};

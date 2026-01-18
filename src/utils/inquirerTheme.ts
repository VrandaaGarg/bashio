import pc from 'picocolors';

export const bashioTheme = {
  prefix: {
    idle: pc.yellow('?'),
    done: pc.yellow('✔'),
  },
  style: {
    answer: (text: string) => pc.yellow(text),
    highlight: (text: string) => pc.yellow(text),
    description: (text: string) => pc.dim(text),
  },
  icon: {
    cursor: pc.yellow('❯'),
  },
};

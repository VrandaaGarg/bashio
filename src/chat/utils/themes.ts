export interface Theme {
  name: string;
  displayName: string;
  accent: string;
  background: string;
  secondaryBg: string;
  textPrimary: string;
  textDim: string;
}

export const THEMES: Theme[] = [
  // Default
  {
    name: 'bashio',
    displayName: 'Bashio',
    accent: '#eea154',
    background: '#1e1e1e',
    secondaryBg: '#2a2a2a',
    textPrimary: 'white',
    textDim: 'gray',
  },
  // A
  {
    name: 'aura',
    displayName: 'Aura',
    accent: '#a277ff',
    background: '#15141b',
    secondaryBg: '#1c1b22',
    textPrimary: '#edecee',
    textDim: '#6d6d6d',
  },
  {
    name: 'ayu-dark',
    displayName: 'Ayu Dark',
    accent: '#ffb454',
    background: '#0a0e14',
    secondaryBg: '#0d1117',
    textPrimary: '#bfbdb6',
    textDim: '#565b66',
  },
  // C
  {
    name: 'catppuccin',
    displayName: 'Catppuccin Mocha',
    accent: '#cba6f7',
    background: '#1e1e2e',
    secondaryBg: '#313244',
    textPrimary: '#cdd6f4',
    textDim: '#6c7086',
  },
  {
    name: 'catppuccin-frappe',
    displayName: 'Catppuccin Frappe',
    accent: '#ca9ee6',
    background: '#303446',
    secondaryBg: '#414559',
    textPrimary: '#c6d0f5',
    textDim: '#737994',
  },
  {
    name: 'catppuccin-macchiato',
    displayName: 'Catppuccin Macchiato',
    accent: '#c6a0f6',
    background: '#24273a',
    secondaryBg: '#363a4f',
    textPrimary: '#cad3f5',
    textDim: '#6e738d',
  },
  {
    name: 'cobalt2',
    displayName: 'Cobalt2',
    accent: '#ffc600',
    background: '#193549',
    secondaryBg: '#15232d',
    textPrimary: '#ffffff',
    textDim: '#0088ff',
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    accent: '#007acc',
    background: '#1e1e1e',
    secondaryBg: '#252526',
    textPrimary: '#cccccc',
    textDim: '#808080',
  },
  // D
  {
    name: 'dracula',
    displayName: 'Dracula',
    accent: '#bd93f9',
    background: '#282a36',
    secondaryBg: '#44475a',
    textPrimary: '#f8f8f2',
    textDim: '#6272a4',
  },
  // E
  {
    name: 'everforest',
    displayName: 'Everforest',
    accent: '#a7c080',
    background: '#2d353b',
    secondaryBg: '#343f44',
    textPrimary: '#d3c6aa',
    textDim: '#859289',
  },
  // F
  {
    name: 'flexoki',
    displayName: 'Flexoki',
    accent: '#d0a215',
    background: '#100f0f',
    secondaryBg: '#1c1b1a',
    textPrimary: '#cecdc3',
    textDim: '#878580',
  },
  // G
  {
    name: 'github-dark',
    displayName: 'GitHub Dark',
    accent: '#58a6ff',
    background: '#0d1117',
    secondaryBg: '#161b22',
    textPrimary: '#c9d1d9',
    textDim: '#8b949e',
  },
  {
    name: 'gruvbox',
    displayName: 'Gruvbox',
    accent: '#fe8019',
    background: '#282828',
    secondaryBg: '#3c3836',
    textPrimary: '#ebdbb2',
    textDim: '#928374',
  },
  // H
  {
    name: 'high-contrast',
    displayName: 'High Contrast',
    accent: '#ffffff',
    background: '#000000',
    secondaryBg: '#1a1a1a',
    textPrimary: '#ffffff',
    textDim: '#888888',
  },
  // K
  {
    name: 'kanagawa',
    displayName: 'Kanagawa',
    accent: '#7e9cd8',
    background: '#1f1f28',
    secondaryBg: '#2a2a37',
    textPrimary: '#dcd7ba',
    textDim: '#727169',
  },
  // L
  {
    name: 'light',
    displayName: 'Light',
    accent: '#0066cc',
    background: '#ffffff',
    secondaryBg: '#f5f5f5',
    textPrimary: '#1f1f1f',
    textDim: '#6e6e6e',
  },
  // M
  {
    name: 'material',
    displayName: 'Material',
    accent: '#89ddff',
    background: '#263238',
    secondaryBg: '#37474f',
    textPrimary: '#eeffff',
    textDim: '#546e7a',
  },
  {
    name: 'monokai',
    displayName: 'Monokai',
    accent: '#a6e22e',
    background: '#272822',
    secondaryBg: '#3e3d32',
    textPrimary: '#f8f8f2',
    textDim: '#75715e',
  },
  // N
  {
    name: 'night-owl',
    displayName: 'Night Owl',
    accent: '#82aaff',
    background: '#011627',
    secondaryBg: '#0b2942',
    textPrimary: '#d6deeb',
    textDim: '#637777',
  },
  {
    name: 'nord',
    displayName: 'Nord',
    accent: '#88c0d0',
    background: '#2e3440',
    secondaryBg: '#3b4252',
    textPrimary: '#eceff4',
    textDim: '#4c566a',
  },
  // O
  {
    name: 'one-dark',
    displayName: 'One Dark',
    accent: '#61afef',
    background: '#282c34',
    secondaryBg: '#21252b',
    textPrimary: '#abb2bf',
    textDim: '#5c6370',
  },
  // P
  {
    name: 'poimandres',
    displayName: 'Poimandres',
    accent: '#add7ff',
    background: '#1b1e28',
    secondaryBg: '#252b37',
    textPrimary: '#e4f0fb',
    textDim: '#767c9d',
  },
  // R
  {
    name: 'rose-pine',
    displayName: 'Rose Pine',
    accent: '#c4a7e7',
    background: '#191724',
    secondaryBg: '#1f1d2e',
    textPrimary: '#e0def4',
    textDim: '#6e6a86',
  },
  {
    name: 'rose-pine-moon',
    displayName: 'Rose Pine Moon',
    accent: '#c4a7e7',
    background: '#232136',
    secondaryBg: '#2a273f',
    textPrimary: '#e0def4',
    textDim: '#6e6a86',
  },
  // S
  {
    name: 'solarized-dark',
    displayName: 'Solarized Dark',
    accent: '#268bd2',
    background: '#002b36',
    secondaryBg: '#073642',
    textPrimary: '#839496',
    textDim: '#586e75',
  },
  {
    name: 'synthwave',
    displayName: 'Synthwave 84',
    accent: '#ff7edb',
    background: '#262335',
    secondaryBg: '#34294f',
    textPrimary: '#ffffff',
    textDim: '#848bbd',
  },
  // T
  {
    name: 'tokyo-night',
    displayName: 'Tokyo Night',
    accent: '#7aa2f7',
    background: '#1a1b26',
    secondaryBg: '#24283b',
    textPrimary: '#c0caf5',
    textDim: '#565f89',
  },
  // V
  {
    name: 'vesper',
    displayName: 'Vesper',
    accent: '#ffc799',
    background: '#101010',
    secondaryBg: '#1a1a1a',
    textPrimary: '#b8b8b8',
    textDim: '#5c5c5c',
  },
  {
    name: 'vitesse',
    displayName: 'Vitesse Dark',
    accent: '#4d9375',
    background: '#121212',
    secondaryBg: '#1e1e1e',
    textPrimary: '#dbd7ca',
    textDim: '#758575',
  },
];

export const DEFAULT_THEME = 'bashio';

export function getThemeByName(name: string): Theme {
  return THEMES.find((t) => t.name === name) ?? THEMES[0];
}

export function getThemeNames(): string[] {
  return THEMES.map((t) => t.name);
}

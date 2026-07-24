/** @type {import('tailwindcss').Config} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'App.tsx'),
    path.join(__dirname, 'main.tsx'),
    path.join(__dirname, 'map/**/*.{ts,tsx}'),
    path.join(__dirname, 'store/**/*.ts'),
    path.join(__dirname, 'components/**/*.{ts,tsx}'),
    path.join(__dirname, 'utils/**/*.ts'),
    path.join(__dirname, 'stories/**/*.{ts,tsx}'),
    path.join(__dirname, 'styles/**/*.css'),
  ],
  theme: {
    extend: {
      colors: {
        paper: '#ebe1cd',
        'panel-bg': '#1c1a17',
        'panel-card': '#252220',
        'panel-header': '#252220',
        'panel-hover': '#332e2a',
        'panel-active': '#3a3020',
        'panel-border': 'rgba(180, 160, 130, 0.15)',
        'accent-gold': '#c4a35a',
        'interactive': '#6a9ec2',
        'accent-blue': '#6a9ec2',
        'status-good': '#56d364',
        'status-warn': '#e8a838',
        'status-danger': '#f47068',
        'text-primary': '#ddd5c8',
        'text-secondary': '#a89e90',
        'faction-rs': '#e08080',
        'faction-rbih': '#4a9a55',
        'faction-hrhb': '#4080b8',
        'faction-rs-subtle': '#e08080',
        'faction-rbih-subtle': '#79b07f',
        'faction-hrhb-subtle': '#6d99c3',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['IBM Plex Sans Condensed', 'sans-serif'],
      },
      dropShadow: {
        'glow-sm': '0 0 4px rgba(180, 160, 130, 0.25)',
        'glow-md': '0 0 8px rgba(180, 160, 130, 0.35)',
        'glow-gold': '0 0 8px rgba(196, 163, 90, 0.4)',
      },
      boxShadow: {
        'glow-inner': 'inset 0 0 8px rgba(180, 160, 130, 0.1)',
        'glow-sm': '0 0 4px rgba(180, 160, 130, 0.15)',
      },
    },
  },
  plugins: [],
};

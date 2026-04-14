import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ZytekOS Design System — exact match to HTML version
        bg:        '#0d0d0f',
        surface:   '#16161a',
        surface2:  '#1e1e24',
        surface3:  '#1e2640',
        topbar:    '#111114',
        border:    'rgba(255,255,255,0.08)',
        border2:   'rgba(255,255,255,0.14)',
        text:      { DEFAULT: '#f0f0f5', mid: '#b0b0c0', dim: '#606070' },
        orange:    { DEFAULT: '#ff7c20', dim: 'rgba(255,124,32,0.12)', b: 'rgba(255,124,32,0.3)' },
        green:     { DEFAULT: '#2ee87a', dim: 'rgba(46,232,122,0.1)',  b: 'rgba(46,232,122,0.25)' },
        red:       { DEFAULT: '#ff4757', dim: 'rgba(255,71,87,0.12)',  b: 'rgba(255,71,87,0.25)' },
        blue:      { DEFAULT: '#38b6ff', dim: 'rgba(56,182,255,0.1)',  b: 'rgba(56,182,255,0.25)' },
        amber:     { DEFAULT: '#ffc040', dim: 'rgba(255,192,64,0.1)',  b: 'rgba(255,192,64,0.25)' },
        purple:    { DEFAULT: '#a855f7', dim: 'rgba(168,85,247,0.1)',  b: 'rgba(168,85,247,0.25)' },
        cyan:      { DEFAULT: '#00d4ff', dim: 'rgba(0,212,255,0.1)' },
      },
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        mono:  ['DM Mono', 'monospace'],
        serif: ['Fraunces', 'serif'],
      },
      borderRadius: { zytek: '10px' },
    },
  },
  plugins: [],
}
export default config

/**
 * Colours are CSS variables (RGB triplets) defined in src/index.css, so the
 * same class names work in both themes and opacity modifiers like
 * `bg-ink/10` keep working.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        raised: token('raised'),
        ink: token('ink'),
        muted: token('muted'),
        subtle: token('subtle'),
        accent: token('accent'),
        open: token('open'),
        offered: token('offered'),
        progress: token('progress'),
        done: token('done'),
        danger: token('danger'),
      },
      borderColor: {
        DEFAULT: 'rgb(var(--line) / var(--line-alpha))',
        line: 'rgb(var(--line) / var(--line-alpha))',
        strong: 'rgb(var(--line) / var(--line-strong-alpha))',
      },
      letterSpacing: {
        display: '-0.05em',
        heading: '-0.035em',
        eyebrow: '0.2em',
      },
      maxWidth: {
        page: '1240px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'none' },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.98) translateY(6px)' },
          to: { opacity: 1, transform: 'none' },
        },
        shimmer: {
          to: { transform: 'translateX(100%)' },
        },
        'scroll-line': {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'top' },
          '50%': { transform: 'scaleY(1)', transformOrigin: 'top' },
          '51%': { transform: 'scaleY(1)', transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(0)', transformOrigin: 'bottom' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fade-in 0.3s ease both',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        shimmer: 'shimmer 1.5s infinite',
        'scroll-line': 'scroll-line 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
      },
    },
  },
  plugins: [],
};

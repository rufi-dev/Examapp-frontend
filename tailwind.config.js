import scrollbar from 'tailwind-scrollbar'

// Tokens are stored as bare OKLCH "L C H" triplets in CSS vars so Tailwind's
// <alpha-value> opacity modifiers (bg-primary/10, ring-ring/50, ...) work.
const token = (name) => `oklch(var(${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}', './redux/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('--bg'),
        surface: token('--surface'),
        surface2: token('--surface-2'),
        line: token('--border'),
        text: token('--text'),
        muted: token('--text-muted'),
        primary: {
          DEFAULT: token('--primary'),
          hover: token('--primary-hover'),
          fg: token('--primary-fg'),
        },
        accent2: token('--accent-2'),
        success: token('--success'),
        warning: token('--warning'),
        danger: token('--danger'),
        ring: token('--ring'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Fraunces', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px oklch(var(--shadow) / 0.05), 0 10px 28px -14px oklch(var(--shadow) / 0.20)',
        lift: '0 2px 6px oklch(var(--shadow) / 0.06), 0 22px 48px -20px oklch(var(--shadow) / 0.28)',
        glow: '0 10px 34px -10px oklch(var(--primary) / 0.45)',
        inset: 'inset 0 1px 0 0 oklch(var(--surface) / 0.6)',
      },
      keyframes: {
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        marquee: 'marquee 28s linear infinite',
      },
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [scrollbar({ nocompatible: true })],
}

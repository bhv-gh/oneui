/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Page backgrounds (state-dependent)
        'page-base': 'var(--color-page-base)',
        'page-focus': 'var(--color-page-focus)',
        'page-break': 'var(--color-page-break)',
        'page-paused': 'var(--color-page-paused)',

        // Surfaces
        'surface-primary': 'var(--color-surface-primary)',
        'surface-secondary': 'var(--color-surface-secondary)',
        'surface-tertiary': 'var(--color-surface-tertiary)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'surface-inset': 'var(--color-surface-inset)',
        'surface-overlay': 'var(--color-surface-overlay)',

        // Content (text)
        'content-primary': 'var(--color-content-primary)',
        'content-secondary': 'var(--color-content-secondary)',
        'content-tertiary': 'var(--color-content-tertiary)',
        'content-muted': 'var(--color-content-muted)',
        'content-disabled': 'var(--color-content-disabled)',
        'content-inverse': 'var(--color-content-inverse)',

        // Borders
        'edge-primary': 'var(--color-edge-primary)',
        'edge-secondary': 'var(--color-edge-secondary)',
        'edge-focus': 'var(--color-edge-focus)',

        // Accent
        'accent': 'var(--color-accent)',
        'accent-bold': 'var(--color-accent-bold)',
        'accent-bolder': 'var(--color-accent-bolder)',
        'accent-boldest': 'var(--color-accent-boldest)',
        'accent-subtle': 'var(--color-accent-subtle)',
        'accent-subtler': 'var(--color-accent-subtler)',

        // Accent secondary
        'accent-secondary': 'var(--color-accent-secondary)',
        'accent-secondary-bold': 'var(--color-accent-secondary-bold)',
        'accent-secondary-subtle': 'var(--color-accent-secondary-subtle)',

        // Brand gradient
        'brand-from': 'var(--color-brand-from)',
        'brand-to': 'var(--color-brand-to)',

        // Status
        'success': 'var(--color-success)',
        'success-subtle': 'var(--color-success-subtle)',
        'danger': 'var(--color-danger)',
        'danger-subtle': 'var(--color-danger-subtle)',
        'warning': 'var(--color-warning)',
        'warning-subtle': 'var(--color-warning-subtle)',
        'info': 'var(--color-info)',
        'info-subtle': 'var(--color-info-subtle)',
      },
      keyframes: {
        'border-pulse': {
          '0%, 100%': { borderColor: 'var(--color-timer-border-pulse-from)' },
          '50%': { borderColor: 'var(--color-timer-border-pulse-to)' },
        },
      },
      animation: {
        'border-pulse': 'border-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

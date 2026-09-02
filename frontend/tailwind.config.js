/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{svelte,js,ts,html}', './src/**/*.svelte'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        // Gruvbox dark
        bg: '#282828',
        'bg-h': '#1d2021',
        surface: '#32302f',
        box: '#3c3836',
        'box-hover': '#504945',
        elevated: '#504945',
        border: '#665c54',
        'border-subtle': '#504945',
        muted: '#a89984',
        dim: '#928374',
        fg: '#ebdbb2',
        bright: '#fbf1c7',
        accent: '#fabd2f',
        orange: '#fe8019',
        aqua: '#8ec07c',
        blue: '#83aaca',
        danger: '#fb4934',
        success: '#b8bb26'
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        full: '0px'
      },
      boxShadow: {
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none'
      },
      maxWidth: {
        page: '960px',
        catalog: '72rem'
      }
    }
  },
  plugins: []
};

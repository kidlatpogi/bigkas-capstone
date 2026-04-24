/**
 * Theme configuration — matches Bigkas-mobile design tokens
 * Source: https://github.com/kidlatpogi/Bigkas-mobile/tree/main/src/styles
 */

export const theme = {
  colors: {
    // Primary — Brand accent
    primary: {
      main: '#F18F01',
      dark: '#D59300',
      light: '#FFC340',
      contrast: '#010101',
    },
    // Secondary — Black
    secondary: {
      main: '#010101',
      light: '#2A2A2A',
      contrast: '#FFFFFF',
    },
    // Neutral grays
    gray: {
      100: '#F5F5F5',
      200: '#E9E9E9',
      300: '#D5D5D5',
      400: '#B0B0B0',
      500: '#8C8C8C',
      600: '#6E6E6E',
      700: '#4B4B4B',
      800: '#2E2E2E',
      900: '#1A1A1A',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
      hover: '#E9E9E9',
    },
    text: {
      primary: '#010101',
      secondary: 'rgba(1, 1, 1, 0.6)',
      muted: 'rgba(1, 1, 1, 0.45)',
      inverse: '#FFFFFF',
      disabled: '#B0B0B0',
    },
    border: '#E2E2E2',
    borderDark: '#010101',
    divider: '#E9E9E9',
    status: {
      error: '#ff0000',
      warning: '#F59E0B',
      success: '#22C55E',
      info: '#3B82F6',
    },
  },

  // Spacing scale — 4px grid
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },

  // Padding presets
  padding: {
    screen: '16px',
    card: '16px',
    button: '12px',
    input: '12px',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
      xxxl: '32px',
      display: '40px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  transitions: {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease',
  },

  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },

  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
  },
};

// Dark theme overrides
export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: {
      default: '#1A1A1A',
      paper: '#2E2E2E',
      hover: '#4B4B4B',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.6)',
      muted: 'rgba(255, 255, 255, 0.45)',
      inverse: '#010101',
      disabled: '#6E6E6E',
    },
    border: '#4B4B4B',
    divider: '#4B4B4B',
  },
};

export default theme;

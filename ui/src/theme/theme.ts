// Modern Theme Configuration
export const theme = {
  colors: {
    // Primary colors
    primary: '#007AFF',
    primaryDark: '#0051D5',
    primaryLight: '#5AC8FA',
    
    // Success colors
    success: '#34C759',
    successDark: '#28A745',
    successLight: '#6FCF97',
    
    // Warning colors
    warning: '#FF9500',
    warningDark: '#F57C00',
    warningLight: '#FFB84D',
    
    // Error colors
    error: '#FF3B30',
    errorDark: '#D32F2F',
    errorLight: '#FF6B6B',
    
    // Neutral colors
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Text colors
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#FFFFFF',
    
    // Border colors
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    borderDark: '#CCCCCC',
    
    // Status colors
    pending: '#FF9500',
    confirmed: '#007AFF',
    preparing: '#FF9500',
    ready: '#34C759',
    pickedUp: '#34C759',
    cancelled: '#FF3B30',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
  },
  
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    captionBold: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    small: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    smallBold: {
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

export type Theme = typeof theme;


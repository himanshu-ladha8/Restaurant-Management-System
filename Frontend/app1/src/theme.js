import { createTheme } from '@mui/material/styles';

// Create theme based on mode (light or dark)
export const getTheme = (mode = 'dark') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode: mode,
      primary: {
        main: '#FF6B35', // Vibrant orange-red
        light: '#FF8C61',
        dark: '#E55A2B',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#4ECDC4', // Teal
        light: '#6EDDD6',
        dark: '#3BA39C',
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#95E1D3', // Mint green
        light: '#B3E8DD',
        dark: '#7BC4B5',
      },
      warning: {
        main: '#FCE38A', // Yellow
        light: '#FDE9A8',
        dark: '#F9D65C',
      },
      error: {
        main: '#F38181', // Coral
        light: '#F59B9B',
        dark: '#E85D5D',
      },
      info: {
        main: '#AA96DA', // Lavender
        light: '#C4B5E8',
        dark: '#8B7AB8',
      },
      background: {
        default: isDark ? '#0a0a0a' : '#f5f5f5',
        paper: isDark ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)',
      },
      text: {
        primary: isDark ? '#FFFFFF' : '#1a1a1a',
        secondary: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontWeight: 300,
        fontSize: '3rem',
        letterSpacing: '0.02em',
        lineHeight: 1.2,
        fontFamily: "'Playfair Display', 'Georgia', serif",
        '@media (max-width:600px)': {
          fontSize: '2rem',
        },
      },
      h2: {
        fontWeight: 300,
        fontSize: '2.25rem',
        letterSpacing: '0.05em',
        lineHeight: 1.3,
        fontFamily: "'Playfair Display', 'Georgia', serif",
        '@media (max-width:600px)': {
          fontSize: '1.75rem',
        },
      },
      h3: {
        fontWeight: 300,
        fontSize: '1.875rem',
        letterSpacing: '0.05em',
        lineHeight: 1.4,
        fontFamily: "'Playfair Display', 'Georgia', serif",
        '@media (max-width:600px)': {
          fontSize: '1.5rem',
        },
      },
      h4: {
        fontWeight: 300,
        fontSize: '1.5rem',
        letterSpacing: '0.05em',
        lineHeight: 1.4,
        '@media (max-width:600px)': {
          fontSize: '1.25rem',
        },
      },
      h5: {
        fontWeight: 300,
        fontSize: '1.25rem',
        letterSpacing: '0.05em',
        lineHeight: 1.5,
        '@media (max-width:600px)': {
          fontSize: '1.125rem',
        },
      },
      h6: {
        fontWeight: 300,
        fontSize: '1.125rem',
        letterSpacing: '0.05em',
        lineHeight: 1.5,
        '@media (max-width:600px)': {
          fontSize: '1rem',
        },
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
      },
      button: {
        textTransform: 'uppercase',
        fontWeight: 300,
        letterSpacing: '0.1em',
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
    shape: {
      borderRadius: 4,
    },
    spacing: 8,
    zIndex: {
      appBar: 1100,
      drawer: 1200,
      modal: 1300,
      snackbar: 1400,
      tooltip: 1500,
    },
    shadows: [
      'none',
      isDark ? '0 2px 4px rgba(0, 0, 0, 0.04)' : '0 2px 4px rgba(0, 0, 0, 0.08)',
      isDark ? '0 4px 8px rgba(0, 0, 0, 0.06)' : '0 4px 8px rgba(0, 0, 0, 0.12)',
      isDark ? '0 8px 16px rgba(0, 0, 0, 0.08)' : '0 8px 16px rgba(0, 0, 0, 0.16)',
      isDark ? '0 12px 24px rgba(0, 0, 0, 0.1)' : '0 12px 24px rgba(0, 0, 0, 0.2)',
      isDark ? '0 16px 32px rgba(0, 0, 0, 0.12)' : '0 16px 32px rgba(0, 0, 0, 0.24)',
      isDark ? '0 20px 40px rgba(0, 0, 0, 0.14)' : '0 20px 40px rgba(0, 0, 0, 0.28)',
      isDark ? '0 24px 48px rgba(0, 0, 0, 0.16)' : '0 24px 48px rgba(0, 0, 0, 0.32)',
      isDark ? '0 28px 56px rgba(0, 0, 0, 0.18)' : '0 28px 56px rgba(0, 0, 0, 0.36)',
      isDark ? '0 32px 64px rgba(0, 0, 0, 0.2)' : '0 32px 64px rgba(0, 0, 0, 0.4)',
      isDark ? '0 36px 72px rgba(0, 0, 0, 0.22)' : '0 36px 72px rgba(0, 0, 0, 0.44)',
      isDark ? '0 40px 80px rgba(0, 0, 0, 0.24)' : '0 40px 80px rgba(0, 0, 0, 0.48)',
      isDark ? '0 44px 88px rgba(0, 0, 0, 0.26)' : '0 44px 88px rgba(0, 0, 0, 0.52)',
      isDark ? '0 48px 96px rgba(0, 0, 0, 0.28)' : '0 48px 96px rgba(0, 0, 0, 0.56)',
      isDark ? '0 52px 104px rgba(0, 0, 0, 0.3)' : '0 52px 104px rgba(0, 0, 0, 0.6)',
      isDark ? '0 56px 112px rgba(0, 0, 0, 0.32)' : '0 56px 112px rgba(0, 0, 0, 0.64)',
      isDark ? '0 60px 120px rgba(0, 0, 0, 0.34)' : '0 60px 120px rgba(0, 0, 0, 0.68)',
      isDark ? '0 64px 128px rgba(0, 0, 0, 0.36)' : '0 64px 128px rgba(0, 0, 0, 0.72)',
      isDark ? '0 68px 136px rgba(0, 0, 0, 0.38)' : '0 68px 136px rgba(0, 0, 0, 0.76)',
      isDark ? '0 72px 144px rgba(0, 0, 0, 0.4)' : '0 72px 144px rgba(0, 0, 0, 0.8)',
      isDark ? '0 76px 152px rgba(0, 0, 0, 0.42)' : '0 76px 152px rgba(0, 0, 0, 0.84)',
      isDark ? '0 80px 160px rgba(0, 0, 0, 0.44)' : '0 80px 160px rgba(0, 0, 0, 0.88)',
      isDark ? '0 84px 168px rgba(0, 0, 0, 0.46)' : '0 84px 168px rgba(0, 0, 0, 0.92)',
      isDark ? '0 88px 176px rgba(0, 0, 0, 0.48)' : '0 88px 176px rgba(0, 0, 0, 0.96)',
      isDark ? '0 92px 184px rgba(0, 0, 0, 0.5)' : '0 92px 184px rgba(0, 0, 0, 1)',
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            padding: '12px 28px',
            fontSize: '1rem',
            fontWeight: 300,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'none',
          },
          contained: {
            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
            '&:hover': {
              background: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.2)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          outlined: {
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
            '&:hover': {
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
              transform: 'translateY(-2px)',
            },
          },
          text: {
            color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              color: isDark ? '#FFFFFF' : '#1a1a1a',
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: isDark 
              ? '0 4px 20px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)'
              : '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
            borderRadius: 4,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              boxShadow: isDark
                ? '0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)'
                : '0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
              transform: 'translateY(-6px)',
              backgroundColor: isDark ? 'rgba(26, 26, 26, 1)' : 'rgba(255, 255, 255, 1)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            backgroundImage: 'none',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
          },
          elevation1: {
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
              : '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          },
          elevation2: {
            boxShadow: isDark
              ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'
              : '0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            borderRadius: 4,
            boxShadow: isDark
              ? '0 24px 64px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3)'
              : '0 24px 64px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              backgroundColor: isDark ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              color: isDark ? '#FFFFFF' : '#1a1a1a',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(26, 26, 26, 1)' : 'rgba(255, 255, 255, 1)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
                  borderWidth: '1px',
                },
              },
              '&.Mui-focused': {
                backgroundColor: isDark ? 'rgba(26, 26, 26, 1)' : 'rgba(255, 255, 255, 1)',
                boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                  borderWidth: '1px',
                },
              },
              '& input': {
                color: isDark ? '#FFFFFF' : '#1a1a1a',
              },
              '& textarea': {
                color: isDark ? '#FFFFFF' : '#1a1a1a',
              },
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.23)',
              borderWidth: '1px',
            },
            '& .MuiInputLabel-root': {
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDark ? '#1a1a1a' : '#ffffff',
            boxShadow: 'none',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 2,
            fontWeight: 300,
            fontSize: '0.875rem',
            height: 32,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '28px',
            '&:last-child': {
              paddingBottom: '28px',
            },
          },
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: '24px',
            paddingRight: '24px',
            '@media (min-width: 600px)': {
              paddingLeft: '32px',
              paddingRight: '32px',
            },
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: '72px !important',
            '@media (min-width: 600px)': {
              minHeight: '80px !important',
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiList: {
        styleOverrides: {
          root: {
            color: isDark ? '#FFFFFF' : '#1a1a1a',
            backgroundColor: 'transparent',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: isDark ? '#FFFFFF' : '#1a1a1a',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
              },
            },
            '& .MuiListItemText-primary': {
              color: isDark ? '#FFFFFF' : '#1a1a1a',
            },
            '& .MuiListItemText-secondary': {
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
            },
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            color: isDark ? '#FFFFFF' : '#1a1a1a',
          },
          secondary: {
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            color: isDark ? '#FFFFFF' : '#1a1a1a',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
            '& .MuiAutocomplete-option': {
              color: isDark ? '#FFFFFF' : '#1a1a1a',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
              },
              '&[aria-selected="true"]': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                },
              },
            },
          },
        },
      },
    },
  });
};

// Default export for backward compatibility
export default getTheme('light');

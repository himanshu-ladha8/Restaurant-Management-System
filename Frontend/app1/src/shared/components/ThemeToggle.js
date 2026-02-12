import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeMode } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { mode, toggleMode } = useThemeMode();

  return (
    <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <IconButton
        onClick={toggleMode}
        sx={{
          color: 'inherit',
          transition: 'all 0.3s',
          '&:hover': {
            transform: 'rotate(20deg) scale(1.1)',
          },
        }}
      >
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;


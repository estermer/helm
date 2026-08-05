import { Box } from '@mui/material';
import { Menu } from 'react-admin';

export const AppMenu = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}
  >
    <Menu>
      <Menu.Item to="/" primaryText="Dashboard" />
      <Menu.Item to="/calculator" primaryText="Calculator" />
    </Menu>
    <Box sx={{ mt: 'auto' }}>
      <Menu>
        <Menu.Item to="/login" primaryText="Login" />
      </Menu>
    </Box>
  </Box>
);

export default AppMenu;

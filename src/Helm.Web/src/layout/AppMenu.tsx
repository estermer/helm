import { Box, Tooltip } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalculateIcon from '@mui/icons-material/Calculate';
import LoginIcon from '@mui/icons-material/Login';
import { Menu, useSidebarState } from 'react-admin';
import type { ReactNode } from 'react';

type ItemProps = {
  to: string;
  primaryText: string;
  icon: ReactNode;
  open: boolean;
};

const NavItem = ({ to, primaryText, icon, open }: ItemProps) => {
  const item = (
    <Menu.Item to={to} primaryText={open ? primaryText : ''} leftIcon={icon} />
  );
  return open ? item : <Tooltip title={primaryText} placement="right">{item}</Tooltip>;
};

export const AppMenu = () => {
  const [open, _] = useSidebarState();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: open ? 200 : 60,
        transition: 'width 0.2s ease',
      }}
    >
      <Menu>
        <NavItem to="/" primaryText="Dashboard" icon={<DashboardIcon />} open={open} />
        <NavItem to="/calculator" primaryText="Calculator" icon={<CalculateIcon />} open={open} />
      </Menu>

      <Box sx={{ mt: 'auto' }}>
        <Menu>
          <NavItem to="/login" primaryText="Login" icon={<LoginIcon />} open={open} />
        </Menu>
      </Box>
    </Box>
  );
};

export default AppMenu;

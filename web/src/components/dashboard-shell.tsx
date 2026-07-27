'use client';

import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import HistoryIcon from '@mui/icons-material/History';
import MenuIcon from '@mui/icons-material/Menu';
import RamenDiningIcon from '@mui/icons-material/RamenDining';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { messages } from '@/messages';
import { ColorModeToggle } from './color-mode-toggle';

const DRAWER_WIDTH = 240;

const navItems = [
  { href: '/inicio', label: messages.nav.inicio, icon: <DashboardIcon />, adminOnly: false },
  {
    href: '/academia',
    label: messages.nav.academia,
    icon: <FitnessCenterIcon />,
    adminOnly: false,
  },
  { href: '/koi', label: messages.nav.koi, icon: <RamenDiningIcon />, adminOnly: false },
  { href: '/auditoria', label: messages.nav.auditoria, icon: <HistoryIcon />, adminOnly: false },
  {
    href: '/acessos',
    label: messages.nav.acessos,
    icon: <AdminPanelSettingsIcon />,
    adminOnly: true,
  },
];

export interface ShellUser {
  name: string;
  image: string | null;
}

export function DashboardShell({
  user,
  isAdmin,
  onLogout,
  children,
}: {
  user: ShellUser;
  isAdmin: boolean;
  onLogout: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap>
          🐉 {messages.appName}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {visibleItems.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              selected={pathname.startsWith(item.href)}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="menu"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {messages.appName}
          </Typography>
          <ColorModeToggle />
          <IconButton
            aria-label={user.name}
            onClick={(event) => setUserMenuAnchor(event.currentTarget)}
            sx={{ ml: 1 }}
          >
            <Avatar src={user.image ?? undefined} alt={user.name} sx={{ width: 32, height: 32 }}>
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
          >
            <MenuItem disabled>{user.name}</MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setUserMenuAnchor(null);
                void onLogout();
              }}
            >
              {messages.userMenu.logout}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Toolbar />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          {children}
        </Box>
        <Box component="footer" sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            {messages.footer}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

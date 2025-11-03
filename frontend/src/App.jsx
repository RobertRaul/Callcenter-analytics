// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  ThemeProvider,
  createTheme,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Phone,
  Queue,
  People,
  Assessment,
  AccountCircle,
  ExitToApp,
  ManageAccounts,
} from '@mui/icons-material';
import Dashboard from './components/Dashboard';
import Calls from './pages/Calls';
import Queues from './pages/Queues';
import Agents from './pages/Agents';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Login from './pages/Login';

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const allMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', permission: 'dashboard' },
  { text: 'Llamadas', icon: <Phone />, path: '/calls', permission: 'calls' },
  { text: 'Colas', icon: <Queue />, path: '/queues', permission: 'queues' },
  { text: 'Agentes', icon: <People />, path: '/agents', permission: 'agents' },
  { text: 'Reportes', icon: <Assessment />, path: '/reports', permission: 'reports' },
  { text: 'Usuarios', icon: <ManageAccounts />, path: '/users', permission: 'admin' },
];

function App() {
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    // Verificar si hay usuario guardado
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAnchorEl(null);
  };

  const menuItems = user ? allMenuItems.filter(item => {
    if (item.permission === 'admin') return user.username === 'admin';
    return user.permissions[item.permission];
  }) : [];

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Box sx={{ display: 'flex' }}>
          <CssBaseline />
          
          {/* AppBar */}
          <AppBar
            position="fixed"
            sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
          >
            <Toolbar>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                Call Center Analytics - Issabel
              </Typography>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {user.full_name}
              </Typography>
              <IconButton
                color="inherit"
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem onClick={handleLogout}>
                  <ExitToApp sx={{ mr: 1 }} /> Cerrar Sesión
                </MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>

          {/* Sidebar */}
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
          >
            <Toolbar />
            <Box sx={{ overflow: 'auto' }}>
              <List>
                {menuItems.map((item) => (
                  <ListItem
                    button
                    key={item.text}
                    component={Link}
                    to={item.path}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>

          {/* Main Content */}
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calls" element={<Calls />} />
              <Route path="/queues" element={<Queues />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<Users />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;

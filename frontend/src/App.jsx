// App.jsx - Migrado a Ant Design con tema MACSA y navegación responsive
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider, Typography, Dropdown, Avatar, Space } from 'antd';
import {
  DashboardOutlined,
  PhoneOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { macsaTheme } from './config/theme';
// MIGRADAS A ANT DESIGN
import Dashboard from './components/Dashboard';
import Login from './pages/Login';
import Analisis from './pages/Analisis/Analisis';

// MIGRADAS A ANT DESIGN
import Calls from './pages/Calls';
import Queues from './pages/Queues';
import Agents from './pages/Agents';
import Reports from './pages/Reports';
import Users from './pages/Users';
import GlobalLoading from './components/GlobalLoading';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// Definición de items del menú con permisos
const allMenuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
    permission: 'dashboard'
  },
  {
    key: '/calls',
    icon: <PhoneOutlined />,
    label: 'Llamadas',
    permission: 'calls'
  },
  {
    key: '/queues',
    icon: <UnorderedListOutlined />,
    label: 'Colas',
    permission: 'queues'
  },
  {
    key: '/agents',
    icon: <TeamOutlined />,
    label: 'Agentes',
    permission: 'agents'
  },
  {
    key: '/analisis',
    icon: <PieChartOutlined />,
    label: 'Análisis',
    permission: 'reports'
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: 'Reportes',
    permission: 'reports'
  },
  {
    key: '/users',
    icon: <SettingOutlined />,
    label: 'Usuarios',
    permission: 'admin'
  },
];

// Componente principal con navegación
function AppLayout({ user, onLogout }) {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // En movil el menu arranca oculto
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);

  // Detectar cambios de tamaño de ventana para responsive
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-colapsar en móvil
      if (mobile) {
        setCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtrar items del menú según permisos
  const menuItems = user ? allMenuItems.filter(item => {
    if (item.permission === 'admin') return user.username === 'admin';
    return user.permissions && user.permissions[item.permission];
  }) : [];

  // Menú dropdown del usuario
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      onClick: onLogout
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar con navegación responsive */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="md"
        collapsedWidth={isMobile ? 0 : 80}
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          if (broken) setCollapsed(true);
        }}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1001
        }}
        theme="dark"
        width={240}
      >
        {/* Logo/Título */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 'bold',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? 'CCA' : 'Call Center Analytics'}
        </div>

        {/* Menú de navegación */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={() => { if (isMobile) setCollapsed(true); }}
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: <Link to={item.key}>{item.label}</Link>
          }))}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {/* Fondo oscuro al abrir el menu en movil (cerrar al tocar) */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1000
          }}
        />
      )}

      {/* Layout principal */}
      <Layout style={{ marginLeft: collapsed ? (isMobile ? 0 : 80) : (isMobile ? 0 : 240), transition: 'all 0.2s' }}>
        {/* Header */}
        <Header style={{
          padding: isMobile ? '0 12px' : '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 998
        }}>
          {/* Botón toggle del menú */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              style: { fontSize: 18, cursor: 'pointer' },
              onClick: () => setCollapsed(!collapsed)
            })}
            <Typography.Title level={4} style={{ margin: '0 0 0 16px', fontSize: isMobile ? 14 : 18 }}>
              {isMobile ? 'CCA' : 'Call Center Analytics - Issabel'}
            </Typography.Title>
          </div>

          {/* Menú de usuario */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              {!isMobile && <Text>{user.full_name}</Text>}
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: macsaTheme.token.colorPrimary }} />
            </Space>
          </Dropdown>
        </Header>

        {/* Contenido principal */}
        <Content style={{
          margin: isMobile ? '12px 8px' : '24px 16px',
          padding: isMobile ? 12 : 24,
          background: '#fff',
          minHeight: 280,
          borderRadius: 8,
          overflowX: 'hidden'
        }}>
          <Routes>
            {/* MIGRADAS Y FUNCIONALES */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/analisis" element={<Analisis />} />

            {/* TODAS MIGRADAS Y FUNCIONALES */}
            <Route path="/calls" element={<Calls />} />
            <Route path="/queues" element={<Queues />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

// Componente principal de la aplicación
function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Verificar si hay usuario guardado
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Si no hay usuario, mostrar login
  if (!user) {
    return (
      <ConfigProvider theme={macsaTheme}>
        <GlobalLoading />
        <Login onLoginSuccess={handleLoginSuccess} />
      </ConfigProvider>
    );
  }

  // Si hay usuario, mostrar layout principal
  return (
    <ConfigProvider theme={macsaTheme}>
      <GlobalLoading />
      <Router>
        <AppLayout user={user} onLogout={handleLogout} />
      </Router>
    </ConfigProvider>
  );
}

export default App;

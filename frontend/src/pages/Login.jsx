// pages/Login.jsx - Diseño Premium con Colores MACSA
import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, BarChartOutlined } from '@ant-design/icons';
import axios from 'axios';
import { MACSA_COLORS } from '../config/theme';
import api from '../services/api';

const { Title, Text } = Typography;

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setError('');
    setLoading(true);

    try {
//      const response = await axios.post('http://192.168.11.3:8000/api/auth/login', {

	const response = await api.post('/auth/login', {
        username: values.username,
        password: values.password
      });

      const { access_token, user } = response.data;

      // Guardar token y usuario
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      onLoginSuccess(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${MACSA_COLORS.blue} 0%, #1976D2 50%, ${MACSA_COLORS.gold} 100%)`,
    }}>
      {/* Decoración de fondo */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '500px',
        height: '500px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(80px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '400px',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(80px)'
      }} />

      {/* Contenedor principal */}
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1200px',
        margin: 'auto',
        padding: '40px 20px',
        gap: '60px',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Panel izquierdo - Branding */}
        <div style={{
          flex: 1,
          color: '#fff',
          display: window.innerWidth < 768 ? 'none' : 'block'
        }}>
          {/* Logo MACSA */}
          <div style={{
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#fff',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              fontSize: '32px',
              fontWeight: 'bold',
              color: MACSA_COLORS.blue,
              fontFamily: 'Arial, sans-serif'
            }}>
              M
            </div>
            <div>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                letterSpacing: '2px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
              }}>
                MACSA
              </div>
              <div style={{
                fontSize: '16px',
                opacity: 0.9,
                letterSpacing: '1px'
              }}>
                Clínica de Salud
              </div>
            </div>
          </div>

          {/* Título principal */}
          <Title level={1} style={{
            color: '#fff',
            fontSize: '42px',
            marginBottom: '16px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
          }}>
            Call Center Analytics
          </Title>

          <Text style={{
            color: '#fff',
            fontSize: '18px',
            display: 'block',
            marginBottom: '40px',
            opacity: 0.95,
            lineHeight: '1.6'
          }}>
            Sistema avanzado de análisis y métricas para optimizar el rendimiento
            de tu centro de atención telefónica.
          </Text>

          {/* Características destacadas */}
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <BarChartOutlined style={{ fontSize: '24px', color: '#fff' }} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                  7 Reportes Avanzados
                </div>
                <div style={{ color: '#fff', opacity: 0.8, fontSize: '14px' }}>
                  Análisis detallados con insights automáticos
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <PhoneOutlined style={{ fontSize: '24px', color: '#fff' }} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                  Monitoreo en Tiempo Real
                </div>
                <div style={{ color: '#fff', opacity: 0.8, fontSize: '14px' }}>
                  Seguimiento de llamadas y agentes al instante
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: `rgba(212, 175, 55, 0.3)`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(212, 175, 55, 0.5)'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: MACSA_COLORS.gold,
                  borderRadius: '50%'
                }} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                  SLA y Cumplimiento
                </div>
                <div style={{ color: '#fff', opacity: 0.8, fontSize: '14px' }}>
                  Métricas de calidad y rendimiento
                </div>
              </div>
            </div>
          </Space>
        </div>

        {/* Panel derecho - Formulario de login */}
        <div style={{ flex: window.innerWidth < 768 ? '1' : '0 0 450px' }}>
          <Card
            style={{
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              borderRadius: '24px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)'
            }}
            bodyStyle={{ padding: '48px' }}
          >
            {/* Header del formulario */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              {/* Icono decorativo */}
              <div style={{
                width: '72px',
                height: '72px',
                margin: '0 auto 24px',
                background: `linear-gradient(135deg, ${MACSA_COLORS.blue} 0%, ${MACSA_COLORS.gold} 100%)`,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(33, 150, 243, 0.3)',
                transform: 'rotate(10deg)'
              }}>
                <LockOutlined style={{
                  fontSize: 36,
                  color: '#fff',
                  transform: 'rotate(-10deg)'
                }} />
              </div>

              <Title level={2} style={{ margin: '0 0 8px 0', color: '#1a1a1a' }}>
                Bienvenido
              </Title>
              <Text style={{ color: MACSA_COLORS.gray, fontSize: '15px' }}>
                Inicia sesión para acceder al sistema
              </Text>
            </div>

            {/* Error alert */}
            {error && (
              <Alert
                message="Error de autenticación"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError('')}
                style={{
                  marginBottom: 24,
                  borderRadius: '12px'
                }}
              />
            )}

            {/* Formulario */}
            <Form
              name="login"
              onFinish={handleSubmit}
              autoComplete="off"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: 'Por favor ingresa tu usuario' }
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: MACSA_COLORS.blue }} />}
                  placeholder="Usuario"
                  autoFocus
                  style={{
                    borderRadius: '12px',
                    height: '50px',
                    fontSize: '15px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Por favor ingresa tu contraseña' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: MACSA_COLORS.blue }} />}
                  placeholder="Contraseña"
                  style={{
                    borderRadius: '12px',
                    height: '50px',
                    fontSize: '15px'
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{
                    height: 52,
                    fontSize: 16,
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${MACSA_COLORS.blue} 0%, #1976D2 100%)`,
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(33, 150, 243, 0.4)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(33, 150, 243, 0.4)';
                  }}
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </Form.Item>
            </Form>

            {/* Footer del formulario */}
            <div style={{
              textAlign: 'center',
              marginTop: 32,
              paddingTop: 24,
              borderTop: '1px solid #f0f0f0'
            }}>
              <Text style={{ color: MACSA_COLORS.gray, fontSize: '13px' }}>
                Sistema de Análisis de Call Center
              </Text>
              <br />
              <Text style={{ color: MACSA_COLORS.gold, fontSize: '12px', fontWeight: 'bold' }}>
                MACSA v2.0 • Premium Edition
              </Text>
            </div>
          </Card>

          {/* Texto de copyright */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Text style={{
              color: '#fff',
              fontSize: '13px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
            }}>
              © 2025 Clínica MACSA. Todos los derechos reservados.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

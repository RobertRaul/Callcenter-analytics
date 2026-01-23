// pages/Agents.jsx - Migrado a Ant Design
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  DatePicker,
  Button,
  Spin,
  Alert,
  Tag,
  Typography,
  Avatar,
  Progress,
  Space,
  Statistic
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { agentsAPI } from '../services/api';
import { MACSA_COLORS } from '../config/theme';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const Agents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fechas - usar hasta hoy
  const today = dayjs();
  const [dateRange, setDateRange] = useState([today, today]);

  // Datos
  const [agentsList, setAgentsList] = useState([]);
  const [agentsStats, setAgentsStats] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState([]);
  const [comparison, setComparison] = useState([]);

  useEffect(() => {
    loadData();
    // Actualizar estado en tiempo real cada 30 segundos
    const interval = setInterval(() => {
      loadRealtimeStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // Cargar lista de agentes
      const listResponse = await agentsAPI.getList();
      const agentsData = listResponse.data.data;
      setAgentsList(agentsData.agents || agentsData || []);

      // Cargar estadísticas
      const statsResponse = await agentsAPI.getStatistics(startDate, endDate);
      setAgentsStats(statsResponse.data.data.agents || []);

      // Cargar comparación
      const compResponse = await agentsAPI.getComparison(startDate, endDate);
      setComparison(compResponse.data.data.agents || []);

      // Cargar estado en tiempo real
      await loadRealtimeStatus();
    } catch (err) {
      console.error('Error loading agents:', err);
      setError(err.message || 'Error al cargar los agentes');
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeStatus = async () => {
    try {
      const response = await agentsAPI.getRealtime();
      setRealtimeStatus(response.data.data.agents || []);
    } catch (err) {
      console.error('Error loading realtime status:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'IN_CALL':
        return 'error';
      case 'AVAILABLE':
        return 'success';
      case 'PAUSED':
        return 'warning';
      case 'UNAVAILABLE':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'IN_CALL': 'En llamada',
      'AVAILABLE': 'Disponible',
      'PAUSED': 'Pausado',
      'UNAVAILABLE': 'No disponible',
      'UNKNOWN': 'Desconocido'
    };
    return statusMap[status] || status;
  };

  const tableColumns = [
    {
      title: 'Agente',
      dataIndex: 'agent',
      key: 'agent',
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: MACSA_COLORS.blue }} />
          <div>
            <div><strong>{text}</strong></div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.agent_full}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Total Llamadas',
      dataIndex: 'total_calls',
      key: 'total_calls',
      align: 'right',
      render: (value) => (
        <Tag icon={<PhoneOutlined />} color="blue">
          {value}
        </Tag>
      )
    },
    {
      title: 'Completadas',
      dataIndex: 'completed_calls',
      key: 'completed_calls',
      align: 'right',
      render: (value) => (
        <Tag icon={<CheckCircleOutlined />} color="success">
          {value}
        </Tag>
      )
    },
    {
      title: 'Tiempo Total',
      dataIndex: 'total_talk_time_formatted',
      key: 'total_talk_time_formatted',
      align: 'right',
      render: (value) => (
        <Space>
          <ClockCircleOutlined style={{ color: MACSA_COLORS.gray }} />
          <strong>{value}</strong>
        </Space>
      )
    },
    {
      title: 'Prom. Conversación',
      dataIndex: 'avg_talk_time',
      key: 'avg_talk_time',
      align: 'right',
      render: (value) => `${Math.round(value)}s`
    },
    {
      title: 'Prom. Espera',
      dataIndex: 'avg_wait_before_answer',
      key: 'avg_wait_before_answer',
      align: 'right',
      render: (value) => (
        <Space>
          <ClockCircleOutlined style={{ color: MACSA_COLORS.gray }} />
          {Math.round(value)}s
        </Space>
      )
    },
    {
      title: 'Tiempo Más Largo',
      dataIndex: 'max_talk_time',
      key: 'max_talk_time',
      align: 'right',
      render: (value) => `${value}s`
    },
    {
      title: 'Tiempo Más Corto',
      dataIndex: 'min_talk_time',
      key: 'min_talk_time',
      align: 'right',
      render: (value) => `${value}s`
    }
  ];

  return (
    <div>
      <Title level={3}>Agentes</Title>

      {/* Estado en tiempo real */}
      <Title level={5} style={{ marginTop: 24 }}>
        Estado en Tiempo Real
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {realtimeStatus.map((agent) => (
          <Col xs={24} sm={12} md={8} lg={6} key={agent.agent}>
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: MACSA_COLORS.blue }} />
                  <div>
                    <div><strong>{agent.agent}</strong></div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Cola: {agent.queue}</Text>
                  </div>
                </Space>
                <Tag color={getStatusColor(agent.status)}>
                  {getStatusText(agent.status)}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Última actividad: {new Date(agent.last_activity).toLocaleTimeString('es-ES')}
                </Text>
              </Space>
            </Card>
          </Col>
        ))}
        {realtimeStatus.length === 0 && !loading && (
          <Col span={24}>
            <Alert
              message="No hay agentes activos actualmente"
              type="info"
              showIcon
            />
          </Col>
        )}
      </Row>

      {/* Filtros de fecha */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>Estadísticas Históricas</Title>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates || [today, today])}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              onClick={() => setDateRange([today, today])}
              block
            >
              Hoy
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={loadData}
              loading={loading}
              block
            >
              Buscar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Error */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Ranking de Agentes */}
      {comparison.length > 0 && (
        <Card
          title={
            <Space>
              <TrophyOutlined style={{ color: MACSA_COLORS.gold }} />
              Ranking de Agentes
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            {comparison.slice(0, 5).map((agent, index) => (
              <Col xs={24} key={agent.agent}>
                <Card size="small" bordered>
                  <Row gutter={[16, 16]} align="middle">
                    <Col>
                      <Avatar
                        size={48}
                        style={{
                          backgroundColor: index < 3 ? MACSA_COLORS.gold : MACSA_COLORS.gray,
                          fontSize: 18,
                          fontWeight: 'bold'
                        }}
                      >
                        #{agent.rank}
                      </Avatar>
                    </Col>
                    <Col flex="auto">
                      <div>
                        <Text strong style={{ fontSize: 16 }}>{agent.agent}</Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          {agent.total_calls} llamadas | {agent.total_talk_time_formatted} total
                        </Text>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Progress
                          percent={agent.efficiency}
                          strokeColor={MACSA_COLORS.blue}
                          size="small"
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Eficiencia: {agent.efficiency}%
                        </Text>
                      </div>
                    </Col>
                    <Col>
                      <Statistic
                        value={agent.total_calls}
                        suffix="llamadas"
                        valueStyle={{ color: MACSA_COLORS.blue }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Tabla de estadísticas detalladas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Cargando estadísticas de agentes..." />
        </div>
      ) : (
        <Card title="Estadísticas Detalladas" style={{ marginBottom: 24 }}>
          <Table
            columns={tableColumns}
            dataSource={agentsStats}
            rowKey="agent"
            locale={{
              emptyText: 'No hay estadísticas disponibles para el período seleccionado'
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} agentes`
            }}
          />
        </Card>
      )}

      {/* Lista de agentes configurados */}
      <Card title="Agentes Configurados">
        <Row gutter={[16, 16]}>
          {agentsList.map((agent) => (
            <Col xs={24} sm={12} md={8} key={agent.agent}>
              <Card size="small" bordered>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: MACSA_COLORS.blue }} />
                    <div>
                      <div><strong>{agent.agent}</strong></div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{agent.agent_full}</Text>
                    </div>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Colas: {agent.queues.join(', ')}
                  </Text>
                </Space>
              </Card>
            </Col>
          ))}
          {agentsList.length === 0 && !loading && (
            <Col span={24}>
              <Alert
                message="No hay agentes configurados"
                type="info"
                showIcon
              />
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
};

export default Agents;

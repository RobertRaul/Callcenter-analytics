// pages/Queues.jsx - Migrado a Ant Design
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
  Statistic,
  Space
} from 'antd';
import {
  UnorderedListOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RiseOutlined,
  SyncOutlined,
  TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { queuesAPI } from '../services/api';
import { MACSA_COLORS } from '../config/theme';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const Queues = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fechas - fecha actual
  const today = dayjs();
  const [dateRange, setDateRange] = useState([today, today]);

  // Datos
  const [queuesList, setQueuesList] = useState([]);
  const [queuesStats, setQueuesStats] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState([]);

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

      // Cargar lista de colas
      const listResponse = await queuesAPI.getList();
      const queuesData = listResponse.data.data;
      setQueuesList(queuesData.queues || queuesData || []);

      // Cargar estadísticas
      const statsResponse = await queuesAPI.getStatistics(startDate, endDate);
      setQueuesStats(statsResponse.data.data.queues || []);

      // Cargar estado en tiempo real
      await loadRealtimeStatus();
    } catch (err) {
      console.error('Error loading queues:', err);
      setError(err.message || 'Error al cargar las colas');
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeStatus = async () => {
    try {
      const response = await queuesAPI.getRealtime();
      setRealtimeStatus(response.data.data.queues || []);
    } catch (err) {
      console.error('Error loading realtime status:', err);
    }
  };

  const tableColumns = [
    {
      title: 'Cola',
      dataIndex: 'queue_name',
      key: 'queue_name',
      render: (text) => (
        <Space>
          <UnorderedListOutlined style={{ color: MACSA_COLORS.blue }} />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: 'Total Llamadas',
      dataIndex: 'total_calls',
      key: 'total_calls',
      align: 'right'
    },
    {
      title: 'Contestadas',
      dataIndex: 'answered_calls',
      key: 'answered_calls',
      align: 'right',
      render: (value) => (
        <Tag icon={<CheckCircleOutlined />} color="success">
          {value}
        </Tag>
      )
    },
    {
      title: 'Abandonadas',
      dataIndex: 'abandoned_calls',
      key: 'abandoned_calls',
      align: 'right',
      render: (value) => (
        <Tag icon={<CloseCircleOutlined />} color="error">
          {value}
        </Tag>
      )
    },
    {
      title: 'Tasa Respuesta',
      dataIndex: 'answer_rate',
      key: 'answer_rate',
      align: 'right',
      render: (value) => <strong>{value}%</strong>
    },
    {
      title: 'Tasa Abandono',
      dataIndex: 'abandon_rate',
      key: 'abandon_rate',
      align: 'right',
      render: (value) => `${value}%`
    },
    {
      title: 'Tiempo Espera Prom.',
      dataIndex: 'avg_wait_time',
      key: 'avg_wait_time',
      align: 'right',
      render: (value) => (
        <Space>
          <ClockCircleOutlined style={{ color: MACSA_COLORS.gray }} />
          {Math.round(value)}s
        </Space>
      )
    },
    {
      title: 'Tiempo Conversación Prom.',
      dataIndex: 'avg_talk_time',
      key: 'avg_talk_time',
      align: 'right',
      render: (value) => (
        <Space>
          <PhoneOutlined style={{ color: MACSA_COLORS.gray }} />
          {Math.round(value)}s
        </Space>
      )
    },
    {
      title: 'Nivel de Servicio',
      dataIndex: 'service_level',
      key: 'service_level',
      align: 'right',
      render: (value) => (
        <Space>
          <RiseOutlined style={{ color: MACSA_COLORS.green }} />
          {value}%
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={3}>Colas</Title>

      {/* Estado en tiempo real */}
      <Title level={5} style={{ marginTop: 24 }}>
        Estado en Tiempo Real (últimos 5 minutos)
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {realtimeStatus.map((queue) => (
          <Col xs={24} sm={12} md={8} lg={6} key={queue.queue_name}>
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <UnorderedListOutlined style={{ color: MACSA_COLORS.blue, fontSize: 20, marginRight: 8 }} />
                  <Text strong style={{ fontSize: 16 }}>{queue.queue_name}</Text>
                </div>

                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic
                      title="Agentes disponibles"
                      value={queue.available_agents}
                      prefix={<TeamOutlined />}
                      valueStyle={{ fontSize: 18 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Completadas 5min"
                      value={queue.calls_completed_5min}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ fontSize: 18, color: MACSA_COLORS.green }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Abandonadas 5min"
                      value={queue.calls_abandoned_5min}
                      prefix={<CloseCircleOutlined />}
                      valueStyle={{ fontSize: 18, color: MACSA_COLORS.red }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Nivel de servicio"
                      value={queue.service_level_5min}
                      suffix="%"
                      prefix={<RiseOutlined />}
                      valueStyle={{ fontSize: 18, color: MACSA_COLORS.green }}
                    />
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
        ))}
        {realtimeStatus.length === 0 && !loading && (
          <Col span={24}>
            <Alert
              message="No hay actividad reciente en las colas"
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

      {/* Tabla de estadísticas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Cargando estadísticas de colas..." />
        </div>
      ) : (
        <Card title="Estadísticas por Cola" style={{ marginBottom: 24 }}>
          <Table
            columns={tableColumns}
            dataSource={queuesStats}
            rowKey="queue_name"
            locale={{
              emptyText: 'No hay estadísticas disponibles para el período seleccionado'
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} colas`
            }}
          />
        </Card>
      )}

      {/* Lista de colas configuradas */}
      <Card title="Colas Configuradas">
        <Row gutter={[16, 16]}>
          {queuesList.map((queue) => (
            <Col xs={24} sm={12} md={8} lg={6} key={queue.queue_name}>
              <Card size="small" bordered>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <UnorderedListOutlined style={{ color: MACSA_COLORS.blue, fontSize: 18 }} />
                    <Text strong style={{ fontSize: 16 }}>{queue.queue_name}</Text>
                  </Space>
                  <Text type="secondary">
                    <TeamOutlined /> {queue.total_agents} agente(s) asignado(s)
                  </Text>
                </Space>
              </Card>
            </Col>
          ))}
          {queuesList.length === 0 && !loading && (
            <Col span={24}>
              <Alert
                message="No hay colas configuradas"
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

export default Queues;

// pages/Analisis/AnalisisAbandono.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Button, Spin, Alert, Table, Tag, Typography, Space, Progress } from 'antd';
import {
  WarningOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  SyncOutlined,
  RiseOutlined,
  FallOutlined,
  TeamOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Line, Bar } from 'react-chartjs-2';
import { analisisAPI } from '../../services/api';
import { MACSA_COLORS } from '../../config/theme';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const AnalisisAbandono = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'days'), dayjs()]);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await analisisAPI.getAnalisisAbandono(startDate, endDate);
      setData(response.data.data);
    } catch (err) {
      console.error('Error loading abandono analysis:', err);
      setError(err.message || 'Error al cargar el análisis de abandono');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Cargando análisis de abandono..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!data) {
    return null;
  }

  // Gráfico de abandonos por hora
  const hourlyChartData = {
    labels: data.hourly_abandonment.map(h => `${h.hour}:00h`),
    datasets: [
      {
        label: 'Llamadas Abandonadas',
        data: data.hourly_abandonment.map(h => h.abandoned_calls),
        backgroundColor: MACSA_COLORS.red,
        borderColor: MACSA_COLORS.red,
        borderWidth: 2,
        yAxisID: 'y'
      },
      {
        label: 'Tasa de Abandono (%)',
        data: data.hourly_abandonment.map(h => h.abandonment_rate),
        backgroundColor: MACSA_COLORS.orange,
        borderColor: MACSA_COLORS.orange,
        borderWidth: 2,
        type: 'line',
        yAxisID: 'y1'
      }
    ]
  };

  const hourlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Distribución de Abandonos por Hora'
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Llamadas Abandonadas'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Tasa de Abandono (%)'
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  };

  // Columnas para tabla de colas
  const queueColumns = [
    {
      title: 'Cola',
      dataIndex: 'queue_name',
      key: 'queue_name',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Total Llamadas',
      dataIndex: 'total_calls',
      key: 'total_calls',
      align: 'right'
    },
    {
      title: 'Abandonadas',
      dataIndex: 'abandoned_calls',
      key: 'abandoned_calls',
      align: 'right',
      render: (value) => <Tag color="error">{value}</Tag>
    },
    {
      title: 'Tasa de Abandono',
      dataIndex: 'abandonment_rate',
      key: 'abandonment_rate',
      align: 'right',
      render: (value) => (
        <Space>
          <Progress
            percent={value}
            size="small"
            strokeColor={value > 15 ? MACSA_COLORS.red : value > 10 ? MACSA_COLORS.orange : MACSA_COLORS.green}
            style={{ width: 80 }}
          />
          <Text strong style={{ color: value > 15 ? MACSA_COLORS.red : undefined }}>
            {value}%
          </Text>
        </Space>
      ),
      sorter: (a, b) => b.abandonment_rate - a.abandonment_rate
    },
    {
      title: 'Tiempo Espera Prom.',
      dataIndex: 'avg_wait_time',
      key: 'avg_wait_time',
      align: 'right',
      render: (value) => `${Math.round(value)}s`
    }
  ];

  // Columnas para top horas de abandono
  const topHoursColumns = [
    {
      title: 'Hora',
      dataIndex: 'hour',
      key: 'hour',
      render: (hour) => <strong>{hour}:00h</strong>
    },
    {
      title: 'Total Llamadas',
      dataIndex: 'total_calls',
      key: 'total_calls',
      align: 'right'
    },
    {
      title: 'Abandonadas',
      dataIndex: 'abandoned_calls',
      key: 'abandoned_calls',
      align: 'right',
      render: (value) => <Tag color="error" style={{ fontSize: 13 }}>{value}</Tag>
    },
    {
      title: 'Tasa',
      dataIndex: 'abandonment_rate',
      key: 'abandonment_rate',
      align: 'right',
      render: (value) => <strong style={{ color: MACSA_COLORS.red }}>{value}%</strong>
    }
  ];

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'critical':
        return <WarningOutlined />;
      case 'staffing':
        return <TeamOutlined />;
      case 'quality':
        return <ClockCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  const getRecommendationColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={10}>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates || [dayjs().subtract(7, 'days'), dayjs()])}
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Button onClick={() => setDateRange([dayjs(), dayjs()])} block>
                  Hoy
                </Button>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Button onClick={() => setDateRange([dayjs().subtract(7, 'days'), dayjs()])} block>
                  Última Semana
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  onClick={loadData}
                  loading={loading}
                  block
                >
                  Actualizar
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* KPIs Principales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total de Llamadas"
              value={data.summary.total_calls}
              prefix={<PhoneOutlined style={{ color: MACSA_COLORS.blue }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Llamadas Abandonadas"
              value={data.summary.total_abandoned}
              prefix={<WarningOutlined style={{ color: MACSA_COLORS.red }} />}
              valueStyle={{ color: MACSA_COLORS.red }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tasa de Abandono"
              value={data.summary.abandonment_rate}
              suffix="%"
              prefix={data.summary.abandonment_rate > 15 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{ color: data.summary.abandonment_rate > 15 ? MACSA_COLORS.red : MACSA_COLORS.green }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Meta: {'<'} 10%
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tiempo Espera Promedio"
              value={Math.round(data.summary.avg_wait_time)}
              suffix="seg"
              prefix={<ClockCircleOutlined style={{ color: MACSA_COLORS.blue }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Recomendaciones */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card title="Recomendaciones Inteligentes">
              <Row gutter={[16, 16]}>
                {data.recommendations.map((rec, index) => (
                  <Col xs={24} md={12} key={index}>
                    <Alert
                      message={rec.message}
                      description={
                        <div>
                          <p>{rec.detail}</p>
                          <Text strong>Acción recomendada: </Text>
                          <Text>{rec.action}</Text>
                        </div>
                      }
                      type={getRecommendationColor(rec.priority)}
                      icon={getRecommendationIcon(rec.type)}
                      showIcon
                    />
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Gráfico de Abandonos por Hora */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Distribución de Abandonos por Hora">
            <div style={{ height: 350 }}>
              <Bar data={hourlyChartData} options={hourlyChartOptions} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Top 5 Horas con Más Abandonos y Análisis por Cola */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Top 5 Horas con Más Abandonos">
            <Table
              columns={topHoursColumns}
              dataSource={data.top_abandonment_hours}
              rowKey="hour"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Análisis por Cola">
            <Table
              columns={queueColumns}
              dataSource={data.queue_abandonment}
              rowKey="queue_name"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalisisAbandono;

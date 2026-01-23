// pages/Analisis/SLACumplimiento.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Button, Spin, Alert, Table, Tag, Typography, Space, Progress, InputNumber } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Line } from 'react-chartjs-2';
import { analisisAPI } from '../../services/api';
import { MACSA_COLORS } from '../../config/theme';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const SLACumplimiento = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'days'), dayjs()]);
  const [slaThreshold, setSlaThreshold] = useState(20);
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

      const response = await analisisAPI.getSLACumplimiento(startDate, endDate, slaThreshold);
      setData(response.data.data);
    } catch (err) {
      console.error('Error loading SLA:', err);
      setError(err.message || 'Error al cargar el análisis de SLA');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Cargando análisis de SLA..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!data) {
    return null;
  }

  // Gráfico de tendencia diaria de SLA
  const trendChartData = {
    labels: data.daily_trend.map(d => dayjs(d.date).format('DD/MM')),
    datasets: [
      {
        label: 'Cumplimiento SLA (%)',
        data: data.daily_trend.map(d => d.sla_compliance),
        borderColor: MACSA_COLORS.blue,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Meta 80%',
        data: data.daily_trend.map(() => 80),
        borderColor: MACSA_COLORS.green,
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }
    ]
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Tendencia de Cumplimiento de SLA'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'SLA (%)'
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
      render: (text) => <strong>{text}</strong>,
      fixed: 'left',
      width: 150
    },
    {
      title: 'Estado',
      dataIndex: 'status_label',
      key: 'status_label',
      width: 120,
      render: (text, record) => {
        let color = 'default';
        if (record.status === 'excellent') color = 'success';
        else if (record.status === 'good') color = 'processing';
        else if (record.status === 'warning') color = 'warning';
        else if (record.status === 'critical') color = 'error';

        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Total Llamadas',
      dataIndex: 'total_calls',
      key: 'total_calls',
      align: 'right',
      width: 120
    },
    {
      title: 'Dentro de SLA',
      dataIndex: 'calls_within_sla',
      key: 'calls_within_sla',
      align: 'right',
      width: 120,
      render: (value) => <Tag color="success">{value}</Tag>
    },
    {
      title: 'Cumplimiento SLA',
      dataIndex: 'sla_compliance',
      key: 'sla_compliance',
      align: 'right',
      width: 200,
      render: (value, record) => (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Progress
            percent={value}
            size="small"
            strokeColor={
              value >= 80 ? MACSA_COLORS.green :
              value >= 70 ? MACSA_COLORS.blue :
              value >= 60 ? MACSA_COLORS.orange :
              MACSA_COLORS.red
            }
          />
          <Text strong style={{
            color: value >= 80 ? MACSA_COLORS.green :
                   value >= 60 ? MACSA_COLORS.orange :
                   MACSA_COLORS.red
          }}>
            {value}%
          </Text>
        </Space>
      ),
      sorter: (a, b) => a.sla_compliance - b.sla_compliance
    },
    {
      title: 'Espera Prom.',
      dataIndex: 'avg_wait_time',
      key: 'avg_wait_time',
      align: 'right',
      width: 120,
      render: (value) => `${value}s`
    },
    {
      title: 'Cumple Meta',
      dataIndex: 'meets_target',
      key: 'meets_target',
      align: 'center',
      width: 100,
      render: (value) => value ?
        <CheckCircleOutlined style={{ fontSize: 20, color: MACSA_COLORS.green }} /> :
        <CloseCircleOutlined style={{ fontSize: 20, color: MACSA_COLORS.red }} />
    }
  ];

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'critical':
        return <WarningOutlined />;
      case 'queue':
        return <InfoCircleOutlined />;
      case 'systemic':
        return <CloseCircleOutlined />;
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
              <Col xs={24} sm={12} md={8}>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates || [dayjs().subtract(7, 'days'), dayjs()])}
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text style={{ fontSize: 12 }}>Umbral SLA (seg)</Text>
                  <InputNumber
                    value={slaThreshold}
                    onChange={setSlaThreshold}
                    min={5}
                    max={120}
                    style={{ width: '100%' }}
                  />
                </Space>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Button onClick={() => setDateRange([dayjs(), dayjs()])} block>
                  Hoy
                </Button>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Button onClick={() => setDateRange([dayjs().subtract(7, 'days'), dayjs()])} block>
                  Última Semana
                </Button>
              </Col>
              <Col xs={24} sm={12} md={4}>
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
              title="SLA Global"
              value={data.overall.sla_compliance}
              suffix="%"
              prefix={
                data.overall.meets_target ?
                <CheckCircleOutlined style={{ color: MACSA_COLORS.green }} /> :
                <CloseCircleOutlined style={{ color: MACSA_COLORS.red }} />
              }
              valueStyle={{
                color: data.overall.meets_target ? MACSA_COLORS.green : MACSA_COLORS.red
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Meta: {data.overall.target}%
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Llamadas Dentro de SLA"
              value={data.overall.calls_within_sla}
              suffix={`/ ${data.overall.total_calls}`}
              prefix={<ClockCircleOutlined style={{ color: MACSA_COLORS.blue }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Umbral: {'<'} {data.period.sla_threshold_seconds}s
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Colas Cumpliendo Meta"
              value={data.insights.queues_meeting_target}
              suffix={`/ ${data.insights.total_queues}`}
              prefix={<TrophyOutlined style={{ color: MACSA_COLORS.gold }} />}
              valueStyle={{
                color: data.insights.queues_meeting_target >= data.insights.total_queues / 2 ?
                  MACSA_COLORS.green : MACSA_COLORS.red
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Colas en Riesgo"
              value={data.insights.failing_queues.length}
              prefix={<WarningOutlined style={{ color: MACSA_COLORS.red }} />}
              valueStyle={{ color: MACSA_COLORS.red }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              SLA {'<'} 80%
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Recomendaciones */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card title="Alertas y Recomendaciones">
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

      {/* Tendencia Diaria */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Tendencia de Cumplimiento SLA">
            <div style={{ height: 300 }}>
              <Line data={trendChartData} options={trendChartOptions} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabla de Colas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Cumplimiento de SLA por Cola">
            <Table
              columns={queueColumns}
              dataSource={data.sla_by_queue}
              rowKey="queue_name"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total: ${total} colas`
              }}
              scroll={{ x: 900 }}
              rowClassName={(record) => {
                if (record.status === 'critical') return 'row-critical';
                if (record.status === 'warning') return 'row-warning';
                if (record.status === 'excellent') return 'row-excellent';
                return '';
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Colas Top y Colas en Riesgo */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: MACSA_COLORS.gold }} />
                <span>Top Colas - Mejor Rendimiento</span>
              </Space>
            }
          >
            {data.insights.top_performing_queues.length > 0 ? (
              data.insights.top_performing_queues.map((queue, index) => (
                <div key={index} style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: index === 0 ? '#f6ffed' : '#f5f5f5',
                  borderLeft: `4px solid ${index === 0 ? MACSA_COLORS.gold : MACSA_COLORS.green}`,
                  borderRadius: '4px'
                }}>
                  <Row align="middle" justify="space-between">
                    <Col>
                      <Space direction="vertical" size="small">
                        <Space>
                          {index === 0 && <TrophyOutlined style={{ color: MACSA_COLORS.gold, fontSize: 18 }} />}
                          <Text strong style={{ fontSize: 14 }}>{queue.queue_name}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {queue.calls_within_sla} de {queue.answered_calls} dentro de SLA
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="success" style={{ fontSize: 16, padding: '4px 12px' }}>
                        {queue.sla_compliance}%
                      </Tag>
                    </Col>
                  </Row>
                </div>
              ))
            ) : (
              <Alert message="No hay colas con SLA >= 90%" type="info" showIcon />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: MACSA_COLORS.red }} />
                <span>Colas en Riesgo - Requieren Atención</span>
              </Space>
            }
          >
            {data.insights.failing_queues.length > 0 ? (
              data.insights.failing_queues.slice(0, 5).map((queue, index) => (
                <div key={index} style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: '#fff1f0',
                  borderLeft: `4px solid ${MACSA_COLORS.red}`,
                  borderRadius: '4px'
                }}>
                  <Row align="middle" justify="space-between">
                    <Col>
                      <Space direction="vertical" size="small">
                        <Text strong style={{ fontSize: 14 }}>{queue.queue_name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Espera promedio: {Math.round(queue.avg_wait_time)}s
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="error" style={{ fontSize: 16, padding: '4px 12px' }}>
                        {queue.sla_compliance}%
                      </Tag>
                    </Col>
                  </Row>
                </div>
              ))
            ) : (
              <Alert message="¡Excelente! Todas las colas cumplen con el SLA" type="success" showIcon />
            )}
          </Card>
        </Col>
      </Row>

      <style>{`
        .row-critical {
          background-color: #fff1f0;
        }
        .row-warning {
          background-color: #fffbe6;
        }
        .row-excellent {
          background-color: #f6ffed;
        }
      `}</style>
    </div>
  );
};

export default SLACumplimiento;

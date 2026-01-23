// Ranking de Agentes - Top performers con gamificación
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Select, Spin, Empty, Alert, Table, Tag, Avatar } from 'antd';
import { TrophyOutlined, PhoneOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import BarChartComponent from '../../components/charts/BarChartComponent';
import { MACSA_COLORS } from '../../config/theme';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function RankingAgentes() {
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'days'), dayjs()]);
  const [metric, setMetric] = useState('total_calls');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [dateRange, metric]);

  const fetchData = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/analisis/ranking-agentes`, {
        params: {
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD'),
          metric: metric
        }
      });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error fetching ranking:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Cargando ranking de agentes..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!data || !data.ranking || data.ranking.length === 0) {
    return <Empty description="No hay datos de agentes disponibles" style={{ marginTop: 100 }} />;
  }

  const getBadgeColor = (badge) => {
    switch (badge) {
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      case 'star': return MACSA_COLORS.gold;
      default: return '#d9d9d9';
    }
  };

  const columns = [
    {
      title: 'Ranking',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (rank, record) => (
        <div>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: MACSA_COLORS.blue }}>
            #{rank}
          </div>
          {record.badge && (
            <div style={{ fontSize: 20 }}>
              {record.badge === 'gold' && '🥇'}
              {record.badge === 'silver' && '🥈'}
              {record.badge === 'bronze' && '🥉'}
              {record.badge === 'star' && '⭐'}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Agente',
      dataIndex: 'agent',
      key: 'agent',
      render: (agent, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: MACSA_COLORS.blue, marginRight: 12 }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{agent}</div>
            {record.badge_label && (
              <Tag color={getBadgeColor(record.badge)} style={{ marginTop: 4 }}>
                {record.badge_label}
              </Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Total Llamadas',
      dataIndex: 'total_calls',
      key: 'total_calls',
      align: 'right',
      sorter: (a, b) => a.total_calls - b.total_calls
    },
    {
      title: 'Completadas',
      dataIndex: 'completed_calls',
      key: 'completed_calls',
      align: 'right',
      sorter: (a, b) => a.completed_calls - b.completed_calls
    },
    {
      title: 'Tiempo Total',
      dataIndex: 'total_talk_time_formatted',
      key: 'total_talk_time_formatted',
      align: 'right'
    },
    {
      title: 'vs Promedio',
      dataIndex: 'vs_average',
      key: 'vs_average',
      align: 'center',
      render: (value) => (
        <Tag color={value >= 0 ? 'green' : 'red'}>
          {value >= 0 ? '+' : ''}{value?.toFixed(1)}%
        </Tag>
      )
    }
  ];

  // Top 10 para gráfica
  const top10 = data.ranking.slice(0, 10);
  const chartData = {
    labels: top10.map(a => a.agent),
    datasets: [{
      label: 'Total Llamadas',
      data: top10.map(a => a.total_calls),
      backgroundColor: top10.map((a, index) => {
        if (index === 0) return '#FFD700'; // Oro
        if (index === 1) return '#C0C0C0'; // Plata
        if (index === 2) return '#CD7F32'; // Bronce
        return MACSA_COLORS.blue;
      })
    }]
  };

  return (
    <div>
      {/* Controles */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            size="large"
          />
        </Col>
        <Col xs={24} md={12}>
          <Select
            value={metric}
            onChange={setMetric}
            style={{ width: '100%' }}
            size="large"
          >
            <Option value="total_calls">
              <PhoneOutlined /> Ordenar por Total de Llamadas
            </Option>
            <Option value="completed_calls">
              <PhoneOutlined /> Ordenar por Llamadas Completadas
            </Option>
            <Option value="avg_talk_time">
              <ClockCircleOutlined /> Ordenar por Tiempo Promedio
            </Option>
          </Select>
        </Col>
      </Row>

      {/* Podio Top 3 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {data.ranking.slice(0, 3).map((agent, index) => (
          <Col xs={24} sm={8} key={agent.rank}>
            <Card
              style={{
                textAlign: 'center',
                backgroundColor:
                  index === 0 ? '#fffbe6' :
                  index === 1 ? '#f0f5ff' : '#fff7e6',
                border: `2px solid ${
                  index === 0 ? '#FFD700' :
                  index === 1 ? '#C0C0C0' : '#CD7F32'
                }`
              }}
            >
              <div style={{ fontSize: 48 }}>
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 'bold', marginTop: 12 }}>
                {agent.agent}
              </div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: MACSA_COLORS.blue, marginTop: 8 }}>
                {agent.total_calls}
              </div>
              <div style={{ color: '#888' }}>llamadas</div>
              {agent.vs_average !== undefined && (
                <Tag
                  color={agent.vs_average >= 0 ? 'green' : 'red'}
                  style={{ marginTop: 12 }}
                >
                  {agent.vs_average >= 0 ? '+' : ''}{agent.vs_average.toFixed(1)}% vs promedio
                </Tag>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Gráfica Top 10 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title={<span><TrophyOutlined /> Top 10 Agentes</span>} bordered={false}>
            <BarChartComponent
              data={chartData}
              height={350}
              options={{
                indexAxis: 'y',
                plugins: {
                  legend: { display: false }
                }
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabla completa */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={`Ranking Completo (${data.total_agents} agentes)`}
            extra={
              <Tag color="blue">
                Promedio: {data.statistics?.average_calls_per_agent?.toFixed(0)} llamadas/agente
              </Tag>
            }
            bordered={false}
          >
            <Table
              columns={columns}
              dataSource={data.ranking}
              rowKey="rank"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total: ${total} agentes`
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

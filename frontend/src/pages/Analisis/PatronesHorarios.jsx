// Patrones Horarios - Análisis de horas pico y recomendaciones
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Alert, Spin, Empty, Tag, List } from 'antd';
import { ClockCircleOutlined, WarningOutlined, TeamOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import BarChartComponent from '../../components/charts/BarChartComponent';
import LineChartComponent from '../../components/charts/LineChartComponent';
import { MACSA_COLORS } from '../../config/theme';

const { RangePicker } = DatePicker;

export default function PatronesHorarios() {
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'days'), dayjs()]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/analisis/patrones-horarios`, {
        params: {
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD')
        }
      });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error fetching patterns:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Analizando patrones horarios..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!data) {
    return <Empty description="Selecciona un rango de fechas" style={{ marginTop: 100 }} />;
  }

  // Datos para gráfica de horas pico
  const peakHoursChartData = {
    labels: (data.hourly_data || []).map(h => `${h.hour}:00h`),
    datasets: [{
      label: 'Llamadas por Hora',
      data: (data.hourly_data || []).map(h => h.total_calls),
      backgroundColor: (data.hourly_data || []).map(h => {
        const isPeak = data.peak_hours?.some(peak => peak.hour === h.hour);
        return isPeak ? MACSA_COLORS.gold : MACSA_COLORS.blue;
      })
    }]
  };

  // Datos para gráfica de abandonos
  const abandonChartData = {
    labels: (data.abandon_patterns || []).map(h => `${h.hour}:00h`),
    datasets: [{
      label: 'Llamadas Abandonadas',
      data: (data.abandon_patterns || []).map(h => h.missed_calls || 0),
      borderColor: MACSA_COLORS.red,
      backgroundColor: 'rgba(255, 77, 79, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <WarningOutlined style={{ color: MACSA_COLORS.red }} />;
      case 'medium':
        return <InfoCircleOutlined style={{ color: MACSA_COLORS.orange }} />;
      default:
        return <InfoCircleOutlined style={{ color: MACSA_COLORS.blue }} />;
    }
  };

  return (
    <div>
      {/* Selector de rango */}
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
          <Alert
            message={`Analizando período: ${dateRange[0].format('DD/MM/YYYY')} - ${dateRange[1].format('DD/MM/YYYY')}`}
            type="info"
            showIcon
          />
        </Col>
      </Row>

      {/* Resumen de horas pico */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title={<span><ClockCircleOutlined /> Top 3 Horas Pico</span>} bordered={false}>
            <Row gutter={[16, 16]}>
              {(data.peak_hours || []).map((peak, index) => (
                <Col xs={24} sm={8} key={index}>
                  <Card
                    size="small"
                    style={{
                      textAlign: 'center',
                      backgroundColor: index === 0 ? '#fff7e6' : '#f0f5ff'
                    }}
                  >
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: MACSA_COLORS.blue }}>
                      {peak.hour}:00h
                    </div>
                    <div style={{ fontSize: 16, marginTop: 8 }}>
                      {peak.total_calls} llamadas
                    </div>
                    <Tag color={index === 0 ? 'gold' : index === 1 ? 'blue' : 'green'} style={{ marginTop: 8 }}>
                      {index === 0 ? '🥇 Hora Pico Principal' : index === 1 ? '🥈 Segunda Hora' : '🥉 Tercera Hora'}
                    </Tag>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Recomendaciones */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card title="Recomendaciones" bordered={false}>
              <List
                dataSource={data.recommendations}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={getPriorityIcon(item.priority)}
                      title={
                        <span>
                          {item.message}
                          <Tag color={item.priority === 'high' ? 'red' : 'orange'} style={{ marginLeft: 8 }}>
                            {item.priority === 'high' ? 'Prioridad Alta' : 'Prioridad Media'}
                          </Tag>
                        </span>
                      }
                      description={item.detail}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Gráficas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Distribución de Llamadas por Hora" bordered={false}>
            <BarChartComponent data={peakHoursChartData} height={300} />
            <div style={{ marginTop: 16, fontSize: 12, color: '#888', textAlign: 'center' }}>
              Las barras doradas indican horas pico
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Patrón de Abandonos" bordered={false}>
            <LineChartComponent data={abandonChartData} height={300} />
            <div style={{ marginTop: 16, fontSize: 12, color: '#888', textAlign: 'center' }}>
              Muestra las 3 horas con más abandonos
            </div>
          </Card>
        </Col>
      </Row>

      {/* Estadísticas adicionales */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: MACSA_COLORS.blue }}>
                {data.statistics?.avg_calls_per_hour?.toFixed(0) || 0}
              </div>
              <div style={{ color: '#888' }}>Promedio llamadas/hora</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: MACSA_COLORS.green }}>
                {data.statistics?.high_activity_hours || 0}
              </div>
              <div style={{ color: '#888' }}>Horas alta actividad</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: MACSA_COLORS.orange }}>
                {data.statistics?.total_hours_analyzed || 0}
              </div>
              <div style={{ color: '#888' }}>Horas analizadas</div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

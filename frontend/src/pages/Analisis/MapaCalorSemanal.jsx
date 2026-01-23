// pages/Analisis/MapaCalorSemanal.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Button, Spin, Alert, Typography, Space, Statistic, Tag, Tooltip } from 'antd';
import {
  FireOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { analisisAPI } from '../../services/api';
import { MACSA_COLORS } from '../../config/theme';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const MapaCalorSemanal = () => {
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

      const response = await analisisAPI.getMapaCalorSemanal(startDate, endDate);
      setData(response.data.data);
    } catch (err) {
      console.error('Error loading heatmap:', err);
      setError(err.message || 'Error al cargar el mapa de calor');
    } finally {
      setLoading(false);
    }
  };

  const getCellColor = (calls, stats) => {
    if (calls === 0) return '#f5f5f5';

    const { avg_calls, high_demand_threshold, low_demand_threshold } = stats;

    if (calls >= high_demand_threshold) {
      // Alto - Rojo
      const intensity = Math.min((calls / high_demand_threshold - 1) * 100, 100);
      return `rgba(255, 77, 79, ${0.3 + intensity / 200})`;
    } else if (calls >= avg_calls) {
      // Medio-Alto - Naranja
      const intensity = ((calls - avg_calls) / (high_demand_threshold - avg_calls)) * 100;
      return `rgba(255, 152, 0, ${0.2 + intensity / 200})`;
    } else if (calls >= low_demand_threshold) {
      // Medio - Amarillo
      const intensity = ((calls - low_demand_threshold) / (avg_calls - low_demand_threshold)) * 100;
      return `rgba(255, 193, 7, ${0.15 + intensity / 300})`;
    } else {
      // Bajo - Verde claro
      return 'rgba(76, 175, 80, 0.15)';
    }
  };

  const getCellTextColor = (calls, stats) => {
    if (calls === 0) return '#999';
    if (calls >= stats.high_demand_threshold) return '#c62828';
    if (calls >= stats.avg_calls) return '#d84315';
    return '#333';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Generando mapa de calor..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!data) {
    return null;
  }

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
                <Button onClick={() => setDateRange([dayjs().subtract(7, 'days'), dayjs()])} block>
                  Última Semana
                </Button>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Button onClick={() => setDateRange([dayjs().subtract(30, 'days'), dayjs()])} block>
                  Último Mes
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

      {/* Estadísticas Generales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Llamadas Promedio por Hora"
              value={data.statistics.avg_calls}
              precision={1}
              prefix={<FireOutlined style={{ color: MACSA_COLORS.orange }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pico Máximo"
              value={data.statistics.max_calls}
              prefix={<RiseOutlined style={{ color: MACSA_COLORS.red }} />}
              valueStyle={{ color: MACSA_COLORS.red }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Llamadas en hora pico
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Día Más Ocupado"
              value={data.insights.busiest_day}
              prefix={<FireOutlined style={{ color: MACSA_COLORS.blue }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Día Más Tranquilo"
              value={data.insights.quietest_day}
              prefix={<FallOutlined style={{ color: MACSA_COLORS.green }} />}
              valueStyle={{ color: MACSA_COLORS.green }}
            />
          </Card>
        </Col>
      </Row>

      {/* Leyenda */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card size="small">
            <Space size="large">
              <Text strong>Leyenda de Intensidad:</Text>
              <Space>
                <div style={{ width: 20, height: 20, backgroundColor: 'rgba(76, 175, 80, 0.15)', border: '1px solid #ddd' }}></div>
                <Text>Bajo ({'<'}{Math.round(data.statistics.low_demand_threshold)})</Text>
              </Space>
              <Space>
                <div style={{ width: 20, height: 20, backgroundColor: 'rgba(255, 193, 7, 0.3)', border: '1px solid #ddd' }}></div>
                <Text>Medio</Text>
              </Space>
              <Space>
                <div style={{ width: 20, height: 20, backgroundColor: 'rgba(255, 152, 0, 0.4)', border: '1px solid #ddd' }}></div>
                <Text>Alto</Text>
              </Space>
              <Space>
                <div style={{ width: 20, height: 20, backgroundColor: 'rgba(255, 77, 79, 0.5)', border: '1px solid #ddd' }}></div>
                <Text>Muy Alto ({'>'}{Math.round(data.statistics.high_demand_threshold)})</Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Mapa de Calor */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: MACSA_COLORS.orange }} />
                <span>Mapa de Calor Semanal - Intensidad de Llamadas</span>
                <Tooltip title="Las celdas más rojas indican mayor volumen de llamadas. Usa esto para planificar turnos y recursos.">
                  <InfoCircleOutlined style={{ color: MACSA_COLORS.gray }} />
                </Tooltip>
              </Space>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                minWidth: '900px'
              }}>
                <thead>
                  <tr>
                    <th style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      backgroundColor: MACSA_COLORS.blue,
                      color: 'white',
                      fontWeight: 'bold',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10
                    }}>
                      Día / Hora
                    </th>
                    {Array.from({ length: 24 }, (_, i) => (
                      <th key={i} style={{
                        border: '1px solid #ddd',
                        padding: '6px',
                        backgroundColor: MACSA_COLORS.blue,
                        color: 'white',
                        fontSize: '10px',
                        textAlign: 'center',
                        minWidth: '35px'
                      }}>
                        {i}h
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.heatmap_matrix.map((dayRow) => (
                    <tr key={dayRow.day_index}>
                      <td style={{
                        border: '1px solid #ddd',
                        padding: '8px',
                        fontWeight: 'bold',
                        backgroundColor: '#f5f5f5',
                        position: 'sticky',
                        left: 0,
                        zIndex: 5
                      }}>
                        {dayRow.day}
                      </td>
                      {dayRow.hours.map((hourData) => (
                        <Tooltip
                          key={hourData.hour}
                          title={
                            <div>
                              <div><strong>{dayRow.day} {hourData.hour}:00h</strong></div>
                              <div>Total: {hourData.total_calls} llamadas</div>
                              <div>Contestadas: {hourData.answered_calls}</div>
                              <div>Perdidas: {hourData.missed_calls}</div>
                            </div>
                          }
                        >
                          <td style={{
                            border: '1px solid #ddd',
                            padding: '8px',
                            textAlign: 'center',
                            backgroundColor: getCellColor(hourData.total_calls, data.statistics),
                            color: getCellTextColor(hourData.total_calls, data.statistics),
                            fontWeight: hourData.total_calls >= data.statistics.high_demand_threshold ? 'bold' : 'normal',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            minWidth: '35px'
                          }}>
                            {hourData.total_calls || '-'}
                          </td>
                        </Tooltip>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Períodos de Alta y Baja Demanda */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Top 10 Períodos de Alta Demanda">
            {data.insights.high_demand_periods.slice(0, 10).map((period, index) => (
              <div key={index} style={{
                padding: '8px',
                marginBottom: '8px',
                backgroundColor: index < 3 ? '#fff1f0' : '#f5f5f5',
                borderLeft: `4px solid ${index < 3 ? MACSA_COLORS.red : MACSA_COLORS.orange}`,
                borderRadius: '4px'
              }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Tag color={index < 3 ? 'error' : 'warning'}>#{index + 1}</Tag>
                    <Text strong>{period.day} - {period.hour}:00h</Text>
                  </Space>
                  <Tag color="error" style={{ fontSize: 13 }}>{period.calls} llamadas</Tag>
                </Space>
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Top 10 Períodos de Baja Demanda">
            {data.insights.low_demand_periods.slice(0, 10).map((period, index) => (
              <div key={index} style={{
                padding: '8px',
                marginBottom: '8px',
                backgroundColor: '#f6ffed',
                borderLeft: `4px solid ${MACSA_COLORS.green}`,
                borderRadius: '4px'
              }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Tag color="success">#{index + 1}</Tag>
                    <Text>{period.day} - {period.hour}:00h</Text>
                  </Space>
                  <Tag color="success">{period.calls} llamadas</Tag>
                </Space>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MapaCalorSemanal;

// Dashboard Ejecutivo - KPIs del día y tendencias
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Alert, Spin, Empty } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  PhoneOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import DoughnutChartComponent from '../../components/charts/DoughnutChartComponent';
import BarChartComponent from '../../components/charts/BarChartComponent';
import LineChartComponent from '../../components/charts/LineChartComponent';
import { MACSA_COLORS } from '../../config/theme';

export default function DashboardEjecutivo() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const response = await axios.get(`/api/analisis/dashboard-ejecutivo`, {
        params: { target_date: dateStr }
      });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Cargando dashboard ejecutivo..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        style={{ marginTop: 24 }}
      />
    );
  }

  if (!data || !data.kpis) {
    return (
      <Empty
        description="No hay datos disponibles para la fecha seleccionada"
        style={{ marginTop: 100 }}
      />
    );
  }

  // Preparar datos para gráficas
  const pieData = {
    labels: ['Atendidas', 'Abandonadas', 'Sin Respuesta'],
    datasets: [{
      data: [
        data.kpis.answered_calls || 0,
        data.kpis.abandoned_calls || 0,
        (data.kpis.total_calls || 0) - (data.kpis.answered_calls || 0) - (data.kpis.abandoned_calls || 0)
      ],
      backgroundColor: [MACSA_COLORS.green, MACSA_COLORS.orange, MACSA_COLORS.red],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const barData = {
    labels: (data.hourly_distribution || []).map(h => `${h.hour}:00h`),
    datasets: [
      {
        label: 'Contestadas',
        data: (data.hourly_distribution || []).map(h => h.answered_calls || 0),
        backgroundColor: MACSA_COLORS.green,
        borderWidth: 1
      },
      {
        label: 'No Contestadas',
        data: (data.hourly_distribution || []).map(h => h.missed_calls || 0),
        backgroundColor: MACSA_COLORS.red,
        borderWidth: 1
      }
    ]
  };

  const lineData = {
    labels: (data.hourly_distribution || []).map(h => `${h.hour}:00h`),
    datasets: [{
      label: 'Llamadas por Hora',
      data: (data.hourly_distribution || []).map(h => h.total_calls || 0),
      borderColor: MACSA_COLORS.blue,
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  return (
    <div>
      {/* Selector de fecha */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <DatePicker
            value={selectedDate}
            onChange={(date) => setSelectedDate(date || dayjs())}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            size="large"
            placeholder="Seleccionar fecha"
          />
        </Col>
        <Col xs={24} sm={12} md={16}>
          <Alert
            message={`Mostrando datos del ${selectedDate.format('DD/MM/YYYY')}`}
            type="info"
            showIcon
          />
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Llamadas"
              value={data.kpis.total_calls || 0}
              prefix={<PhoneOutlined />}
              suffix={
                data.trends && (
                  <span
                    style={{
                      fontSize: 14,
                      color: data.trends.calls >= 0 ? MACSA_COLORS.green : MACSA_COLORS.red,
                      marginLeft: 8
                    }}
                  >
                    {data.trends.calls >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(data.trends.calls).toFixed(1)}%
                  </span>
                )
              }
              valueStyle={{ fontSize: 32 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              vs día anterior
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tasa de Respuesta"
              value={(data.kpis.answer_rate || 0).toFixed(1)}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color: data.kpis.answer_rate >= 80 ? MACSA_COLORS.green :
                       data.kpis.answer_rate >= 60 ? MACSA_COLORS.orange : MACSA_COLORS.red,
                fontSize: 32
              }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {data.kpis.answered_calls || 0} de {data.kpis.total_calls || 0} llamadas
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hora Pico"
              value={data.peak_hour ? `${data.peak_hour.hour}:00h` : 'N/A'}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: 28 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {data.peak_hour?.total_calls || 0} llamadas
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Agente Estrella"
              value={data.top_agent?.agent || 'N/A'}
              prefix={<TrophyOutlined style={{ color: MACSA_COLORS.gold }} />}
              valueStyle={{ fontSize: 20 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {data.top_agent?.total_calls || 0} llamadas atendidas
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Distribución de Llamadas" bordered={false}>
            <DoughnutChartComponent data={pieData} height={300} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Llamadas por Hora" bordered={false}>
            <BarChartComponent
              data={barData}
              height={300}
              options={{
                scales: {
                  x: { stacked: true },
                  y: { stacked: true, beginAtZero: true }
                }
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Tendencia de Llamadas Durante el Día" bordered={false}>
            <LineChartComponent data={lineData} height={300} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

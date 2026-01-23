// components/Dashboard.jsx - Migrado a Ant Design con Chart.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Switch, DatePicker, Button, Alert, Spin, Typography } from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  SyncOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { dashboardAPI, callsAPI } from '../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import BarChartComponent from './charts/BarChartComponent';
import DoughnutChartComponent from './charts/DoughnutChartComponent';
import LineChartComponent from './charts/LineChartComponent';
import { MACSA_COLORS } from '../config/theme';

const { Title, Text } = Typography;

// Componente de tarjeta de estadística
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <Card>
    <Statistic
      title={title}
      value={value}
      prefix={<Icon style={{ color }} />}
      suffix={
        trend !== undefined && trend !== 0 ? (
          <span style={{ fontSize: 14, marginLeft: 8, color: trend > 0 ? MACSA_COLORS.green : MACSA_COLORS.red }}>
            {trend > 0 ? <RiseOutlined /> : <FallOutlined />}
            {Math.abs(trend)}%
          </span>
        ) : null
      }
      valueStyle={{ fontSize: 28 }}
    />
    {subtitle && (
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
        {subtitle}
      </Text>
    )}
  </Card>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(dayjs());
  const [hourlyData, setHourlyData] = useState([]);
  const [selectedDateData, setSelectedDateData] = useState(null);

  // Filtros de fecha
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [useRealtime, setUseRealtime] = useState(true);

  const fetchData = async (dateToFetch = null) => {
    try {
      setError(null);
      const response = await dashboardAPI.getSummary();
      setData(response.data.data);

      // Usar la fecha seleccionada o la actual
      let targetDate = dateToFetch || selectedDate.format('YYYY-MM-DD') || today;

      // Cargar estadísticas para la fecha seleccionada
      const statsResponse = await callsAPI.getStatistics(targetDate, targetDate);
      setSelectedDateData(statsResponse.data.data);

      // Cargar datos para gráficos
      const hourlyResponse = await callsAPI.getHourlyDistribution(targetDate, targetDate);
      setHourlyData(hourlyResponse.data.data?.data || []);

      setLastUpdate(dayjs());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Actualizar cada 30 segundos solo si está en modo tiempo real
    let interval;
    if (useRealtime) {
      interval = setInterval(() => fetchData(), 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [useRealtime, selectedDate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Cargando dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error al cargar el dashboard"
        description={error}
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  const { today: todayData, yesterday: yesterdayData, week, agents } = data || {};

  // Determinar qué datos mostrar según la fecha seleccionada
  let mainData, comparisonData, periodLabel;

  const selectedDateStr = selectedDate.format('YYYY-MM-DD');

  if (useRealtime) {
    // Modo tiempo real: muestra hoy si tiene datos, sino ayer
    const hasDataToday = (todayData?.total_calls || 0) > 0;
    mainData = hasDataToday ? todayData : yesterdayData;
    comparisonData = hasDataToday ? yesterdayData : null;
    periodLabel = hasDataToday ? 'Hoy' : 'Ayer (Últimos datos)';
  } else {
    // Modo manual: mostrar la fecha seleccionada
    if (selectedDateStr === today) {
      mainData = todayData;
      comparisonData = yesterdayData;
      periodLabel = 'Hoy';
    } else if (selectedDateStr === yesterday) {
      mainData = yesterdayData;
      comparisonData = null;
      periodLabel = 'Ayer';
    } else {
      // Para otras fechas, usar los datos cargados para esa fecha
      mainData = selectedDateData || yesterdayData;
      comparisonData = null;
      periodLabel = selectedDate.locale('es').format('D [de] MMM');
    }
  }

  // Calcular tendencias
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const callsTrend = comparisonData ? calculateTrend(
    mainData?.total_calls || 0,
    comparisonData?.total_calls || 0
  ) : 0;

  const answeredTrend = comparisonData ? calculateTrend(
    mainData?.answered_calls || 0,
    comparisonData?.answered_calls || 0
  ) : 0;

  // Contar agentes activos
  const activeAgents = agents?.filter(a => a.status !== 'UNAVAILABLE').length || 4;

  // Datos para gráfica de barras (llamadas por hora)
  const barChartData = {
    labels: (hourlyData || []).map(h => `${h.hour}:00h`),
    datasets: [
      {
        label: 'Contestadas',
        data: (hourlyData || []).map(h => h.answered_calls || 0),
        backgroundColor: MACSA_COLORS.green,
        borderWidth: 1
      },
      {
        label: 'No Contestadas',
        data: (hourlyData || []).map(h => h.missed_calls || 0),
        backgroundColor: MACSA_COLORS.red,
        borderWidth: 1
      }
    ]
  };

  // Datos para gráfica de pie (tasa de abandono)
  const pieChartData = {
    labels: ['Atendidas', 'Abandonadas', 'Sin Respuesta'],
    datasets: [{
      data: [
        mainData?.answered_calls || 0,
        mainData?.abandoned_calls || 0,
        (mainData?.total_calls || 0) - (mainData?.answered_calls || 0) - (mainData?.abandoned_calls || 0)
      ],
      backgroundColor: [MACSA_COLORS.green, MACSA_COLORS.orange, MACSA_COLORS.red],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  // Datos para gráfica de líneas (tiempo de espera)
  const lineChartData = {
    labels: (hourlyData || []).map(h => `${h.hour}:00h`),
    datasets: [{
      label: 'Tiempo Espera Promedio (seg)',
      data: (hourlyData || []).map(h => h.avg_wait_time || 0),
      borderColor: MACSA_COLORS.blue,
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const abandonRate = mainData?.abandoned_calls && mainData?.total_calls
    ? ((mainData.abandoned_calls / mainData.total_calls) * 100).toFixed(1)
    : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>Dashboard General</Title>
        <Text type="secondary">
          Última actualización: {lastUpdate.locale('es').format('DD [de] MMMM, HH:mm:ss')}
        </Text>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Switch
                checked={useRealtime}
                onChange={(checked) => setUseRealtime(checked)}
                style={{ marginRight: 8 }}
              />
              <Text>Auto-actualización</Text>
            </div>
          </Col>

          {!useRealtime && (
            <>
              <Col xs={24} sm={12} md={6}>
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date || dayjs())}
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Button
                  onClick={() => setSelectedDate(dayjs())}
                  block
                >
                  Hoy
                </Button>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Button
                  onClick={() => setSelectedDate(dayjs().subtract(1, 'day'))}
                  block
                >
                  Ayer
                </Button>
              </Col>
            </>
          )}

          <Col xs={24} sm={12} md={useRealtime ? 6 : 4}>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => fetchData()}
              loading={loading}
              block
            >
              Actualizar
            </Button>
          </Col>
        </Row>

        {!useRealtime && (
          <Alert
            message={`Modo manual activado. Mostrando datos de: ${periodLabel}`}
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Estadísticas principales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title={`Llamadas ${periodLabel}`}
            value={mainData?.total_calls || 0}
            subtitle={`${week?.total_calls || 0} esta semana`}
            icon={PhoneOutlined}
            color={MACSA_COLORS.blue}
            trend={callsTrend}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Contestadas"
            value={mainData?.answered_calls || 0}
            subtitle={`${(mainData?.answer_rate || 0).toFixed(1)}% tasa de respuesta`}
            icon={CheckCircleOutlined}
            color={MACSA_COLORS.green}
            trend={answeredTrend}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Abandonadas"
            value={mainData?.abandoned_calls || 0}
            subtitle={`${Math.round((mainData?.abandoned_calls || 0) / (mainData?.total_calls || 1) * 100)}% del total`}
            icon={CloseCircleOutlined}
            color={MACSA_COLORS.red}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Agentes Activos"
            value={activeAgents}
            subtitle={`${agents?.length || 4} total`}
            icon={TeamOutlined}
            color={MACSA_COLORS.blue}
          />
        </Col>
      </Row>

      {/* Métricas adicionales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title={`Tiempo Promedio ${periodLabel}`}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Duración de llamada"
                  value={Math.round(mainData?.avg_duration || 0)}
                  suffix="seg"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Tiempo de espera"
                  value={Math.round(mainData?.avg_wait_time || 0)}
                  suffix="seg"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Llamada más larga"
                  value={Math.round(mainData?.max_talk_time || 0)}
                  suffix="seg"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Duración total"
                  value={Math.round((mainData?.total_duration || 0) / 60)}
                  suffix="min"
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Resumen Semanal">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Total llamadas"
                  value={week?.total_calls || 0}
                  prefix={<PhoneOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Contestadas"
                  value={week?.answered_calls || 0}
                  suffix={`(${(week?.answer_rate || 0).toFixed(1)}%)`}
                  valueStyle={{ color: MACSA_COLORS.green }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Abandonadas"
                  value={week?.abandoned_calls || 0}
                  valueStyle={{ color: MACSA_COLORS.red }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Tasa de respuesta"
                  value={(week?.answer_rate || 0).toFixed(1)}
                  suffix="%"
                  valueStyle={{ color: (week?.answer_rate || 0) >= 80 ? MACSA_COLORS.green : MACSA_COLORS.orange }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Gráficos */}
      <Row gutter={[16, 16]}>
        {/* Gráfico 1: Llamadas por Hora del Día */}
        <Col xs={24} lg={16}>
          <Card title="Llamadas Durante el Día (Por Hora)">
            <BarChartComponent
              data={barChartData}
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

        {/* Gráfico 2: Tasa de Abandono */}
        <Col xs={24} lg={8}>
          <Card title="Distribución de Llamadas">
            <DoughnutChartComponent data={pieChartData} height={300} />
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Title level={2} style={{ color: MACSA_COLORS.orange, margin: 0 }}>
                {abandonRate}%
              </Title>
              <Text type="secondary">Tasa de Abandono Total</Text>
            </div>
          </Card>
        </Col>

        {/* Gráfico 3: Distribución de Tiempos de Espera */}
        <Col xs={24}>
          <Card title="Tiempo de Espera Promedio por Hora (Segundos)">
            <LineChartComponent
              data={lineChartData}
              height={250}
              options={{
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

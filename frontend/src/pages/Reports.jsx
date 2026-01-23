// pages/Reports.jsx - Dashboard Ejecutivo Mejorado con Visualizaciones
import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  DatePicker,
  Button,
  Spin,
  Alert,
  Typography,
  Space,
  Tag,
  Progress,
  Statistic,
  Divider,
  message
} from 'antd';
import {
  FileExcelOutlined,
  FilePdfOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  TrophyOutlined,
  PhoneOutlined,
  SyncOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import html2canvas from 'html2canvas';
import axios from 'axios';
import { callsAPI, queuesAPI, agentsAPI } from '../services/api';
import { MACSA_COLORS } from '../config/theme';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Fechas
  const today = dayjs();
  const [dateRange, setDateRange] = useState([today.subtract(7, 'days'), today]);

  // Datos
  const [dailySummary, setDailySummary] = useState([]);
  const [hourlyDistribution, setHourlyDistribution] = useState([]);
  const [dispositionSummary, setDispositionSummary] = useState([]);
  const [queuesPerformance, setQueuesPerformance] = useState([]);
  const [agentsComparison, setAgentsComparison] = useState([]);
  const [currentStats, setCurrentStats] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);

  // Refs para capturar gráficos
  const hourlyChartRef = useRef(null);
  const donutChartRef = useRef(null);
  const lineChartRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // Calcular período anterior para comparación
      const daysDiff = dateRange[1].diff(dateRange[0], 'days') + 1;
      const prevStartDate = dateRange[0].subtract(daysDiff, 'days').format('YYYY-MM-DD');
      const prevEndDate = dateRange[0].subtract(1, 'days').format('YYYY-MM-DD');

      // Cargar datos del período actual
      const [dailyRes, hourlyRes, dispositionRes, queuesRes, agentsRes, statsRes] = await Promise.all([
        callsAPI.getDailySummary(startDate, endDate),
        callsAPI.getHourlyDistribution(startDate, endDate),
        callsAPI.getDispositionSummary(startDate, endDate),
        queuesAPI.getStatistics(startDate, endDate),
        agentsAPI.getComparison(startDate, endDate),
        callsAPI.getStatistics(startDate, endDate)
      ]);

      setDailySummary(dailyRes.data.data?.data || []);
      setHourlyDistribution(hourlyRes.data.data?.data || []);
      setDispositionSummary(dispositionRes.data.data?.data || []);
      setQueuesPerformance(queuesRes.data.data?.queues || []);
      setAgentsComparison(agentsRes.data.data?.agents || []);
      setCurrentStats(statsRes.data.data || {});

      // Cargar estadísticas del período anterior para comparación
      try {
        const prevStatsRes = await callsAPI.getStatistics(prevStartDate, prevEndDate);
        setPreviousStats(prevStatsRes.data.data || {});
      } catch (err) {
        console.warn('No se pudieron cargar estadísticas del período anterior');
        setPreviousStats({});
      }

    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const captureCharts = async () => {
    try {
      const charts = [];

      // Capturar gráfico de barras (distribución horaria)
      if (hourlyChartRef.current && hourlyDistribution.length > 0) {
        const canvas = await html2canvas(hourlyChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false
        });
        charts.push(canvas.toDataURL('image/png'));
      }

      // Capturar gráfico de dona (estado de llamadas)
      if (donutChartRef.current && currentStats) {
        const canvas = await html2canvas(donutChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false
        });
        charts.push(canvas.toDataURL('image/png'));
      }

      // Capturar gráfico de línea (tendencia diaria)
      if (lineChartRef.current && dailySummary.length > 1) {
        const canvas = await html2canvas(lineChartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false
        });
        charts.push(canvas.toDataURL('image/png'));
      }

      // Retornar el primer gráfico disponible (o null)
      return charts.length > 0 ? charts[0] : null;
    } catch (error) {
      console.error('Error capturando gráficos:', error);
      message.warning('No se pudo capturar los gráficos, el reporte se generará sin ellos');
      return null;
    }
  };

  const handleExport = async (reportType, format) => {
    setExporting(true);
    message.loading({ content: 'Capturando gráficos...', key: 'export', duration: 0 });

    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // Capturar gráficos
      const chartImage = await captureCharts();

      message.loading({ content: 'Generando reporte...', key: 'export', duration: 0 });

      // Realizar petición POST con imagen de gráfico
      const response = await axios.post(
        `http://192.168.11.3:8000/api/reports/export/${reportType}/${format}?start_date=${startDate}&end_date=${endDate}`,
        { chart_image: chartImage },
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Descargar archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      const filename = `reporte_${reportType}_${startDate}_${endDate}.${extension}`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success({ content: 'Reporte generado exitosamente', key: 'export' });
    } catch (error) {
      console.error('Error exportando reporte:', error);
      message.error({ content: 'Error al generar el reporte', key: 'export' });
    } finally {
      setExporting(false);
    }
  };

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Categorizar eventos del sistema de manera amigable
  const categorizeEvents = (events) => {
    const categories = {
      'Llamadas Entrantes': { events: [], icon: <PhoneOutlined />, color: MACSA_COLORS.blue, count: 0 },
      'Llamadas Atendidas': { events: [], icon: <CheckCircleOutlined />, color: MACSA_COLORS.green, count: 0 },
      'Llamadas No Atendidas': { events: [], icon: <CloseCircleOutlined />, color: MACSA_COLORS.red, count: 0 },
      'Transferencias': { events: [], icon: <SyncOutlined />, color: MACSA_COLORS.orange, count: 0 },
      'Operaciones de Agente': { events: [], icon: <BarChartOutlined />, color: MACSA_COLORS.gray, count: 0 }
    };

    const eventMapping = {
      'ENTERQUEUE': 'Llamadas Entrantes',
      'DID': 'Llamadas Entrantes',
      'CONNECT': 'Llamadas Atendidas',
      'COMPLETEAGENT': 'Llamadas Atendidas',
      'COMPLETECALLER': 'Llamadas Atendidas',
      'ABANDON': 'Llamadas No Atendidas',
      'RINGNOANSWER': 'Llamadas No Atendidas',
      'RINGCANCELED': 'Llamadas No Atendidas',
      'EXITWITHTIMEOUT': 'Llamadas No Atendidas',
      'EXITWITHKEY': 'Llamadas No Atendidas',
      'TRANSFER': 'Transferencias',
      'BLINDTRANSFER': 'Transferencias',
      'ATTENDEDTRANSFER': 'Transferencias',
      'PAUSE': 'Operaciones de Agente',
      'UNPAUSE': 'Operaciones de Agente',
      'ADDMEMBER': 'Operaciones de Agente',
      'REMOVEMEMBER': 'Operaciones de Agente',
      'AGENTDUMP': 'Operaciones de Agente'
    };

    events.forEach(event => {
      const category = eventMapping[event.disposition] || 'Operaciones de Agente';
      categories[category].events.push(event);
      categories[category].count += event.count;
    });

    return Object.entries(categories)
      .filter(([_, data]) => data.count > 0)
      .map(([name, data]) => ({
        category: name,
        count: data.count,
        percentage: events.reduce((sum, e) => sum + e.count, 0) > 0
          ? ((data.count / events.reduce((sum, e) => sum + e.count, 0)) * 100).toFixed(1)
          : 0,
        icon: data.icon,
        color: data.color,
        events: data.events
      }));
  };

  // Generar insights automáticos
  const generateInsights = () => {
    const insights = [];

    if (!currentStats) return insights;

    // Insight 1: Tasa de respuesta
    const answerRate = currentStats.answer_rate || 0;
    if (answerRate < 80) {
      insights.push({
        type: 'error',
        icon: <WarningOutlined />,
        title: 'Tasa de Respuesta Baja',
        message: `Tasa actual: ${answerRate.toFixed(1)}% (Meta: 80%)`,
        action: 'Considere incrementar agentes disponibles'
      });
    } else if (answerRate >= 95) {
      insights.push({
        type: 'success',
        icon: <CheckCircleOutlined />,
        title: 'Excelente Tasa de Respuesta',
        message: `Tasa actual: ${answerRate.toFixed(1)}%`,
        action: 'Continuar con el buen desempeño'
      });
    }

    // Insight 2: Abandonos
    const abandonRate = currentStats.total_calls > 0
      ? ((currentStats.abandoned_calls / currentStats.total_calls) * 100)
      : 0;
    if (abandonRate > 10) {
      insights.push({
        type: 'warning',
        icon: <CloseCircleOutlined />,
        title: 'Tasa de Abandono Elevada',
        message: `${abandonRate.toFixed(1)}% de llamadas abandonadas (${currentStats.abandoned_calls} llamadas)`,
        action: 'Revisar tiempos de espera y capacidad de agentes'
      });
    }

    // Insight 3: Comparativa con período anterior
    if (previousStats && previousStats.total_calls > 0) {
      const callsTrend = calculateTrend(currentStats.total_calls, previousStats.total_calls);
      if (Math.abs(callsTrend) > 20) {
        insights.push({
          type: callsTrend > 0 ? 'info' : 'warning',
          icon: callsTrend > 0 ? <RiseOutlined /> : <FallOutlined />,
          title: callsTrend > 0 ? 'Incremento Significativo de Llamadas' : 'Disminución Significativa de Llamadas',
          message: `${Math.abs(callsTrend).toFixed(1)}% ${callsTrend > 0 ? 'más' : 'menos'} llamadas vs período anterior`,
          action: callsTrend > 0 ? 'Asegurar capacidad suficiente de agentes' : 'Analizar causas de la disminución'
        });
      }
    }

    // Insight 4: Hora pico
    if (hourlyDistribution.length > 0) {
      const peakHour = hourlyDistribution.reduce((max, hour) =>
        hour.total_calls > max.total_calls ? hour : max
      );
      if (peakHour.total_calls > 0) {
        insights.push({
          type: 'info',
          icon: <ClockCircleOutlined />,
          title: 'Hora Pico Identificada',
          message: `${peakHour.hour}:00h con ${peakHour.total_calls} llamadas`,
          action: 'Asegurar personal suficiente en este horario'
        });
      }
    }

    // Insight 5: Top agente
    if (agentsComparison.length > 0) {
      const topAgent = agentsComparison[0];
      insights.push({
        type: 'success',
        icon: <TrophyOutlined />,
        title: 'Mejor Agente del Período',
        message: `${topAgent.agent} con ${topAgent.total_calls} llamadas`,
        action: 'Reconocer desempeño destacado'
      });
    }

    return insights;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Generando dashboard ejecutivo..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon closable onClose={() => setError(null)} />;
  }

  // Preparar datos para gráficos
  const hourlyChartData = {
    labels: hourlyDistribution.map(h => `${h.hour}:00h`),
    datasets: [
      {
        label: 'Contestadas',
        data: hourlyDistribution.map(h => h.answered_calls || 0),
        backgroundColor: MACSA_COLORS.green,
        borderColor: MACSA_COLORS.green,
        borderWidth: 1
      },
      {
        label: 'Perdidas',
        data: hourlyDistribution.map(h => h.missed_calls || 0),
        backgroundColor: MACSA_COLORS.red,
        borderColor: MACSA_COLORS.red,
        borderWidth: 1
      }
    ]
  };

  const hourlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold', size: 10 },
        formatter: (value) => value > 0 ? value : ''
      }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };

  // Gráfico de dona para estado de llamadas
  const callsStatusData = currentStats ? {
    labels: ['Contestadas', 'Abandonadas', 'Otras'],
    datasets: [{
      data: [
        currentStats.answered_calls || 0,
        currentStats.abandoned_calls || 0,
        (currentStats.total_calls || 0) - (currentStats.answered_calls || 0) - (currentStats.abandoned_calls || 0)
      ],
      backgroundColor: [MACSA_COLORS.green, MACSA_COLORS.red, MACSA_COLORS.gray],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  } : null;

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold', size: 12 },
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return value > 0 ? `${value}\n(${percentage}%)` : '';
        }
      }
    }
  };

  // Gráfico de tendencia diaria
  const dailyTrendData = {
    labels: dailySummary.slice(-14).map(d => dayjs(d.date).format('DD/MM')),
    datasets: [{
      label: 'Llamadas Diarias',
      data: dailySummary.slice(-14).map(d => d.total_calls),
      borderColor: MACSA_COLORS.blue,
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        color: MACSA_COLORS.blue,
        font: { weight: 'bold', size: 10 },
        align: 'top',
        formatter: (value) => value > 0 ? value : ''
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  const categorizedEvents = categorizeEvents(dispositionSummary);
  const insights = generateInsights();

  // Calcular tendencias
  const callsTrend = previousStats ? calculateTrend(currentStats?.total_calls || 0, previousStats.total_calls) : 0;
  const answerRateTrend = previousStats ? calculateTrend(currentStats?.answer_rate || 0, previousStats.answer_rate) : 0;

  return (
    <div>
      {/* Header con exportación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Dashboard Ejecutivo de Reportes</Title>
          <Text type="secondary">
            Período: {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')}
          </Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={() => handleExport('general', 'excel')}
            loading={exporting}
            style={{ backgroundColor: '#52c41a' }}
          >
            Exportar Excel
          </Button>
          <Button
            danger
            icon={<FilePdfOutlined />}
            onClick={() => handleExport('general', 'pdf')}
            loading={exporting}
          >
            Exportar PDF
          </Button>
        </Space>
      </div>

      {/* Filtros de fecha */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates || [today.subtract(7, 'days'), today])}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button onClick={() => setDateRange([today, today])} block>
              Hoy
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button onClick={() => setDateRange([today.subtract(7, 'days'), today])} block>
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

      {/* KPIs Principales con Comparativa */}
      {currentStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total de Llamadas"
                value={currentStats.total_calls || 0}
                prefix={<PhoneOutlined style={{ color: MACSA_COLORS.blue }} />}
                suffix={
                  previousStats && previousStats.total_calls > 0 && (
                    <span style={{
                      fontSize: 14,
                      color: callsTrend >= 0 ? MACSA_COLORS.green : MACSA_COLORS.red,
                      marginLeft: 8
                    }}>
                      {callsTrend >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      {Math.abs(callsTrend).toFixed(1)}%
                    </span>
                  )
                }
              />
              {previousStats && previousStats.total_calls > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Anterior: {previousStats.total_calls}
                </Text>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Tasa de Respuesta"
                value={(currentStats.answer_rate || 0).toFixed(1)}
                suffix="%"
                prefix={
                  (currentStats.answer_rate || 0) >= 80 ?
                  <CheckCircleOutlined style={{ color: MACSA_COLORS.green }} /> :
                  <WarningOutlined style={{ color: MACSA_COLORS.red }} />
                }
                valueStyle={{
                  color: (currentStats.answer_rate || 0) >= 80 ? MACSA_COLORS.green : MACSA_COLORS.red
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Meta: 80%
                {previousStats && previousStats.answer_rate > 0 && (
                  <span style={{ marginLeft: 8, color: answerRateTrend >= 0 ? MACSA_COLORS.green : MACSA_COLORS.red }}>
                    ({answerRateTrend >= 0 ? '+' : ''}{answerRateTrend.toFixed(1)}%)
                  </span>
                )}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Llamadas Abandonadas"
                value={currentStats.abandoned_calls || 0}
                prefix={<CloseCircleOutlined style={{ color: MACSA_COLORS.red }} />}
                valueStyle={{ color: MACSA_COLORS.red }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentStats.total_calls > 0
                  ? ((currentStats.abandoned_calls / currentStats.total_calls) * 100).toFixed(1)
                  : 0}% del total
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Tiempo Promedio"
                value={Math.round(currentStats.avg_duration || 0)}
                suffix="seg"
                prefix={<ClockCircleOutlined style={{ color: MACSA_COLORS.blue }} />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Espera: {Math.round(currentStats.avg_wait_time || 0)}s
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* Insights y Alertas */}
      {insights.length > 0 && (
        <Card title={<><InfoCircleOutlined /> Insights y Recomendaciones</>} style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {insights.map((insight, index) => (
              <Col xs={24} md={12} key={index}>
                <Alert
                  message={insight.title}
                  description={
                    <div>
                      <p style={{ margin: '8px 0' }}>{insight.message}</p>
                      <Text strong style={{ fontSize: 12 }}>→ {insight.action}</Text>
                    </div>
                  }
                  type={insight.type}
                  icon={insight.icon}
                  showIcon
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Gráficos Visuales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Distribución Horaria - Gráfico de Barras */}
        <Col xs={24} lg={16}>
          <Card title={<><ClockCircleOutlined style={{ color: MACSA_COLORS.blue }} /> Distribución por Hora del Día</>}>
            <div ref={hourlyChartRef} style={{ height: 300 }}>
              <Bar data={hourlyChartData} options={hourlyChartOptions} />
            </div>
          </Card>
        </Col>

        {/* Estado de Llamadas - Dona */}
        <Col xs={24} lg={8}>
          <Card title={<><BarChartOutlined style={{ color: MACSA_COLORS.blue }} /> Estado de Llamadas</>}>
            <div ref={donutChartRef} style={{ height: 300 }}>
              {callsStatusData && <Doughnut data={callsStatusData} options={donutOptions} />}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tendencia Diaria */}
      {dailySummary.length > 1 && (
        <Card
          title={<><CalendarOutlined style={{ color: MACSA_COLORS.blue }} /> Tendencia de Llamadas (Últimos 14 Días)</>}
          style={{ marginBottom: 24 }}
        >
          <div ref={lineChartRef} style={{ height: 250 }}>
            <Line data={dailyTrendData} options={lineChartOptions} />
          </div>
        </Card>
      )}

      {/* Resumen Diario Completo */}
      <Card
        title={<><CalendarOutlined style={{ color: MACSA_COLORS.blue }} /> Resumen Diario Detallado</>}
        extra={
          <Space>
            <Button
              size="small"
              icon={<FileExcelOutlined />}
              onClick={() => handleExport('calls', 'excel')}
              loading={exporting}
              style={{ color: '#52c41a' }}
            >
              Excel
            </Button>
            <Button
              size="small"
              danger
              icon={<FilePdfOutlined />}
              onClick={() => handleExport('calls', 'pdf')}
              loading={exporting}
            >
              PDF
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={[
            {
              title: 'Fecha',
              dataIndex: 'date',
              key: 'date',
              render: (date) => new Date(date).toLocaleDateString('es-ES', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            },
            {
              title: 'Total',
              dataIndex: 'total_calls',
              key: 'total_calls',
              align: 'right',
              sorter: (a, b) => a.total_calls - b.total_calls
            },
            {
              title: 'Contestadas',
              dataIndex: 'answered_calls',
              key: 'answered_calls',
              align: 'right',
              render: (value) => <Tag color="success">{value}</Tag>,
              sorter: (a, b) => a.answered_calls - b.answered_calls
            },
            {
              title: 'Perdidas',
              dataIndex: 'missed_calls',
              key: 'missed_calls',
              align: 'right',
              render: (value) => <Tag color="error">{value}</Tag>,
              sorter: (a, b) => a.missed_calls - b.missed_calls
            },
            {
              title: 'Duración Prom.',
              dataIndex: 'avg_duration',
              key: 'avg_duration',
              align: 'right',
              render: (value) => `${Math.round(value)}s`,
              sorter: (a, b) => a.avg_duration - b.avg_duration
            }
          ]}
          dataSource={dailySummary}
          rowKey="date"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} días`,
            pageSizeOptions: ['10', '20', '30', '50']
          }}
          locale={{ emptyText: 'No hay datos disponibles' }}
        />
      </Card>

      {/* Eventos Categorizados */}
      {/* <Card
        title={<><BarChartOutlined style={{ color: MACSA_COLORS.blue }} /> Categorías de Eventos</>}
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          {categorizedEvents.map((category, index) => (
            <Col xs={24} sm={12} md={8} lg={8} xl={4} key={index}>
              <Card size="small" style={{ borderLeft: `4px solid ${category.color}` }}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space>
                    {React.cloneElement(category.icon, { style: { color: category.color, fontSize: 18 } })}
                    <Text strong style={{ fontSize: 12 }}>{category.category}</Text>
                  </Space>
                  <Title level={3} style={{ margin: 0, color: category.color }}>{category.count}</Title>
                  <Progress
                    percent={parseFloat(category.percentage)}
                    size="small"
                    strokeColor={category.color}
                    showInfo={false}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>{category.percentage}% del total</Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Divider /> */}

      {/* Tablas Detalladas */}
      {/* <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card
            title={<><TrophyOutlined style={{ color: MACSA_COLORS.gold }} /> Top 10 Agentes</>}
            extra={
              <Space>
                <Button
                  size="small"
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport('agents', 'excel')}
                  loading={exporting}
                  style={{ color: '#52c41a' }}
                >
                  Excel
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<FilePdfOutlined />}
                  onClick={() => handleExport('agents', 'pdf')}
                  loading={exporting}
                >
                  PDF
                </Button>
              </Space>
            }
          >
            <Table
              columns={[
                {
                  title: '#',
                  dataIndex: 'rank',
                  key: 'rank',
                  width: 60,
                  render: (rank) => (
                    <Tag color={rank <= 3 ? 'gold' : 'default'} style={{ fontSize: 12 }}>
                      #{rank}
                    </Tag>
                  )
                },
                {
                  title: 'Agente',
                  dataIndex: 'agent',
                  key: 'agent',
                  render: (agent) => <strong>{agent}</strong>
                },
                {
                  title: 'Llamadas',
                  dataIndex: 'total_calls',
                  key: 'total_calls',
                  align: 'right',
                  render: (value) => <Tag color="blue">{value}</Tag>
                },
                {
                  title: 'Tiempo',
                  dataIndex: 'total_talk_time_formatted',
                  key: 'total_talk_time_formatted',
                  align: 'right'
                }
              ]}
              dataSource={agentsComparison.slice(0, 10)}
              rowKey="agent"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="Performance de Colas"
            extra={
              <Space>
                <Button
                  size="small"
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport('queues', 'excel')}
                  loading={exporting}
                  style={{ color: '#52c41a' }}
                >
                  Excel
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<FilePdfOutlined />}
                  onClick={() => handleExport('queues', 'pdf')}
                  loading={exporting}
                >
                  PDF
                </Button>
              </Space>
            }
          >
            <Table
              columns={[
                {
                  title: 'Cola',
                  dataIndex: 'queue_name',
                  key: 'queue_name',
                  render: (name) => <strong>{name}</strong>
                },
                {
                  title: 'Llamadas',
                  dataIndex: 'total_calls',
                  key: 'total_calls',
                  align: 'right'
                },
                {
                  title: 'Tasa Resp.',
                  dataIndex: 'answer_rate',
                  key: 'answer_rate',
                  align: 'right',
                  render: (value) => (
                    <Tag color={value >= 80 ? 'success' : value >= 60 ? 'warning' : 'error'}>
                      {value}%
                    </Tag>
                  )
                }
              ]}
              dataSource={queuesPerformance.slice(0, 10)}
              rowKey="queue_name"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row> */}
    </div>
  );
};

export default Reports;

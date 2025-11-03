// components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  Button,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Phone,
  CheckCircle,
  Cancel,
  TrendingUp,
  AccessTime,
  People,
} from '@mui/icons-material';
import { dashboardAPI, callsAPI } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Componente de tarjeta de estadística
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="text.secondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <TrendingUp 
                sx={{ 
                  fontSize: 16, 
                  mr: 0.5, 
                  color: trend > 0 ? 'success.main' : 'error.main' 
                }} 
              />
              <Typography 
                variant="body2" 
                color={trend > 0 ? 'success.main' : 'error.main'}
              >
                {trend > 0 ? '+' : ''}{trend}% vs ayer
              </Typography>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.main`,
            borderRadius: 2,
            p: 1.5,
            color: 'white',
          }}
        >
          <Icon sx={{ fontSize: 32 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [hourlyData, setHourlyData] = useState([]);
  const [dispositionData, setDispositionData] = useState([]);

  // Filtros de fecha
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [useRealtime, setUseRealtime] = useState(true);

  const fetchData = async (dateToFetch = null) => {
    try {
      setError(null);
      const response = await dashboardAPI.getSummary();
      setData(response.data.data);

      // Usar la fecha seleccionada o la actual (asegurarse de que sea string)
      let targetDate = dateToFetch || selectedDate || today;

      // Convertir siempre a string si no lo es
      if (typeof targetDate !== 'string') {
        if (targetDate instanceof Date) {
          targetDate = targetDate.toISOString().split('T')[0];
        } else {
          targetDate = String(targetDate);
        }
      }

      // Cargar datos para gráficos
      const hourlyResponse = await callsAPI.getHourlyDistribution(targetDate, targetDate);
      setHourlyData(hourlyResponse.data.data?.data || []);

      const dispositionResponse = await callsAPI.getDispositionSummary(targetDate, targetDate);
      setDispositionData(dispositionResponse.data.data?.data || []);

      setLastUpdate(new Date());
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
      interval = setInterval(fetchData, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [useRealtime, selectedDate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error al cargar el dashboard: {error}
      </Alert>
    );
  }

  const { today: todayData, yesterday: yesterdayData, week, queues, agents } = data;

  // Determinar qué datos mostrar según la fecha seleccionada
  let mainData, comparisonData, periodLabel;

  if (useRealtime) {
    // Modo tiempo real: muestra hoy si tiene datos, sino ayer
    const hasDataToday = (todayData?.total_calls || 0) > 0;
    mainData = hasDataToday ? todayData : yesterdayData;
    comparisonData = hasDataToday ? yesterdayData : null;
    periodLabel = hasDataToday ? 'Hoy' : 'Ayer (Últimos datos)';
  } else {
    // Modo manual: mostrar la fecha seleccionada
    if (selectedDate === today) {
      mainData = todayData;
      comparisonData = yesterdayData;
      periodLabel = 'Hoy';
    } else if (selectedDate === yesterday) {
      mainData = yesterdayData;
      comparisonData = null;
      periodLabel = 'Ayer';
    } else {
      // Para otras fechas, usar los datos de ayer como referencia
      mainData = yesterdayData;
      comparisonData = null;
      periodLabel = new Date(selectedDate).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
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
  const activeAgents = agents?.filter(a => a.status !== 'UNAVAILABLE').length || 0;

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Dashboard General
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Última actualización: {format(lastUpdate, "dd 'de' MMMM, HH:mm:ss", { locale: es })}
        </Typography>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={useRealtime}
                  onChange={(e) => setUseRealtime(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto-actualización (Tiempo Real)"
            />
          </Grid>

          {!useRealtime && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Fecha"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  variant="outlined"
                  onClick={() => setSelectedDate(today)}
                  fullWidth
                  size="small"
                >
                  Hoy
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  variant="outlined"
                  onClick={() => setSelectedDate(yesterday)}
                  fullWidth
                  size="small"
                >
                  Ayer
                </Button>
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={useRealtime ? 2 : 1}>
            <Button
              variant="contained"
              onClick={() => fetchData()}
              fullWidth
              size="small"
              disabled={loading}
            >
              Actualizar
            </Button>
          </Grid>
        </Grid>

        {!useRealtime && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Modo manual activado. Mostrando datos de: <strong>{periodLabel}</strong>
            {selectedDate === today && (todayData?.total_calls || 0) === 0 && (
              <> - No hay llamadas registradas aún para hoy.</>
            )}
          </Alert>
        )}
      </Paper>

      {/* Estadísticas principales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={`Llamadas ${periodLabel}`}
            value={mainData?.total_calls || 0}
            subtitle={`${week?.total_calls || 0} esta semana`}
            icon={Phone}
            color="primary"
            trend={callsTrend}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Contestadas"
            value={mainData?.answered_calls || 0}
            subtitle={`${mainData?.answer_rate || 0}% tasa de respuesta`}
            icon={CheckCircle}
            color="success"
            trend={answeredTrend}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Abandonadas"
            value={mainData?.abandoned_calls || 0}
            subtitle={`${Math.round((mainData?.abandoned_calls || 0) / (mainData?.total_calls || 1) * 100)}% del total`}
            icon={Cancel}
            color="error"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Agentes"
            value={activeAgents > 0 ? activeAgents : 4}
            subtitle={activeAgents > 0 ? `${agents?.length || 0} total` : '4 configurados'}
            icon={People}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Métricas adicionales */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Tiempo Promedio {periodLabel}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Duración de llamada:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {Math.round(mainData?.avg_duration || 0)} seg
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Tiempo de espera:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {Math.round(mainData?.avg_wait_time || 0)} seg
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Llamada más larga:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {Math.round(mainData?.max_talk_time || 0)} seg
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Resumen Semanal
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Total llamadas:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {week?.total_calls || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Contestadas:</Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {week?.answered_calls || 0} ({week?.answer_rate || 0}%)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Abandonadas:</Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">
                  {week?.abandoned_calls || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Gráfico 1: Llamadas por Hora del Día */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Llamadas Durante el Día (Por Hora)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  label={{ value: 'Hora del Día', position: 'insideBottom', offset: -5 }}
                  tickFormatter={(hour) => `${hour}:00h`}
                />
                <YAxis label={{ value: 'Cantidad de Llamadas', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  labelFormatter={(hour) => `Hora: ${hour}:00`}
                  formatter={(value, name) => [value, name]}
                />
                <Legend />
                <Bar dataKey="answered_calls" name="Contestadas" fill="#4caf50" />
                <Bar dataKey="missed_calls" name="No Contestadas" fill="#f44336" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico 2: Tasa de Abandono */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tasa de Abandono
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Atendidas', value: mainData?.answered_calls || 0, fill: '#4caf50' },
                    { name: 'Abandonadas', value: mainData?.abandoned_calls || 0, fill: '#ff9800' },
                    { name: 'Sin Respuesta', value: (mainData?.total_calls || 0) - (mainData?.answered_calls || 0) - (mainData?.abandoned_calls || 0), fill: '#f44336' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {mainData?.abandoned_calls && mainData?.total_calls
                  ? ((mainData.abandoned_calls / mainData.total_calls) * 100).toFixed(1)
                  : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tasa de Abandono Total
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Gráfico 3: Distribución de Tiempos de Espera */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tiempo de Espera Promedio por Hora (En Segundos)
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  label={{ value: 'Hora del Día', position: 'insideBottom', offset: -5 }}
                  tickFormatter={(hour) => `${hour}:00h`}
                />
                <YAxis
                  label={{ value: 'Tiempo de Espera (segundos)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  labelFormatter={(hour) => `Hora: ${hour}:00`}
                  formatter={(value) => [`${value} segundos`, 'Tiempo de Espera']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_wait_time"
                  name="Tiempo Espera Promedio (seg)"
                  stroke="#2196f3"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

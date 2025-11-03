// pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
  Phone,
  AccessTime,
  CalendarToday,
  GetApp,
  PictureAsPdf,
  TableChart,
} from '@mui/icons-material';
import { callsAPI, queuesAPI, agentsAPI } from '../services/api';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fechas - usar hasta ayer para incluir datos recientes
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Datos
  const [dailySummary, setDailySummary] = useState([]);
  const [hourlyDistribution, setHourlyDistribution] = useState([]);
  const [dispositionSummary, setDispositionSummary] = useState([]);
  const [queuesPerformance, setQueuesPerformance] = useState([]);
  const [agentsComparison, setAgentsComparison] = useState([]);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Cargar resumen diario
      const dailyResponse = await callsAPI.getDailySummary(startDate, endDate);
      setDailySummary(dailyResponse.data.data?.data || []);

      // Cargar distribución por hora
      const hourlyResponse = await callsAPI.getHourlyDistribution(startDate, endDate);
      setHourlyDistribution(hourlyResponse.data.data?.data || []);

      // Cargar resumen por disposición
      const dispositionResponse = await callsAPI.getDispositionSummary(startDate, endDate);
      setDispositionSummary(dispositionResponse.data.data?.data || []);

      // Cargar performance de colas
      const queuesResponse = await queuesAPI.getStatistics(startDate, endDate);
      setQueuesPerformance(queuesResponse.data.data?.queues || []);

      // Cargar comparación de agentes
      const agentsResponse = await agentsAPI.getComparison(startDate, endDate);
      setAgentsComparison(agentsResponse.data.data?.agents || []);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (current, previous) => {
    if (current > previous) return <TrendingUp color="success" />;
    if (current < previous) return <TrendingDown color="error" />;
    return null;
  };

  const handleExport = (reportType, format) => {
    const url = `http://192.168.11.3:8000/api/reports/export/${reportType}/${format}?start_date=${startDate}&end_date=${endDate}`;
    window.open(url, '_blank');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Reportes y Análisis
        </Typography>

        {/* Botones de exportación global */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<TableChart />}
            onClick={() => handleExport('general', 'excel')}
            size="small"
          >
            Excel General
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<PictureAsPdf />}
            onClick={() => handleExport('general', 'pdf')}
            size="small"
          >
            PDF General
          </Button>
        </Box>
      </Box>

      {/* Filtros de fecha */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label="Fecha inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Fecha fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              onClick={loadData}
              fullWidth
              disabled={loading}
            >
              Generar Reporte
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Resumen Diario */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <CalendarToday sx={{ verticalAlign: 'middle', mr: 1 }} />
                Resumen Diario
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<TableChart />}
                  onClick={() => handleExport('calls', 'excel')}
                >
                  Excel
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<PictureAsPdf />}
                  onClick={() => handleExport('calls', 'pdf')}
                >
                  PDF
                </Button>
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Contestadas</TableCell>
                    <TableCell align="right">Perdidas</TableCell>
                    <TableCell align="right">Duración Prom.</TableCell>
                    <TableCell align="right">Duración Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailySummary.slice(0, 10).map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>
                        {new Date(day.date).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell align="right">{day.total_calls}</TableCell>
                      <TableCell align="right">
                        <Chip label={day.answered_calls} color="success" size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={day.missed_calls} color="error" size="small" />
                      </TableCell>
                      <TableCell align="right">{Math.round(day.avg_duration)}s</TableCell>
                      <TableCell align="right">
                        {Math.floor(day.total_duration / 60)}m {day.total_duration % 60}s
                      </TableCell>
                    </TableRow>
                  ))}
                  {dailySummary.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No hay datos disponibles
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {dailySummary.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Mostrando 10 de {dailySummary.length} días
              </Typography>
            )}
          </Paper>

          {/* Distribución por Hora */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <AccessTime sx={{ verticalAlign: 'middle', mr: 1 }} />
              Distribución por Hora del Día
            </Typography>
            <Grid container spacing={1}>
              {hourlyDistribution.map((hour) => {
                const percentage = hourlyDistribution.length > 0
                  ? (hour.total_calls / Math.max(...hourlyDistribution.map(h => h.total_calls))) * 100
                  : 0;
                return (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={hour.hour}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">
                          {hour.hour}:00
                        </Typography>
                        <Typography variant="h6">
                          {hour.total_calls}
                        </Typography>
                        <Box sx={{
                          width: '100%',
                          height: 4,
                          bgcolor: 'grey.300',
                          borderRadius: 1,
                          mt: 0.5
                        }}>
                          <Box sx={{
                            width: `${percentage}%`,
                            height: '100%',
                            bgcolor: 'primary.main',
                            borderRadius: 1
                          }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {hour.answered_calls} contestadas
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          {/* Resumen por Tipo de Evento */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <Assessment sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Eventos del Sistema
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Evento</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="right">Porcentaje</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dispositionSummary.map((disp) => (
                        <TableRow key={disp.disposition}>
                          <TableCell>{disp.disposition}</TableCell>
                          <TableCell align="right">
                            <strong>{disp.count}</strong>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Box sx={{
                                width: `${disp.percentage}%`,
                                height: 8,
                                bgcolor: 'primary.main',
                                borderRadius: 1,
                                mr: 1,
                                minWidth: 20
                              }} />
                              {disp.percentage}%
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Top 5 Agentes */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Top 5 Agentes
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<TableChart />}
                      onClick={() => handleExport('agents', 'excel')}
                    >
                      Excel
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<PictureAsPdf />}
                      onClick={() => handleExport('agents', 'pdf')}
                    >
                      PDF
                    </Button>
                  </Box>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Ranking</TableCell>
                        <TableCell>Agente</TableCell>
                        <TableCell align="right">Llamadas</TableCell>
                        <TableCell align="right">Tiempo Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {agentsComparison.slice(0, 5).map((agent) => (
                        <TableRow key={agent.agent}>
                          <TableCell>
                            <Chip
                              label={`#${agent.rank}`}
                              color={agent.rank <= 3 ? 'primary' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <strong>{agent.agent}</strong>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              icon={<Phone />}
                              label={agent.total_calls}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {agent.total_talk_time_formatted}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Performance de Colas */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Performance de Colas
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<TableChart />}
                  onClick={() => handleExport('queues', 'excel')}
                >
                  Excel
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<PictureAsPdf />}
                  onClick={() => handleExport('queues', 'pdf')}
                >
                  PDF
                </Button>
              </Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cola</TableCell>
                    <TableCell align="right">Llamadas</TableCell>
                    <TableCell align="right">Tasa Respuesta</TableCell>
                    <TableCell align="right">Nivel Servicio</TableCell>
                    <TableCell align="right">Espera Prom.</TableCell>
                    <TableCell align="right">Conversación Prom.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queuesPerformance.map((queue) => (
                    <TableRow key={queue.queue_name}>
                      <TableCell><strong>{queue.queue_name}</strong></TableCell>
                      <TableCell align="right">{queue.total_calls}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${queue.answer_rate}%`}
                          color={queue.answer_rate >= 80 ? 'success' : queue.answer_rate >= 60 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${queue.service_level}%`}
                          color={queue.service_level >= 80 ? 'success' : queue.service_level >= 60 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{Math.round(queue.avg_wait_time)}s</TableCell>
                      <TableCell align="right">{Math.round(queue.avg_talk_time)}s</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default Reports;

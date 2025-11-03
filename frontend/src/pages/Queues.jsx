// pages/Queues.jsx
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
} from '@mui/material';
import {
  Queue as QueueIcon,
  TrendingUp,
  Phone,
  Timer,
  CheckCircle,
} from '@mui/icons-material';
import { queuesAPI } from '../services/api';

const Queues = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fechas - fecha actual
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Datos
  const [queuesList, setQueuesList] = useState([]);
  const [queuesStats, setQueuesStats] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState([]);

  useEffect(() => {
    loadData();
    // Actualizar estado en tiempo real cada 30 segundos
    const interval = setInterval(() => {
      loadRealtimeStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Cargar lista de colas
      const listResponse = await queuesAPI.getList();
      const queuesData = listResponse.data.data;
      setQueuesList(queuesData.queues || queuesData || []);

      // Cargar estadísticas
      const statsResponse = await queuesAPI.getStatistics(startDate, endDate);
      setQueuesStats(statsResponse.data.data.queues || []);

      // Cargar estado en tiempo real
      await loadRealtimeStatus();
    } catch (err) {
      console.error('Error loading queues:', err);
      setError(err.message || 'Error al cargar las colas');
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeStatus = async () => {
    try {
      const response = await queuesAPI.getRealtime();
      setRealtimeStatus(response.data.data.queues || []);
    } catch (err) {
      console.error('Error loading realtime status:', err);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Colas
      </Typography>

      {/* Estado en tiempo real */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Estado en Tiempo Real (últimos 5 minutos)
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {realtimeStatus.map((queue) => (
          <Grid item xs={12} sm={6} md={4} key={queue.queue_name}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <QueueIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">{queue.queue_name}</Typography>
                </Box>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Agentes disponibles
                    </Typography>
                    <Typography variant="h6">
                      {queue.available_agents}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Completadas 5min
                    </Typography>
                    <Typography variant="h6">
                      {queue.calls_completed_5min}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Abandonadas 5min
                    </Typography>
                    <Typography variant="h6" color="error">
                      {queue.calls_abandoned_5min}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Nivel de servicio
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {queue.service_level_5min}%
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {realtimeStatus.length === 0 && !loading && (
          <Grid item xs={12}>
            <Alert severity="info">
              No hay actividad reciente en las colas
            </Alert>
          </Grid>
        )}
      </Grid>

      {/* Filtros de fecha */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Estadísticas Históricas
        </Typography>
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
              Buscar
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

      {/* Tabla de estadísticas */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cola</TableCell>
                <TableCell align="right">Total Llamadas</TableCell>
                <TableCell align="right">Contestadas</TableCell>
                <TableCell align="right">Abandonadas</TableCell>
                <TableCell align="right">Tasa Respuesta</TableCell>
                <TableCell align="right">Tasa Abandono</TableCell>
                <TableCell align="right">Tiempo Espera Prom.</TableCell>
                <TableCell align="right">Tiempo Conversación Prom.</TableCell>
                <TableCell align="right">Nivel de Servicio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queuesStats.map((queue) => (
                <TableRow key={queue.queue_name}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <QueueIcon fontSize="small" sx={{ mr: 1 }} />
                      <strong>{queue.queue_name}</strong>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{queue.total_calls}</TableCell>
                  <TableCell align="right">
                    <Chip
                      icon={<CheckCircle />}
                      label={queue.answered_calls}
                      color="success"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={queue.abandoned_calls}
                      color="error"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <strong>{queue.answer_rate}%</strong>
                  </TableCell>
                  <TableCell align="right">
                    {queue.abandon_rate}%
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Timer fontSize="small" sx={{ mr: 0.5 }} />
                      {Math.round(queue.avg_wait_time)}s
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Phone fontSize="small" sx={{ mr: 0.5 }} />
                      {Math.round(queue.avg_talk_time)}s
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
                      {queue.service_level}%
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {queuesStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No hay estadísticas disponibles para el período seleccionado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Lista de colas disponibles */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Colas Configuradas
        </Typography>
        <Grid container spacing={2}>
          {queuesList.map((queue) => (
            <Grid item xs={12} sm={6} md={4} key={queue.queue_name}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    {queue.queue_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {queue.total_agents} agente(s) asignado(s)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default Queues;

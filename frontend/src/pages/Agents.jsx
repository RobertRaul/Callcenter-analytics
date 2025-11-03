// pages/Agents.jsx
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
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  Person,
  Phone,
  Timer,
  CheckCircle,
  TrendingUp,
  AccessTime,
} from '@mui/icons-material';
import { agentsAPI } from '../services/api';

const Agents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fechas - usar hasta ayer para incluir datos recientes
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Datos
  const [agentsList, setAgentsList] = useState([]);
  const [agentsStats, setAgentsStats] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState([]);
  const [comparison, setComparison] = useState([]);

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
      // Cargar lista de agentes
      const listResponse = await agentsAPI.getList();
      const agentsData = listResponse.data.data;
      setAgentsList(agentsData.agents || agentsData || []);

      // Cargar estadísticas
      const statsResponse = await agentsAPI.getStatistics(startDate, endDate);
      setAgentsStats(statsResponse.data.data.agents || []);

      // Cargar comparación
      const compResponse = await agentsAPI.getComparison(startDate, endDate);
      setComparison(compResponse.data.data.agents || []);

      // Cargar estado en tiempo real
      await loadRealtimeStatus();
    } catch (err) {
      console.error('Error loading agents:', err);
      setError(err.message || 'Error al cargar los agentes');
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeStatus = async () => {
    try {
      const response = await agentsAPI.getRealtime();
      setRealtimeStatus(response.data.data.agents || []);
    } catch (err) {
      console.error('Error loading realtime status:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'IN_CALL':
        return 'error';
      case 'AVAILABLE':
        return 'success';
      case 'PAUSED':
        return 'warning';
      case 'UNAVAILABLE':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'IN_CALL': 'En llamada',
      'AVAILABLE': 'Disponible',
      'PAUSED': 'Pausado',
      'UNAVAILABLE': 'No disponible',
      'UNKNOWN': 'Desconocido'
    };
    return statusMap[status] || status;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Agentes
      </Typography>

      {/* Estado en tiempo real */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Estado en Tiempo Real
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {realtimeStatus.map((agent) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={agent.agent}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {agent.agent}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cola: {agent.queue}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={getStatusText(agent.status)}
                  color={getStatusColor(agent.status)}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Última actividad: {new Date(agent.last_activity).toLocaleTimeString('es-ES')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {realtimeStatus.length === 0 && !loading && (
          <Grid item xs={12}>
            <Alert severity="info">
              No hay agentes activos actualmente
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

      {/* Comparación de Agentes */}
      {comparison.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ranking de Agentes
          </Typography>
          <Grid container spacing={2}>
            {comparison.slice(0, 5).map((agent, index) => (
              <Grid item xs={12} key={agent.agent}>
                <Card variant="outlined">
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>
                        <Avatar sx={{ bgcolor: index < 3 ? 'primary.main' : 'grey.500' }}>
                          #{agent.rank}
                        </Avatar>
                      </Grid>
                      <Grid item xs>
                        <Typography variant="h6">
                          {agent.agent}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {agent.total_calls} llamadas | {agent.total_talk_time_formatted} total
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={agent.efficiency}
                          sx={{ mt: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Eficiencia: {agent.efficiency}%
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Typography variant="h5" color="primary">
                          {agent.total_calls}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          llamadas
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Tabla de estadísticas detalladas */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agente</TableCell>
                <TableCell align="right">Total Llamadas</TableCell>
                <TableCell align="right">Completadas</TableCell>
                <TableCell align="right">Tiempo Total</TableCell>
                <TableCell align="right">Prom. Conversación</TableCell>
                <TableCell align="right">Prom. Espera</TableCell>
                <TableCell align="right">Tiempo Más Largo</TableCell>
                <TableCell align="right">Tiempo Más Corto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agentsStats.map((agent) => (
                <TableRow key={agent.agent}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1, width: 32, height: 32, bgcolor: 'primary.main' }}>
                        <Person fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          <strong>{agent.agent}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent.agent_full}
                        </Typography>
                      </Box>
                    </Box>
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
                    <Chip
                      icon={<CheckCircle />}
                      label={agent.completed_calls}
                      color="success"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <AccessTime fontSize="small" sx={{ mr: 0.5 }} />
                      <strong>{agent.total_talk_time_formatted}</strong>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(agent.avg_talk_time)}s
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Timer fontSize="small" sx={{ mr: 0.5 }} />
                      {Math.round(agent.avg_wait_before_answer)}s
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {agent.max_talk_time}s
                  </TableCell>
                  <TableCell align="right">
                    {agent.min_talk_time}s
                  </TableCell>
                </TableRow>
              ))}
              {agentsStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No hay estadísticas disponibles para el período seleccionado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Lista de agentes disponibles */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Agentes Configurados
        </Typography>
        <Grid container spacing={2}>
          {agentsList.map((agent) => (
            <Grid item xs={12} sm={6} md={4} key={agent.agent}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        {agent.agent}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {agent.agent_full}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Colas: {agent.queues.join(', ')}
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

export default Agents;

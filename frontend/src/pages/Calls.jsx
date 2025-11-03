// pages/Calls.jsx
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
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  TablePagination,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Phone,
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  PlayArrow,
  GetApp,
  Stop,
  VolumeUp,
} from '@mui/icons-material';
import { callsAPI, recordingsAPI } from '../services/api';

const Calls = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fechas - usar hasta ayer para incluir datos recientes
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Datos
  const [callsList, setCallsList] = useState([]);
  const [callsByAgent, setCallsByAgent] = useState([]);
  const [statistics, setStatistics] = useState(null);

  // Estado del reproductor de audio
  const [playingCallId, setPlayingCallId] = useState(null);

  // Paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Cargar datos según la pestaña activa
      if (tabValue === 0) {
        // Lista de llamadas - traer más registros para paginación
        const response = await callsAPI.getList(startDate, endDate, null, 500);
        // Filtrar anexos telefónicos (números cortos <= 4 dígitos)
        const filteredCalls = (response.data.data.calls || []).filter(call => {
          const phone = call.phone_number;
          return phone && phone !== 'N/A' && phone.length > 4;
        });
        setCallsList(filteredCalls);
        setPage(0); // Reset página al cargar nuevos datos
      } else if (tabValue === 1) {
        // Llamadas por agente
        const response = await callsAPI.getByAgent(startDate, endDate);
        setCallsByAgent(response.data.data.agents || []);
      }

      // Siempre cargar estadísticas
      const statsResponse = await callsAPI.getStatistics(startDate, endDate);
      setStatistics(statsResponse.data.data);
    } catch (err) {
      console.error('Error loading calls:', err);
      setError(err.message || 'Error al cargar las llamadas');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
      case 'ANSWERED':
        return 'success';
      case 'ABANDONED':
        return 'error';
      case 'TIMEOUT':
      case 'EXITED_WITH_KEY':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'COMPLETED': 'Completada',
      'ANSWERED': 'Contestada',
      'ABANDONED': 'Abandonada',
      'TIMEOUT': 'Tiempo agotado',
      'EXITED_WITH_KEY': 'Salida con tecla',
      'ENTERED': 'En cola',
      'UNKNOWN': 'Desconocido'
    };
    return statusMap[status] || status;
  };

  const getEventText = (event) => {
    const eventMap = {
      'ENTERQUEUE': 'Llamada Entrante',
      'CONNECT': 'Conectada',
      'COMPLETEAGENT': 'Finalizada por Agente',
      'COMPLETECALLER': 'Finalizada por Cliente',
      'RINGNOANSWER': 'Sin Respuesta',
      'RINGCANCELED': 'Cancelada',
      'ABANDON': 'Abandonada',
      'EXITWITHTIMEOUT': 'Timeout',
      'EXITWITHKEY': 'Salida por Teclado',
      'TRANSFER': 'Transferida',
      'BLINDTRANSFER': 'Transfer. Ciega',
      'ATTENDEDTRANSFER': 'Transfer. Atendida',
      'DID': 'Número Marcado',
      'ADDMEMBER': 'Agente Agregado',
      'REMOVEMEMBER': 'Agente Removido',
      'PAUSE': 'En Pausa',
      'UNPAUSE': 'Activo',
      'AGENTDUMP': 'Desconectado',
      'SYSCOMPAT': 'Compatibilidad',
      'CONFIGRELOAD': 'Recarga Config.',
      'QUEUESTART': 'Inicio Cola'
    };
    return eventMap[event] || event;
  };

  const handlePlayRecording = (callid) => {
    // Toggle reproductor
    if (playingCallId === callid) {
      setPlayingCallId(null);
    } else {
      setPlayingCallId(callid);
    }
  };

  const handleDownloadRecording = (callid, calldate) => {
    const date = calldate.split('T')[0];
    const downloadUrl = recordingsAPI.getDownloadUrl(callid, date);
    window.open(downloadUrl, '_blank');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Llamadas
      </Typography>

      {/* Estadísticas */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Phone color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total</Typography>
                </Box>
                <Typography variant="h4">{statistics.total_calls}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Llamadas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Contestadas</Typography>
                </Box>
                <Typography variant="h4">{statistics.answered_calls}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {statistics.answer_rate}% tasa de respuesta
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Cancel color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Abandonadas</Typography>
                </Box>
                <Typography variant="h4">{statistics.abandoned_calls}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Llamadas perdidas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Schedule color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Duración</Typography>
                </Box>
                <Typography variant="h4">{Math.round(statistics.avg_duration)}s</Typography>
                <Typography variant="body2" color="text.secondary">
                  Promedio de conversación
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

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

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Lista de Llamadas" />
          <Tab label="Por Agente" />
        </Tabs>
      </Paper>

      {/* Contenido de tabs */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Tab 0: Lista de llamadas */}
          {tabValue === 0 && (
            <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha/Hora</TableCell>
                    <TableCell>Número</TableCell>
                    <TableCell>Call ID</TableCell>
                    <TableCell>Cola</TableCell>
                    <TableCell>Agente</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Espera</TableCell>
                    <TableCell align="right">Conversación</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Grabación</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {callsList
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((call, index) => (
                    <React.Fragment key={`${call.callid}-${index}`}>
                      <TableRow>
                        <TableCell>
                          {new Date(call.calldate).toLocaleString('es-ES', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Phone fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                            <strong>{call.phone_number}</strong>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75em' }}>
                          ...{call.callid.substring(call.callid.length - 8)}
                        </TableCell>
                        <TableCell>{call.queuename}</TableCell>
                        <TableCell>
                          {call.agent !== 'N/A' ? (
                            <strong>{call.agent}</strong>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(call.status)}
                            color={getStatusColor(call.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">{call.wait_time_formatted}</TableCell>
                        <TableCell align="right">{call.talk_time_formatted}</TableCell>
                        <TableCell align="right">{call.total_time_formatted}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color={playingCallId === call.callid ? 'error' : 'primary'}
                              onClick={() => handlePlayRecording(call.callid)}
                              title={playingCallId === call.callid ? 'Detener' : 'Reproducir'}
                            >
                              {playingCallId === call.callid ? <Stop /> : <VolumeUp />}
                            </IconButton>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => handleDownloadRecording(call.callid, call.calldate)}
                              title="Descargar"
                            >
                              <GetApp />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                      {/* Reproductor inline */}
                      <TableRow>
                        <TableCell colSpan={10} sx={{ py: 0, borderBottom: 'none' }}>
                          <Collapse in={playingCallId === call.callid} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <audio
                                controls
                                autoPlay
                                style={{ width: '100%' }}
                                src={recordingsAPI.getStreamUrl(call.callid, call.calldate.split('T')[0])}
                              >
                                Tu navegador no soporta el elemento de audio.
                              </audio>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  {callsList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        No hay llamadas en el rango de fechas seleccionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={callsList.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
            </>
          )}

          {/* Tab 1: Por agente */}
          {tabValue === 1 && (
            <Grid container spacing={2}>
              {callsByAgent.map((agentData) => (
                <Grid item xs={12} md={6} key={agentData.agent}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ fontSize: 40, mr: 1, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="h6">
                              Agente {agentData.agent}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {agentData.agent_full}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          icon={<Phone />}
                          label={`${agentData.total_calls} llamadas`}
                          color="primary"
                        />
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                            <Typography variant="h5" sx={{ color: 'success.dark', fontWeight: 'bold' }}>
                              {agentData.completed_calls}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'success.dark' }}>
                              Completadas
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                            <Typography variant="h5" sx={{ color: 'info.dark', fontWeight: 'bold' }}>
                              {agentData.total_talk_time_formatted}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'info.dark' }}>
                              Tiempo Total
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                            <Typography variant="h5" sx={{ color: 'warning.dark', fontWeight: 'bold' }}>
                              {Math.round(agentData.avg_talk_time)}s
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'warning.dark' }}>
                              Promedio
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Últimas {Math.min(5, agentData.calls.length)} llamadas:
                      </Typography>
                      {agentData.calls.slice(0, 5).map((call, index) => (
                        <Box
                          key={`${call.callid}-${index}`}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 0.5,
                            borderBottom: index < 4 ? '1px solid' : 'none',
                            borderColor: 'divider'
                          }}
                        >
                          <Typography variant="caption">
                            {new Date(call.time).toLocaleString('es-ES', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                          <Chip label={getEventText(call.event)} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                          <Typography variant="caption" fontWeight="bold">
                            {call.talk_time_formatted}
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {callsByAgent.length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No hay datos de agentes en el rango de fechas seleccionado
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default Calls;

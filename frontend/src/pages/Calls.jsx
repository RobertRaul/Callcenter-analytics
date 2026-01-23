// pages/Calls.jsx - Migrado a Ant Design
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  DatePicker,
  Button,
  Tabs,
  Tag,
  Spin,
  Alert,
  Typography,
  Space,
  Statistic,
  Avatar,
  Collapse
} from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SyncOutlined,
  SoundOutlined,
  DownloadOutlined,
  StopOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { callsAPI, recordingsAPI } from '../services/api';
import { MACSA_COLORS } from '../config/theme';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Panel } = Collapse;

const Calls = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fechas
  const today = dayjs();
  const [dateRange, setDateRange] = useState([today, today]);

  // Datos
  const [callsList, setCallsList] = useState([]);
  const [callsByAgent, setCallsByAgent] = useState([]);
  const [statistics, setStatistics] = useState(null);

  // Estado del reproductor de audio
  const [playingCallId, setPlayingCallId] = useState(null);
  const [playingRowKey, setPlayingRowKey] = useState(null);

  useEffect(() => {
    loadData();
  }, [dateRange, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // Cargar datos según la pestaña activa
      if (activeTab === '1') {
        // Lista de llamadas - traer más registros para paginación
        const response = await callsAPI.getList(startDate, endDate, null, 500);
        // Filtrar anexos telefónicos (números cortos <= 4 dígitos)
        const filteredCalls = (response.data.data.calls || []).filter(call => {
          const phone = call.phone_number;
          return phone && phone !== 'N/A' && phone.length > 4;
        });
        setCallsList(filteredCalls);
      } else if (activeTab === '2') {
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

  const handlePlayRecording = (callid, rowKey) => {
    // Toggle reproductor
    if (playingCallId === callid) {
      setPlayingCallId(null);
      setPlayingRowKey(null);
    } else {
      setPlayingCallId(callid);
      setPlayingRowKey(rowKey);
    }
  };

  const handleDownloadRecording = (callid, calldate) => {
    const date = calldate.split('T')[0];
    const downloadUrl = recordingsAPI.getDownloadUrl(callid, date);
    window.open(downloadUrl, '_blank');
  };

  // Columnas de la tabla para Lista de Llamadas
  const callsColumns = [
    {
      title: 'Fecha/Hora',
      dataIndex: 'calldate',
      key: 'calldate',
      render: (date) => new Date(date).toLocaleString('es-ES', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    {
      title: 'Número',
      dataIndex: 'phone_number',
      key: 'phone_number',
      render: (phone) => (
        <Space>
          <PhoneOutlined style={{ color: MACSA_COLORS.blue }} />
          <strong>{phone}</strong>
        </Space>
      )
    },
    {
      title: 'Call ID',
      dataIndex: 'callid',
      key: 'callid',
      render: (callid) => (
        <Text code style={{ fontSize: 11 }}>
          ...{callid.substring(callid.length - 8)}
        </Text>
      )
    },
    {
      title: 'Cola',
      dataIndex: 'queuename',
      key: 'queuename'
    },
    {
      title: 'Agente',
      dataIndex: 'agent',
      key: 'agent',
      render: (agent) => agent !== 'N/A' ? <strong>{agent}</strong> : '-'
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Espera',
      dataIndex: 'wait_time_formatted',
      key: 'wait_time_formatted',
      align: 'right'
    },
    {
      title: 'Conversación',
      dataIndex: 'talk_time_formatted',
      key: 'talk_time_formatted',
      align: 'right'
    },
    {
      title: 'Total',
      dataIndex: 'total_time_formatted',
      key: 'total_time_formatted',
      align: 'right'
    },
    {
      title: 'Grabación',
      key: 'recording',
      align: 'center',
      render: (_, record, index) => {
        const rowKey = `${record.callid}-${index}`;
        return (
          <Space>
            <Button
              type={playingCallId === record.callid ? 'primary' : 'default'}
              danger={playingCallId === record.callid}
              size="small"
              icon={playingCallId === record.callid ? <StopOutlined /> : <SoundOutlined />}
              onClick={() => handlePlayRecording(record.callid, rowKey)}
              title={playingCallId === record.callid ? 'Detener' : 'Reproducir'}
            />
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadRecording(record.callid, record.calldate)}
              title="Descargar"
            />
          </Space>
        );
      }
    }
  ];

  // Renderizar reproductor expandible
  const expandedRowRender = (record) => {
    // Solo renderizar si este es el registro que se está reproduciendo
    if (playingCallId !== record.callid) return null;

    const date = record.calldate.split('T')[0];
    const streamUrl = recordingsAPI.getStreamUrl(record.callid, date);

    return (
      <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <Text strong style={{ display: 'block', marginBottom: '8px', color: MACSA_COLORS.blue }}>
          Reproduciendo grabación: {record.callid}
        </Text>
        <audio
          controls
          autoPlay
          style={{ width: '100%' }}
          src={streamUrl}
          onError={(e) => {
            console.error('Error loading audio:', e);
            console.log('Stream URL:', streamUrl);
          }}
        >
          Tu navegador no soporta el elemento de audio.
        </audio>
      </div>
    );
  };

  // Items de tabs
  const tabItems = [
    {
      key: '1',
      label: 'Lista de Llamadas',
      children: (
        <Card>
          <Table
            columns={callsColumns}
            dataSource={callsList}
            rowKey={(record, index) => `${record.callid}-${index}`}
            loading={loading}
            locale={{
              emptyText: 'No hay llamadas en el rango de fechas seleccionado'
            }}
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              pageSizeOptions: ['10', '25', '50', '100'],
              showTotal: (total) => `Total: ${total} llamadas`
            }}
            expandable={{
              expandedRowRender: playingRowKey ? expandedRowRender : undefined,
              expandedRowKeys: playingRowKey ? [playingRowKey] : [],
              expandIcon: () => null
            }}
          />
        </Card>
      )
    },
    {
      key: '2',
      label: 'Por Agente',
      children: (
        <Row gutter={[16, 16]}>
          {callsByAgent.map((agentData) => (
            <Col xs={24} md={12} key={agentData.agent}>
              <Card>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: MACSA_COLORS.blue }} />
                      <div>
                        <div><Text strong style={{ fontSize: 16 }}>Agente {agentData.agent}</Text></div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{agentData.agent_full}</Text>
                      </div>
                    </Space>
                    <Tag icon={<PhoneOutlined />} color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                      {agentData.total_calls} llamadas
                    </Tag>
                  </div>

                  {/* Stats */}
                  <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
                    <Col span={8}>
                      <Card size="small" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', textAlign: 'center' }}>
                        <Statistic
                          value={agentData.completed_calls}
                          valueStyle={{ color: MACSA_COLORS.green, fontSize: 20, fontWeight: 'bold' }}
                        />
                        <Text style={{ fontSize: 11, color: MACSA_COLORS.green }}>Completadas</Text>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', textAlign: 'center' }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: MACSA_COLORS.blue }}>{agentData.total_talk_time_formatted}</Text>
                        <br />
                        <Text style={{ fontSize: 11, color: MACSA_COLORS.blue }}>Tiempo Total</Text>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ backgroundColor: '#fff7e6', border: '1px solid #ffd591', textAlign: 'center' }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: MACSA_COLORS.gold }}>{Math.round(agentData.avg_talk_time)}s</Text>
                        <br />
                        <Text style={{ fontSize: 11, color: MACSA_COLORS.gold }}>Promedio</Text>
                      </Card>
                    </Col>
                  </Row>

                  {/* Últimas llamadas */}
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Últimas {Math.min(5, agentData.calls.length)} llamadas:
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      {agentData.calls.slice(0, 5).map((call, index) => (
                        <div
                          key={`${call.callid}-${index}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 0',
                            borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none'
                          }}
                        >
                          <Text style={{ fontSize: 11 }}>
                            {new Date(call.time).toLocaleString('es-ES', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                          <Tag style={{ fontSize: 10, margin: 0 }}>{getEventText(call.event)}</Tag>
                          <Text strong style={{ fontSize: 11 }}>{call.talk_time_formatted}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
          {callsByAgent.length === 0 && !loading && (
            <Col span={24}>
              <Alert
                message="No hay datos de agentes en el rango de fechas seleccionado"
                type="info"
                showIcon
              />
            </Col>
          )}
        </Row>
      )
    }
  ];

  return (
    <div>
      <Title level={3}>Llamadas</Title>

      {/* Estadísticas */}
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total"
                value={statistics.total_calls}
                prefix={<PhoneOutlined style={{ color: MACSA_COLORS.blue }} />}
                suffix="Llamadas"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Contestadas"
                value={statistics.answered_calls}
                prefix={<CheckCircleOutlined style={{ color: MACSA_COLORS.green }} />}
                suffix={
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    ({statistics.answer_rate}% tasa)
                  </Text>
                }
                valueStyle={{ color: MACSA_COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Abandonadas"
                value={statistics.abandoned_calls}
                prefix={<CloseCircleOutlined style={{ color: MACSA_COLORS.red }} />}
                suffix="Llamadas perdidas"
                valueStyle={{ color: MACSA_COLORS.red }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Duración"
                value={Math.round(statistics.avg_duration)}
                prefix={<ClockCircleOutlined style={{ color: MACSA_COLORS.blue }} />}
                suffix="seg promedio"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filtros de fecha */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates || [today, today])}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              onClick={() => setDateRange([today, today])}
              block
            >
              Hoy
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={loadData}
              loading={loading}
              block
            >
              Buscar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Error */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default Calls;

// Comparativa de Períodos - Comparar rendimiento entre dos períodos
import React, { useState } from 'react';
import { Card, Row, Col, DatePicker, Button, Table, Statistic, Alert, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, SyncOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import BarChartComponent from '../../components/charts/BarChartComponent';
import { MACSA_COLORS } from '../../config/theme';

const { RangePicker } = DatePicker;

export default function ComparativaPeriodos() {
  const [periodo1, setPeriodo1] = useState([dayjs().subtract(14, 'days'), dayjs().subtract(8, 'days')]);
  const [periodo2, setPeriodo2] = useState([dayjs().subtract(7, 'days'), dayjs()]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComparison = async () => {
    if (!periodo1 || !periodo2) {
      setError('Por favor selecciona ambos períodos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/analisis/comparativa-periodos`, {
        params: {
          periodo1_inicio: periodo1[0].format('YYYY-MM-DD'),
          periodo1_fin: periodo1[1].format('YYYY-MM-DD'),
          periodo2_inicio: periodo2[0].format('YYYY-MM-DD'),
          periodo2_fin: periodo2[1].format('YYYY-MM-DD')
        }
      });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error fetching comparison:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const renderTrend = (trend, changePct) => {
    const isPositive = trend === 'up';
    const color = isPositive ? MACSA_COLORS.green : MACSA_COLORS.red;

    return (
      <span style={{ color, fontWeight: 'bold' }}>
        {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {Math.abs(changePct).toFixed(1)}%
      </span>
    );
  };

  const columns = [
    {
      title: 'Métrica',
      dataIndex: 'metric',
      key: 'metric',
      width: '25%'
    },
    {
      title: `Período 1`,
      dataIndex: 'periodo1',
      key: 'periodo1',
      align: 'right'
    },
    {
      title: `Período 2`,
      dataIndex: 'periodo2',
      key: 'periodo2',
      align: 'right'
    },
    {
      title: 'Cambio',
      dataIndex: 'change',
      key: 'change',
      align: 'center',
      render: (_, record) => renderTrend(record.trend, record.changePct)
    }
  ];

  let tableData = [];
  if (data && data.comparison) {
    const comp = data.comparison;
    tableData = [
      {
        key: '1',
        metric: 'Total Llamadas',
        periodo1: comp.total_calls?.periodo1 || 0,
        periodo2: comp.total_calls?.periodo2 || 0,
        trend: comp.total_calls?.trend,
        changePct: comp.total_calls?.change_pct || 0
      },
      {
        key: '2',
        metric: 'Llamadas Contestadas',
        periodo1: comp.answered_calls?.periodo1 || 0,
        periodo2: comp.answered_calls?.periodo2 || 0,
        trend: comp.answered_calls?.trend,
        changePct: comp.answered_calls?.change_pct || 0
      },
      {
        key: '3',
        metric: 'Llamadas Abandonadas',
        periodo1: comp.abandoned_calls?.periodo1 || 0,
        periodo2: comp.abandoned_calls?.periodo2 || 0,
        trend: comp.abandoned_calls?.trend,
        changePct: comp.abandoned_calls?.change_pct || 0
      },
      {
        key: '4',
        metric: 'Tasa de Respuesta (%)',
        periodo1: comp.answer_rate?.periodo1?.toFixed(1) || 0,
        periodo2: comp.answer_rate?.periodo2?.toFixed(1) || 0,
        trend: comp.answer_rate?.trend,
        changePct: comp.answer_rate?.change_pct || 0
      },
      {
        key: '5',
        metric: 'Tiempo Espera Promedio (seg)',
        periodo1: comp.avg_wait_time?.periodo1?.toFixed(0) || 0,
        periodo2: comp.avg_wait_time?.periodo2?.toFixed(0) || 0,
        trend: comp.avg_wait_time?.trend,
        changePct: comp.avg_wait_time?.change_pct || 0
      }
    ];
  }

  // Datos para gráfica comparativa
  const chartData = data ? {
    labels: ['Total Llamadas', 'Contestadas', 'Abandonadas'],
    datasets: [
      {
        label: 'Período 1',
        data: [
          data.comparison.total_calls?.periodo1 || 0,
          data.comparison.answered_calls?.periodo1 || 0,
          data.comparison.abandoned_calls?.periodo1 || 0
        ],
        backgroundColor: MACSA_COLORS.blue
      },
      {
        label: 'Período 2',
        data: [
          data.comparison.total_calls?.periodo2 || 0,
          data.comparison.answered_calls?.periodo2 || 0,
          data.comparison.abandoned_calls?.periodo2 || 0
        ],
        backgroundColor: MACSA_COLORS.gold
      }
    ]
  } : null;

  return (
    <div>
      {/* Selectores de período */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={10}>
          <Card size="small" title="Período 1" style={{ backgroundColor: '#f0f5ff' }}>
            <RangePicker
              value={periodo1}
              onChange={setPeriodo1}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
            />
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card size="small" title="Período 2" style={{ backgroundColor: '#fffbe6' }}>
            <RangePicker
              value={periodo2}
              onChange={setPeriodo2}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
            />
          </Card>
        </Col>

        <Col xs={24} md={4}>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={fetchComparison}
            size="large"
            block
            style={{ height: '100%', minHeight: 40 }}
          >
            Comparar
          </Button>
        </Col>
      </Row>

      {loading && (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Comparando períodos..." />
        </div>
      )}

      {error && (
        <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 24 }} />
      )}

      {data && !loading && (
        <>
          {/* Tabla comparativa */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24}>
              <Card title="Comparación Detallada" bordered={false}>
                <Table
                  columns={columns}
                  dataSource={tableData}
                  pagination={false}
                  size="middle"
                />
              </Card>
            </Col>
          </Row>

          {/* Gráfica comparativa */}
          {chartData && (
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Card title="Comparación Visual" bordered={false}>
                  <BarChartComponent data={chartData} height={350} />
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}
    </div>
  );
}

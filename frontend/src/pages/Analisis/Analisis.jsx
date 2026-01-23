// Análisis - Módulo de reportes ejecutivos y visuales
import React from 'react';
import { Tabs } from 'antd';
import {
  DashboardOutlined,
  LineChartOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  WarningOutlined,
  FireOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import DashboardEjecutivo from './DashboardEjecutivo';
import ComparativaPeriodos from './ComparativaPeriodos';
import PatronesHorarios from './PatronesHorarios';
import RankingAgentes from './RankingAgentes';
import AnalisisAbandono from './AnalisisAbandono';
import MapaCalorSemanal from './MapaCalorSemanal';
import SLACumplimiento from './SLACumplimiento';

export default function Analisis() {
  const items = [
    {
      key: '1',
      label: (
        <span>
          <DashboardOutlined /> Dashboard Ejecutivo
        </span>
      ),
      children: <DashboardEjecutivo />
    },
    {
      key: '2',
      label: (
        <span>
          <LineChartOutlined /> Comparativa de Períodos
        </span>
      ),
      children: <ComparativaPeriodos />
    },
    {
      key: '3',
      label: (
        <span>
          <ClockCircleOutlined /> Patrones Horarios
        </span>
      ),
      children: <PatronesHorarios />
    },
    {
      key: '4',
      label: (
        <span>
          <TrophyOutlined /> Ranking de Agentes
        </span>
      ),
      children: <RankingAgentes />
    },
    {
      key: '5',
      label: (
        <span>
          <WarningOutlined /> Análisis de Abandono
        </span>
      ),
      children: <AnalisisAbandono />
    },
    {
      key: '6',
      label: (
        <span>
          <FireOutlined /> Mapa de Calor Semanal
        </span>
      ),
      children: <MapaCalorSemanal />
    },
    {
      key: '7',
      label: (
        <span>
          <CheckCircleOutlined /> SLA y Cumplimiento
        </span>
      ),
      children: <SLACumplimiento />
    }
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Análisis y Reportes Ejecutivos</h1>
      <p style={{ marginBottom: 24, color: '#666' }}>
        7 reportes avanzados con métricas clave, análisis inteligente y recomendaciones automáticas para optimizar el rendimiento del call center
      </p>
      <Tabs
        defaultActiveKey="1"
        size="large"
        items={items}
        style={{ minHeight: 'calc(100vh - 250px)' }}
      />
    </div>
  );
}

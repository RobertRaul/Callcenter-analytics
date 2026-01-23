// Componente reutilizable para gráficas de dona/pie con Chart.js
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { chartDefaults } from '../../config/chartDefaults';

// Registrar componentes de Chart.js necesarios
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

/**
 * Componente de gráfica de dona (doughnut)
 * @param {Object} data - Datos en formato Chart.js { labels: [], datasets: [] }
 * @param {Object} options - Opciones adicionales para personalizar la gráfica
 * @param {number} height - Altura del contenedor en pixels (default: 300)
 */
export default function DoughnutChartComponent({ data, options = {}, height = 300 }) {
  const mergedOptions = {
    ...chartDefaults,
    ...options,
    plugins: {
      ...chartDefaults.plugins,
      ...options.plugins,
      legend: {
        ...chartDefaults.plugins.legend,
        ...(options.plugins?.legend || {}),
        position: options.plugins?.legend?.position || 'bottom'
      }
    },
    // Las gráficas circulares no necesitan scales
    scales: undefined
  };

  return (
    <div style={{ height: `${height}px`, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Doughnut data={data} options={mergedOptions} />
    </div>
  );
}

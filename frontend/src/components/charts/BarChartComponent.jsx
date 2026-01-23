// Componente reutilizable para gráficas de barras con Chart.js
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { chartDefaults } from '../../config/chartDefaults';

// Registrar componentes de Chart.js necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Componente de gráfica de barras
 * @param {Object} data - Datos en formato Chart.js { labels: [], datasets: [] }
 * @param {Object} options - Opciones adicionales para personalizar la gráfica
 * @param {number} height - Altura del contenedor en pixels (default: 300)
 */
export default function BarChartComponent({ data, options = {}, height = 300 }) {
  const mergedOptions = {
    ...chartDefaults,
    ...options,
    plugins: {
      ...chartDefaults.plugins,
      ...options.plugins
    }
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
}

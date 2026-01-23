// Componente reutilizable para gráficas de líneas con Chart.js
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { chartDefaults } from '../../config/chartDefaults';

// Registrar componentes de Chart.js necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Componente de gráfica de líneas
 * @param {Object} data - Datos en formato Chart.js { labels: [], datasets: [] }
 * @param {Object} options - Opciones adicionales para personalizar la gráfica
 * @param {number} height - Altura del contenedor en pixels (default: 300)
 */
export default function LineChartComponent({ data, options = {}, height = 300 }) {
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
      <Line data={data} options={mergedOptions} />
    </div>
  );
}

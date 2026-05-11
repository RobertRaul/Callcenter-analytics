// Configuración por defecto para Chart.js
// Aplica tema MACSA y configuración responsive

import { MACSA_COLORS } from './theme';

// Configuración base para todos los charts
export const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: '#333',
        font: {
          size: 12,
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          weight: '500'
        },
        padding: 15,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: {
        size: 13,
        weight: 'bold'
      },
      bodyFont: {
        size: 12
      },
      padding: 12,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 6,
      displayColors: true
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        color: '#666',
        font: { size: 11 }
      }
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false
      },
      ticks: {
        color: '#666',
        font: { size: 11 }
      },
      beginAtZero: true
    }
  },
  interaction: {
    mode: 'index',
    intersect: false
  }
};

// Configuración específica para móviles
export const getMobileChartOptions = (baseOptions = {}) => {
  const isMobile = window.innerWidth < 768;

  return {
    ...chartDefaults,
    ...baseOptions,
    plugins: {
      ...chartDefaults.plugins,
      ...baseOptions.plugins,
      legend: {
        ...chartDefaults.plugins.legend,
        display: !isMobile,
        position: isMobile ? 'bottom' : 'top',
        labels: {
          ...chartDefaults.plugins.legend.labels,
          font: {
            ...chartDefaults.plugins.legend.labels.font,
            size: isMobile ? 10 : 12
          }
        }
      }
    },
    scales: baseOptions.scales || {
      x: {
        ...chartDefaults.scales.x,
        ticks: {
          ...chartDefaults.scales.x.ticks,
          maxRotation: isMobile ? 90 : 0,
          minRotation: isMobile ? 45 : 0,
          font: { size: isMobile ? 9 : 11 }
        }
      },
      y: {
        ...chartDefaults.scales.y,
        ticks: {
          ...chartDefaults.scales.y.ticks,
          font: { size: isMobile ? 9 : 11 }
        }
      }
    }
  };
};

// Paletas de colores predefinidas para gráficas
export const chartColorPalettes = {
  // Paleta principal MACSA
  primary: [
    MACSA_COLORS.blue,
    MACSA_COLORS.gold,
    MACSA_COLORS.green,
    MACSA_COLORS.orange,
    MACSA_COLORS.purple,
    MACSA_COLORS.cyan
  ],

  // Paleta para estado de llamadas
  callStatus: {
    answered: MACSA_COLORS.green,
    abandoned: MACSA_COLORS.orange,
    missed: MACSA_COLORS.red,
    queued: MACSA_COLORS.blue
  },

};

// Exportar colores MACSA
export { MACSA_COLORS };

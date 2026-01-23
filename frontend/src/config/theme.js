// Tema corporativo MACSA
// Colores extraídos del logo: Azul #2196F3, Dorado #D4AF37, Gris #9E9E9E

export const macsaTheme = {
  token: {
    colorPrimary: '#2196F3',      // Azul MACSA (corporativo principal)
    colorWarning: '#D4AF37',       // Dorado MACSA (acentos)
    colorTextSecondary: '#9E9E9E', // Gris MACSA (complementario)
    colorSuccess: '#52C41A',       // Verde Ant Design (éxito/positivo)
    colorError: '#FF4D4F',         // Rojo Ant Design (error/negativo)
    borderRadius: 8,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  components: {
    Layout: {
      siderBg: '#001529',          // Fondo sidebar oscuro
      headerBg: '#2196F3'          // Header con azul MACSA
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemSelectedBg: '#2196F3',
      darkItemSelectedColor: '#fff'
    },
    Card: {
      borderRadius: 8
    },
    Button: {
      borderRadius: 6
    }
  }
};

// Paleta de colores MACSA para uso en charts y componentes
export const MACSA_COLORS = {
  blue: '#2196F3',      // Azul corporativo
  gold: '#D4AF37',      // Dorado
  gray: '#9E9E9E',      // Gris
  green: '#52C41A',     // Verde (éxito)
  red: '#FF4D4F',       // Rojo (error)
  orange: '#FF9800',    // Naranja (advertencia)
  purple: '#9C27B0',    // Púrpura (complementario)
  cyan: '#00BCD4'       // Cyan (información)
};

// Gradientes para gráficas
export const MACSA_GRADIENTS = {
  blueGradient: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
  goldGradient: 'linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)',
  successGradient: 'linear-gradient(135deg, #52C41A 0%, #3F9C12 100%)'
};

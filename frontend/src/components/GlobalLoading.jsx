// Indicador de carga global: barra superior + badge "Cargando..."
// Se activa automaticamente con CUALQUIER peticion al API (todos los filtros,
// todas las paginas), suscribiendose al loadingBus de services/api.js.
import React, { useEffect, useState } from 'react';
import { loadingBus } from '../services/api';

export default function GlobalLoading() {
  const [loading, setLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  // Suscripcion al bus de peticiones activas
  useEffect(() => loadingBus.subscribe(setLoading), []);

  // El badge "Cargando..." solo aparece si la carga tarda >350ms,
  // asi los refrescos rapidos (polling) no parpadean.
  useEffect(() => {
    if (!loading) {
      setShowBadge(false);
      return undefined;
    }
    const t = setTimeout(() => setShowBadge(true), 350);
    return () => clearTimeout(t);
  }, [loading]);

  if (!loading) return null;

  return (
    <>
      {/* Barra de progreso superior */}
      <div className="cca-loadbar" />

      {/* Badge central no bloqueante */}
      {showBadge && (
        <div className="cca-loadbadge">
          <span className="cca-spinner" />
          Cargando…
        </div>
      )}
    </>
  );
}

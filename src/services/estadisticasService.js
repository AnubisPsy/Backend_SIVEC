// src/services/estadisticasService.js
const { supabase } = require("../config/database");

const estadisticasService = {
  /**
   * Obtener estadísticas principales del dashboard
   */
  async obtenerEstadisticasDashboard(fecha, sucursal_id, rol_id) {
    try {
      // Fecha inicio y fin del día
      const fechaInicio = `${fecha}T00:00:00`;
      const fechaFin = `${fecha}T23:59:59`;

      // 1. Viajes activos (en proceso)
      let queryViajesActivos = supabase
        .from("viaje")
        .select(
          `
          viaje_id,
          numero_vehiculo,
          vehiculo:numero_vehiculo (
            sucursal_id
          )
        `
        )
        .eq("estado_viaje", 8)
        .gte("fecha_viaje", fecha)
        .lte("fecha_viaje", fecha);

      // Filtrar por sucursal si no es admin
      if (rol_id !== 3) {
        // Obtener números de vehículos de la sucursal
        const { data: vehiculosSucursal } = await supabase
          .from("vehiculo")
          .select("numero_vehiculo")
          .eq("sucursal_id", sucursal_id);

        const numerosVehiculos = vehiculosSucursal.map(
          (v) => v.numero_vehiculo
        );
        queryViajesActivos = queryViajesActivos.in(
          "numero_vehiculo",
          numerosVehiculos
        );
      }

      const { data: viajesActivos } = await queryViajesActivos;

      // 2. Viajes completados del día
      let queryViajesCompletados = supabase
        .from("viaje")
        .select(
          `
          viaje_id,
          numero_vehiculo,
          vehiculo:numero_vehiculo (
            sucursal_id
          )
        `
        )
        .eq("estado_viaje", 9)
        .gte("updated_at", fechaInicio)
        .lte("updated_at", fechaFin);

      if (rol_id !== 3) {
        const { data: vehiculosSucursal } = await supabase
          .from("vehiculo")
          .select("numero_vehiculo")
          .eq("sucursal_id", sucursal_id);

        const numerosVehiculos = vehiculosSucursal.map(
          (v) => v.numero_vehiculo
        );
        queryViajesCompletados = queryViajesCompletados.in(
          "numero_vehiculo",
          numerosVehiculos
        );
      }

      const { data: viajesCompletados } = await queryViajesCompletados;

      // 3. Obtener guías del día
      const viajeIds = [
        ...(viajesActivos || []).map((v) => v.viaje_id),
        ...(viajesCompletados || []).map((v) => v.viaje_id),
      ];

      let totalGuias = 0;
      let guiasEntregadas = 0;
      let guiasPendientes = 0;

      if (viajeIds.length > 0) {
        const { data: guias } = await supabase
          .from("guia_remision")
          .select("guia_id, estado_id")
          .in("viaje_id", viajeIds);

        totalGuias = guias?.length || 0;
        guiasEntregadas = guias?.filter((g) => g.estado_id === 4).length || 0;
        guiasPendientes = guias?.filter((g) => g.estado_id === 3).length || 0;
      }

      // 4. Calcular tasa de éxito
      const tasaExito =
        totalGuias > 0 ? Math.round((guiasEntregadas / totalGuias) * 100) : 0;

      return {
        viajesActivos: viajesActivos?.length || 0,
        viajesCompletados: viajesCompletados?.length || 0,
        entregasCompletadas: guiasEntregadas,
        entregasPendientes: guiasPendientes,
        tasaExito,
        totalGuias,
      };
    } catch (error) {
      console.error("❌ Error en obtenerEstadisticasDashboard:", error);
      throw error;
    }
  },

  /**
   * Obtener entregas por hora del día
   */
  async obtenerEntregasPorHora(fecha, sucursal_id, rol_id) {
    try {
      const fechaInicio = `${fecha}T00:00:00`;
      const fechaFin = `${fecha}T23:59:59`;

      // Obtener guías entregadas del día
      let query = supabase
        .from("guia_remision")
        .select(
          `
          guia_id,
          fecha_entrega,
          viaje_id,
          viaje:viaje_id (
            numero_vehiculo,
            vehiculo:numero_vehiculo (
              sucursal_id
            )
          )
        `
        )
        .in("estado_id", [4, 5])
        .gte("fecha_entrega", fechaInicio)
        .lte("fecha_entrega", fechaFin);

      const { data: guias } = await query;

      // Filtrar por sucursal si no es admin
      let guiasFiltradas = guias || [];
      if (rol_id !== 3 && guias) {
        guiasFiltradas = guias.filter(
          (g) => g.viaje?.vehiculo?.sucursal_id === sucursal_id
        );
      }

      // Agrupar por hora
      const entregasPorHora = Array.from({ length: 24 }, (_, i) => ({
        hora: `${i.toString().padStart(2, "0")}:00`,
        entregas: 0,
      }));

      guiasFiltradas.forEach((guia) => {
        if (guia.fecha_entrega) {
          const hora = new Date(guia.fecha_entrega).getHours();
          entregasPorHora[hora].entregas++;
        }
      });

      // Filtrar solo horas con actividad o rango de trabajo (6am - 8pm)
      return entregasPorHora.filter(
        (h, i) => h.entregas > 0 || (i >= 6 && i <= 20)
      );
    } catch (error) {
      console.error("❌ Error en obtenerEntregasPorHora:", error);
      throw error;
    }
  },

  /**
   * Obtener viajes por sucursal
   */
  async obtenerViajesPorSucursal(fecha_desde, fecha_hasta, rol_id) {
    try {
      // Solo admin puede ver todas las sucursales
      if (rol_id !== 3) {
        return [];
      }

      const fechaInicio = fecha_desde || new Date().toISOString().split("T")[0];
      const fechaFin = fecha_hasta || fechaInicio;

      const { data: viajes } = await supabase
        .from("viaje")
        .select(
          `
          viaje_id,
          numero_vehiculo,
          vehiculo:numero_vehiculo (
            sucursal_id,
            sucursales:sucursal_id (
              nombre_sucursal
            )
          )
        `
        )
        .gte("fecha_viaje", fechaInicio)
        .lte("fecha_viaje", fechaFin);

      // Agrupar por sucursal
      const agrupado = {};
      viajes?.forEach((viaje) => {
        const sucursal =
          viaje.vehiculo?.sucursales?.nombre_sucursal || "Sin sucursal";
        agrupado[sucursal] = (agrupado[sucursal] || 0) + 1;
      });

      return Object.entries(agrupado).map(([nombre, cantidad]) => ({
        nombre,
        viajes: cantidad,
      }));
    } catch (error) {
      console.error("❌ Error en obtenerViajesPorSucursal:", error);
      throw error;
    }
  },

  /**
   * Obtener top 5 pilotos más eficientes
   */
  async obtenerTopPilotos(fecha_desde, fecha_hasta, sucursal_id, rol_id) {
    try {
      const fechaInicio = fecha_desde || new Date().toISOString().split("T")[0];
      const fechaFin = fecha_hasta || fechaInicio;

      // Obtener viajes completados del período
      let query = supabase
        .from("viaje")
        .select(
          `
          viaje_id,
          piloto,
          numero_vehiculo,
          vehiculo:numero_vehiculo (
            sucursal_id
          )
        `
        )
        .eq("estado_viaje", 9)
        .gte("fecha_viaje", fechaInicio)
        .lte("fecha_viaje", fechaFin);

      const { data: viajes } = await query;

      // Filtrar por sucursal si no es admin
      let viajesFiltrados = viajes || [];
      if (rol_id !== 3 && viajes) {
        viajesFiltrados = viajes.filter(
          (v) => v.vehiculo?.sucursal_id === sucursal_id
        );
      }

      // Obtener guías de esos viajes
      const viajeIds = viajesFiltrados.map((v) => v.viaje_id);

      if (viajeIds.length === 0) {
        return [];
      }

      const { data: guias } = await supabase
        .from("guia_remision")
        .select("guia_id, estado_id, viaje_id")
        .in("viaje_id", viajeIds);

      // Calcular estadísticas por piloto
      const pilotos = {};
      viajesFiltrados.forEach((viaje) => {
        if (!pilotos[viaje.piloto]) {
          pilotos[viaje.piloto] = {
            piloto: viaje.piloto,
            viajes: 0,
            entregas: 0,
            total: 0,
          };
        }
        pilotos[viaje.piloto].viajes++;

        const guiasViaje =
          guias?.filter((g) => g.viaje_id === viaje.viaje_id) || [];
        pilotos[viaje.piloto].total += guiasViaje.length;
        pilotos[viaje.piloto].entregas += guiasViaje.filter(
          (g) => g.estado_id === 4
        ).length;
      });

      // Calcular tasa de éxito y ordenar
      const ranking = Object.values(pilotos)
        .map((p) => ({
          ...p,
          tasaExito: p.total > 0 ? Math.round((p.entregas / p.total) * 100) : 0,
        }))
        .sort((a, b) => b.tasaExito - a.tasaExito)
        .slice(0, 5);

      return ranking;
    } catch (error) {
      console.error("❌ Error en obtenerTopPilotos:", error);
      throw error;
    }
  },

  /**
   * Obtener actividad reciente
   */
  async obtenerActividadReciente(sucursal_id, rol_id, limit) {
    try {
      // Obtener guías recientes
      const { data: guias } = await supabase
        .from("guia_remision")
        .select(
          `
          guia_id,
          numero_guia,
          estado_id,
          updated_at,
          estados:estado_id (
            nombre
          ),
          viaje:viaje_id (
            piloto,
            numero_vehiculo,
            vehiculo:numero_vehiculo (
              sucursal_id
            )
          )
        `
        )
        .order("updated_at", { ascending: false })
        .limit(limit * 2); // Traer más para filtrar después

      // Filtrar por sucursal si no es admin
      let guiasFiltradas = guias || [];
      if (rol_id !== 3 && guias) {
        guiasFiltradas = guias.filter(
          (g) => g.viaje?.vehiculo?.sucursal_id === sucursal_id
        );
      }

      // Formatear actividades
      const actividades = guiasFiltradas.slice(0, limit).map((guia) => ({
        tipo: "guia",
        descripcion: `${guia.viaje?.piloto || "Piloto"} - Guía ${
          guia.numero_guia
        }: ${guia.estados?.nombre}`,
        timestamp: guia.updated_at,
        estado: guia.estado_id,
      }));

      return actividades;
    } catch (error) {
      console.error("❌ Error en obtenerActividadReciente:", error);
      throw error;
    }
  },

  /**
   * Obtener tendencia de entregas de los últimos 7 días
   */
  async obtenerTendenciaSemanal(sucursal_id, rol_id) {
    try {
      const hoy = new Date();
      const hace7Dias = new Date(hoy);
      hace7Dias.setDate(hace7Dias.getDate() - 7);

      const { data: viajes } = await supabase
        .from("viaje")
        .select(
          `
        viaje_id,
        fecha_viaje,
        numero_vehiculo,
        vehiculo:numero_vehiculo (
          sucursal_id
        )
      `
        )
        .gte("fecha_viaje", hace7Dias.toISOString().split("T")[0])
        .lte("fecha_viaje", hoy.toISOString().split("T")[0]);

      // Filtrar por sucursal si no es admin
      let viajesFiltrados = viajes || [];
      if (rol_id !== 3 && viajes) {
        viajesFiltrados = viajes.filter(
          (v) => v.vehiculo?.sucursal_id === sucursal_id
        );
      }

      const viajeIds = viajesFiltrados.map((v) => v.viaje_id);

      if (viajeIds.length === 0) {
        return Array.from({ length: 7 }, (_, i) => {
          const fecha = new Date(hoy);
          fecha.setDate(fecha.getDate() - (6 - i));
          return {
            fecha: fecha.toISOString().split("T")[0],
            dia: fecha.toLocaleDateString("es-HN", { weekday: "short" }),
            entregas: 0,
          };
        });
      }

      // Obtener guías de esos viajes
      const { data: guias } = await supabase
        .from("guia_remision")
        .select("guia_id, estado_id, fecha_entrega, viaje_id")
        .in("viaje_id", viajeIds);

      // Agrupar por día
      const entregasPorDia = {};

      (guias || []).forEach((guia) => {
        if (guia.estado_id === 4 && guia.fecha_entrega) {
          const fecha = new Date(guia.fecha_entrega)
            .toISOString()
            .split("T")[0];
          entregasPorDia[fecha] = (entregasPorDia[fecha] || 0) + 1;
        }
      });

      // Generar array de últimos 7 días
      return Array.from({ length: 7 }, (_, i) => {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - (6 - i));
        const fechaStr = fecha.toISOString().split("T")[0];

        return {
          fecha: fechaStr,
          dia: fecha.toLocaleDateString("es-HN", { weekday: "short" }),
          entregas: entregasPorDia[fechaStr] || 0,
        };
      });
    } catch (error) {
      console.error("❌ Error en obtenerTendenciaSemanal:", error);
      throw error;
    }
  },

  /**
   * Obtener comparación de estados de guías
   */
  async obtenerComparacionEstados(fecha, sucursal_id, rol_id) {
    try {
      const fechaInicio = `${fecha}T00:00:00`;
      const fechaFin = `${fecha}T23:59:59`;

      // ✅ CAMBIO: Buscar guías actualizadas HOY, sin importar cuándo se creó el viaje
      let query = supabase
        .from("guia_remision")
        .select(
          `
        guia_id,
        estado_id,
        updated_at,
        viaje_id,
        viaje:viaje_id (
          numero_vehiculo,
          vehiculo:numero_vehiculo (
            sucursal_id
          )
        )
      `
        )
        .gte("updated_at", fechaInicio)
        .lte("updated_at", fechaFin);

      const { data: guias } = await query;

      // Filtrar por sucursal si no es admin
      let guiasFiltradas = guias || [];
      if (rol_id !== 3 && guias) {
        guiasFiltradas = guias.filter(
          (g) => g.viaje?.vehiculo?.sucursal_id === sucursal_id
        );
      }

      if (guiasFiltradas.length === 0) {
        return [
          { estado: "Entregadas", cantidad: 0, color: "#10b981" },
          { estado: "No Entregadas", cantidad: 0, color: "#ef4444" },
          { estado: "Pendientes", cantidad: 0, color: "#f59e0b" },
        ];
      }

      const entregadas = guiasFiltradas.filter((g) => g.estado_id === 4).length;
      const noEntregadas = guiasFiltradas.filter(
        (g) => g.estado_id === 5
      ).length;
      const pendientes = guiasFiltradas.filter((g) => g.estado_id === 3).length;

      return [
        { estado: "Entregadas", cantidad: entregadas, color: "#10b981" },
        { estado: "No Entregadas", cantidad: noEntregadas, color: "#ef4444" },
        { estado: "Pendientes", cantidad: pendientes, color: "#f59e0b" },
      ];
    } catch (error) {
      console.error("❌ Error en obtenerComparacionEstados:", error);
      throw error;
    }
  },

  /**
   * Obtener viajes por sucursal
   */
  async obtenerViajesPorSucursal(
    fecha_desde,
    fecha_hasta,
    sucursal_id,
    rol_id
  ) {
    try {
      const fechaInicio = fecha_desde || new Date().toISOString().split("T")[0];
      const fechaFin = fecha_hasta || fechaInicio;

      const { data: viajes } = await supabase
        .from("viaje")
        .select(
          `
        viaje_id,
        numero_vehiculo,
        vehiculo:numero_vehiculo (
          sucursal_id,
          sucursales:sucursal_id (
            nombre_sucursal
          )
        )
      `
        )
        .gte("fecha_viaje", fechaInicio)
        .lte("fecha_viaje", fechaFin);

      // ✅ FILTRAR SEGÚN ROL Y SUCURSAL
      let viajesFiltrados = viajes || [];

      if (rol_id === 2) {
        // JEFE: Solo su sucursal
        viajesFiltrados = viajesFiltrados.filter(
          (v) => v.vehiculo?.sucursal_id === sucursal_id
        );
      } else if (rol_id === 3 && sucursal_id) {
        // ADMIN con sucursal específica: Filtrar por esa sucursal
        viajesFiltrados = viajesFiltrados.filter(
          (v) => v.vehiculo?.sucursal_id === sucursal_id
        );
      }
      // ADMIN sin sucursal_id: Ver todas (no filtrar)

      if (viajesFiltrados.length === 0) {
        return [];
      }

      // Agrupar por sucursal
      const agrupado = {};
      viajesFiltrados.forEach((viaje) => {
        const sucursal =
          viaje.vehiculo?.sucursales?.nombre_sucursal || "Sin sucursal";
        agrupado[sucursal] = (agrupado[sucursal] || 0) + 1;
      });

      return Object.entries(agrupado).map(([nombre, cantidad]) => ({
        nombre,
        viajes: cantidad,
      }));
    } catch (error) {
      console.error("❌ Error en obtenerViajesPorSucursal:", error);
      throw error;
    }
  },
};

module.exports = estadisticasService;

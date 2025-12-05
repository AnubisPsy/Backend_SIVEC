// src/services/viajeService.js
const { supabase } = require("../config/database");

const viajeService = {
  /**
   * Obtener viajes básicos con filtros
   */
  async obtenerViajes(filtros = {}) {
    let query = supabase.from("viaje").select(`
      viaje_id,
      numero_vehiculo,
      piloto,
      fecha_viaje,
      estado_viaje,
      created_at
    `);

    // Filtrar por estado
    if (filtros.estado === "activo") {
      query = query.in("estado_viaje", [7, 8]);
    } else if (filtros.estado) {
      query = query.eq("estado_viaje", filtros.estado);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return data;
  },

  /**
   * Obtener viaje por ID completo
   */
  async obtenerViajePorId(viaje_id) {
    const { data, error } = await supabase
      .from("viaje")
      .select(
        `
        *,
        vehiculo:numero_vehiculo (placa, agrupacion, sucursal_id)
      `
      )
      .eq("viaje_id", viaje_id)
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Obtener vehículo con sucursal
   */
  async obtenerVehiculo(numero_vehiculo) {
    const { data, error } = await supabase
      .from("vehiculo")
      .select("placa, agrupacion, sucursal_id")
      .eq("numero_vehiculo", numero_vehiculo)
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Obtener vehículos de una sucursal
   */
  async obtenerVehiculosPorSucursal(sucursal_id) {
    const { data, error } = await supabase
      .from("vehiculo")
      .select("numero_vehiculo")
      .eq("sucursal_id", sucursal_id);

    if (error) throw error;

    return data || [];
  },

  /**
   * Obtener facturas de un viaje
   */
  async obtenerFacturasDeViaje(viaje_id) {
    const { data, error } = await supabase
      .from("factura_asignada")
      .select("factura_id, numero_factura, estado_id, notas_jefe")
      .eq("viaje_id", viaje_id);

    if (error) throw error;

    return data || [];
  },

  /**
   * Obtener todas las facturas de un viaje (para detalle)
   */
  async obtenerFacturasCompletasDeViaje(viaje_id) {
    const { data, error } = await supabase
      .from("factura_asignada")
      .select("*")
      .eq("viaje_id", viaje_id);

    if (error) throw error;

    return data || [];
  },

  /**
   * Obtener guías de una factura
   */
  async obtenerGuiasDeFactura(numero_factura) {
    const { data, error } = await supabase
      .from("guia_remision")
      .select(
        `
        guia_id,
        numero_guia,
        detalle_producto,
        direccion,
        estado_id,
        fecha_entrega,
        estados (nombre, codigo)
      `
      )
      .eq("numero_factura", numero_factura);

    if (error) throw error;

    return data || [];
  },

  /**
   * Obtener guías completas de una factura (para detalle)
   */
  async obtenerGuiasCompletasDeFactura(numero_factura) {
    const { data, error } = await supabase
      .from("guia_remision")
      .select(
        `
        *,
        estados (nombre, codigo)
      `
      )
      .eq("numero_factura", numero_factura);

    if (error) throw error;

    return data || [];
  },

  /**
   * Obtener guías de un viaje
   */
  async obtenerGuiasDeViaje(viaje_id) {
    const { data, error } = await supabase
      .from("guia_remision")
      .select(
        `
        guia_id,
        numero_guia,
        estado_id,
        fecha_entrega,
        estados:estado_id (nombre)
      `
      )
      .eq("viaje_id", viaje_id);

    if (error) throw error;

    return data || [];
  },

  /**
   * Obtener viajes recientes (últimas 24h) completados
   */
  async obtenerViajesRecientes(hace24Horas) {
    const { data, error } = await supabase
      .from("viaje")
      .select(
        `
        viaje_id,
        numero_vehiculo,
        piloto,
        fecha_viaje,
        estado_viaje,
        created_at,
        updated_at,
        creado_automaticamente
      `
      )
      .eq("estado_viaje", 9) // Solo completados
      .gte("updated_at", hace24Horas)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  /**
   * Obtener viajes con filtros para historial
   */
  async obtenerViajesHistorial(filtros = {}) {
    let query = supabase
      .from("viaje")
      .select(
        `
        viaje_id,
        numero_vehiculo,
        piloto,
        fecha_viaje,
        estado_viaje,
        created_at,
        updated_at,
        creado_automaticamente
      `
      )
      .eq("estado_viaje", 9) // Solo completados
      .order("updated_at", { ascending: false });

    // Aplicar filtros
    if (filtros.fecha_desde) {
      query = query.gte("fecha_viaje", filtros.fecha_desde);
    }

    if (filtros.fecha_hasta) {
      query = query.lte("fecha_viaje", filtros.fecha_hasta);
    }

    if (filtros.piloto) {
      query = query.ilike("piloto", `%${filtros.piloto}%`);
    }

    if (filtros.numero_vehiculo) {
      query = query.eq("numero_vehiculo", filtros.numero_vehiculo);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  /**
   * REPORTE AGREGADO - Agrupa y calcula totales
   */
  async obtenerReporteAgregado(filtros) {
    const {
      fecha_desde,
      fecha_hasta,
      piloto,
      numero_vehiculo,
      sucursal_id,
      agrupar_por,
    } = filtros;

    // CAMBIO CLAVE: Usar numero_factura_fkey en lugar de factura_id_fkey
    let query = supabase.from("viaje").select(`
      viaje_id,
      piloto,
      numero_vehiculo,
      fecha_viaje,
      sucursal_id,
      sucursales(nombre_sucursal),
      factura_asignada(
        factura_id,
        numero_factura,
        guia_remision!guia_remision_numero_factura_fkey(
          guia_id,
          estado_id
        )
      )
    `);

    // Aplicar filtros
    if (fecha_desde) {
      query = query.gte("fecha_viaje", fecha_desde);
    }

    if (fecha_hasta) {
      query = query.lte("fecha_viaje", fecha_hasta);
    }

    if (piloto) {
      query = query.ilike("piloto", `%${piloto}%`);
    }

    if (numero_vehiculo) {
      query = query.eq("numero_vehiculo", numero_vehiculo);
    }

    if (sucursal_id) {
      query = query.eq("sucursal_id", parseInt(sucursal_id));
    }

    const { data: viajes, error } = await query;

    if (error) {
      console.error("Error obteniendo viajes:", error);
      throw error;
    }

    console.log(`📊 Viajes obtenidos: ${viajes?.length || 0}`);

    // Agrupar manualmente en JavaScript
    const grupos = {};

    viajes?.forEach((viaje) => {
      let clave;
      switch (agrupar_por) {
        case "piloto":
          clave = viaje.piloto;
          break;
        case "vehiculo":
          clave = viaje.numero_vehiculo;
          break;
        case "sucursal":
          clave = viaje.sucursales?.nombre_sucursal || "Sin sucursal";
          break;
        case "fecha":
          clave = viaje.fecha_viaje;
          break;
        default:
          clave = viaje.piloto;
      }

      if (!grupos[clave]) {
        grupos[clave] = {
          grupo: clave,
          viajes: new Set(),
          facturas: new Set(),
          guias: new Set(),
          guias_entregadas: new Set(),
          guias_no_entregadas: new Set(),
        };
      }

      grupos[clave].viajes.add(viaje.viaje_id);

      viaje.factura_asignada?.forEach((factura) => {
        grupos[clave].facturas.add(factura.factura_id);

        factura.guia_remision?.forEach((guia) => {
          grupos[clave].guias.add(guia.guia_id);

          if (guia.estado_id === 4) {
            grupos[clave].guias_entregadas.add(guia.guia_id);
          } else if (guia.estado_id === 5) {
            grupos[clave].guias_no_entregadas.add(guia.guia_id);
          }
        });
      });
    });

    const resultado = Object.values(grupos).map((grupo) => {
      const total_guias = grupo.guias.size;
      const guias_entregadas = grupo.guias_entregadas.size;
      const porcentaje_exito =
        total_guias > 0
          ? Math.round((guias_entregadas / total_guias) * 100)
          : 0;

      return {
        grupo: grupo.grupo,
        total_viajes: grupo.viajes.size,
        total_facturas: grupo.facturas.size,
        total_guias: total_guias,
        guias_entregadas: guias_entregadas,
        guias_no_entregadas: grupo.guias_no_entregadas.size,
        porcentaje_exito: porcentaje_exito,
      };
    });

    resultado.sort((a, b) => b.total_viajes - a.total_viajes);

    console.log(`✅ Grupos generados: ${resultado.length}`);

    return {
      data: resultado,
      columnas_disponibles: this._getColumnasAgregadas(agrupar_por),
    };
  },

  /**
   * REPORTE ESPECIFICADO - Devuelve filas individuales
   */
  async obtenerReporteEspecificado(filtros) {
    const {
      fecha_desde,
      fecha_hasta,
      piloto,
      numero_vehiculo,
      sucursal_id,
      agrupar_por,
    } = filtros;

    // CAMBIO CLAVE: Usar numero_factura_fkey en lugar de factura_id_fkey
    let query = supabase.from("viaje").select(`
      viaje_id,
      fecha_viaje,
      piloto,
      numero_vehiculo,
      sucursal_id,
      sucursales(nombre_sucursal),
      factura_asignada(
        factura_id,
        numero_factura,
        guia_remision!guia_remision_numero_factura_fkey(
          guia_id,
          numero_guia,
          estado_id,
          estados(nombre)
        )
      )
    `);

    if (fecha_desde) {
      query = query.gte("fecha_viaje", fecha_desde);
    }

    if (fecha_hasta) {
      query = query.lte("fecha_viaje", fecha_hasta);
    }

    if (piloto) {
      query = query.ilike("piloto", `%${piloto}%`);
    }

    if (numero_vehiculo) {
      query = query.eq("numero_vehiculo", numero_vehiculo);
    }

    if (sucursal_id) {
      query = query.eq("sucursal_id", parseInt(sucursal_id));
    }

    query = query.order("piloto", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error ejecutando reporte especificado:", error);
      throw error;
    }

    console.log(`📊 Viajes obtenidos: ${data?.length || 0}`);

    const filasAplanadas = [];

    data?.forEach((viaje) => {
      if (!viaje.factura_asignada || viaje.factura_asignada.length === 0) {
        console.log(`⚠️ Viaje ${viaje.viaje_id} sin facturas`);
        return;
      }

      viaje.factura_asignada.forEach((factura) => {
        if (!factura.guia_remision || factura.guia_remision.length === 0) {
          console.log(`⚠️ Factura ${factura.numero_factura} sin guías`);
          return;
        }

        factura.guia_remision.forEach((guia) => {
          filasAplanadas.push({
            piloto: viaje.piloto,
            viaje_id: viaje.viaje_id,
            fecha_viaje: viaje.fecha_viaje,
            numero_vehiculo: viaje.numero_vehiculo,
            sucursal: viaje.sucursales?.nombre_sucursal || "",
            numero_factura: factura.numero_factura,
            numero_guia: guia.numero_guia,
            estado_guia: guia.estados?.nombre || "",
          });
        });
      });
    });

    console.log(`📋 Filas aplanadas: ${filasAplanadas.length}`);

    return {
      data: filasAplanadas,
      columnas_disponibles: this._getColumnasEspecificadas(),
    };
  },

  /**
   * Helper: Columnas para modo agregado
   */
  _getColumnasAgregadas(agrupar_por) {
    const columnas = [
      {
        id: "grupo",
        nombre: this._getNombreGrupo(agrupar_por),
        visible: true,
        tipo: "detalle",
      },
      {
        id: "total_viajes",
        nombre: "Total Viajes",
        visible: true,
        tipo: "agregada",
      },
      {
        id: "total_facturas",
        nombre: "Total Facturas",
        visible: true,
        tipo: "agregada",
      },
      {
        id: "total_guias",
        nombre: "Total Guías",
        visible: true,
        tipo: "agregada",
      },
      {
        id: "guias_entregadas",
        nombre: "Guías Entregadas",
        visible: true,
        tipo: "agregada",
      },
      {
        id: "guias_no_entregadas",
        nombre: "No Entregadas",
        visible: true,
        tipo: "agregada",
      },
      {
        id: "porcentaje_exito",
        nombre: "% Éxito",
        visible: true,
        tipo: "agregada",
      },
    ];

    return columnas;
  },

  /**
   * Helper: Columnas para modo especificado
   */
  _getColumnasEspecificadas() {
    return [
      { id: "piloto", nombre: "Piloto", visible: true, tipo: "detalle" },
      { id: "viaje_id", nombre: "ID Viaje", visible: true, tipo: "detalle" },
      { id: "fecha_viaje", nombre: "Fecha", visible: true, tipo: "detalle" },
      {
        id: "numero_vehiculo",
        nombre: "Vehículo",
        visible: true,
        tipo: "detalle",
      },
      { id: "sucursal", nombre: "Sucursal", visible: true, tipo: "detalle" },
      {
        id: "numero_factura",
        nombre: "Factura",
        visible: true,
        tipo: "detalle",
      },
      { id: "numero_guia", nombre: "Guía", visible: true, tipo: "detalle" },
      { id: "estado_guia", nombre: "Estado", visible: true, tipo: "detalle" },
    ];
  },

  /**
   * Helper: Nombre del campo de agrupación
   */
  _getNombreGrupo(agrupar_por) {
    switch (agrupar_por) {
      case "piloto":
        return "Piloto";
      case "vehiculo":
        return "Vehículo";
      case "sucursal":
        return "Sucursal";
      case "fecha":
        return "Fecha";
      default:
        return "Grupo";
    }
  },

  /**
   * Obtener todas las sucursales
   */
  async obtenerSucursales() {
    try {
      const { data, error } = await supabase
        .from("sucursales")
        .select("sucursal_id, nombre_sucursal")
        .order("nombre_sucursal", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error obteniendo sucursales:", error);
      throw error;
    }
  },

  /**
   * Obtener todos los pilotos únicos (desde viajes y facturas)
   */
  async obtenerTodosPilotos() {
    try {
      const { data, error } = await supabase
        .from("viaje")
        .select("piloto")
        .order("piloto", { ascending: true });

      if (error) throw error;

      // Eliminar duplicados
      const pilotosUnicos = [...new Set(data?.map((v) => v.piloto) || [])];

      return pilotosUnicos.filter((p) => p && p.trim() !== "");
    } catch (error) {
      console.error("Error obteniendo pilotos:", error);
      throw error;
    }
  },

  /**
   * Obtener vehículos filtrados por sucursal
   */
  async obtenerVehiculosPorSucursal(sucursal_id = null) {
    try {
      let query = supabase
        .from("vehiculo")
        .select(
          "vehiculo_id, numero_vehiculo, placa, sucursal_id, sucursales(nombre_sucursal)"
        )
        .eq("activo", true)
        .order("numero_vehiculo", { ascending: true });

      // Filtrar por sucursal si se especifica
      if (sucursal_id) {
        query = query.eq("sucursal_id", parseInt(sucursal_id));
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error obteniendo vehículos:", error);
      throw error;
    }
  },
};

module.exports = viajeService;

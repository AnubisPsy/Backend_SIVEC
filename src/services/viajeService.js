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
};

module.exports = viajeService;

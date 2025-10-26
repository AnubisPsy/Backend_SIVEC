// src/services/guiaService.js
const { supabase } = require("../config/database");

const guiaService = {
  /**
   * Obtener guía por ID
   */
  async obtenerPorId(guia_id) {
    const { data, error } = await supabase
      .from("guia_remision")
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .eq("guia_id", guia_id)
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Obtener guías por número de factura
   */
  async obtenerPorFactura(numero_factura) {
    const { data, error } = await supabase
      .from("guia_remision")
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .eq("numero_factura", numero_factura)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data;
  },

  /**
   * Verificar si una guía ya existe
   */
  async existeGuia(numero_guia) {
    const { data, error } = await supabase
      .from("guia_remision")
      .select("guia_id")
      .eq("numero_guia", numero_guia)
      .single();

    return !!data;
  },

  /**
   * Obtener viaje_id de una factura
   */
  async obtenerViajeIdDeFactura(numero_factura) {
    const { data, error } = await supabase
      .from("factura_asignada")
      .select("viaje_id")
      .eq("numero_factura", numero_factura)
      .single();

    if (error) throw error;

    return data?.viaje_id;
  },

  /**
   * Crear guía
   */
  async crear(dataGuia) {
    const { data, error } = await supabase
      .from("guia_remision")
      .insert({
        numero_guia: dataGuia.numero_guia,
        numero_factura: dataGuia.numero_factura,
        detalle_producto: dataGuia.detalle_producto || "Sin descripción",
        direccion: dataGuia.direccion || "Sin dirección",
        fecha_emision: dataGuia.fecha_emision || new Date().toISOString(),
        estado_id: 3, // guia_asignada
        viaje_id: dataGuia.viaje_id,
      })
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Actualizar estado de guía
   */
  async actualizarEstado(guia_id, estado_id) {
    const updateData = {
      estado_id,
      updated_at: new Date().toISOString(),
    };

    // Si se marca como entregada, guardar fecha
    if (estado_id === 4) {
      updateData.fecha_entrega = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("guia_remision")
      .update(updateData)
      .eq("guia_id", guia_id)
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Obtener todas las guías de un viaje
   */
  async obtenerGuiasDeViaje(viaje_id) {
    // 1. Obtener facturas del viaje
    const { data: facturas, error: errorFacturas } = await supabase
      .from("factura_asignada")
      .select("numero_factura")
      .eq("viaje_id", viaje_id);

    if (errorFacturas) throw errorFacturas;

    if (!facturas || facturas.length === 0) {
      return [];
    }

    const numeroFacturas = facturas.map((f) => f.numero_factura);

    // 2. Obtener todas las guías de esas facturas
    const { data: guias, error: errorGuias } = await supabase
      .from("guia_remision")
      .select("guia_id, estado_id")
      .in("numero_factura", numeroFacturas);

    if (errorGuias) throw errorGuias;

    return guias || [];
  },

  /**
   * Verificar si todas las guías de un viaje están completadas
   */
  async verificarViajeCompletado(viaje_id) {
    const guias = await this.obtenerGuiasDeViaje(viaje_id);

    if (guias.length === 0) {
      return false;
    }

    // Todas deben estar en estado 4 (entregada) o 5 (no entregada)
    const todasCompletadas = guias.every(
      (g) => g.estado_id === 4 || g.estado_id === 5
    );

    return todasCompletadas;
  },

  /**
   * Actualizar estado de viaje
   */
  async actualizarEstadoViaje(viaje_id, estado_viaje) {
    const { error } = await supabase
      .from("viaje")
      .update({
        estado_viaje,
        updated_at: new Date().toISOString(),
      })
      .eq("viaje_id", viaje_id);

    if (error) throw error;

    return true;
  },
};

module.exports = guiaService;

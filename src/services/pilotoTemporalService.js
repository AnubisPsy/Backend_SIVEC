// src/services/pilotoTemporalService.js
const { supabase } = require("../config/database");

const pilotoTemporalService = {
  /**
   * Obtener todos los pilotos temporales
   */
  async obtenerTodos() {
    const { data, error } = await supabase
      .from("piloto_temporal")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    return data;
  },

  /**
   * Obtener piloto temporal por ID
   */
  async obtenerPorId(piloto_temporal_id) {
    const { data, error } = await supabase
      .from("piloto_temporal")
      .select("*")
      .eq("piloto_temporal_id", piloto_temporal_id)
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Verificar si existe piloto por nombre
   */
  async existePorNombre(nombre) {
    const { data, error } = await supabase
      .from("piloto_temporal")
      .select("piloto_temporal_id")
      .eq("nombre", nombre.trim())
      .single();

    // Si no hay error, significa que existe
    return !!data;
  },

  /**
   * Crear piloto temporal
   */
  async crear(dataPiloto) {
    const { data, error } = await supabase
      .from("piloto_temporal")
      .insert({
        nombre: dataPiloto.nombre.trim(),
        activo: true,
        creado_por: dataPiloto.creado_por,
        notas: dataPiloto.notas || null,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Actualizar piloto temporal
   */
  async actualizar(piloto_temporal_id, dataPiloto) {
    const { data, error } = await supabase
      .from("piloto_temporal")
      .update({
        nombre: dataPiloto.nombre.trim(),
        notas: dataPiloto.notas || null,
      })
      .eq("piloto_temporal_id", piloto_temporal_id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Cambiar estado activo/inactivo
   */
  async toggleActivo(piloto_temporal_id) {
    // Obtener estado actual
    const piloto = await this.obtenerPorId(piloto_temporal_id);

    // Cambiar estado
    const { data, error } = await supabase
      .from("piloto_temporal")
      .update({
        activo: !piloto.activo,
      })
      .eq("piloto_temporal_id", piloto_temporal_id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },
};

module.exports = pilotoTemporalService;

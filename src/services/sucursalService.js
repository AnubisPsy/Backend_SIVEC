// src/services/sucursalService.js
const { supabase } = require("../config/database");

const sucursalService = {
  /**
   * Obtener todas las sucursales activas
   */
  async obtenerTodas() {
    const { data, error } = await supabase
      .from("sucursales")
      .select("*")
      .order("nombre_sucursal", { ascending: true });

    if (error) throw error;

    return data;
  },

  /**
   * Obtener sucursal por ID
   */
  async obtenerPorId(sucursal_id) {
    const { data, error } = await supabase
      .from("sucursales")
      .select("*")
      .eq("sucursal_id", sucursal_id)
      .single();

    if (error) throw error;

    return data;
  },
};

module.exports = sucursalService;

// src/services/vehiculoService.js
const { supabase } = require("../config/database");

const vehiculoService = {
  /**
   * OBTENER VEHÍCULOS POR SUCURSAL
   */
  async obtenerVehiculosPorSucursal(sucursal_id) {
    try {
      console.log(
        `🚛 Obteniendo vehículos activos de sucursal: ${sucursal_id}`
      );

      const { data, error } = await supabase
        .from("vehiculo")
        .select(
          `
        vehiculo_id,
        agrupacion,
        numero_vehiculo,
        placa,
        sucursal_id,
        activo,
        created_at,
        updated_at
      `
        )
        .eq("sucursal_id", sucursal_id)
        .eq("activo", true) // <- FILTRAR SOLO ACTIVOS
        .order("numero_vehiculo");

      if (error) {
        throw new Error(`Error al obtener vehículos: ${error.message}`);
      }

      console.log(`✅ ${data.length} vehículos activos encontrados`);
      return data;
    } catch (error) {
      console.error("❌ Error en obtenerVehiculosPorSucursal:", error);
      throw error;
    }
  },

  /**
   * OBTENER TODOS LOS VEHÍCULOS
   */
  async obtenerTodosVehiculos(filtros = {}) {
    try {
      let query = supabase.from("vehiculo").select(`
        vehiculo_id,
        agrupacion,
        numero_vehiculo,
        placa,
        sucursal_id,
        activo,
        created_at,
        updated_at
      `);

      // Aplicar filtros
      if (filtros.sucursal_id) {
        query = query.eq("sucursal_id", filtros.sucursal_id);
      }

      if (filtros.agrupacion) {
        query = query.eq("agrupacion", filtros.agrupacion);
      }

      // Filtrar solo activos por defecto, a menos que se especifique lo contrario
      if (filtros.incluir_inactivos !== true) {
        query = query.eq("activo", true);
      }

      const { data, error } = await query.order("numero_vehiculo");

      if (error) {
        throw new Error(`Error al obtener vehículos: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("❌ Error en obtenerTodosVehiculos:", error);
      throw error;
    }
  },

  /**
   * CREAR VEHÍCULO
   */
  async crearVehiculo(datosVehiculo) {
    try {
      const { agrupacion, numero_vehiculo, placa, sucursal_id } = datosVehiculo;

      if (!numero_vehiculo || !placa || !sucursal_id) {
        throw new Error("numero_vehiculo, placa y sucursal_id son requeridos");
      }

      // Verificar que numero_vehiculo sea único
      const { data: vehiculoExistente } = await supabase
        .from("vehiculo")
        .select("vehiculo_id")
        .eq("numero_vehiculo", numero_vehiculo)
        .single();

      if (vehiculoExistente) {
        throw new Error(`Ya existe un vehículo con número ${numero_vehiculo}`);
      }

      // Verificar que placa sea única
      const { data: placaExistente } = await supabase
        .from("vehiculo")
        .select("vehiculo_id")
        .eq("placa", placa)
        .single();

      if (placaExistente) {
        throw new Error(`Ya existe un vehículo con placa ${placa}`);
      }

      const { data, error } = await supabase
        .from("vehiculo")
        .insert({
          agrupacion,
          numero_vehiculo,
          placa,
          sucursal_id: parseInt(sucursal_id),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error al crear vehículo: ${error.message}`);
      }

      console.log(`✅ Vehículo creado: ${data.numero_vehiculo}`);
      return data;
    } catch (error) {
      console.error("❌ Error en crearVehiculo:", error);
      throw error;
    }
  },

  /**
   * OBTENER VEHÍCULO POR ID
   */
  async obtenerVehiculoPorId(vehiculo_id) {
    try {
      const { data, error } = await supabase
        .from("vehiculo")
        .select("*")
        .eq("vehiculo_id", vehiculo_id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Error al obtener vehículo: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error("❌ Error en obtenerVehiculoPorId:", error);
      throw error;
    }
  },

  /**
   * ACTUALIZAR VEHÍCULO
   */
  async actualizarVehiculo(vehiculo_id, datosActualizacion) {
    try {
      const { data, error } = await supabase
        .from("vehiculo")
        .update({
          ...datosActualizacion,
          updated_at: new Date().toISOString(),
        })
        .eq("vehiculo_id", vehiculo_id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error al actualizar vehículo: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("❌ Error en actualizarVehiculo:", error);
      throw error;
    }
  },

  /**
   * ELIMINAR VEHÍCULO
   */
  async eliminarVehiculo(vehiculo_id) {
    try {
      const { error } = await supabase
        .from("vehiculo")
        .delete()
        .eq("vehiculo_id", vehiculo_id);

      if (error) {
        throw new Error(`Error al eliminar vehículo: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("❌ Error en eliminarVehiculo:", error);
      throw error;
    }
  },

  /**
   * OBTENER ESTADÍSTICAS DE VEHÍCULOS
   */
  async obtenerEstadisticas() {
    try {
      const { data, error } = await supabase
        .from("vehiculo")
        .select("sucursal_id, agrupacion");

      if (error) {
        throw new Error(`Error al obtener estadísticas: ${error.message}`);
      }

      const total = data.length;
      const porSucursal = data.reduce((acc, vehiculo) => {
        acc[vehiculo.sucursal_id] = (acc[vehiculo.sucursal_id] || 0) + 1;
        return acc;
      }, {});

      const porAgrupacion = data.reduce((acc, vehiculo) => {
        if (vehiculo.agrupacion) {
          acc[vehiculo.agrupacion] = (acc[vehiculo.agrupacion] || 0) + 1;
        }
        return acc;
      }, {});

      return {
        total,
        porSucursal,
        porAgrupacion,
      };
    } catch (error) {
      console.error("❌ Error en obtenerEstadisticas:", error);
      throw error;
    }
  },
};

module.exports = vehiculoService;

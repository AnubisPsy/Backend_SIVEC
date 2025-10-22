// src/services/facturaService.js
const { supabase } = require("../config/database");

const facturaService = {
  /**
   * ASIGNAR FACTURA (lo que hace el jefe de yarda)
   */
  /**
   * ASIGNAR FACTURA (lo que hace el jefe de yarda)
   */
  async asignarFactura(datosFactura) {
    try {
      const {
        numero_factura,
        piloto,
        numero_vehiculo,
        fecha_asignacion,
        notas_jefe,
      } = datosFactura; // ← CAMBIO: Ya no es req.body, es datosFactura

      console.log("📋 Asignando factura:", {
        numero_factura,
        piloto,
        numero_vehiculo,
      });

      // Validaciones
      if (!numero_factura || !piloto || !numero_vehiculo) {
        throw new Error(
          "Faltan campos requeridos: numero_factura, piloto, numero_vehiculo"
        );
      }

      // 1️⃣ CREAR EL VIAJE PRIMERO (sin guía aún)
      const { data: viaje, error: errorViaje } = await supabase
        .from("viaje")
        .insert({
          numero_vehiculo: numero_vehiculo, // ← AGREGAR
          piloto: piloto,
          fecha_viaje:
            fecha_asignacion || new Date().toISOString().split("T")[0],
          estado_viaje: 7, // Pendiente
          creado_automaticamente: false,
        })
        .select("viaje_id")
        .single();

      if (errorViaje) {
        console.error("❌ Error creando viaje:", errorViaje);
        throw new Error("No se pudo crear el viaje");
      }

      console.log(`✅ Viaje creado: ${viaje.viaje_id}`);

      // 2️⃣ CREAR LA FACTURA ASIGNADA CON EL VIAJE_ID
      const { data, error } = await supabase
        .from("factura_asignada")
        .insert({
          numero_factura,
          piloto,
          numero_vehiculo,
          fecha_asignacion:
            fecha_asignacion || new Date().toISOString().split("T")[0],
          estado_id: 1, // Estado: asignada
          viaje_id: viaje.viaje_id, // ← Vincular con el viaje
          notas_jefe: notas_jefe || null,
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

      if (error) {
        // Si falla, eliminar el viaje creado
        await supabase.from("viaje").delete().eq("viaje_id", viaje.viaje_id);

        console.error("❌ Error asignando factura:", error);
        throw new Error(error.message);
      }

      console.log(
        `✅ Factura asignada: ${data.numero_factura} (ID: ${data.factura_id})`
      );
      console.log(`🔗 Vinculada con viaje_id: ${viaje.viaje_id}`);

      return {
        ...data,
        viaje_id: viaje.viaje_id,
      };
    } catch (error) {
      console.error("❌ Error en asignarFactura:", error);
      throw error;
    }
  },

  /**
   * OBTENER FACTURAS ASIGNADAS
   */
  async obtenerFacturasAsignadas(filtros = {}) {
    try {
      let query = supabase.from("factura_asignada").select(`
          factura_id,
          numero_factura,
          piloto,
          numero_vehiculo,
          fecha_asignacion,
          estado_id,
          viaje_id,
          notas_jefe,
          created_at,
          updated_at,
          estados:estado_id (
            estado_id,
            codigo,
            nombre,
            descripcion
          ),
          viaje:viaje_id (
            viaje_id,
            numero_guia,
            fecha_viaje,
            cliente
          )
        `);

      // Aplicar filtros
      if (filtros.estado_id) {
        query = query.eq("estado_id", filtros.estado_id);
      }

      if (filtros.piloto) {
        query = query.eq("piloto", filtros.piloto);
      }

      if (filtros.numero_vehiculo) {
        query = query.eq("numero_vehiculo", filtros.numero_vehiculo);
      }

      if (filtros.fecha_desde) {
        query = query.gte("fecha_asignacion", filtros.fecha_desde);
      }

      if (filtros.fecha_hasta) {
        query = query.lte("fecha_asignacion", filtros.fecha_hasta);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        throw new Error(
          `Error al obtener facturas asignadas: ${error.message}`
        );
      }

      return data;
    } catch (error) {
      console.error("❌ Error en obtenerFacturasAsignadas:", error);
      throw error;
    }
  },

  /**
   * OBTENER FACTURA ASIGNADA POR ID
   */
  async obtenerFacturaPorId(factura_id) {
    try {
      const { data, error } = await supabase
        .from("factura_asignada")
        .select(
          `
          factura_id,
          numero_factura,
          piloto,
          numero_vehiculo,
          fecha_asignacion,
          estado_id,
          viaje_id,
          notas_jefe,
          created_at,
          updated_at,
          estados:estado_id (
            estado_id,
            codigo,
            nombre,
            descripcion
          ),
          viaje:viaje_id (
            viaje_id,
            numero_guia,
            detalle_producto,
            fecha_viaje,
            cliente,
            direccion
          )
        `
        )
        .eq("factura_id", factura_id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Error al obtener factura: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error("❌ Error en obtenerFacturaPorId:", error);
      throw error;
    }
  },

  /**
   * OBTENER FACTURAS PENDIENTES (estado 1 - asignadas)
   */
  async obtenerFacturasPendientes() {
    return await this.obtenerFacturasAsignadas({ estado_id: 1 });
  },

  /**
   * OBTENER FACTURAS DESPACHADAS (estado 2 - despachadas)
   */
  async obtenerFacturasDespachadas(filtros = {}) {
    return await this.obtenerFacturasAsignadas({
      estado_id: 2,
      ...filtros,
    });
  },

  /**
   * ACTUALIZAR FACTURA ASIGNADA
   */
  async actualizarFactura(factura_id, datosActualizacion) {
    try {
      const { data, error } = await supabase
        .from("factura_asignada")
        .update({
          ...datosActualizacion,
          updated_at: new Date().toISOString(),
        })
        .eq("factura_id", factura_id)
        .select(
          `
          factura_id,
          numero_factura,
          piloto,
          numero_vehiculo,
          fecha_asignacion,
          estado_id,
          viaje_id,
          notas_jefe,
          updated_at,
          estados:estado_id (
            estado_id,
            codigo,
            nombre
          )
        `
        )
        .single();

      if (error) {
        throw new Error(`Error al actualizar factura: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("❌ Error en actualizarFactura:", error);
      throw error;
    }
  },

  /**
   * ELIMINAR FACTURA ASIGNADA
   */
  async eliminarFactura(factura_id) {
    try {
      // Verificar que no esté despachada
      const factura = await this.obtenerFacturaPorId(factura_id);

      if (!factura) {
        throw new Error("Factura no encontrada");
      }

      if (factura.estado_id === 2) {
        throw new Error("No se puede eliminar una factura ya despachada");
      }

      const { error } = await supabase
        .from("factura_asignada")
        .delete()
        .eq("factura_id", factura_id);

      if (error) {
        throw new Error(`Error al eliminar factura: ${error.message}`);
      }

      console.log(`✅ Factura ${factura.numero_factura} eliminada`);
      return true;
    } catch (error) {
      console.error("❌ Error en eliminarFactura:", error);
      throw error;
    }
  },

  /**
   * ESTADÍSTICAS DE FACTURAS
   */
  async obtenerEstadisticas(filtros = {}) {
    try {
      let query = supabase
        .from("factura_asignada")
        .select("estado_id, created_at");

      // Aplicar filtros de fecha si existen
      if (filtros.fecha_desde) {
        query = query.gte("created_at", filtros.fecha_desde);
      }

      if (filtros.fecha_hasta) {
        query = query.lte("created_at", filtros.fecha_hasta);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error al obtener estadísticas: ${error.message}`);
      }

      // Calcular estadísticas
      const total = data.length;
      const asignadas = data.filter((f) => f.estado_id === 1).length;
      const despachadas = data.filter((f) => f.estado_id === 2).length;

      return {
        total,
        asignadas,
        despachadas,
        porcentaje_completado:
          total > 0 ? Math.round((despachadas / total) * 100) : 0,
      };
    } catch (error) {
      console.error("❌ Error en obtenerEstadisticas:", error);
      throw error;
    }
  },
};

module.exports = facturaService;

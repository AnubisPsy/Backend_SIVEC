// src/services/facturaService.js
const { supabase } = require("../config/database");

const facturaService = {
  // SOLUCIÓN COMPLETA PARA facturaService.js
  //
  // Reemplaza la función asignarFactura() completa con esta versión:

  async asignarFactura(datosFactura) {
    try {
      const {
        numero_factura,
        piloto,
        numero_vehiculo,
        fecha_asignacion,
        notas_jefe,
      } = datosFactura;

      console.log("📋 Asignando factura:", {
        numero_factura,
        piloto,
        numero_vehiculo,
        fecha_asignacion,
      });

      // Validaciones
      if (!numero_factura || !piloto || !numero_vehiculo) {
        throw new Error(
          "Faltan campos requeridos: numero_factura, piloto, numero_vehiculo"
        );
      }

      const fecha = fecha_asignacion || new Date().toISOString().split("T")[0];

      // 1️⃣ BUSCAR SI YA EXISTE UN VIAJE PENDIENTE (ESTADO 7) PARA REUTILIZAR
      console.log("🔍 Buscando viaje pendiente para reutilizar...");
      const { data: viajePendiente, error: errorBusqueda } = await supabase
        .from("viaje")
        .select("viaje_id, estado_viaje")
        .eq("piloto", piloto)
        .eq("numero_vehiculo", numero_vehiculo)
        .eq("fecha_viaje", fecha)
        .eq("estado_viaje", 7) // ✅ Solo estado 7 (Pendiente)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errorBusqueda) {
        console.error("❌ Error buscando viaje:", errorBusqueda);
      }

      let viaje_id;
      let viajeCreado = false;

      if (viajePendiente) {
        // ✅ REUTILIZAR VIAJE PENDIENTE
        viaje_id = viajePendiente.viaje_id;
        console.log(`♻️  Reutilizando viaje pendiente: ${viaje_id}`);
      } else {
        // 2️⃣ ✅ VALIDAR: Piloto NO debe tener viajes ACTIVOS (estados 7 u 8)
        console.log(`🔍 Validando disponibilidad del piloto: ${piloto}`);
        const { data: viajesPiloto, error: errorPiloto } = await supabase
          .from("viaje")
          .select("viaje_id, estado_viaje, numero_vehiculo")
          .eq("piloto", piloto)
          .in("estado_viaje", [7, 8]) // ✅ CAMBIO: Estados 7 y 8
          .limit(1);

        if (errorPiloto) throw errorPiloto;

        if (viajesPiloto && viajesPiloto.length > 0) {
          const viajeActivo = viajesPiloto[0];
          const estadoTexto =
            viajeActivo.estado_viaje === 7 ? "pendiente" : "en ruta";
          throw new Error(
            `El piloto ${piloto} ya tiene un viaje ${estadoTexto} (Viaje ID: ${viajeActivo.viaje_id}) con el vehículo ${viajeActivo.numero_vehiculo}. Debe completar ese viaje antes de asignar uno nuevo.`
          );
        }

        // 3️⃣ ✅ VALIDAR: Vehículo NO debe estar en viajes ACTIVOS con OTRO piloto (estados 7 u 8)
        console.log(
          `🔍 Validando disponibilidad del vehículo: ${numero_vehiculo}`
        );
        const { data: viajesVehiculo, error: errorVehiculo } = await supabase
          .from("viaje")
          .select("viaje_id, estado_viaje, piloto")
          .eq("numero_vehiculo", numero_vehiculo)
          .in("estado_viaje", [7, 8]) // ✅ CAMBIO: Estados 7 y 8
          .neq("piloto", piloto) // ✅ NUEVO: Excluir al piloto actual (evita conflicto con validación anterior)
          .limit(1);

        if (errorVehiculo) throw errorVehiculo;

        if (viajesVehiculo && viajesVehiculo.length > 0) {
          const viajeActivo = viajesVehiculo[0];
          const estadoTexto =
            viajeActivo.estado_viaje === 7 ? "pendiente" : "en ruta";
          throw new Error(
            `El vehículo ${numero_vehiculo} ya está asignado al piloto ${viajeActivo.piloto} en un viaje ${estadoTexto} (Viaje ID: ${viajeActivo.viaje_id}). Debe completarse ese viaje antes de asignar el vehículo a otro piloto.`
          );
        }

        const { data: nuevoViaje, error: errorViaje } = await supabase
          .from("viaje")
          .insert({
            numero_vehiculo: numero_vehiculo,
            piloto: piloto,
            fecha_viaje: fecha,
            estado_viaje: 7,
            creado_automaticamente: false,
            sucursal_id: datosFactura.sucursal_id,
          })
          .select("viaje_id")
          .single();

        if (errorViaje) {
          console.error("❌ Error creando viaje:", errorViaje);
          throw new Error("No se pudo crear el viaje: " + errorViaje.message);
        }

        viaje_id = nuevoViaje.viaje_id;
        viajeCreado = true;
        console.log(`✨ Nuevo viaje creado: ${viaje_id}`);
      }

      // 5️⃣ CREAR LA FACTURA ASIGNADA
      const { data, error } = await supabase
        .from("factura_asignada")
        .insert({
          numero_factura,
          piloto,
          numero_vehiculo,
          fecha_asignacion: fecha,
          estado_id: 1, // Estado: asignada
          viaje_id: viaje_id,
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
        // Si falla y acabamos de crear el viaje, eliminarlo
        if (viajeCreado) {
          await supabase.from("viaje").delete().eq("viaje_id", viaje_id);
          console.log("🗑️  Viaje creado eliminado por error en factura");
        }

        console.error("❌ Error asignando factura:", error);
        throw new Error(error.message);
      }

      console.log(
        `✅ Factura asignada: ${data.numero_factura} (ID: ${data.factura_id})`
      );
      console.log(
        `🔗 Vinculada con viaje_id: ${viaje_id} ${
          viajeCreado ? "(nuevo)" : "(existente)"
        }`
      );

      return {
        ...data,
        viaje_id: viaje_id,
        viaje_nuevo: viajeCreado,
      };
    } catch (error) {
      console.error("❌ Error en asignarFactura:", error);
      throw error;
    }
  },

  // =============================================================================
  // FLUJO COMPLETO CON VALIDACIONES:
  // =============================================================================
  //
  // Escenario 1: Agregar facturas a viaje pendiente ✅
  // -------------------------------------------------
  // 09:00 - Asignar FACT-001 (Carlos + C-20)
  //         → No hay viajes → Crea Viaje #42 (Estado 7)
  // 09:15 - Asignar FACT-002 (Carlos + C-20, mismo día)
  //         → Encuentra Viaje #42 (Estado 7) → Reutiliza ✅
  // 09:30 - Asignar FACT-003 (Carlos + C-20, mismo día)
  //         → Encuentra Viaje #42 (Estado 7) → Reutiliza ✅
  //
  // Escenario 2: Bloquear durante viaje en proceso ❌
  // -------------------------------------------------
  // 10:00 - Piloto vincula guías → Viaje #42 pasa a Estado 8
  // 10:15 - Asignar FACT-004 (Carlos + C-20)
  //         → NO encuentra viaje en Estado 7
  //         → Valida piloto: Carlos tiene Viaje #42 en Estado 8
  //         → ❌ ERROR: "Piloto ya está en ruta"
  // 10:20 - Asignar FACT-005 (Juan + C-20)
  //         → NO encuentra viaje en Estado 7
  //         → Valida vehículo: C-20 está en Viaje #42 (Estado 8)
  //         → ❌ ERROR: "Vehículo está en ruta"
  //
  // Escenario 3: Permitir después de completar ✅
  // ----------------------------------------------
  // 11:00 - Piloto completa entregas → Viaje #42 pasa a Estado 9
  // 11:15 - Asignar FACT-006 (Carlos + C-20)
  //         → NO encuentra viaje en Estado 7
  //         → Valida piloto: Carlos NO tiene viajes en Estado 8 ✅
  //         → Valida vehículo: C-20 NO tiene viajes en Estado 8 ✅
  //         → Crea Viaje #43 (Estado 7) ✅
  // =============================================================================

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

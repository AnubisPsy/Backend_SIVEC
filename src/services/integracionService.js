// src/services/integracionService.js
const sql = require("mssql");
const { sqlConfig } = require("../config/database");
const { supabase } = require("../config/database");

const integracionService = {
  /**
   * BUSCAR GUÍA CORRECTA EN SISTEMA EXTERNO
   */
  async buscarGuiaCorrecta(numero_factura, piloto_asignado) {
    let pool;

    try {
      console.log(
        `🔍 Buscando guía para factura: ${numero_factura}, piloto: ${piloto_asignado}`
      );

      // Conectar a SQL Server
      pool = await sql.connect(sqlConfig);

      // Query con los criterios definidos
      const query = `
        SELECT TOP 1 
          d.documento,
          d.referencia,
          d.piloto,
          f.detalle_producto,
          f.direccion,
          d.created_at as fecha_creacion
        FROM despachos d
        INNER JOIN factura f ON d.documento = f.documento
        WHERE d.documento = @numero_factura
          AND d.estado IN (5, 6)  -- Estados válidos
          AND d.piloto = @piloto  -- Mismo conductor
          AND d.referencia IS NOT NULL
        ORDER BY d.created_at DESC  -- Más reciente
      `;

      const result = await pool
        .request()
        .input("numero_factura", sql.VarChar(100), numero_factura)
        .input("piloto", sql.VarChar(100), piloto_asignado)
        .query(query);

      if (result.recordset.length > 0) {
        const guia = result.recordset[0];
        console.log(`✅ Guía encontrada: ${guia.referencia}`);
        return guia;
      } else {
        console.log(
          `❌ No se encontró guía válida para factura ${numero_factura}`
        );
        return null;
      }
    } catch (error) {
      console.error("❌ Error al buscar guía:", error);
      throw new Error(`Error de integración: ${error.message}`);
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  },

  /**
   * PROCESAR FACTURA ASIGNADA - Buscar y crear guía si existe
   */
  async procesarFacturaAsignada(factura_id) {
    try {
      console.log(`🔄 Procesando factura_asignada ID: ${factura_id}`);

      // 1. Obtener datos de la factura asignada
      const { data: facturaAsignada, error: errorFactura } = await supabase
        .from("factura_asignada")
        .select("*")
        .eq("factura_id", factura_id)
        .eq("estado_id", 1) // Solo facturas asignadas (no procesadas)
        .single();

      if (errorFactura || !facturaAsignada) {
        throw new Error("Factura asignada no encontrada o ya procesada");
      }

      // 2. Buscar guía en sistema externo
      const guiaExterna = await this.buscarGuiaCorrecta(
        facturaAsignada.numero_factura,
        facturaAsignada.piloto
      );

      if (!guiaExterna) {
        console.log(
          `⏳ Guía aún no disponible para factura ${facturaAsignada.numero_factura}`
        );
        return {
          procesada: false,
          mensaje: "Guía no disponible aún",
        };
      }

      // 3. Crear viaje si no existe
      let viaje_id = facturaAsignada.viaje_id;

      if (!viaje_id) {
        viaje_id = await this.crearViaje(facturaAsignada, guiaExterna);
      }

      // 4. Crear guía de remisión en SIVEC
      await this.crearGuiaRemision(guiaExterna, viaje_id);

      // 5. Actualizar factura asignada
      await this.actualizarFacturaAsignada(factura_id, viaje_id);

      // 6. Log del proceso
      await this.registrarDeteccion(
        facturaAsignada.numero_factura,
        guiaExterna.referencia,
        "procesado_exitosamente"
      );

      console.log(
        `✅ Factura ${facturaAsignada.numero_factura} procesada exitosamente`
      );

      return {
        procesada: true,
        numero_guia: guiaExterna.referencia,
        viaje_id: viaje_id,
      };
    } catch (error) {
      console.error("❌ Error al procesar factura:", error);

      // Log del error
      await this.registrarDeteccion(
        "error",
        "error",
        "error_procesamiento",
        error.message
      );

      throw error;
    }
  },

  /**
   * CREAR VIAJE AUTOMÁTICAMENTE
   */
  async crearViaje(facturaAsignada, guiaExterna) {
    try {
      const datosViaje = {
        numero_guia: guiaExterna.referencia,
        detalle_producto: guiaExterna.detalle_producto,
        fecha_viaje: new Date().toISOString().split("T")[0], // Fecha actual
        cliente: guiaExterna.cliente || "No especificado",
        direccion: guiaExterna.direccion,
        numero_vehiculo: facturaAsignada.numero_vehiculo,
        piloto: facturaAsignada.piloto,
        creado_automaticamente: true,
      };

      const { data: viaje, error } = await supabase
        .from("viaje")
        .insert(datosViaje)
        .select("viaje_id")
        .single();

      if (error) {
        throw new Error(`Error al crear viaje: ${error.message}`);
      }

      console.log(`✅ Viaje creado automáticamente: ${viaje.viaje_id}`);
      return viaje.viaje_id;
    } catch (error) {
      console.error("❌ Error al crear viaje:", error);
      throw error;
    }
  },

  /**
   * CREAR GUÍA DE REMISIÓN EN SIVEC
   */
  async crearGuiaRemision(guiaExterna, viaje_id) {
    try {
      const datosGuia = {
        numero_guia: guiaExterna.referencia,
        numero_factura: guiaExterna.documento,
        detalle_producto: guiaExterna.detalle_producto,
        fecha_emision: new Date().toISOString().split("T")[0],
        cliente: guiaExterna.cliente || "No especificado",
        direccion: guiaExterna.direccion,
        piloto: guiaExterna.piloto,
        estado_id: 3, // guia_asignada
        viaje_id: viaje_id,
      };

      const { data: guia, error } = await supabase
        .from("guia_remision")
        .insert(datosGuia)
        .select("guia_id")
        .single();

      if (error) {
        throw new Error(`Error al crear guía de remisión: ${error.message}`);
      }

      console.log(`✅ Guía de remisión creada: ${guia.guia_id}`);
      return guia.guia_id;
    } catch (error) {
      console.error("❌ Error al crear guía de remisión:", error);
      throw error;
    }
  },

  /**
   * ACTUALIZAR FACTURA ASIGNADA
   */
  async actualizarFacturaAsignada(factura_id, viaje_id) {
    try {
      const { error } = await supabase
        .from("factura_asignada")
        .update({
          estado_id: 2, // factura_despachada
          viaje_id: viaje_id,
          updated_at: new Date().toISOString(),
        })
        .eq("factura_id", factura_id);

      if (error) {
        throw new Error(
          `Error al actualizar factura asignada: ${error.message}`
        );
      }

      console.log(`✅ Factura asignada actualizada a estado despachada`);
    } catch (error) {
      console.error("❌ Error al actualizar factura asignada:", error);
      throw error;
    }
  },

  /**
   * REGISTRAR LOG DE DETECCIÓN
   */
  async registrarDeteccion(numero_factura, numero_guia, accion, detalles = "") {
    try {
      await supabase.from("log_detecciones").insert({
        numero_factura,
        numero_guia,
        accion,
        detalles,
        fecha_deteccion: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error al registrar log:", error);
      // No lanzar error aquí para no interrumpir el proceso principal
    }
  },

  /**
   * PROCESAR TODAS LAS FACTURAS PENDIENTES
   */
  async procesarFacturasPendientes() {
    try {
      console.log("🔄 Iniciando procesamiento de facturas pendientes...");

      // Obtener todas las facturas asignadas pendientes
      const { data: facturasPendientes, error } = await supabase
        .from("factura_asignada")
        .select("factura_id, numero_factura")
        .eq("estado_id", 1); // Solo asignadas

      if (error) {
        throw new Error(
          `Error al obtener facturas pendientes: ${error.message}`
        );
      }

      console.log(
        `📋 ${facturasPendientes.length} facturas pendientes encontradas`
      );

      let procesadas = 0;
      let errores = 0;

      // Procesar cada factura
      for (const factura of facturasPendientes) {
        try {
          const resultado = await this.procesarFacturaAsignada(
            factura.factura_id
          );

          if (resultado.procesada) {
            procesadas++;
          }
        } catch (error) {
          console.error(
            `❌ Error procesando factura ${factura.numero_factura}:`,
            error.message
          );
          errores++;
        }
      }

      console.log(
        `✅ Procesamiento completado: ${procesadas} procesadas, ${errores} errores`
      );

      return {
        total: facturasPendientes.length,
        procesadas,
        errores,
      };
    } catch (error) {
      console.error("❌ Error en procesamiento masivo:", error);
      throw error;
    }
  },
};

module.exports = integracionService;

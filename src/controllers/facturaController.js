// src/controllers/facturaController.js
const facturaService = require("../services/facturaService");
const pilotoService = require("../services/pilotoService");
const vehiculoService = require("../services/vehiculoService");
const { supabase } = require("../config/database");
const logService = require("../services/logService");

const facturaController = {
  /**
   * POST /api/facturas - Asignar factura (jefe de yarda)
   */
  async asignar(req, res) {
    const ip = req.ip || req.connection.remoteAddress; // ← NUEVO

    try {
      console.log("🎯 =====================================");
      console.log("📋 facturaController.asignar LLAMADO");
      console.log("📦 req.body:", JSON.stringify(req.body, null, 2));
      console.log(
        "👤 Usuario:",
        req.usuario?.nombre_usuario,
        "- Rol:",
        req.usuario?.rol_id
      );
      console.log("🎯 =====================================");

      const facturaAsignada = await facturaService.asignarFactura({
        ...req.body,
        sucursal_id: req.usuario.sucursal_id,
      });

      console.log(`✅ Factura asignada con ID: ${facturaAsignada.factura_id}`);
      console.log(
        `🔗 Viaje ID: ${facturaAsignada.viaje_id} ${
          facturaAsignada.viaje_nuevo ? "(nuevo)" : "(existente reutilizado)"
        }`
      );

      // ✅ NUEVO: Log de factura asignada
      await logService.operaciones.facturaAsignada({
        usuario_id: req.usuario.usuario_id,
        factura_id: facturaAsignada.factura_id,
        numero_factura: req.body.numero_factura,
        detalles: {
          piloto: req.body.piloto,
          vehiculo: req.body.numero_vehiculo,
          fecha_asignacion:
            req.body.fecha_asignacion || new Date().toISOString().split("T")[0],
          viaje_id: facturaAsignada.viaje_id,
          viaje_nuevo: facturaAsignada.viaje_nuevo,
          notas: req.body.notas_jefe,
        },
        ip,
      });

      res.status(201).json({
        success: true,
        data: facturaAsignada,
        message: facturaAsignada.viaje_nuevo
          ? "Factura asignada en nuevo viaje"
          : "Factura agregada a viaje existente",
      });
    } catch (error) {
      console.error("❌ Error al asignar factura:", error.message);
      console.error("Stack:", error.stack);

      // ❌ NUEVO: Log de error
      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "facturaController",
        mensaje: `Error al asignar factura: ${error.message}`,
        stack_trace: error.stack,
        detalles: {
          input: req.body,
        },
        ip,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al asignar factura",
      });
    }
  },

  /**
   * GET /api/facturas - Obtener facturas asignadas
   */
  async obtenerTodas(req, res) {
    try {
      const filtros = {};

      // Aplicar filtros desde query params
      if (req.query.estado_id)
        filtros.estado_id = parseInt(req.query.estado_id);
      if (req.query.piloto) filtros.piloto = req.query.piloto;
      if (req.query.numero_vehiculo)
        filtros.numero_vehiculo = req.query.numero_vehiculo;
      if (req.query.fecha_desde) filtros.fecha_desde = req.query.fecha_desde;
      if (req.query.fecha_hasta) filtros.fecha_hasta = req.query.fecha_hasta;

      console.log("🔍 Obteniendo facturas con filtros:", filtros);

      const facturas = await facturaService.obtenerFacturasAsignadas(filtros);

      console.log(`📋 ${facturas.length} facturas encontradas`);

      res.json({
        success: true,
        data: facturas,
        total: facturas.length,
        filtros: filtros,
        message: "Facturas obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener facturas:", error.message);

      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "facturaController",
        mensaje: `Error obteniendo facturas: ${error.message}`,
        stack_trace: error.stack,
        ip: req.ip,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener facturas",
      });
    }
  },

  /**
   * GET /api/facturas/:id - Obtener factura por ID
   */
  async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de factura inválido",
          message: "El ID debe ser un número válido",
        });
      }

      console.log("🔍 Buscando factura ID:", id);

      const factura = await facturaService.obtenerFacturaPorId(parseInt(id));

      if (!factura) {
        return res.status(404).json({
          success: false,
          error: "Factura no encontrada",
          message: `No existe una factura con ID ${id}`,
        });
      }

      console.log(`✅ Factura encontrada: ${factura.numero_factura}`);

      res.json({
        success: true,
        data: factura,
        message: "Factura obtenida exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener factura:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener factura",
      });
    }
  },

  /**
   * PUT /api/facturas/:id - Actualizar factura
   */
  async actualizar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de factura inválido",
        });
      }

      console.log("📝 Actualizando factura ID:", id);

      const factura = await facturaService.actualizarFactura(
        parseInt(id),
        req.body
      );

      console.log(`✅ Factura actualizada: ${factura.numero_factura}`);

      res.json({
        success: true,
        data: factura,
        message: "Factura actualizada exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al actualizar factura:", error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al actualizar factura",
      });
    }
  },

  /**
   * DELETE /api/facturas/:id - Eliminar factura
   */
  async eliminar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de factura inválido",
        });
      }

      console.log("🗑️ Eliminando factura ID:", id);

      await facturaService.eliminarFactura(parseInt(id));

      console.log("✅ Factura eliminada");

      res.json({
        success: true,
        message: "Factura eliminada exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al eliminar factura:", error.message);

      await logService.operaciones.registrar({
        usuario_id: req.usuario?.usuario_id,
        tipo: "factura",
        accion: "eliminada",
        entidad_id: parseInt(id),
        entidad_referencia: `FACTURA-${id}`,
        detalles: {
          motivo: "eliminacion_manual",
        },
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al eliminar factura",
      });
    }
  },

  // ==========================================
  // ENDPOINTS ESPECÍFICOS
  // ==========================================

  /**
   * GET /api/facturas/pendientes - Facturas pendientes (estado 1)
   */
  async obtenerPendientes(req, res) {
    try {
      console.log("📋 Obteniendo facturas pendientes");

      const facturas = await facturaService.obtenerFacturasPendientes();

      console.log(`📋 ${facturas.length} facturas pendientes`);

      res.json({
        success: true,
        data: facturas,
        total: facturas.length,
        message: "Facturas pendientes obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener facturas pendientes:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener facturas pendientes",
      });
    }
  },

  /**
   * GET /api/facturas/despachadas - Facturas despachadas (estado 2)
   */
  async obtenerDespachadas(req, res) {
    try {
      const filtros = {};
      if (req.query.fecha_desde) filtros.fecha_desde = req.query.fecha_desde;
      if (req.query.fecha_hasta) filtros.fecha_hasta = req.query.fecha_hasta;

      console.log("📋 Obteniendo facturas despachadas");

      const facturas = await facturaService.obtenerFacturasDespachadas(filtros);

      console.log(`📋 ${facturas.length} facturas despachadas`);

      res.json({
        success: true,
        data: facturas,
        total: facturas.length,
        filtros: filtros,
        message: "Facturas despachadas obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener facturas despachadas:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener facturas despachadas",
      });
    }
  },

  /**
   * GET /api/facturas/estadisticas - Estadísticas de facturas
   */
  async obtenerEstadisticas(req, res) {
    try {
      const filtros = {};
      if (req.query.fecha_desde) filtros.fecha_desde = req.query.fecha_desde;
      if (req.query.fecha_hasta) filtros.fecha_hasta = req.query.fecha_hasta;

      console.log("📊 Obteniendo estadísticas de facturas");

      const estadisticas = await facturaService.obtenerEstadisticas(filtros);

      console.log("✅ Estadísticas calculadas:", estadisticas);

      res.json({
        success: true,
        data: estadisticas,
        filtros: filtros,
        message: "Estadísticas obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener estadísticas:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener estadísticas",
      });
    }
  },

  /**
   * GET /api/facturas/form-data - Datos para formulario de asignar factura
   * ✅ CORREGIDO: Usa req.usuario.sucursal.sucursal_id con fallback
   */
  async obtenerDatosFormulario(req, res) {
    try {
      console.log("═══════════════════════════════════════════════════");
      console.log("📋 OBTENER DATOS FORMULARIO");
      console.log("═══════════════════════════════════════════════════");
      console.log("👤 Usuario completo:", JSON.stringify(req.usuario, null, 2));
      console.log("📦 sucursal_id (directo):", req.usuario.sucursal_id);
      console.log("📦 sucursal (objeto):", req.usuario.sucursal);
      console.log(
        "📦 sucursal.sucursal_id:",
        req.usuario.sucursal?.sucursal_id
      );

      // ✅ OBTENER SUCURSAL DEL USUARIO (objeto o campo directo con fallback)
      const sucursalId =
        req.usuario.sucursal?.sucursal_id || req.usuario.sucursal_id;

      console.log("🏢 Sucursal ID FINAL a usar:", sucursalId);

      // Verificar que el usuario tenga sucursal
      if (!sucursalId) {
        console.log("⚠️ Usuario sin sucursal:", req.usuario);
        return res.status(400).json({
          success: false,
          error: "Usuario sin sucursal asignada",
          message:
            "El usuario debe tener una sucursal asignada para ver vehículos",
        });
      }

      // Obtener pilotos del endpoint que mezcla SQL + Supabase
      console.log("🔍 Obteniendo pilotos (SQL + Temporales)...");
      const axios = require("axios");
      const token = req.headers.authorization;

      const pilotosResponse = await axios.get(
        "http://localhost:3000/api/pilotos",
        {
          headers: { Authorization: token },
        }
      );

      const pilotos = pilotosResponse.data.data.map((p) => ({
        nombre_piloto: p.nombre_piloto,
        es_temporal: p.es_temporal,
      }));

      console.log(
        `✅ ${pilotos.length} pilotos obtenidos (SQL: ${pilotosResponse.data.fuentes.sql}, Temporales: ${pilotosResponse.data.fuentes.temporales})`
      );

      // ✅ Obtener vehículos desde Supabase (filtrados por sucursal correcta)
      console.log(`🔍 Obteniendo vehículos de sucursal ${sucursalId}...`);
      const vehiculos = await vehiculoService.obtenerVehiculosPorSucursal(
        sucursalId
      );
      console.log(`✅ ${vehiculos.length} vehículos obtenidos`);
      console.log("═══════════════════════════════════════════════════");

      res.json({
        success: true,
        data: {
          pilotos: pilotos,
          vehiculos: vehiculos,
          sucursal_usuario: sucursalId, // ✅ Usar el ID correcto
        },
        message: "Datos para formulario obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener datos para formulario:", error);
      console.error("Stack:", error.stack);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener datos para formulario",
      });
    }
  },

  /**
   * GET /api/facturas/piloto/:piloto - Facturas asignadas a un piloto específico
   */
  async obtenerFacturasPiloto(req, res) {
    try {
      const { piloto } = req.params;

      const facturas = await facturaService.obtenerFacturasAsignadas({
        piloto: piloto,
        estado_id: 1, // Solo pendientes
      });

      res.json({
        success: true,
        data: facturas,
        message: `Facturas para piloto ${piloto}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener facturas del piloto",
      });
    }
  },

  /**
   * GET /api/facturas/:numero_factura/guias-disponibles - Guías disponibles
   */
  async obtenerGuiasDisponibles(req, res) {
    try {
      const { numero_factura } = req.params;
      const { piloto } = req.query;

      console.log(
        `🔍 Buscando guías disponibles para factura: ${numero_factura}`
      );
      console.log(`👤 Piloto: ${piloto}`);

      const sql = require("mssql");
      const { sqlConfig } = require("../config/database");

      const pool = await sql.connect(sqlConfig);

      const query = `
      SELECT 
        d.despacho_id,
        d.referencia AS numero_guia,
        d.documento AS numero_factura,
        d.created_at AS fecha_emision,
        d.venta_id,
        COUNT(vd.ventas_detalle_id) AS total_productos,
        STRING_AGG(CAST(vd.descripcion AS VARCHAR(MAX)), ' | ') AS detalle_producto,
        STRING_AGG(CAST(vd.cantidad AS VARCHAR), ' | ') AS cantidades,
        MAX(CAST(vd.direccion_entrega AS VARCHAR(MAX))) AS direccion_entrega
      FROM despachos d
      LEFT JOIN ventas_detalle vd ON d.venta_id = vd.venta_id
      WHERE d.estado = 8 
        AND d.referencia IS NOT NULL
        AND d.documento = @numero_factura
      GROUP BY 
        d.despacho_id,
        d.referencia,
        d.documento,
        d.created_at,
        d.venta_id
      ORDER BY d.created_at DESC
    `;

      const result = await pool
        .request()
        .input("numero_factura", sql.VarChar, numero_factura)
        .query(query);

      await pool.close();

      console.log(
        `📦 ${result.recordset.length} guías encontradas en SQL Server`
      );

      const guiasDisponibles = [];

      for (const guia of result.recordset) {
        const { data: guiaExiste } = await supabase
          .from("guia_remision")
          .select("guia_id")
          .eq("numero_guia", guia.numero_guia)
          .single();

        if (!guiaExiste) {
          guiasDisponibles.push({
            numero_guia: guia.numero_guia,
            numero_factura: guia.numero_factura,
            descripcion: guia.detalle_producto || "Sin descripción",
            detalle_producto: guia.detalle_producto || "Sin descripción",
            direccion_entrega: guia.direccion_entrega || "Sin dirección",
            cantidad: guia.total_productos,
            total_productos: guia.total_productos,
            fecha_emision: guia.fecha_emision,
          });
        }
      }

      console.log(
        `✅ ${guiasDisponibles.length} guías disponibles para vincular`
      );

      res.json({
        success: true,
        data: guiasDisponibles,
        total: guiasDisponibles.length,
        message: "Guías disponibles obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo guías disponibles:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener guías disponibles",
      });
    }
  },
};

module.exports = facturaController;

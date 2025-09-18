// src/controllers/facturaController.js
const facturaService = require("../services/facturaService");

const facturaController = {
  /**
   * POST /api/facturas - Asignar factura (jefe de yarda)
   */
  async asignar(req, res) {
    try {
      console.log("📋 Asignando factura:", {
        numero_factura: req.body.numero_factura,
        piloto: req.body.piloto,
        numero_vehiculo: req.body.numero_vehiculo,
        usuario: req.usuario.nombre_usuario,
      });

      const facturaAsignada = await facturaService.asignarFactura(req.body);

      console.log(`✅ Factura asignada con ID: ${facturaAsignada.factura_id}`);

      res.status(201).json({
        success: true,
        data: facturaAsignada,
        message: "Factura asignada exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al asignar factura:", error.message);

      res.status(400).json({
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
};

module.exports = facturaController;

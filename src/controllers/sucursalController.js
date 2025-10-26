// src/controllers/sucursalController.js
const sucursalService = require("../services/sucursalService");

const sucursalController = {
  /**
   * GET /api/sucursales - Obtener todas las sucursales
   */
  async obtenerTodas(req, res) {
    try {
      console.log("🏭 Obteniendo sucursales...");

      const sucursales = await sucursalService.obtenerTodas();

      console.log(`✅ ${sucursales.length} sucursales encontradas`);

      res.json({
        success: true,
        data: sucursales,
        total: sucursales.length,
        message: "Sucursales obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo sucursales:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener sucursales",
      });
    }
  },

  /**
   * GET /api/sucursales/:id - Obtener sucursal por ID
   */
  async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de sucursal inválido",
          message: "El ID debe ser un número válido",
        });
      }

      console.log(`🔍 Buscando sucursal ID: ${id}`);

      const sucursal = await sucursalService.obtenerPorId(parseInt(id));

      if (!sucursal) {
        return res.status(404).json({
          success: false,
          error: "Sucursal no encontrada",
          message: `No existe una sucursal con ID ${id}`,
        });
      }

      console.log(`✅ Sucursal encontrada: ${sucursal.nombre_sucursal}`);

      res.json({
        success: true,
        data: sucursal,
        message: "Sucursal obtenida exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo sucursal:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener sucursal",
      });
    }
  },
};

module.exports = sucursalController;

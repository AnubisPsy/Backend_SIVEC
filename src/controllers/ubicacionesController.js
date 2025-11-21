// src/controllers/ubicacionesController.js
const ubicacionesService = require("../services/ubicacionesService");

const ubicacionesController = {
  /**
   * GET /api/ubicaciones - Obtener todas las ubicaciones
   */
  async obtenerTodas(req, res) {
    try {
      const usuario = req.usuario;

      // Determinar sucursal según rol
      let sucursal_id = null;

      if (usuario.rol_id === 2) {
        // Jefe: Solo su sucursal
        sucursal_id = usuario.sucursal_id;
      } else if (usuario.rol_id === 3 && req.query.sucursal_id) {
        // Admin: Puede filtrar por sucursal
        sucursal_id = parseInt(req.query.sucursal_id);
      }

/*       console.log(
        `📍 Obteniendo ubicaciones${
          sucursal_id ? ` de sucursal ${sucursal_id}` : ""
        }`
      ); */

      const datos = await ubicacionesService.obtenerTodasUbicaciones(
        sucursal_id
      );

      res.json({
        success: true,
        data: datos,
        message: "Ubicaciones obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo ubicaciones:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener ubicaciones",
      });
    }
  },

  /**
   * GET /api/ubicaciones/:numero_vehiculo - Obtener ubicación específica
   */
  async obtenerPorVehiculo(req, res) {
    try {
      const { numero_vehiculo } = req.params;
      const usuario = req.usuario;

   //   console.log(`📍 Obteniendo ubicación de: ${numero_vehiculo}`);

      const ubicacion = await ubicacionesService.obtenerUbicacionVehiculo(
        numero_vehiculo
      );

      // Verificar permisos: jefe solo puede ver vehículos de su sucursal
      if (
        usuario.rol_id === 2 &&
        ubicacion.sucursal_id !== usuario.sucursal_id
      ) {
        return res.status(403).json({
          success: false,
          error: "No tienes permisos para ver este vehículo",
        });
      }

      res.json({
        success: true,
        data: ubicacion,
        message: "Ubicación obtenida exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo ubicación:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener ubicación",
      });
    }
  },
};

module.exports = ubicacionesController;

// src/routes/vehiculos.js
const express = require("express");
const vehiculoController = require("../controllers/vehiculoController");
const { verificarAuth, soloAdmin, soloJefes } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// RUTAS CRUD BÁSICAS
// ==========================================

/**
 * GET /api/vehiculos - Obtener vehículos (filtrados por sucursal automáticamente)
 * Headers: Authorization: Bearer <token>
 * Query params: ?agrupacion=categoria&sucursal_id=2 (solo admin puede override sucursal)
 */
router.get("/", verificarAuth, vehiculoController.obtenerTodos);

/**
 * GET /api/vehiculos/:id - Obtener vehículo por ID
 * Headers: Authorization: Bearer <token>
 */
router.get("/:id", verificarAuth, vehiculoController.obtenerPorId);

/**
 * POST /api/vehiculos - Crear vehículo (solo jefes y admins)
 * Headers: Authorization: Bearer <token>
 * Body: { agrupacion?, numero_vehiculo, placa, sucursal_id? }
 */
router.post("/", verificarAuth, soloJefes, vehiculoController.crear);

/**
 * PUT /api/vehiculos/:id - Actualizar vehículo (solo jefes y admins)
 * Headers: Authorization: Bearer <token>
 */
router.put("/:id", verificarAuth, soloJefes, vehiculoController.actualizar);

/**
 * DELETE /api/vehiculos/:id - Eliminar vehículo (solo jefes y admins)
 * Headers: Authorization: Bearer <token>
 */
router.delete("/:id", verificarAuth, soloJefes, vehiculoController.eliminar);

// ==========================================
// RUTAS ESPECÍFICAS
// ==========================================

/**
 * GET /api/vehiculos/sucursal/:sucursal_id - Vehículos por sucursal específica
 * Headers: Authorization: Bearer <token>
 */
router.get(
  "/sucursal/:sucursal_id",
  verificarAuth,
  vehiculoController.obtenerPorSucursal
);

/**
 * GET /api/vehiculos/reportes/estadisticas - Estadísticas de vehículos (solo admins)
 * Headers: Authorization: Bearer <token>
 */
router.get(
  "/reportes/estadisticas",
  verificarAuth,
  soloAdmin,
  vehiculoController.obtenerEstadisticas
);

module.exports = router;

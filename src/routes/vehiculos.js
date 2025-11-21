// src/routes/vehiculos.js
const express = require("express");
const vehiculoController = require("../controllers/vehiculoController");
const { verificarAuth, soloAdmin, soloJefes } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// ⚠️ RUTAS ESPECÍFICAS PRIMERO (muy importante)
// ==========================================

/**
 * GET /api/vehiculos/reportes/estadisticas - Estadísticas de vehículos (solo admins)
 */
router.get(
  "/reportes/estadisticas",
  verificarAuth,
  soloAdmin,
  vehiculoController.obtenerEstadisticas
);

/**
 * GET /api/vehiculos/sucursal/:sucursal_id - Vehículos por sucursal específica
 */
router.get(
  "/sucursal/:sucursal_id",
  verificarAuth,
  vehiculoController.obtenerPorSucursal
);

// ==========================================
// RUTAS CRUD BÁSICAS (después de específicas)
// ==========================================

/**
 * GET /api/vehiculos - Obtener vehículos (filtrados por sucursal automáticamente)
 */
router.get("/", verificarAuth, vehiculoController.obtenerTodos);

/**
 * POST /api/vehiculos - Crear vehículo (solo jefes y admins)
 */
router.post("/", verificarAuth, soloJefes, vehiculoController.crear);

/**
 * GET /api/vehiculos/:id - Obtener vehículo por ID
 */
router.get("/:id", verificarAuth, vehiculoController.obtenerPorId);

/**
 * PUT /api/vehiculos/:id - Actualizar vehículo (solo jefes y admins)
 */
router.put("/:id", verificarAuth, soloJefes, vehiculoController.actualizar);

/**
 * DELETE /api/vehiculos/:id - Eliminar vehículo (solo jefes y admins)
 */
router.delete("/:id", verificarAuth, soloJefes, vehiculoController.eliminar);

/**
 * PATCH /api/vehiculos/:id/desactivar - Desactivar vehículo (solo jefes y admins)
 */
router.patch(
  "/:id/desactivar",
  verificarAuth,
  soloJefes,
  vehiculoController.desactivar
);

/**
 * PATCH /api/vehiculos/:id/activar - Activar vehículo (solo jefes y admins)
 */
router.patch(
  "/:id/activar",
  verificarAuth,
  soloJefes,
  vehiculoController.activar
);

module.exports = router;

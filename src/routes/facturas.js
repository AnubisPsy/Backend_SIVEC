// src/routes/facturas.js
const express = require("express");
const facturaController = require("../controllers/facturaController");
const { verificarAuth, soloJefes, soloAdmin } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// RUTAS CRUD BÁSICAS
// ==========================================

/**
 * POST /api/facturas - Asignar factura (solo jefes y admins)
 * Headers: Authorization: Bearer <token>
 * Body: { numero_factura, piloto, numero_vehiculo, fecha_asignacion?, notas_jefe? }
 */
router.post("/", verificarAuth, soloJefes, facturaController.asignar);

/**
 * GET /api/facturas - Obtener todas las facturas (requiere auth)
 * Headers: Authorization: Bearer <token>
 * Query params: ?estado_id=1&piloto=Juan&numero_vehiculo=CAM-001&fecha_desde=2024-01-01&fecha_hasta=2024-12-31
 */
router.get("/", verificarAuth, facturaController.obtenerTodas);

/**
 * GET /api/facturas/:id - Obtener factura por ID (requiere auth)
 * Headers: Authorization: Bearer <token>
 */
router.get("/:id", verificarAuth, facturaController.obtenerPorId);

/**
 * PUT /api/facturas/:id - Actualizar factura (solo jefes y admins)
 * Headers: Authorization: Bearer <token>
 */
router.put("/:id", verificarAuth, soloJefes, facturaController.actualizar);

/**
 * DELETE /api/facturas/:id - Eliminar factura (solo jefes y admins)
 * Headers: Authorization: Bearer <token>
 */
router.delete("/:id", verificarAuth, soloJefes, facturaController.eliminar);

// ==========================================
// RUTAS ESPECÍFICAS PARA SIVEC
// ==========================================

/**
 * GET /api/facturas/status/pendientes - Facturas pendientes (estado 1)
 * Headers: Authorization: Bearer <token>
 */
router.get(
  "/status/pendientes",
  verificarAuth,
  facturaController.obtenerPendientes
);

/**
 * GET /api/facturas/status/despachadas - Facturas despachadas (estado 2)
 * Headers: Authorization: Bearer <token>
 * Query params: ?fecha_desde=2024-01-01&fecha_hasta=2024-12-31
 */
router.get(
  "/status/despachadas",
  verificarAuth,
  facturaController.obtenerDespachadas
);

/**
 * GET /api/facturas/reportes/estadisticas - Estadísticas de facturas
 * Headers: Authorization: Bearer <token>
 * Query params: ?fecha_desde=2024-01-01&fecha_hasta=2024-12-31
 */
router.get(
  "/reportes/estadisticas",
  verificarAuth,
  facturaController.obtenerEstadisticas
);

module.exports = router;

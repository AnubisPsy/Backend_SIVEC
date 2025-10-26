// src/routes/viajes.js
const express = require("express");
const router = express.Router();
const viajeController = require("../controllers/viajeController");
const { verificarAuth } = require("../middleware/auth");

// Aplicar autenticación a todas las rutas
router.use(verificarAuth);

// ==========================================
// RUTAS ESPECÍFICAS (PRIMERO)
// ==========================================

/**
 * GET /api/viajes/recientes - Obtener viajes de las últimas 24 horas
 * Headers: Authorization: Bearer <token>
 * Response: Viajes completados en las últimas 24h de la sucursal del usuario
 */
router.get("/recientes", viajeController.obtenerRecientes);

/**
 * GET /api/viajes/historial - Obtener viajes completados con filtros
 * Headers: Authorization: Bearer <token>
 * Query params: ?fecha_desde=2025-01-01&fecha_hasta=2025-01-31&piloto=Juan&numero_vehiculo=C-30
 * Response: Viajes filtrados con estadísticas
 */
router.get("/historial", viajeController.obtenerHistorial);

// ==========================================
// RUTAS GENÉRICAS (DESPUÉS)
// ==========================================

/**
 * GET /api/viajes - Obtener viajes filtrados por sucursal
 * Headers: Authorization: Bearer <token>
 * Query params: ?estado=activo (7,8) | ?estado=9 (completado)
 * Response: Viajes con facturas y guías
 */
router.get("/", viajeController.obtenerTodos);

/**
 * GET /api/viajes/:id - Obtener detalle específico de un viaje
 * Headers: Authorization: Bearer <token>
 * Params: id (viaje_id)
 * Response: Viaje completo con facturas y guías
 */
router.get("/:id", viajeController.obtenerPorId);

module.exports = router;

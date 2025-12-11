// src/routes/pilotos.js
const express = require("express");
const pilotoController = require("../controllers/pilotoController");
const { verificarAuth, soloAdmin } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

/**
 * GET /api/pilotos - Obtener todos los pilotos activos (desde SQL Server)
 * Headers: Authorization: Bearer <token>
 */
router.get("/", verificarAuth, pilotoController.obtenerTodos);

/**
 * GET /api/pilotos/buscar - Buscar pilotos por término
 * Headers: Authorization: Bearer <token>
 * Query params: ?q=juan (término de búsqueda)
 */
router.get("/buscar", verificarAuth, pilotoController.buscar);

/**
 * POST /api/pilotos/validar - Validar que un piloto existe
 * Headers: Authorization: Bearer <token>
 * Body: { nombre_piloto: "Juan Rodriguez" }
 */
router.post("/validar", verificarAuth, pilotoController.validar);

/**
 * GET /api/pilotos/sql - Obtener pilotos SQL Server para migración (solo admins)
 * Headers: Authorization: Bearer <token>
 */
router.get(
  "/sql",
  verificarAuth,
  soloAdmin,
  pilotoController.obtenerPilotosSQL
);

// ==========================================
// RUTAS ADMINISTRATIVAS
// ==========================================

/**
 * GET /api/pilotos/estadisticas - Estadísticas de pilotos (solo admins)
 * Headers: Authorization: Bearer <token>
 */
router.get(
  "/estadisticas",
  verificarAuth,
  soloAdmin,
  pilotoController.obtenerEstadisticas
);

/**
 * GET /api/pilotos/test-conexion - Probar conexión con sistema externo (solo admins)
 * Headers: Authorization: Bearer <token>
 */
router.get(
  "/test-conexion",
  verificarAuth,
  soloAdmin,
  pilotoController.probarConexion
);

module.exports = router;

// src/routes/pilotos-temporales.js
const express = require("express");
const router = express.Router();
const pilotoTemporalController = require("../controllers/pilotoTemporalController");
const { verificarAuth, soloAdmin } = require("../middleware/auth");

// Todas las rutas requieren autenticación de admin
router.use(verificarAuth);
router.use(soloAdmin);

/**
 * GET /api/pilotos-temporales - Obtener todos los pilotos temporales
 * Headers: Authorization: Bearer <token>
 */
router.get("/", pilotoTemporalController.obtenerTodos);

/**
 * POST /api/pilotos-temporales - Crear piloto temporal
 * Headers: Authorization: Bearer <token>
 * Body: { nombre, notas? }
 */
router.post("/", pilotoTemporalController.crear);

/**
 * PUT /api/pilotos-temporales/:id - Actualizar piloto temporal
 * Headers: Authorization: Bearer <token>
 * Body: { nombre, notas? }
 */
router.put("/:id", pilotoTemporalController.actualizar);

/**
 * PATCH /api/pilotos-temporales/:id/toggle - Activar/Desactivar
 * Headers: Authorization: Bearer <token>
 */
router.patch("/:id/toggle", pilotoTemporalController.toggleActivo);

module.exports = router;

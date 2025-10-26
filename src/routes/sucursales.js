// src/routes/sucursales.js
const express = require("express");
const router = express.Router();
const sucursalController = require("../controllers/sucursalController");
const { verificarAuth } = require("../middleware/auth");

// Aplicar autenticación a todas las rutas
router.use(verificarAuth);

/**
 * GET /api/sucursales - Obtener todas las sucursales
 * Headers: Authorization: Bearer <token>
 */
router.get("/", sucursalController.obtenerTodas);

/**
 * GET /api/sucursales/:id - Obtener sucursal por ID
 * Headers: Authorization: Bearer <token>
 */
router.get("/:id", sucursalController.obtenerPorId);

module.exports = router;

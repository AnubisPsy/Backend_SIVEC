// src/routes/ubicaciones.js
const express = require("express");
const router = express.Router();
const ubicacionesController = require("../controllers/ubicacionesController");
const { verificarAuth, soloJefes } = require("../middleware/auth");

// Todas las rutas requieren autenticación y ser jefe o admin
router.use(verificarAuth);
router.use(soloJefes);

/**
 * GET /api/ubicaciones - Obtener todas las ubicaciones
 * Query params: ?sucursal_id=1 (solo para admins)
 */
router.get("/", ubicacionesController.obtenerTodas);

/**
 * GET /api/ubicaciones/:numero_vehiculo - Ubicación específica
 */
router.get("/:numero_vehiculo", ubicacionesController.obtenerPorVehiculo);

module.exports = router;

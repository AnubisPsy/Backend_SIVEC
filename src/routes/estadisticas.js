// src/routes/estadisticas.js
const express = require("express");
const router = express.Router();
const estadisticasController = require("../controllers/estadisticasController");
const { verificarAuth } = require("../middleware/auth"); // ← CAMBIAR: desestructurar verificarAuth

// Todas las rutas requieren autenticación
router.use(verificarAuth); // ← CAMBIAR: usar verificarAuth en lugar de auth

// GET /api/estadisticas/dashboard
router.get("/dashboard", estadisticasController.obtenerDashboard);

// GET /api/estadisticas/entregas-por-hora
router.get("/entregas-por-hora", estadisticasController.obtenerEntregasPorHora);

// GET /api/estadisticas/viajes-por-sucursal
router.get(
  "/viajes-por-sucursal",
  estadisticasController.obtenerViajesPorSucursal
);

// GET /api/estadisticas/top-pilotos
router.get("/top-pilotos", estadisticasController.obtenerTopPilotos);

// GET /api/estadisticas/actividad-reciente
router.get(
  "/actividad-reciente",
  estadisticasController.obtenerActividadReciente
);

// GET /api/estadisticas/tendencia-semanal
router.get(
  "/tendencia-semanal",
  estadisticasController.obtenerTendenciaSemanal
);

// GET /api/estadisticas/comparacion-estados
router.get(
  "/comparacion-estados",
  estadisticasController.obtenerComparacionEstados
);

module.exports = router;

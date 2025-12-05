// src/routes/viajes.js
const express = require("express");
const router = express.Router();
const viajeController = require("../controllers/viajeController");
const { verificarAuth } = require("../middleware/auth");

// Autenticación para todas las rutas
router.use(verificarAuth);

// ==========================================
// RUTAS ESPECÍFICAS (PRIMERO)
// ==========================================

// Últimas 24 horas
router.get("/recientes", viajeController.obtenerRecientes);

// Historial con filtros
router.get("/historial", viajeController.obtenerHistorial);

// Viajes por piloto
router.get("/piloto/:piloto_id", viajeController.obtenerViajesPiloto);

// ==========================================
// RUTAS GENÉRICAS (DESPUÉS)
// ==========================================

// Obtener viajes filtrados por sucursal
router.get("/", viajeController.obtenerTodos);

router.get("/sucursales", viajeController.obtenerSucursales);
router.get("/pilotos", viajeController.obtenerTodosPilotos);
router.get("/vehiculos", viajeController.obtenerVehiculosPorSucursal);

// Reporte dinámico (segmento fijo, va antes de :id)
router.get("/reportes/dinamico", viajeController.obtenerReporteDinamico);

// ==========================================
// RUTA POR ID (AL FINAL SIEMPRE)
// ==========================================

// Detalle de un viaje
router.get("/:id", viajeController.obtenerPorId);

module.exports = router;

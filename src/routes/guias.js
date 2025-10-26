// src/routes/guias.js
const express = require("express");
const router = express.Router();
const guiaController = require("../controllers/guiaController");
const { verificarAuth } = require("../middleware/auth");

// Todas las rutas requieren autenticación
router.use(verificarAuth);

// Middleware de log (opcional, puedes quitarlo después)
router.use((req, res, next) => {
  console.log(`🎯 ${req.method} /api/guias${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Body:", req.body);
  }
  next();
});

// ==========================================
// RUTAS ESPECÍFICAS (PRIMERO)
// ==========================================

/**
 * GET /api/guias/factura/:numero_factura - Obtener guías de una factura
 * Headers: Authorization: Bearer <token>
 */
router.get("/factura/:numero_factura", guiaController.obtenerPorFactura);

/**
 * PATCH /api/guias/:id/estado - Actualizar estado de guía
 * Headers: Authorization: Bearer <token>
 * Body: { estado_id: 4 } // 3=asignada, 4=entregada, 5=no_entregada
 */
router.patch("/:id/estado", guiaController.actualizarEstado);

// ==========================================
// RUTAS GENERALES (DESPUÉS)
// ==========================================

/**
 * POST /api/guias - Crear guía (vincular a factura)
 * Headers: Authorization: Bearer <token>
 * Body: { numero_guia, numero_factura, detalle_producto?, direccion?, fecha_emision? }
 */
router.post("/", guiaController.crear);

/**
 * GET /api/guias/:id - Obtener guía por ID
 * Headers: Authorization: Bearer <token>
 */
router.get("/:id", guiaController.obtenerPorId);

module.exports = router;

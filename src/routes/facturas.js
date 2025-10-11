// src/routes/facturas.js
const express = require("express");
const facturaController = require("../controllers/facturaController");
const { verificarAuth, soloJefes, soloAdmin } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// RUTAS ESPECÍFICAS PARA SIVEC (PRIMERO)
// ==========================================

/**
 * GET /api/facturas/form-data - Obtener datos para el formulario
 * Headers: Authorization: Bearer <token>
 */
router.get(
  "/form-data",
  verificarAuth,
  facturaController.obtenerDatosFormulario
);

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

// ==========================================
// RUTAS CRUD BÁSICAS (DESPUÉS)
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

/**
 * GET /api/facturas/piloto/:piloto - Facturas de un piloto específico
 */
router.get(
  "/piloto/:piloto",
  verificarAuth,
  facturaController.obtenerFacturasPiloto
);

/**
 * GET /api/facturas/:numero_factura/guias-disponibles - Guías disponibles
 */
router.get(
  "/:numero_factura/guias-disponibles",
  verificarAuth,
  facturaController.obtenerGuiasDisponibles
);

// POST /api/facturas/asignar
router.post("/asignar", async (req, res) => {
  try {
    const { numero_vehiculo, piloto, facturas, notas } = req.body;

    // Validar
    if (!numero_vehiculo || !piloto || !facturas || facturas.length === 0) {
      return res.status(400).json({
        error: "Faltan datos requeridos",
      });
    }

    // 1. Crear el viaje
    const { data: viaje, error: viajeError } = await supabase
      .from("viaje")
      .insert({
        numero_vehiculo,
        piloto,
        estado_viaje: "pendiente",
      })
      .select()
      .single();

    if (viajeError) throw viajeError;

    // 2. Asignar facturas al viaje
    const facturasData = facturas.map((factura) => ({
      numero_factura: factura.numero_factura,
      piloto,
      numero_vehiculo,
      fecha_asignacion: new Date().toISOString().split("T")[0],
      estado_id: 1,
      viaje_id: viaje.viaje_id,
      notas_jefe: factura.notas || notas || null,
    }));

    const { data: facturasCreadas, error: facturasError } = await supabase
      .from("factura_asignada")
      .insert(facturasData)
      .select();

    if (facturasError) throw facturasError;

    res.status(201).json({
      success: true,
      viaje_id: viaje.viaje_id,
      facturas: facturasCreadas,
    });
  } catch (error) {
    console.error("Error asignando facturas:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
    });
  }
});

module.exports = router;

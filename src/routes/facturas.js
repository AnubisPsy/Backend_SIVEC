// src/routes/facturas.js
const express = require("express");
const facturaController = require("../controllers/facturaController");
const { verificarAuth, soloJefes, soloAdmin } = require("../middleware/auth");
const { supabase } = require("../config/database");

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
// GET /api/facturas/piloto/:piloto_id/con-guias
router.get("/piloto/:piloto_id/con-guias", async (req, res) => {
  try {
    const { piloto_id } = req.params; // ✨ Ahora recibe piloto_id

    // Obtener facturas del piloto por ID
    const { data: facturas, error: errorFacturas } = await supabase
      .from("factura_asignada")
      .select("*")
      .eq("piloto_id", piloto_id) // ✨ Filtrar por piloto_id
      .eq("estado_id", 1)
      .order("created_at", { ascending: false });

    if (errorFacturas) throw errorFacturas;

    // Para cada factura, buscar su guía
    const facturasConGuias = await Promise.all(
      facturas.map(async (factura) => {
        const { data: guia } = await supabase
          .from("guia_remision")
          .select(
            `
            *,
            estados (codigo, nombre)
          `
          )
          .eq("factura_id", factura.factura_id)
          .single();

        return {
          ...factura,
          guia: guia || null,
        };
      })
    );

    res.json({
      success: true,
      data: facturasConGuias,
    });
  } catch (error) {
    console.error("Error obteniendo facturas con guías:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener facturas",
      error: error.message,
    });
  }
});

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

// GET /api/facturas/piloto/:piloto_id/con-guias-disponibles
router.get(
  "/piloto/:piloto_id/con-guias-disponibles",
  verificarAuth,
  async (req, res) => {
    try {
      const { piloto_id } = req.params;

      console.log(
        `🔍 Obteniendo facturas con guías para usuario: ${piloto_id}`
      );

      // 1. Obtener el usuario y su vinculación con piloto
      const { data: usuario, error: errorUsuario } = await supabase
        .from("usuario")
        .select("piloto_sql_id, piloto_temporal_id, nombre_usuario")
        .eq("usuario_id", piloto_id)
        .single();

      if (errorUsuario) throw errorUsuario;

      let nombrePiloto = null;

      // 2. Si tiene vinculación con piloto temporal, obtener el nombre
      if (usuario.piloto_temporal_id) {
        const { data: pilotoTemp } = await supabase
          .from("piloto_temporal")
          .select("nombre")
          .eq("piloto_temporal_id", usuario.piloto_temporal_id)
          .single();

        if (pilotoTemp) nombrePiloto = pilotoTemp.nombre;
      }

      // 3. Si tiene vinculación con SQL, buscar en SQL Server
      else if (usuario.piloto_sql_id) {
        const sql = require("mssql");
        const { sqlConfig } = require("../config/database");
        const pool = await sql.connect(sqlConfig);

        const result = await pool
          .request()
          .input("piloto_id", sql.Int, usuario.piloto_sql_id)
          .query("SELECT nombre FROM pilotos WHERE piloto_id = @piloto_id");

        await pool.close();

        if (result.recordset.length > 0) {
          nombrePiloto = result.recordset[0].nombre;
        }
      }

      // 4. Si no tiene vinculación, intentar con nombre_usuario como fallback
      if (!nombrePiloto) {
        nombrePiloto = usuario.nombre_usuario;
        console.log(
          `⚠️ Usuario sin vinculación, usando nombre_usuario: ${nombrePiloto}`
        );
      }

      console.log(`👤 Nombre del piloto para buscar: ${nombrePiloto}`);

      // 5. Buscar facturas por nombre del piloto O por nombre de usuario (como fallback)
      const { data: facturas, error: errorFacturas } = await supabase
        .from("factura_asignada")
        .select("*")
        .or(`piloto.eq.${nombrePiloto},piloto.eq.${usuario.nombre_usuario}`) // ← Buscar ambos
        .eq("estado_id", 1) // Solo pendientes
        .order("created_at", { ascending: false });

      if (errorFacturas) throw errorFacturas;

      console.log(`📋 ${facturas.length} facturas encontradas`);

      // 6. Para cada factura, buscar guías disponibles en SQL Server
      const sql = require("mssql");
      const { sqlConfig } = require("../config/database");

      const pool = await sql.connect(sqlConfig);

      const facturasConGuias = await Promise.all(
        facturas.map(async (factura) => {
          try {
            const query = `
              SELECT 
                d.referencia AS numero_guia,
                d.documento AS numero_factura,
                vd.descripcion AS detalle_producto,
                vd.cantidad,
                vd.direccion_entrega,
                d.created_at AS fecha_emision
              FROM despachos d
              LEFT JOIN ventas_detalle vd ON d.venta_id = vd.venta_id
              WHERE d.estado = 8 
                AND d.referencia IS NOT NULL
                AND d.documento = @numero_factura
              ORDER BY d.created_at DESC
            `;

            const result = await pool
              .request()
              .input("numero_factura", sql.VarChar, factura.numero_factura)
              .query(query);

            // Filtrar guías que NO estén ya en Supabase
            const guiasDisponibles = [];

            for (const guia of result.recordset) {
              const { data: guiaExiste } = await supabase
                .from("guia_remision")
                .select("guia_id")
                .eq("numero_guia", guia.numero_guia)
                .single();

              if (!guiaExiste) {
                guiasDisponibles.push(guia);
              }
            }

            return {
              ...factura,
              guias_disponibles: guiasDisponibles,
              total_guias: guiasDisponibles.length,
            };
          } catch (error) {
            console.error(
              `Error procesando factura ${factura.numero_factura}:`,
              error
            );
            return {
              ...factura,
              guias_disponibles: [],
              total_guias: 0,
            };
          }
        })
      );

      await pool.close();

      console.log(`✅ ${facturasConGuias.length} facturas procesadas`);

      res.json({
        success: true,
        data: facturasConGuias,
        message: "Facturas con guías obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo facturas:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener facturas con guías",
      });
    }
  }
);

module.exports = router;

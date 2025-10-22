const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { verificarAuth } = require("../middleware/auth"); // ✨ IMPORTAR

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ✨ AGREGAR MIDDLEWARE - CRÍTICO
router.use(verificarAuth);

// GET /api/viajes - Obtener viajes filtrados por sucursal
router.get("/", async (req, res) => {
  try {
    const { estado } = req.query;
    const usuario = req.usuario;

    console.log(
      `🔍 Usuario: ${usuario.nombre_usuario} | Rol: ${usuario.rol_id} | Sucursal: ${usuario.sucursal_id}`
    );

    let query = supabase.from("viaje").select(`
        viaje_id,
        numero_vehiculo,
        piloto,
        fecha_viaje,
        estado_viaje,
        created_at
      `);

    if (estado === "activo") {
      query = query.in("estado_viaje", [7, 8]);
    } else if (estado) {
      query = query.eq("estado_viaje", estado);
    }

    const { data: viajes, error: viajesError } = await query.order(
      "created_at",
      { ascending: false }
    );

    if (viajesError) throw viajesError;

    console.log(`📋 Total viajes encontrados: ${viajes.length}`);

    const viajesCompletos = await Promise.all(
      viajes.map(async (viaje) => {
        // Obtener vehículo CON sucursal_id
        const { data: vehiculo } = await supabase
          .from("vehiculo")
          .select("placa, agrupacion, sucursal_id")
          .eq("numero_vehiculo", viaje.numero_vehiculo)
          .single();

        console.log(
          `🚛 Viaje ${viaje.viaje_id} | Vehículo: ${viaje.numero_vehiculo} | Sucursal: ${vehiculo?.sucursal_id}`
        );

        // ✅ FILTRAR: Admin ve todos, otros solo su sucursal
        if (
          usuario.rol_id !== 3 &&
          vehiculo?.sucursal_id !== usuario.sucursal_id
        ) {
          console.log(
            `❌ Viaje ${viaje.viaje_id} FILTRADO (sucursal ${vehiculo?.sucursal_id} != ${usuario.sucursal_id})`
          );
          return null;
        }

        console.log(`✅ Viaje ${viaje.viaje_id} PERMITIDO`);

        // Obtener facturas del viaje
        const { data: facturas } = await supabase
          .from("factura_asignada")
          .select("factura_id, numero_factura, estado_id, notas_jefe")
          .eq("viaje_id", viaje.viaje_id);

        // Para cada factura, obtener sus guías
        // Para cada factura, obtener sus guías
        const facturasConGuias = await Promise.all(
          (facturas || []).map(async (factura) => {
            console.log(
              `🔍 Buscando guías para factura: ${factura.numero_factura}`
            ); // ← AGREGAR

            const { data: guias, error: guiasError } = await supabase // ← AGREGAR error
              .from("guia_remision")
              .select(
                `
        guia_id,
        numero_guia,
        detalle_producto,
        direccion,
        estado_id,
        fecha_entrega,
        estados (nombre, codigo)
      `
              )
              .eq("numero_factura", factura.numero_factura);

            console.log(`📦 Guías encontradas:`, guias?.length || 0); // ← AGREGAR
            console.log(`❌ Error:`, guiasError); // ← AGREGAR

            if (guias) {
              console.log(`📋 Detalle guías:`, guias); // ← AGREGAR
            }

            return {
              ...factura,
              guias: guias || [],
            };
          })
        );

        return {
          ...viaje,
          vehiculo,
          facturas: facturasConGuias,
          total_guias: facturasConGuias.reduce(
            (sum, f) => sum + f.guias.length,
            0
          ),
          guias_entregadas: facturasConGuias.reduce(
            (sum, f) => sum + f.guias.filter((g) => g.estado_id === 4).length,
            0
          ),
        };
      })
    );

    const viajesFiltrados = viajesCompletos.filter((v) => v !== null);

    console.log(
      `✅ Viajes mostrados: ${viajesFiltrados.length} de ${viajes.length}`
    );

    res.json(viajesFiltrados);
  } catch (error) {
    console.error("❌ Error obteniendo viajes:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
    });
  }
});

// GET /api/viajes/:id - Obtener detalle específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.usuario;

    const { data: viaje, error } = await supabase
      .from("viaje")
      .select(
        `
        *,
        vehiculo:numero_vehiculo (placa, agrupacion, sucursal_id)
      `
      )
      .eq("viaje_id", id)
      .single();

    if (error) throw error;

    // Validar permisos
    if (
      usuario.rol_id !== 3 &&
      viaje.vehiculo?.sucursal_id !== usuario.sucursal_id
    ) {
      return res.status(403).json({
        error: "No tienes permiso para ver este viaje",
      });
    }

    // Obtener facturas y guías
    const { data: facturas } = await supabase
      .from("factura_asignada")
      .select("*")
      .eq("viaje_id", id);

    const facturasConGuias = await Promise.all(
      (facturas || []).map(async (factura) => {
        const { data: guias } = await supabase
          .from("guia_remision")
          .select(
            `
            *,
            estados (nombre, codigo)
          `
          )
          .eq("numero_factura", factura.numero_factura);

        return {
          ...factura,
          guias: guias || [],
        };
      })
    );

    // ← AGREGAR ESTO AQUÍ
    const total_guias = facturasConGuias.reduce(
      (sum, f) => sum + f.guias.length,
      0
    );

    const guias_entregadas = facturasConGuias.reduce(
      (sum, f) => sum + f.guias.filter((g) => g.estado_id === 4).length,
      0
    );

    res.json({
      ...viaje,
      facturas: facturasConGuias,
      total_guias, // ← AGREGAR
      guias_entregadas, // ← AGREGAR
    });
  } catch (error) {
    console.error("Error obteniendo viaje:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
    });
  }
});
module.exports = router;

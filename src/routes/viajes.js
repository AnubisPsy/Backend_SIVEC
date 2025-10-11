const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GET /api/viajes - Obtener todos los viajes activos
router.get("/", async (req, res) => {
  try {
    const { estado } = req.query;

    let query = supabase.from("viaje").select(`
        viaje_id,
        numero_vehiculo,
        piloto,
        timestamp_salida,
        timestamp_regreso,
        estado_viaje,
        created_at
      `);

    // Filtrar por estado si se proporciona
    if (estado) {
      if (estado === "activo") {
        query = query.in("estado_viaje", ["pendiente", "en_curso"]);
      } else {
        query = query.eq("estado_viaje", estado);
      }
    }

    const { data: viajes, error: viajesError } = await query.order(
      "created_at",
      { ascending: false }
    );

    if (viajesError) throw viajesError;

    // Para cada viaje, obtener facturas y guías
    const viajesCompletos = await Promise.all(
      viajes.map(async (viaje) => {
        // Obtener facturas del viaje
        const { data: facturas } = await supabase
          .from("factura_asignada")
          .select("factura_id, numero_factura, estado_id, notas_jefe")
          .eq("viaje_id", viaje.viaje_id);

        // Para cada factura, obtener sus guías
        const facturasConGuias = await Promise.all(
          (facturas || []).map(async (factura) => {
            const { data: guias } = await supabase
              .from("guia_remision")
              .select(
                `
                guia_id,
                numero_guia,
                detalle_producto,
                cliente,
                direccion,
                estado_id,
                fecha_entrega,
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

        // Obtener datos del vehículo
        const { data: vehiculo } = await supabase
          .from("vehiculo")
          .select("placa, agrupacion")
          .eq("numero_vehiculo", viaje.numero_vehiculo)
          .single();

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

    res.json(viajesCompletos);
  } catch (error) {
    console.error("Error obteniendo viajes:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
    });
  }
});

// GET /api/viajes/:id - Obtener detalle de un viaje específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: viaje, error } = await supabase
      .from("viaje")
      .select(
        `
        *,
        vehiculo:numero_vehiculo (placa, agrupacion)
      `
      )
      .eq("viaje_id", id)
      .single();

    if (error) throw error;

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

    res.json({
      ...viaje,
      facturas: facturasConGuias,
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

const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { verificarAuth } = require("../middleware/auth");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ✨ AGREGAR MIDDLEWARE - CRÍTICO
router.use(verificarAuth);

// ==========================================
// RUTAS ESPECÍFICAS (DEBEN IR PRIMERO)
// ==========================================

// GET /api/viajes/recientes - Obtener viajes de las últimas 24 horas por sucursal
router.get("/recientes", async (req, res) => {
  try {
    const { sucursal_id } = req.usuario;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        error: "Usuario sin sucursal asignada",
      });
    }

    console.log(`📊 Obteniendo viajes recientes de sucursal: ${sucursal_id}`);

    const hace24Horas = new Date();
    hace24Horas.setHours(hace24Horas.getHours() - 24);

    const { data: viajes, error } = await supabase
      .from("viaje")
      .select(
        `
        viaje_id,
        numero_vehiculo,
        piloto,
        fecha_viaje,
        estado_viaje,
        created_at,
        updated_at,
        creado_automaticamente
      `
      )
      .eq("estado_viaje", 9)
      .gte("updated_at", hace24Horas.toISOString())
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const { data: vehiculosSucursal } = await supabase
      .from("vehiculo")
      .select("numero_vehiculo")
      .eq("sucursal_id", sucursal_id);

    const numerosVehiculos =
      vehiculosSucursal?.map((v) => v.numero_vehiculo) || [];

    const viajesFiltrados = viajes.filter((v) =>
      numerosVehiculos.includes(v.numero_vehiculo)
    );

    const viajesConDetalles = await Promise.all(
      viajesFiltrados.map(async (viaje) => {
        const { data: facturas } = await supabase
          .from("factura_asignada")
          .select("numero_factura, notas_jefe")
          .eq("viaje_id", viaje.viaje_id);

        const { data: guias } = await supabase
          .from("guia_remision")
          .select(
            `
            guia_id,
            numero_guia,
            estado_id,
            fecha_entrega,
            estados:estado_id (nombre)
          `
          )
          .eq("viaje_id", viaje.viaje_id);

        const totalGuias = guias?.length || 0;
        const guiasEntregadas =
          guias?.filter((g) => g.estado_id === 4).length || 0;
        const guiasNoEntregadas =
          guias?.filter((g) => g.estado_id === 5).length || 0;

        return {
          ...viaje,
          facturas: facturas || [],
          guias: guias || [],
          estadisticas: {
            total_facturas: facturas?.length || 0,
            total_guias: totalGuias,
            guias_entregadas: guiasEntregadas,
            guias_no_entregadas: guiasNoEntregadas,
            porcentaje_exito:
              totalGuias > 0
                ? Math.round((guiasEntregadas / totalGuias) * 100)
                : 0,
          },
        };
      })
    );

    const estadisticas = {
      total_viajes: viajesConDetalles.length,
      total_facturas: viajesConDetalles.reduce(
        (sum, v) => sum + v.estadisticas.total_facturas,
        0
      ),
      total_guias: viajesConDetalles.reduce(
        (sum, v) => sum + v.estadisticas.total_guias,
        0
      ),
      total_entregadas: viajesConDetalles.reduce(
        (sum, v) => sum + v.estadisticas.guias_entregadas,
        0
      ),
    };

    console.log(
      `✅ ${viajesConDetalles.length} viajes recientes de sucursal ${sucursal_id}`
    );

    res.json({
      success: true,
      data: viajesConDetalles,
      estadisticas,
      periodo: "Últimas 24 horas",
    });
  } catch (error) {
    console.error("❌ Error obteniendo viajes recientes:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/viajes/historial - Obtener viajes completados con filtros
router.get("/historial", async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, piloto, numero_vehiculo } = req.query;

    console.log("📊 Obteniendo historial de viajes:", {
      fecha_desde,
      fecha_hasta,
      piloto,
      numero_vehiculo,
    });

    let query = supabase
      .from("viaje")
      .select(
        `
        viaje_id,
        numero_vehiculo,
        piloto,
        fecha_viaje,
        estado_viaje,
        created_at,
        updated_at,
        creado_automaticamente
      `
      )
      .eq("estado_viaje", 9)
      .order("updated_at", { ascending: false });

    if (fecha_desde) {
      query = query.gte("fecha_viaje", fecha_desde);
    }

    if (fecha_hasta) {
      query = query.lte("fecha_viaje", fecha_hasta);
    }

    if (piloto) {
      query = query.ilike("piloto", `%${piloto}%`);
    }

    if (numero_vehiculo) {
      query = query.eq("numero_vehiculo", numero_vehiculo);
    }

    const { data: viajes, error } = await query;

    if (error) throw error;

    const viajesConDetalles = await Promise.all(
      viajes.map(async (viaje) => {
        const { data: facturas } = await supabase
          .from("factura_asignada")
          .select("numero_factura, notas_jefe")
          .eq("viaje_id", viaje.viaje_id);

        const { data: guias } = await supabase
          .from("guia_remision")
          .select(
            `
            guia_id,
            numero_guia,
            estado_id,
            fecha_entrega,
            estados:estado_id (nombre)
          `
          )
          .eq("viaje_id", viaje.viaje_id);

        const totalGuias = guias?.length || 0;
        const guiasEntregadas =
          guias?.filter((g) => g.estado_id === 4).length || 0;
        const guiasNoEntregadas =
          guias?.filter((g) => g.estado_id === 5).length || 0;

        return {
          ...viaje,
          facturas: facturas || [],
          guias: guias || [],
          estadisticas: {
            total_facturas: facturas?.length || 0,
            total_guias: totalGuias,
            guias_entregadas: guiasEntregadas,
            guias_no_entregadas: guiasNoEntregadas,
            porcentaje_exito:
              totalGuias > 0
                ? Math.round((guiasEntregadas / totalGuias) * 100)
                : 0,
          },
        };
      })
    );

    const estadisticasGenerales = {
      total_viajes: viajesConDetalles.length,
      total_facturas: viajesConDetalles.reduce(
        (sum, v) => sum + v.estadisticas.total_facturas,
        0
      ),
      total_guias: viajesConDetalles.reduce(
        (sum, v) => sum + v.estadisticas.total_guias,
        0
      ),
      total_entregadas: viajesConDetalles.reduce(
        (sum, v) => sum + v.estadisticas.guias_entregadas,
        0
      ),
      pilotos_activos: [...new Set(viajesConDetalles.map((v) => v.piloto))]
        .length,
    };

    console.log(`✅ ${viajesConDetalles.length} viajes en historial`);

    res.json({
      success: true,
      data: viajesConDetalles,
      estadisticas: estadisticasGenerales,
      filtros: {
        fecha_desde,
        fecha_hasta,
        piloto,
        numero_vehiculo,
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo historial:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// RUTAS GENÉRICAS (DESPUÉS)
// ==========================================

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
        const { data: vehiculo } = await supabase
          .from("vehiculo")
          .select("placa, agrupacion, sucursal_id")
          .eq("numero_vehiculo", viaje.numero_vehiculo)
          .single();

        console.log(
          `🚛 Viaje ${viaje.viaje_id} | Vehículo: ${viaje.numero_vehiculo} | Sucursal: ${vehiculo?.sucursal_id}`
        );

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

        const { data: facturas } = await supabase
          .from("factura_asignada")
          .select("factura_id, numero_factura, estado_id, notas_jefe")
          .eq("viaje_id", viaje.viaje_id);

        const facturasConGuias = await Promise.all(
          (facturas || []).map(async (factura) => {
            console.log(
              `🔍 Buscando guías para factura: ${factura.numero_factura}`
            );

            const { data: guias, error: guiasError } = await supabase
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

            console.log(`📦 Guías encontradas:`, guias?.length || 0);
            console.log(`❌ Error:`, guiasError);

            if (guias) {
              console.log(`📋 Detalle guías:`, guias);
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

    if (
      usuario.rol_id !== 3 &&
      viaje.vehiculo?.sucursal_id !== usuario.sucursal_id
    ) {
      return res.status(403).json({
        error: "No tienes permiso para ver este viaje",
      });
    }

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
      total_guias,
      guias_entregadas,
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

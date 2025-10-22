const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { verificarAuth } = require("../middleware/auth");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Todas las rutas requieren autenticación
router.use(verificarAuth);

// POST /api/guias - Crear guía (vincular a factura)
router.post("/", async (req, res) => {
  try {
    const {
      numero_guia,
      numero_factura,
      detalle_producto,
      direccion,
      cliente,
      fecha_emision,
      viaje_id,
    } = req.body;

    console.log("📝 Creando guía:", {
      numero_guia,
      numero_factura,
      usuario: req.usuario.nombre_usuario,
    });

    // Validaciones
    if (!numero_guia || !numero_factura) {
      return res.status(400).json({
        success: false,
        error: "numero_guia y numero_factura son requeridos",
      });
    }

    // Verificar que la guía no exista ya
    const { data: guiaExistente } = await supabase
      .from("guia_remision")
      .select("guia_id")
      .eq("numero_guia", numero_guia)
      .single();

    if (guiaExistente) {
      return res.status(400).json({
        success: false,
        error: "Esta guía ya fue vinculada anteriormente",
      });
    }

    // Crear guía en Supabase
    const { data, error } = await supabase
      .from("guia_remision")
      .insert({
        numero_guia,
        numero_factura,
        detalle_producto: detalle_producto || "Sin descripción",
        direccion: direccion || "Sin dirección",
        cliente: cliente || "Cliente",
        fecha_emision: fecha_emision || new Date().toISOString(),
        estado_id: 3, // guia_asignada
        viaje_id: viaje_id || null,
      })
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .single();

    if (error) throw error;

    console.log(`✅ Guía creada: ${data.numero_guia} (ID: ${data.guia_id})`);

    res.status(201).json({
      success: true,
      data: data,
      message: "Guía vinculada exitosamente",
    });
  } catch (error) {
    console.error("❌ Error creando guía:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al crear guía",
    });
  }
});

// PATCH /api/guias/:id/estado - Actualizar estado de guía
router.patch("/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_id } = req.body;

    console.log(`📝 Actualizando estado de guía ${id} a estado ${estado_id}`);

    // Validar estado
    if (![3, 4, 5].includes(estado_id)) {
      return res.status(400).json({
        success: false,
        error: "Estado inválido (debe ser 3, 4 o 5)",
      });
    }

    const updateData = {
      estado_id,
      updated_at: new Date().toISOString(),
    };

    if (estado_id === 4) {
      updateData.fecha_entrega = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("guia_remision")
      .update(updateData)
      .eq("guia_id", id)
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .single();

    if (error) throw error;

    console.log(
      `✅ Estado actualizado: ${data.numero_guia} → ${data.estados.nombre}`
    );

    // 🆕 VERIFICAR SI TODAS LAS GUÍAS DEL VIAJE ESTÁN COMPLETAS
    if ((estado_id === 4 || estado_id === 5) && data.viaje_id) {
      // 1. Obtener TODAS las guías del viaje
      const { data: facturasDelViaje } = await supabase
        .from("factura_asignada")
        .select("numero_factura")
        .eq("viaje_id", data.viaje_id);

      const numeroFacturas = facturasDelViaje.map((f) => f.numero_factura);

      const { data: todasLasGuias } = await supabase
        .from("guia_remision")
        .select("guia_id, estado_id")
        .in("numero_factura", numeroFacturas);

      // 2. Verificar si TODAS están entregadas o no entregadas (4 o 5)
      const todasCompletadas =
        todasLasGuias.length > 0 &&
        todasLasGuias.every((g) => g.estado_id === 4 || g.estado_id === 5);

      if (todasCompletadas) {
        // 3. Marcar el viaje como completado
        const { error: errorViaje } = await supabase
          .from("viaje")
          .update({
            estado_viaje: 9, // Completado
            updated_at: new Date().toISOString(),
          })
          .eq("viaje_id", data.viaje_id);

        if (errorViaje) {
          console.error("⚠️ Error completando viaje:", errorViaje);
        } else {
          console.log(
            `✅ Viaje ${data.viaje_id} completado - Todas las guías finalizadas (${todasLasGuias.length})`
          );
        }
      } else {
        console.log(
          `ℹ️ Viaje ${data.viaje_id} aún tiene guías pendientes (${
            todasLasGuias.filter((g) => g.estado_id === 3).length
          } de ${todasLasGuias.length})`
        );
      }
    }

    res.json({
      success: true,
      data: data,
      message: "Estado actualizado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error actualizando estado:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al actualizar estado",
    });
  }
});

// GET /api/guias/:numero_factura - Obtener guías de una factura
router.get("/factura/:numero_factura", async (req, res) => {
  try {
    const { numero_factura } = req.params;

    console.log(`🔍 Obteniendo guías de factura: ${numero_factura}`);

    const { data, error } = await supabase
      .from("guia_remision")
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .eq("numero_factura", numero_factura)
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log(`✅ ${data.length} guías encontradas`);

    res.json({
      success: true,
      data: data,
      total: data.length,
      message: "Guías obtenidas exitosamente",
    });
  } catch (error) {
    console.error("❌ Error obteniendo guías:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener guías",
    });
  }
});

// POST /api/guias - Crear guía (vincular a factura)
router.post("/", async (req, res) => {
  try {
    const {
      numero_guia,
      numero_factura,
      detalle_producto,
      direccion,
      cliente,
      fecha_emision,
    } = req.body;

    console.log("📝 Creando guía:", {
      numero_guia,
      numero_factura,
      usuario: req.usuario.nombre_usuario,
    });

    // Validaciones
    if (!numero_guia || !numero_factura) {
      return res.status(400).json({
        success: false,
        error: "numero_guia y numero_factura son requeridos",
      });
    }

    // Verificar que la guía no exista ya
    const { data: guiaExistente } = await supabase
      .from("guia_remision")
      .select("guia_id")
      .eq("numero_guia", numero_guia)
      .single();

    if (guiaExistente) {
      return res.status(400).json({
        success: false,
        error: "Esta guía ya fue vinculada anteriormente",
      });
    }

    // 1️⃣ Obtener el viaje_id de la factura
    const { data: factura, error: errorFactura } = await supabase
      .from("factura_asignada")
      .select("viaje_id")
      .eq("numero_factura", numero_factura)
      .single();

    if (errorFactura || !factura) {
      return res.status(404).json({
        success: false,
        error: "No se encontró la factura asignada",
      });
    }

    const viaje_id = factura.viaje_id;

    if (!viaje_id) {
      return res.status(400).json({
        success: false,
        error: "La factura no tiene un viaje asociado",
      });
    }

    // 2️⃣ Crear guía en Supabase
    const { data, error } = await supabase
      .from("guia_remision")
      .insert({
        numero_guia,
        numero_factura,
        detalle_producto: detalle_producto || "Sin descripción",
        direccion: direccion || "Sin dirección",
        cliente: cliente || "Cliente",
        fecha_emision: fecha_emision || new Date().toISOString(),
        estado_id: 3, // guia_asignada
        viaje_id: viaje_id, // ← Vincular con el viaje
      })
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .single();

    if (error) throw error;

    console.log(`✅ Guía creada: ${data.numero_guia} (ID: ${data.guia_id})`);

    // 3️⃣ ACTUALIZAR EL VIAJE con la información de la guía
    const { error: errorViaje } = await supabase
      .from("viaje")
      .update({
        numero_guia: numero_guia,
        cliente: cliente || "Cliente",
        detalle_producto: detalle_producto || "Sin descripción",
        direccion: direccion || "Sin dirección",
        estado_viaje: 8, // Actualizar estado del viaje
        updated_at: new Date().toISOString(),
      })
      .eq("viaje_id", viaje_id);

    if (errorViaje) {
      console.error("⚠️ Error actualizando viaje:", errorViaje);
      // No fallar la operación, solo log
    } else {
      console.log(`✅ Viaje actualizado: ${viaje_id}`);
    }

    res.status(201).json({
      success: true,
      data: data,
      message: "Guía vinculada exitosamente",
    });
  } catch (error) {
    console.error("❌ Error creando guía:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al crear guía",
    });
  }
});

// GET /api/guias/:id - Obtener guía por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("guia_remision")
      .select(
        `
        *,
        estados:estado_id (
          codigo,
          nombre
        )
      `
      )
      .eq("guia_id", id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      message: "Guía obtenida exitosamente",
    });
  } catch (error) {
    console.error("❌ Error obteniendo guía:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener guía",
    });
  }
});

module.exports = router;

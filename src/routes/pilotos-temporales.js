const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { verificarAuth, soloAdmin } = require("../middleware/auth");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Todas las rutas requieren autenticación de admin
router.use(verificarAuth);
router.use(soloAdmin);

// GET /api/pilotos-temporales - Obtener todos los pilotos temporales
router.get("/", async (req, res) => {
  try {
    console.log("📋 Obteniendo pilotos temporales...");

    const { data, error } = await supabase
      .from("piloto_temporal")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    console.log(`✅ ${data.length} pilotos temporales encontrados`);

    res.json({
      success: true,
      data: data,
      total: data.length,
      message: "Pilotos temporales obtenidos exitosamente",
    });
  } catch (error) {
    console.error("❌ Error obteniendo pilotos temporales:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener pilotos temporales",
    });
  }
});

// POST /api/pilotos-temporales - Crear piloto temporal
router.post("/", async (req, res) => {
  try {
    const { nombre, notas } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        error: "El nombre es requerido",
      });
    }

    console.log(`📝 Creando piloto temporal: ${nombre}`);

    // Verificar si ya existe
    const { data: existente } = await supabase
      .from("piloto_temporal")
      .select("piloto_temporal_id")
      .eq("nombre", nombre.trim())
      .single();

    if (existente) {
      return res.status(400).json({
        success: false,
        error: `Ya existe un piloto temporal con el nombre "${nombre}"`,
      });
    }

    const { data, error } = await supabase
      .from("piloto_temporal")
      .insert({
        nombre: nombre.trim(),
        activo: true,
        creado_por: req.usuario.usuario_id,
        notas: notas || null,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Piloto temporal creado: ID ${data.piloto_temporal_id}`);

    res.status(201).json({
      success: true,
      data: data,
      message: "Piloto temporal creado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error creando piloto temporal:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al crear piloto temporal",
    });
  }
});

// PUT /api/pilotos-temporales/:id - Actualizar piloto temporal
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, notas } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        error: "El nombre es requerido",
      });
    }

    console.log(`📝 Actualizando piloto temporal ID: ${id}`);

    const { data, error } = await supabase
      .from("piloto_temporal")
      .update({
        nombre: nombre.trim(),
        notas: notas || null,
      })
      .eq("piloto_temporal_id", id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Piloto temporal actualizado: ${data.nombre}`);

    res.json({
      success: true,
      data: data,
      message: "Piloto temporal actualizado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error actualizando piloto temporal:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al actualizar piloto temporal",
    });
  }
});

// PATCH /api/pilotos-temporales/:id/toggle - Activar/Desactivar
router.patch("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔄 Cambiando estado de piloto temporal ID: ${id}`);

    // Obtener estado actual
    const { data: piloto, error: errorGet } = await supabase
      .from("piloto_temporal")
      .select("activo")
      .eq("piloto_temporal_id", id)
      .single();

    if (errorGet) throw errorGet;

    // Cambiar estado
    const { data, error } = await supabase
      .from("piloto_temporal")
      .update({
        activo: !piloto.activo,
      })
      .eq("piloto_temporal_id", id)
      .select()
      .single();

    if (error) throw error;

    console.log(
      `✅ Piloto temporal ${data.activo ? "activado" : "desactivado"}: ${
        data.nombre
      }`
    );

    res.json({
      success: true,
      data: data,
      message: `Piloto temporal ${
        data.activo ? "activado" : "desactivado"
      } exitosamente`,
    });
  } catch (error) {
    console.error("❌ Error cambiando estado:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al cambiar estado del piloto temporal",
    });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { verificarAuth } = require("../middleware/auth");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Aplicar autenticación a todas las rutas
router.use(verificarAuth);

// GET /api/sucursales - Obtener todas las sucursales
router.get("/", async (req, res) => {
  try {
    const { data: sucursales, error } = await supabase
      .from("sucursales")
      .select("*")
      .order("nombre_sucursal", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: sucursales,
    });
  } catch (error) {
    console.error("Error obteniendo sucursales:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error.message,
    });
  }
});

module.exports = router;

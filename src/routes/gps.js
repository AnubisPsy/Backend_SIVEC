const express = require("express");
const router = express.Router();
const axios = require("axios");

const WIALON_TOKEN =
  "822b5d763e6f778d00290af6eecfc0e56295BAD1E92AABF7562E3E0D323F05B94EFC88CD";
const WIALON_URL = "https://hst-api.wialon.com/wialon/ajax.html";

// Login y obtener session
async function loginWialon() {
  const params = { token: WIALON_TOKEN, fl: 11 };
  const response = await axios.get(
    `${WIALON_URL}?svc=token/login&params=${JSON.stringify(params)}`
  );
  return response.data.eid;
}

// GET /api/gps/ubicacion/:numeroVehiculo
router.get("/ubicacion/:numeroVehiculo", async (req, res) => {
  try {
    const { numeroVehiculo } = req.params;

    // Login
    const sid = await loginWialon();

    // Primero obtener la placa del vehículo desde la BD
    const { supabase } = require("../config/database");
    const { data: vehiculoDb, error: dbError } = await supabase
      .from("vehiculo")
      .select("placa, numero_vehiculo")
      .eq("numero_vehiculo", numeroVehiculo)
      .single();

    if (dbError || !vehiculoDb) {
      return res.status(404).json({ error: "Vehículo no encontrado en BD" });
    }

    const placaBuscada = vehiculoDb.placa;

    // Buscar vehículos en Wialon
    const searchParams = {
      spec: {
        itemsType: "avl_unit",
        propName: "sys_name",
        propValueMask: "*",
        sortType: "sys_name",
      },
      force: 1,
      flags: 1025,
      from: 0,
      to: 0,
    };

    const searchResponse = await axios.get(
      `${WIALON_URL}?svc=core/search_items&params=${JSON.stringify(
        searchParams
      )}&sid=${sid}`
    );

    // Buscar vehículo por placa (dentro de paréntesis)
    const vehiculo = searchResponse.data.items.find((v) => {
      // Extraer texto entre paréntesis: "ASR004 (TCA0211) C-25" -> "TCA0211"
      const match = v.nm.match(/\(([^)]+)\)/);
      if (match) {
        const placaWialon = match[1].replace(/[-\s]/g, ""); // Eliminar guiones y espacios
        const placaComparar = placaBuscada.replace(/[-\s]/g, "");
        return placaWialon.toUpperCase() === placaComparar.toUpperCase();
      }
      return false;
    });

    if (!vehiculo) {
      return res.status(404).json({
        error: "Vehículo no encontrado en Wialon",
        placaBuscada: placaBuscada,
      });
    }

    const pos = vehiculo.pos;

    res.json({
      nombre: vehiculo.nm,
      placa: placaBuscada,
      latitud: pos.y,
      longitud: pos.x,
      velocidad: pos.s || 0,
      timestamp: pos.t,
      enMovimiento: (pos.s || 0) > 0,
    });
  } catch (error) {
    console.error("Error GPS:", error);
    res.status(500).json({ error: "Error al obtener ubicación" });
  }
});

module.exports = router;

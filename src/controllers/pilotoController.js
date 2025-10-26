// src/controllers/pilotoController.js
const pilotoService = require("../services/pilotoService");
const { supabase } = require("../config/database");

const pilotoController = {
  /**
   * GET /api/pilotos - Obtener todos los pilotos activos
   */
  async obtenerTodos(req, res) {
    try {
      console.log("👨‍✈️ Obteniendo pilotos de ambas fuentes...");

      // 1. Obtener pilotos de SQL Server
      const pilotosSQL = await pilotoService.obtenerTodosPilotos();
      console.log(`📋 ${pilotosSQL.length} pilotos desde SQL Server`);

      // 2. Obtener pilotos temporales activos de Supabase
      const { data: pilotosTemporales, error } = await supabase
        .from("piloto_temporal")
        .select("piloto_temporal_id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) {
        console.error("❌ Error obteniendo temporales:", error);
      }

      console.log(
        `📋 ${pilotosTemporales?.length || 0} pilotos temporales activos`
      );

      // 3. Combinar ambas listas
      const pilotosCombinados = [
        ...pilotosSQL.map((p) => ({
          nombre_piloto: p.nombre_piloto,
          piloto_id: p.piloto_id,
          es_temporal: false,
          fuente: "sql",
        })),
        ...(pilotosTemporales || []).map((p) => ({
          nombre_piloto: p.nombre,
          es_temporal: true,
          piloto_temporal_id: p.piloto_temporal_id,
          fuente: "supabase",
        })),
      ].sort((a, b) => a.nombre_piloto.localeCompare(b.nombre_piloto));

      console.log(`✅ Total pilotos combinados: ${pilotosCombinados.length}`);

      res.json({
        success: true,
        data: pilotosCombinados,
        total: pilotosCombinados.length,
        fuentes: {
          sql: pilotosSQL.length,
          temporales: pilotosTemporales?.length || 0,
        },
        message: "Pilotos obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener pilotos:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al consultar pilotos",
      });
    }
  },

  /**
   * GET /api/pilotos/buscar - Buscar pilotos por término
   */
  async buscar(req, res) {
    try {
      const { q: termino_busqueda } = req.query;

      console.log(`🔍 Buscando pilotos: "${termino_busqueda || "todos"}"`);

      const pilotos = await pilotoService.buscarPilotos(termino_busqueda);

      console.log(`✅ ${pilotos.length} pilotos encontrados`);

      res.json({
        success: true,
        data: pilotos,
        total: pilotos.length,
        termino_busqueda: termino_busqueda || "",
        message: "Búsqueda de pilotos completada",
      });
    } catch (error) {
      console.error("❌ Error en búsqueda de pilotos:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error en búsqueda de pilotos",
      });
    }
  },

  /**
   * POST /api/pilotos/validar - Validar que un piloto existe
   */
  async validar(req, res) {
    try {
      const { nombre_piloto } = req.body;

      if (!nombre_piloto || nombre_piloto.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "nombre_piloto es requerido",
          message: "Datos incompletos",
        });
      }

      console.log(`🔍 Validando piloto: ${nombre_piloto}`);

      const piloto = await pilotoService.buscarPilotoPorNombre(
        nombre_piloto.trim()
      );

      if (piloto) {
        console.log(`✅ Piloto válido: ${nombre_piloto}`);

        res.json({
          success: true,
          data: {
            nombre_piloto: piloto.nombre_piloto,
            existe: true,
          },
          message: "Piloto validado exitosamente",
        });
      } else {
        console.log(`❌ Piloto no encontrado: ${nombre_piloto}`);

        res.status(404).json({
          success: false,
          data: {
            nombre_piloto: nombre_piloto.trim(),
            existe: false,
          },
          error: "Piloto no encontrado en el sistema externo",
          message: "Piloto no válido",
        });
      }
    } catch (error) {
      console.error("❌ Error al validar piloto:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al validar piloto",
      });
    }
  },

  /**
   * GET /api/pilotos/estadisticas - Estadísticas de pilotos (solo admins)
   */
  async obtenerEstadisticas(req, res) {
    try {
      console.log("📊 Obteniendo estadísticas de pilotos");

      const estadisticas = await pilotoService.obtenerEstadisticas();

      console.log("✅ Estadísticas calculadas");

      res.json({
        success: true,
        data: estadisticas,
        message: "Estadísticas obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener estadísticas:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener estadísticas",
      });
    }
  },

  /**
   * GET /api/pilotos/test-conexion - Probar conexión con sistema externo
   */
  async probarConexion(req, res) {
    try {
      console.log("🔧 Probando conexión con sistema externo de pilotos");

      // Intentar obtener al menos un piloto
      const pilotos = await pilotoService.buscarPilotos("");

      res.json({
        success: true,
        data: {
          conexion_ok: true,
          pilotos_disponibles: pilotos.length,
          timestamp: new Date().toISOString(),
        },
        message: "Conexión con sistema externo exitosa",
      });
    } catch (error) {
      console.error("❌ Error de conexión con sistema externo:", error.message);

      res.status(503).json({
        success: false,
        data: {
          conexion_ok: false,
          timestamp: new Date().toISOString(),
        },
        error: error.message,
        message: "Error de conexión con sistema externo",
      });
    }
  },
};

module.exports = pilotoController;

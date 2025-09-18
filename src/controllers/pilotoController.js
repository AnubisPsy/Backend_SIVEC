// src/controllers/pilotoController.js
const pilotoService = require("../services/pilotoService");

const pilotoController = {
  /**
   * GET /api/pilotos - Obtener todos los pilotos activos
   */
  async obtenerTodos(req, res) {
    try {
      console.log("👨‍✈️ Obteniendo lista de pilotos");

      const pilotos = await pilotoService.obtenerTodosPilotos();

      console.log(`📋 ${pilotos.length} pilotos disponibles`);

      res.json({
        success: true,
        data: pilotos,
        total: pilotos.length,
        message: "Pilotos obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener pilotos:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al consultar sistema externo de pilotos",
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

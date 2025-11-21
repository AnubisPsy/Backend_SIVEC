// src/controllers/estadisticasController.js
const estadisticasService = require("../services/estadisticasService");

const estadisticasController = {
  /**
   * GET /api/estadisticas/dashboard - Métricas principales del dashboard
   */
  async obtenerDashboard(req, res) {
    try {
      const { fecha } = req.query;
      const usuario = req.usuario;

      console.log(
        `📊 Obteniendo estadísticas dashboard para usuario: ${usuario.nombre_usuario}`
      );

      // Obtener fecha actual si no se especifica
      const fechaConsulta = fecha || new Date().toISOString().split("T")[0];

      // Obtener estadísticas
      const estadisticas =
        await estadisticasService.obtenerEstadisticasDashboard(
          fechaConsulta,
          usuario.sucursal_id,
          usuario.rol_id
        );

      res.json({
        success: true,
        data: estadisticas,
        fecha: fechaConsulta,
        message: "Estadísticas obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas dashboard:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener estadísticas",
      });
    }
  },

  /**
   * GET /api/estadisticas/entregas-por-hora - Distribución de entregas por hora
   */
  async obtenerEntregasPorHora(req, res) {
    try {
      const { fecha } = req.query;
      const usuario = req.usuario;

      const fechaConsulta = fecha || new Date().toISOString().split("T")[0];

      const datos = await estadisticasService.obtenerEntregasPorHora(
        fechaConsulta,
        usuario.sucursal_id,
        usuario.rol_id
      );

      res.json({
        success: true,
        data: datos,
        message: "Distribución de entregas obtenida exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo entregas por hora:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener entregas por hora",
      });
    }
  },

  /**
   * GET /api/estadisticas/viajes-por-sucursal - Distribución de viajes por sucursal
   */
  async obtenerViajesPorSucursal(req, res) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;
      const usuario = req.usuario;

      const datos = await estadisticasService.obtenerViajesPorSucursal(
        fecha_desde,
        fecha_hasta,
        usuario.rol_id
      );

      res.json({
        success: true,
        data: datos,
        message: "Viajes por sucursal obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo viajes por sucursal:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener viajes por sucursal",
      });
    }
  },

  /**
   * GET /api/estadisticas/top-pilotos - Top 5 pilotos más eficientes
   */
  async obtenerTopPilotos(req, res) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;
      const usuario = req.usuario;

      const datos = await estadisticasService.obtenerTopPilotos(
        fecha_desde,
        fecha_hasta,
        usuario.sucursal_id,
        usuario.rol_id
      );

      res.json({
        success: true,
        data: datos,
        message: "Top pilotos obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo top pilotos:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener top pilotos",
      });
    }
  },

  /**
   * GET /api/estadisticas/actividad-reciente - Actividad reciente
   */
  async obtenerActividadReciente(req, res) {
    try {
      const usuario = req.usuario;
      const { limit = 10 } = req.query;

      const actividades = await estadisticasService.obtenerActividadReciente(
        usuario.sucursal_id,
        usuario.rol_id,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: actividades,
        message: "Actividad reciente obtenida exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo actividad reciente:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener actividad reciente",
      });
    }
  },

  /**
   * GET /api/estadisticas/tendencia-semanal - Tendencia de entregas últimos 7 días
   */
  async obtenerTendenciaSemanal(req, res) {
    try {
      const usuario = req.usuario;

      const datos = await estadisticasService.obtenerTendenciaSemanal(
        usuario.sucursal_id,
        usuario.rol_id
      );

      res.json({
        success: true,
        data: datos,
        message: "Tendencia semanal obtenida exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo tendencia semanal:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener tendencia semanal",
      });
    }
  },

  /**
   * GET /api/estadisticas/comparacion-estados - Comparación de estados de guías
   */
  async obtenerComparacionEstados(req, res) {
    try {
      const { fecha } = req.query;
      const usuario = req.usuario;

      const fechaConsulta = fecha || new Date().toISOString().split("T")[0];

      const datos = await estadisticasService.obtenerComparacionEstados(
        fechaConsulta,
        usuario.sucursal_id,
        usuario.rol_id
      );

      res.json({
        success: true,
        data: datos,
        message: "Comparación de estados obtenida exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo comparación de estados:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener comparación de estados",
      });
    }
  },

  async obtenerViajesPorSucursal(req, res) {
    try {
      const { fecha_desde, fecha_hasta, sucursal_id } = req.query;
      const usuario = req.usuario;

      const datos = await estadisticasService.obtenerViajesPorSucursal(
        fecha_desde,
        fecha_hasta,
        sucursal_id ? parseInt(sucursal_id) : null,
        usuario.rol_id
      );

      res.json({
        success: true,
        data: datos,
        message: "Viajes por sucursal obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo viajes por sucursal:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener viajes por sucursal",
      });
    }
  },
};

module.exports = estadisticasController;

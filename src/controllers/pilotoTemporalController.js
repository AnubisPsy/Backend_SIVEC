// src/controllers/pilotoTemporalController.js
const pilotoTemporalService = require("../services/pilotoTemporalService");

const pilotoTemporalController = {
  /**
   * GET /api/pilotos-temporales - Obtener todos
   */
  async obtenerTodos(req, res) {
    try {
      console.log("📋 Obteniendo pilotos temporales...");

      const pilotos = await pilotoTemporalService.obtenerTodos();

      console.log(`✅ ${pilotos.length} pilotos temporales encontrados`);

      res.json({
        success: true,
        data: pilotos,
        total: pilotos.length,
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
  },

  /**
   * POST /api/pilotos-temporales - Crear
   */
  async crear(req, res) {
    try {
      const { nombre, notas } = req.body;

      // Validación
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({
          success: false,
          error: "El nombre es requerido",
          message: "Debe proporcionar un nombre válido",
        });
      }

      console.log(`🔍 Creando piloto temporal: ${nombre}`);

      // Verificar si ya existe
      const existe = await pilotoTemporalService.existePorNombre(nombre);

      if (existe) {
        return res.status(400).json({
          success: false,
          error: `Ya existe un piloto temporal con el nombre "${nombre}"`,
          message: "Nombre duplicado",
        });
      }

      // Crear piloto
      const piloto = await pilotoTemporalService.crear({
        nombre,
        notas,
        creado_por: req.usuario.usuario_id,
      });

      console.log(`✅ Piloto temporal creado: ID ${piloto.piloto_temporal_id}`);

      res.status(201).json({
        success: true,
        data: piloto,
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
  },

  /**
   * PUT /api/pilotos-temporales/:id - Actualizar
   */
  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { nombre, notas } = req.body;

      // Validaciones
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de piloto inválido",
          message: "El ID debe ser un número válido",
        });
      }

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({
          success: false,
          error: "El nombre es requerido",
          message: "Debe proporcionar un nombre válido",
        });
      }

      console.log(`🔍 Actualizando piloto temporal ID: ${id}`);

      // Verificar que existe
      const pilotoExistente = await pilotoTemporalService.obtenerPorId(
        parseInt(id)
      );

      if (!pilotoExistente) {
        return res.status(404).json({
          success: false,
          error: "Piloto temporal no encontrado",
          message: `No existe un piloto con ID ${id}`,
        });
      }

      // Actualizar
      const piloto = await pilotoTemporalService.actualizar(parseInt(id), {
        nombre,
        notas,
      });

      console.log(`✅ Piloto temporal actualizado: ${piloto.nombre}`);

      res.json({
        success: true,
        data: piloto,
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
  },

  /**
   * PATCH /api/pilotos-temporales/:id/toggle - Activar/Desactivar
   */
  async toggleActivo(req, res) {
    try {
      const { id } = req.params;

      // Validación
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de piloto inválido",
          message: "El ID debe ser un número válido",
        });
      }

      console.log(`🔄 Cambiando estado de piloto temporal ID: ${id}`);

      // Verificar que existe
      const pilotoExistente = await pilotoTemporalService.obtenerPorId(
        parseInt(id)
      );

      if (!pilotoExistente) {
        return res.status(404).json({
          success: false,
          error: "Piloto temporal no encontrado",
          message: `No existe un piloto con ID ${id}`,
        });
      }

      // Toggle estado
      const piloto = await pilotoTemporalService.toggleActivo(parseInt(id));

      console.log(
        `✅ Piloto temporal ${piloto.activo ? "activado" : "desactivado"}: ${
          piloto.nombre
        }`
      );

      res.json({
        success: true,
        data: piloto,
        message: `Piloto temporal ${
          piloto.activo ? "activado" : "desactivado"
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
  },
};

module.exports = pilotoTemporalController;

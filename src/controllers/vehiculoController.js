// src/controllers/vehiculoController.js
const vehiculoService = require("../services/vehiculoService");

const vehiculoController = {
  /**
   * GET /api/vehiculos - Obtener vehículos con filtros
   */
  async obtenerTodos(req, res) {
    try {
      const filtros = {};

      // ✅ LÓGICA CORREGIDA
      // 1. Si hay query param sucursal_id, usarlo (para filtros de reportes)
      if (req.query.sucursal_id) {
        filtros.sucursal_id = parseInt(req.query.sucursal_id);
        console.log(
          `🔍 Filtrando por sucursal especificada: ${filtros.sucursal_id}`
        );
      }
      // 2. Si NO hay query param y el usuario NO es admin, usar su sucursal
      else if (req.usuario?.rol_id !== 3 && req.usuario?.sucursal_id) {
        filtros.sucursal_id = req.usuario.sucursal_id;
        console.log(
          `🔒 Filtrando por sucursal del usuario: ${filtros.sucursal_id}`
        );
      }
      // 3. Si es admin y NO especifica sucursal, mostrar TODOS
      else if (req.usuario?.rol_id === 3) {
        console.log(`🌐 Admin sin filtro: mostrando TODOS los vehículos`);
        // No agregar filtro de sucursal
      }

      // Filtro de agrupación (opcional)
      if (req.query.agrupacion) {
        filtros.agrupacion = req.query.agrupacion;
      }

      console.log(`🔍 Obteniendo vehículos con filtros:`, filtros);

      const vehiculos = await vehiculoService.obtenerTodosVehiculos(filtros);

      console.log(`📋 ${vehiculos.length} vehículos encontrados`);

      res.json({
        success: true,
        data: vehiculos,
        total: vehiculos.length,
        filtros: filtros,
        message: "Vehículos obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener vehículos:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener vehículos",
      });
    }
  },

  /**
   * GET /api/vehiculos/sucursal/:sucursal_id - Vehículos por sucursal específica
   */
  async obtenerPorSucursal(req, res) {
    try {
      const { sucursal_id } = req.params;

      if (!sucursal_id || isNaN(parseInt(sucursal_id))) {
        return res.status(400).json({
          success: false,
          error: "sucursal_id debe ser un número válido",
          message: "Parámetro inválido",
        });
      }

      // Verificar permisos: solo puede ver vehículos de su sucursal o ser admin
      const sucursalSolicitada = parseInt(sucursal_id);
      if (
        req.usuario.rol_id !== 3 &&
        req.usuario.sucursal_id !== sucursalSolicitada
      ) {
        return res.status(403).json({
          success: false,
          error: "Solo puedes ver vehículos de tu sucursal",
          message: "Permisos insuficientes",
        });
      }

      console.log(`🚛 Obteniendo vehículos de sucursal: ${sucursal_id}`);

      const vehiculos = await vehiculoService.obtenerVehiculosPorSucursal(
        sucursalSolicitada
      );

      console.log(`✅ ${vehiculos.length} vehículos encontrados`);

      res.json({
        success: true,
        data: vehiculos,
        total: vehiculos.length,
        sucursal_id: sucursalSolicitada,
        message: "Vehículos obtenidos exitosamente",
      });
    } catch (error) {
      console.error(
        "❌ Error al obtener vehículos por sucursal:",
        error.message
      );

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener vehículos",
      });
    }
  },

  /**
   * GET /api/vehiculos/:id - Obtener vehículo por ID
   */
  async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de vehículo inválido",
          message: "El ID debe ser un número válido",
        });
      }

      console.log("🔍 Buscando vehículo ID:", id);

      const vehiculo = await vehiculoService.obtenerVehiculoPorId(parseInt(id));

      if (!vehiculo) {
        return res.status(404).json({
          success: false,
          error: "Vehículo no encontrado",
          message: `No existe un vehículo con ID ${id}`,
        });
      }

      // Verificar permisos: solo puede ver vehículos de su sucursal o ser admin
      if (
        req.usuario.rol_id !== 3 &&
        req.usuario.sucursal_id !== vehiculo.sucursal_id
      ) {
        return res.status(403).json({
          success: false,
          error: "Solo puedes ver vehículos de tu sucursal",
          message: "Permisos insuficientes",
        });
      }

      console.log(`✅ Vehículo encontrado: ${vehiculo.numero_vehiculo}`);

      res.json({
        success: true,
        data: vehiculo,
        message: "Vehículo obtenido exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener vehículo:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener vehículo",
      });
    }
  },

  /**
   * POST /api/vehiculos - Crear vehículo
   */
  async crear(req, res) {
    try {
      console.log("🚛 Creando vehículo:", {
        numero_vehiculo: req.body.numero_vehiculo,
        placa: req.body.placa,
        sucursal_id: req.body.sucursal_id,
        usuario: req.usuario.nombre_usuario,
      });

      // Si no es admin, forzar sucursal del usuario
      if (req.usuario.rol_id !== 3) {
        req.body.sucursal_id = req.usuario.sucursal_id;
      }

      const vehiculo = await vehiculoService.crearVehiculo(req.body);

      console.log(`✅ Vehículo creado con ID: ${vehiculo.vehiculo_id}`);

      res.status(201).json({
        success: true,
        data: vehiculo,
        message: "Vehículo creado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al crear vehículo:", error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al crear vehículo",
      });
    }
  },

  /**
   * PUT /api/vehiculos/:id - Actualizar vehículo
   */
  async actualizar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de vehículo inválido",
        });
      }

      // Verificar que el vehículo existe y permisos
      const vehiculoExistente = await vehiculoService.obtenerVehiculoPorId(
        parseInt(id)
      );

      if (!vehiculoExistente) {
        return res.status(404).json({
          success: false,
          error: "Vehículo no encontrado",
        });
      }

      // Verificar permisos: solo puede actualizar vehículos de su sucursal o ser admin
      if (
        req.usuario.rol_id !== 3 &&
        req.usuario.sucursal_id !== vehiculoExistente.sucursal_id
      ) {
        return res.status(403).json({
          success: false,
          error: "Solo puedes actualizar vehículos de tu sucursal",
          message: "Permisos insuficientes",
        });
      }

      console.log("📝 Actualizando vehículo ID:", id);

      const vehiculo = await vehiculoService.actualizarVehiculo(
        parseInt(id),
        req.body
      );

      console.log(`✅ Vehículo actualizado: ${vehiculo.numero_vehiculo}`);

      res.json({
        success: true,
        data: vehiculo,
        message: "Vehículo actualizado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al actualizar vehículo:", error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al actualizar vehículo",
      });
    }
  },

  /**
   * DELETE /api/vehiculos/:id - Eliminar vehículo
   */
  async eliminar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de vehículo inválido",
        });
      }

      // Verificar que el vehículo existe y permisos
      const vehiculoExistente = await vehiculoService.obtenerVehiculoPorId(
        parseInt(id)
      );

      if (!vehiculoExistente) {
        return res.status(404).json({
          success: false,
          error: "Vehículo no encontrado",
        });
      }

      // Verificar permisos
      if (
        req.usuario.rol_id !== 3 &&
        req.usuario.sucursal_id !== vehiculoExistente.sucursal_id
      ) {
        return res.status(403).json({
          success: false,
          error: "Solo puedes eliminar vehículos de tu sucursal",
          message: "Permisos insuficientes",
        });
      }

      console.log("🗑️ Eliminando vehículo ID:", id);

      await vehiculoService.eliminarVehiculo(parseInt(id));

      console.log("✅ Vehículo eliminado");

      res.json({
        success: true,
        message: "Vehículo eliminado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al eliminar vehículo:", error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al eliminar vehículo",
      });
    }
  },

  /**
   * GET /api/vehiculos/estadisticas - Estadísticas de vehículos
   */
  async obtenerEstadisticas(req, res) {
    try {
      console.log("📊 Obteniendo estadísticas de vehículos");

      const estadisticas = await vehiculoService.obtenerEstadisticas();

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
};

module.exports = vehiculoController;

// src/controllers/usuarioController.js
const usuarioService = require('../services/usuarioService');

const usuarioController = {

  /**
   * POST /api/usuarios - Crear usuario
   */
  async crear(req, res) {
    try {
      console.log('📝 Creando usuario:', { 
        email: req.body.email, 
        tipo_usuario: req.body.tipo_usuario 
      });

      const usuario = await usuarioService.crearUsuario(req.body);

      console.log('✅ Usuario creado con ID:', usuario.id);

      res.status(201).json({
        success: true,
        data: usuario,
        message: 'Usuario creado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al crear usuario:', error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Error al crear usuario'
      });
    }
  },

  /**
   * GET /api/usuarios - Obtener usuarios
   */
  async obtenerTodos(req, res) {
    try {
      const filtros = {};
      
      // Aplicar filtros desde query params
      if (req.query.tipo_usuario) filtros.tipo_usuario = req.query.tipo_usuario;
      if (req.query.activo) filtros.activo = req.query.activo === 'true';
      if (req.query.sucursal_id) filtros.sucursal_id = parseInt(req.query.sucursal_id);

      console.log('🔍 Obteniendo usuarios con filtros:', filtros);

      const usuarios = await usuarioService.obtenerUsuarios(filtros);

      console.log(`📋 ${usuarios.length} usuarios encontrados`);

      res.json({
        success: true,
        data: usuarios,
        total: usuarios.length,
        filtros: filtros,
        message: 'Usuarios obtenidos exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al obtener usuarios:', error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error al obtener usuarios'
      });
    }
  },

  /**
   * GET /api/usuarios/:id - Obtener usuario por ID
   */
  async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario inválido',
          message: 'El ID debe ser un número válido'
        });
      }

      console.log('🔍 Buscando usuario ID:', id);

      const usuario = await usuarioService.obtenerUsuarioPorId(parseInt(id));

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
          message: `No existe un usuario con ID ${id}`
        });
      }

      console.log('✅ Usuario encontrado:', usuario.nombre_usuario);

      res.json({
        success: true,
        data: usuario,
        message: 'Usuario obtenido exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al obtener usuario:', error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error al obtener usuario'
      });
    }
  },

  /**
   * PUT /api/usuarios/:id - Actualizar usuario
   */
  async actualizar(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario inválido'
        });
      }

      console.log('📝 Actualizando usuario ID:', id);

      const usuario = await usuarioService.actualizarUsuario(parseInt(id), req.body);

      console.log('✅ Usuario actualizado:', usuario.nombre_usuario);

      res.json({
        success: true,
        data: usuario,
        message: 'Usuario actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al actualizar usuario:', error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Error al actualizar usuario'
      });
    }
  },

  /**
   * DELETE /api/usuarios/:id - Eliminar usuario
   */
  async eliminar(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario inválido'
        });
      }

      console.log('🗑️ Eliminando usuario ID:', id);

      await usuarioService.eliminarUsuario(parseInt(id));

      console.log('✅ Usuario eliminado (marcado como inactivo)');

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al eliminar usuario:', error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Error al eliminar usuario'
      });
    }
  },

  // ==========================================
  // ENDPOINTS ESPECÍFICOS PARA SIVEC
  // ==========================================

  /**
   * GET /api/usuarios/pilotos - Obtener solo pilotos
   */
  async obtenerPilotos(req, res) {
    try {
      console.log('🚛 Obteniendo pilotos disponibles');
      
      const pilotos = await usuarioService.obtenerPilotos();
      
      console.log(`✅ ${pilotos.length} pilotos encontrados`);

      res.json({
        success: true,
        data: pilotos,
        total: pilotos.length,
        message: 'Pilotos obtenidos exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al obtener pilotos:', error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error al obtener pilotos'
      });
    }
  },

  /**
   * GET /api/usuarios/jefes-yarda - Obtener jefes de yarda
   */
  async obtenerJefesYarda(req, res) {
    try {
      console.log('👔 Obteniendo jefes de yarda');
      
      const jefes = await usuarioService.obtenerJefesYarda();
      
      console.log(`✅ ${jefes.length} jefes de yarda encontrados`);

      res.json({
        success: true,
        data: jefes,
        total: jefes.length,
        message: 'Jefes de yarda obtenidos exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al obtener jefes de yarda:', error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error al obtener jefes de yarda'
      });
    }
  }
};

module.exports = usuarioController;
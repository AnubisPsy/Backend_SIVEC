// src/services/usuarioService.js
const { supabase } = require('../config/database');
const bcrypt = require('bcrypt');

const usuarioService = {
  
  /**
   * CREAR USUARIO
   */
  async crearUsuario(datosUsuario) {
    try {
      // Validar datos básicos
      const { nombre_usuario, correo, password, rol_id } = datosUsuario;
      
      if (!nombre_usuario || !correo || !password || !rol_id) {
        throw new Error('Faltan campos requeridos: nombre_usuario, correo, password, rol_id');
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        throw new Error('Formato de correo inválido');
      }

      // Validar rol_id
      const rolesValidos = [1, 2, 3]; // 1=Piloto, 2=Jefe, 3=Admin
      if (!rolesValidos.includes(parseInt(rol_id))) {
        throw new Error('rol_id debe ser 1 (Piloto), 2 (Jefe) o 3 (Admin)');
      }

      // Verificar si el email ya existe
      const { data: usuarioExistente } = await supabase
        .from('usuario')
        .select('usuario_id')
        .eq('correo', correo)
        .single();

      if (usuarioExistente) {
        throw new Error('Ya existe un usuario con ese correo');
      }

      // Encriptar contraseña
      const contraseña = await bcrypt.hash(password, 10);

      // Crear usuario en Supabase
      const { data, error } = await supabase
        .from('usuario')
        .insert({
          nombre_usuario,
          correo,
          contraseña,
          rol_id: parseInt(rol_id)
        })
        .select(`
          usuario_id,
          nombre_usuario,
          correo,
          rol_id,
          created_at,
          updated_at,
          roles:rol_id (
            rol_id,
            nombre_rol,
            descripcion
          )
        `)
        .single();

      if (error) {
        throw new Error(`Error al crear usuario: ${error.message}`);
      }

      // Retornar usuario sin contraseña
      return data;

    } catch (error) {
      console.error('Error en crearUsuario:', error);
      throw error;
    }
  },

  /**
   * OBTENER TODOS LOS USUARIOS
   */
  async obtenerUsuarios(filtros = {}) {
    try {
      let query = supabase
        .from('usuario')
        .select(`
          usuario_id,
          nombre_usuario,
          correo,
          rol_id,
          created_at,
          updated_at,
          roles:rol_id (
            rol_id,
            nombre_rol,
            descripcion
          )
        `);

      // Aplicar filtros
      if (filtros.rol_id) {
        query = query.eq('rol_id', filtros.rol_id);
      }

      const { data, error } = await query.order('nombre_usuario');

      if (error) {
        throw new Error(`Error al obtener usuarios: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error en obtenerUsuarios:', error);
      throw error;
    }
  },

  /**
   * OBTENER USUARIO POR ID
   */
  async obtenerUsuarioPorId(id) {
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select(`
          usuario_id,
          nombre_usuario,
          correo,
          rol_id,
          created_at,
          updated_at,
          roles:rol_id (
            rol_id,
            nombre_rol,
            descripcion
          )
        `)
        .eq('usuario_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error al obtener usuario: ${error.message}`);
      }

      return data || null;

    } catch (error) {
      console.error('Error en obtenerUsuarioPorId:', error);
      throw error;
    }
  },

  /**
   * OBTENER USUARIO POR EMAIL (para login)
   */
  async obtenerUsuarioPorEmail(email) {
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error al obtener usuario: ${error.message}`);
      }

      return data || null;

    } catch (error) {
      console.error('Error en obtenerUsuarioPorEmail:', error);
      throw error;
    }
  },

  /**
   * ACTUALIZAR USUARIO
   */
  async actualizarUsuario(id, datosActualizacion) {
    try {
      // Si se va a actualizar la contraseña, encriptarla
      if (datosActualizacion.password) {
        datosActualizacion.contraseña = await bcrypt.hash(datosActualizacion.password, 10);
        delete datosActualizacion.password;
      }

      const { data, error } = await supabase
        .from('usuario')
        .update(datosActualizacion)
        .eq('usuario_id', id)
        .select(`
          usuario_id,
          nombre_usuario,
          correo,
          rol_id,
          created_at,
          updated_at,
          roles:rol_id (
            rol_id,
            nombre_rol,
            descripcion
          )
        `)
        .single();

      if (error) {
        throw new Error(`Error al actualizar usuario: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error en actualizarUsuario:', error);
      throw error;
    }
  },

  /**
   * ELIMINAR USUARIO (soft delete)
   */
  async eliminarUsuario(id) {
    try {
      // En lugar de soft delete, hacemos delete real por ahora
      // Si prefieres soft delete, necesitarías agregar una columna "activo" a la tabla usuario
      const { error } = await supabase
        .from('usuario')
        .delete()
        .eq('usuario_id', id);

      if (error) {
        throw new Error(`Error al eliminar usuario: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('Error en eliminarUsuario:', error);
      throw error;
    }
  },

  /**
   * MÉTODOS ESPECÍFICOS PARA SIVEC
   */
  
  async obtenerPilotos() {
    return await this.obtenerUsuarios({ rol_id: 1 }); // 1 = Piloto
  },

  async obtenerJefesYarda() {
    return await this.obtenerUsuarios({ rol_id: 2 }); // 2 = Jefe
  }
};

module.exports = usuarioService;
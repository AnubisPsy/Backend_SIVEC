// src/services/usuarioService.js
const { supabase } = require("../config/database");
const bcrypt = require("bcrypt");

const usuarioService = {
  /**
   * CREAR USUARIO (con vinculación de piloto)
   */
  async crearUsuario(datosUsuario) {
    try {
      // Validar datos básicos
      const {
        nombre_usuario,
        correo,
        password,
        rol_id,
        piloto_sql_id,
        piloto_temporal_id,
      } = datosUsuario;

      if (!nombre_usuario || !password || !rol_id) {
        throw new Error(
          "Faltan campos requeridos: nombre_usuario, password, rol_id"
        );
      }

      // Si no es piloto, no debe tener vinculación
      if (rol_id !== 1 && (piloto_sql_id || piloto_temporal_id)) {
        throw new Error(
          "Solo los usuarios con rol Piloto pueden estar vinculados a pilotos"
        );
      }

      // Validar que no se vincule a ambos tipos
      if (piloto_sql_id && piloto_temporal_id) {
        throw new Error(
          "Un usuario solo puede estar vinculado a un tipo de piloto (SQL o Temporal)"
        );
      }

      // Si es piloto y está vinculado, verificar que no esté duplicado
      if (rol_id === 1 && (piloto_sql_id || piloto_temporal_id)) {
        const { data: usuarioExistente } = await supabase
          .from("usuario")
          .select("usuario_id")
          .or(
            piloto_sql_id
              ? `piloto_sql_id.eq.${piloto_sql_id}`
              : `piloto_temporal_id.eq.${piloto_temporal_id}`
          )
          .single();

        if (usuarioExistente) {
          throw new Error("Este piloto ya tiene un usuario asignado");
        }
      }

      // Validar email si se proporciona
      if (correo) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
          throw new Error("Formato de correo inválido");
        }

        // Verificar si el email ya existe
        const { data: correoExistente } = await supabase
          .from("usuario")
          .select("usuario_id")
          .eq("correo", correo)
          .single();

        if (correoExistente) {
          throw new Error("Ya existe un usuario con ese correo");
        }
      }

      // Encriptar contraseña
      const contraseña = await bcrypt.hash(password, 10);

      // Crear usuario en Supabase
      const { data, error } = await supabase
        .from("usuario")
        .insert({
          nombre_usuario,
          correo: correo || `${nombre_usuario}@temp.local`,
          contraseña,
          rol_id: parseInt(rol_id),
          sucursal_id: datosUsuario.sucursal_id || 1,
          activo: true,
          piloto_sql_id: piloto_sql_id || null,
          piloto_temporal_id: piloto_temporal_id || null,
        })
        .select(
          `
          usuario_id,
          nombre_usuario,
          correo,
          rol_id,
          sucursal_id,
          activo,
          piloto_sql_id,
          piloto_temporal_id,
          created_at,
          roles:rol_id (
            rol_id,
            nombre_rol,
            descripcion
          )
        `
        )
        .single();

      if (error) {
        throw new Error(`Error al crear usuario: ${error.message}`);
      }

      console.log("✅ Usuario creado con ID:", data.usuario_id);
      if (data.piloto_sql_id)
        console.log("🔵 Vinculado a piloto SQL ID:", data.piloto_sql_id);
      if (data.piloto_temporal_id)
        console.log(
          "🟡 Vinculado a piloto temporal ID:",
          data.piloto_temporal_id
        );

      return data;
    } catch (error) {
      console.error("Error en crearUsuario:", error);
      throw error;
    }
  },

  /**
   * OBTENER TODOS LOS USUARIOS (con info de piloto vinculado)
   */
  async obtenerUsuarios(filtros = {}) {
    try {
      let query = supabase.from("usuario").select(`
          usuario_id,
          nombre_usuario,
          correo,
          rol_id,
          sucursal_id,
          activo,
          piloto_sql_id,
          piloto_temporal_id,
          created_at,
          roles:rol_id (
            rol_id,
            nombre_rol,
            descripcion
          )
        `);

      // Aplicar filtros
      if (filtros.rol_id) {
        query = query.eq("rol_id", filtros.rol_id);
      }

      if (filtros.activo !== undefined) {
        query = query.eq("activo", filtros.activo);
      }

      if (filtros.sucursal_id) {
        query = query.eq("sucursal_id", filtros.sucursal_id);
      }

      const { data, error } = await query.order("nombre_usuario");

      if (error) {
        throw new Error(`Error al obtener usuarios: ${error.message}`);
      }

      // Para cada usuario piloto, obtener el nombre del piloto vinculado
      const usuariosConPiloto = await Promise.all(
        data.map(async (usuario) => {
          let piloto_vinculado = null;

          if (usuario.rol_id === 1) {
            if (usuario.piloto_temporal_id) {
              // Buscar en pilotos temporales
              const { data: pilotoTemp } = await supabase
                .from("piloto_temporal")
                .select("nombre")
                .eq("piloto_temporal_id", usuario.piloto_temporal_id)
                .single();

              if (pilotoTemp) {
                piloto_vinculado = {
                  nombre: pilotoTemp.nombre,
                  tipo: "temporal",
                  id: usuario.piloto_temporal_id,
                };
              }
            }
            // Nota: Para pilotos de SQL, necesitaríamos hacer una query a SQL Server
            // Por ahora solo mostramos el ID
            else if (usuario.piloto_sql_id) {
              piloto_vinculado = {
                nombre: `Piloto SQL (ID: ${usuario.piloto_sql_id})`,
                tipo: "sql",
                id: usuario.piloto_sql_id,
              };
            }
          }

          return {
            ...usuario,
            piloto_vinculado,
          };
        })
      );

      return usuariosConPiloto;
    } catch (error) {
      console.error("Error en obtenerUsuarios:", error);
      throw error;
    }
  },

  /**
   * ACTUALIZAR USUARIO (con vinculación de piloto)
   */
  async actualizarUsuario(id, datosActualizacion) {
    try {
      const { piloto_sql_id, piloto_temporal_id, rol_id } = datosActualizacion;

      // Validar que no se vincule a ambos tipos
      if (piloto_sql_id && piloto_temporal_id) {
        throw new Error(
          "Un usuario solo puede estar vinculado a un tipo de piloto"
        );
      }

      // Si se va a actualizar la contraseña, encriptarla
      if (datosActualizacion.password) {
        datosActualizacion.contraseña = await bcrypt.hash(
          datosActualizacion.password,
          10
        );
        delete datosActualizacion.password;
      }

      // Si está cambiando a rol piloto y tiene vinculación, verificar duplicados
      if (rol_id === 1 && (piloto_sql_id || piloto_temporal_id)) {
        const { data: usuarioExistente } = await supabase
          .from("usuario")
          .select("usuario_id")
          .neq("usuario_id", id)
          .or(
            piloto_sql_id
              ? `piloto_sql_id.eq.${piloto_sql_id}`
              : `piloto_temporal_id.eq.${piloto_temporal_id}`
          )
          .single();

        if (usuarioExistente) {
          throw new Error("Este piloto ya tiene un usuario asignado");
        }
      }

      const { data, error } = await supabase
        .from("usuario")
        .update(datosActualizacion)
        .eq("usuario_id", id)
        .select(
          `
          usuario_id,
          nombre_usuario,
          correo,
          rol_id,
          sucursal_id,
          activo,
          piloto_sql_id,
          piloto_temporal_id,
          created_at,
          roles:rol_id (
            rol_id,
            nombre_rol,
            descripcion
          )
        `
        )
        .single();

      if (error) {
        throw new Error(`Error al actualizar usuario: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error en actualizarUsuario:", error);
      throw error;
    }
  },

  /**
   * ELIMINAR USUARIO (soft delete - marcar como inactivo)
   */
  async eliminarUsuario(id) {
    try {
      const { error } = await supabase
        .from("usuario")
        .update({ activo: false })
        .eq("usuario_id", id);

      if (error) {
        throw new Error(`Error al eliminar usuario: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error en eliminarUsuario:", error);
      throw error;
    }
  },

  async obtenerUsuarioPorId(id) {
    try {
      const { data, error } = await supabase
        .from("usuario")
        .select(
          `
          usuario_id,
          nombre_usuario,
          correo,
          rol_id,
          sucursal_id,
          activo,
          piloto_sql_id,
          piloto_temporal_id,
          created_at,
          roles:rol_id (
            rol_id,
            nombre_rol,
            descripcion
          )
        `
        )
        .eq("usuario_id", id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Error al obtener usuario: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error("Error en obtenerUsuarioPorId:", error);
      throw error;
    }
  },

  async obtenerPilotos() {
    return await this.obtenerUsuarios({ rol_id: 1, activo: true });
  },

  async obtenerJefesYarda() {
    return await this.obtenerUsuarios({ rol_id: 2, activo: true });
  },
};

module.exports = usuarioService;

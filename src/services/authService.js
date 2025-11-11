// src/services/authService.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usuarioService = require("./usuarioService");

const authService = {
  /**
   * LOGIN - Autenticar usuario y generar JWT
   */
  async login(loginInput, password) {
    try {
      console.log("🔐 Intentando login para:", loginInput);

      // 1. Detectar si es correo o nombre de usuario
      const esCorreo = loginInput.includes("@");

      const { supabase } = require("../config/database");

      // 2. Buscar usuario por correo o nombre de usuario
      let query = supabase.from("usuario").select(`
        usuario_id,
        nombre_usuario,
        correo,
        contraseña,
        rol_id,
        sucursal_id,
        roles:rol_id (
          rol_id,
          nombre_rol,
          descripcion
        ),
        sucursales:sucursal_id (
          sucursal_id,
          nombre_sucursal
        )
      `);

      // Filtrar por correo o nombre_usuario según el input
      if (esCorreo) {
        query = query.eq("correo", loginInput);
      } else {
        query = query.eq("nombre_usuario", loginInput);
      }

      const { data: usuario, error } = await query.single();

      if (error || !usuario) {
        throw new Error("Credenciales inválidas");
      }

      // 3. Verificar contraseña
      const passwordValido = await bcrypt.compare(password, usuario.contraseña);

      if (!passwordValido) {
        console.log("❌ Contraseña incorrecta para:", loginInput);
        throw new Error("Credenciales inválidas");
      }

      // 4. Generar JWT token
      const payload = {
        usuario_id: usuario.usuario_id,
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        rol_id: usuario.rol_id,
        sucursal_id: usuario.sucursal_id,
        nombre_rol: usuario.roles.nombre_rol,
        nombre_sucursal: usuario.sucursales.nombre_sucursal,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "12h",
        issuer: "sivec-backend",
        audience: "sivec-frontend",
      });

      console.log("✅ Login exitoso para:", usuario.nombre_usuario);

      // 5. Retornar datos del usuario y token
      return {
        token,
        usuario: {
          usuario_id: usuario.usuario_id,
          nombre_usuario: usuario.nombre_usuario,
          correo: usuario.correo,
          rol_id: usuario.rol_id,
          sucursal_id: usuario.sucursal_id,
          rol: usuario.roles,
          sucursal: usuario.sucursales,
        },
      };
    } catch (error) {
      console.error("❌ Error en login:", error.message);
      throw error;
    }
  },

  /**
   * VERIFICAR TOKEN - Decodificar y validar JWT
   */
  async verificarToken(token) {
    try {
      // Decodificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verificar que el usuario aún exista
      const usuario = await usuarioService.obtenerUsuarioPorId(
        decoded.usuario_id
      );

      if (!usuario) {
        throw new Error("Usuario no válido");
      }

      return {
        valid: true,
        usuario: decoded,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  },

  /**
   * GENERAR REFRESH TOKEN (opcional para futuro)
   */
  async generarRefreshToken(usuario_id) {
    const payload = {
      usuario_id,
      type: "refresh",
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
  },

  /**
   * CAMBIAR CONTRASEÑA
   */
  async cambiarPassword(usuario_id, passwordActual, passwordNuevo) {
    try {
      // Obtener usuario con contraseña
      const { supabase } = require("../config/database");
      const { data: usuario } = await supabase
        .from("usuario")
        .select("usuario_id, contraseña")
        .eq("usuario_id", usuario_id)
        .single();

      if (!usuario) {
        throw new Error("Usuario no encontrado");
      }

      // Verificar contraseña actual
      const passwordValido = await bcrypt.compare(
        passwordActual,
        usuario.contraseña
      );

      if (!passwordValido) {
        throw new Error("Contraseña actual incorrecta");
      }

      // Actualizar contraseña
      await usuarioService.actualizarUsuario(usuario_id, {
        password: passwordNuevo,
      });

      return true;
    } catch (error) {
      console.error("❌ Error al cambiar contraseña:", error.message);
      throw error;
    }
  },
};

module.exports = authService;

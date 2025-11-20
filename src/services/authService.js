// src/services/authService.js - CON reCAPTCHA
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usuarioService = require("./usuarioService");
const recaptchaService = require("./recaptchaService");

const authService = {
  /**
   * LOGIN - Autenticar usuario y generar JWT
   * Ahora con protección reCAPTCHA
   */
  async login(loginInput, password, recaptchaToken = null, ipAddress = null) {
    try {
      console.log("🔍 Intentando login para:", loginInput);

      // 1. Obtener IP (usar la proporcionada o 'unknown')
      const ip = ipAddress || "unknown";

      // 2. Verificar si requiere captcha
      const requiereCaptcha = recaptchaService.requiereCaptcha(ip, loginInput);

      if (requiereCaptcha) {
        console.log("🤖 Captcha requerido para:", loginInput);

        // Validar que se envió el token de reCAPTCHA
        if (!recaptchaToken) {
          return {
            error: "CAPTCHA_REQUERIDO",
            message: "Debes completar el captcha para continuar",
            requiereCaptcha: true,
          };
        }

        // Validar el token con Google
        const resultadoCaptcha = await recaptchaService.verificarRecaptcha(
          recaptchaToken
        );

        if (!resultadoCaptcha.valido) {
          return {
            error: "CAPTCHA_INVALIDO",
            message:
              resultadoCaptcha.error || "Captcha inválido, intenta de nuevo",
            requiereCaptcha: true,
          };
        }

        console.log("✅ Captcha validado correctamente");
      }

      // 3. Detectar si es correo o nombre de usuario
      const esCorreo = loginInput.includes("@");

      const { supabase } = require("../config/database");

      // 4. Buscar usuario por correo o nombre de usuario
      let query = supabase.from("usuario").select(`
        usuario_id,
        nombre_usuario,
        correo,
        contraseña,
        rol_id,
        sucursal_id,
        activo,
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
        // ❌ Usuario no encontrado - registrar intento fallido
        const intentos = recaptchaService.registrarIntentoFallido(
          ip,
          loginInput
        );

        return {
          error: "CREDENCIALES_INVALIDAS",
          message: "Credenciales inválidas",
          requiereCaptcha: intentos >= 3,
        };
      }

      // 5. Verificar si el usuario está activo
      if (!usuario.activo) {
        console.log("⛔ Usuario inactivo:", loginInput);
        return {
          error: "USUARIO_INACTIVO",
          message: "Tu cuenta está desactivada. Contacta al administrador.",
        };
      }

      // 6. Verificar contraseña
      const passwordValido = await bcrypt.compare(password, usuario.contraseña);

      if (!passwordValido) {
        console.log("❌ Contraseña incorrecta para:", loginInput);

        // Registrar intento fallido
        const intentos = recaptchaService.registrarIntentoFallido(
          ip,
          loginInput
        );

        return {
          error: "CREDENCIALES_INVALIDAS",
          message: "Credenciales inválidas",
          requiereCaptcha: intentos >= 3,
        };
      }

      // 7. ✅ LOGIN EXITOSO - Limpiar intentos fallidos
      recaptchaService.limpiarIntentos(ip, loginInput);

      // 8. Generar JWT token
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

      // 9. Retornar datos del usuario y token
      return {
        success: true,
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
   * VERIFICAR SI REQUIERE CAPTCHA (endpoint público)
   */
  async verificarRequiereCaptcha(loginInput, ipAddress) {
    const ip = ipAddress || "unknown";
    const requiere = recaptchaService.requiereCaptcha(ip, loginInput);

    return {
      requiereCaptcha: requiere,
      intentos: recaptchaService.obtenerIntentos(ip, loginInput),
    };
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

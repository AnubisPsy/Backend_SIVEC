// src/controllers/authController.js - CON reCAPTCHA Y LOGS
const authService = require("../services/authService");
const logService = require("../services/logService");

const authController = {
  /**
   * POST /api/auth/login
   * Login con protección reCAPTCHA
   */
  async login(req, res) {
    // Obtener IP del usuario
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "unknown";

    const user_agent = req.headers["user-agent"];

    try {
      const { loginInput, password, recaptchaToken } = req.body;

      // Validar campos requeridos
      if (!loginInput || !password) {
        // ⚠️ Log: Campos faltantes
        await logService.auth.loginFallido({
          usuario_id: null,
          ip: ipAddress,
          user_agent,
          detalles: {
            motivo: "campos_faltantes",
            login_intentado: loginInput,
          },
        });

        return res.status(400).json({
          success: false,
          error: "Faltan campos requeridos",
        });
      }

      console.log(`🌐 Login attempt from IP: ${ipAddress}`);

      // Intentar login
      const result = await authService.login(
        loginInput,
        password,
        recaptchaToken,
        ipAddress
      );

      // Si el resultado tiene error
      if (result.error) {
        // ❌ Log: Login fallido
        await logService.auth.loginFallido({
          usuario_id: null,
          ip: ipAddress,
          user_agent,
          detalles: {
            motivo: result.error,
            login_intentado: loginInput,
            requiere_captcha: result.requiereCaptcha || false,
          },
        });

        return res.status(401).json({
          success: false,
          error: result.error,
          message: result.message,
          requiereCaptcha: result.requiereCaptcha || false,
        });
      }

      // ✅ Log: Login exitoso
      await logService.auth.login({
        usuario_id: result.usuario.usuario_id,
        ip: ipAddress,
        user_agent,
        detalles: {
          nombre: result.usuario.nombre_usuario,
          rol: result.usuario.rol_id,
          sucursal: result.usuario.sucursal_id,
          con_captcha: !!recaptchaToken,
        },
      });

      console.log(`✅ Login exitoso: ${result.usuario.nombre_usuario}`);

      // Login exitoso
      return res.status(200).json({
        success: true,
        data: {
          token: result.token,
          usuario: result.usuario,
        },
      });
    } catch (error) {
      console.error("❌ Error en authController.login:", error);

      // ❌ Log: Error del sistema
      await logService.errores.error({
        usuario_id: null,
        origen: "backend",
        modulo: "authController",
        mensaje: `Error en login: ${error.message}`,
        stack_trace: error.stack,
        detalles: {
          login_intentado: req.body.loginInput,
        },
        ip: ipAddress,
        user_agent,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      return res.status(500).json({
        success: false,
        error: "ERROR_SERVIDOR",
        message: "Error interno del servidor",
      });
    }
  },

  /**
   * POST /api/auth/verificar-captcha-requerido
   * Verificar si un usuario requiere captcha (ANTES del login)
   */
  async verificarCaptchaRequerido(req, res) {
    try {
      const { loginInput } = req.body;

      if (!loginInput) {
        return res.status(400).json({
          success: false,
          error: "loginInput requerido",
        });
      }

      // Obtener IP
      const ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.headers["x-real-ip"] ||
        req.connection.remoteAddress ||
        "unknown";

      const resultado = await authService.verificarRequiereCaptcha(
        loginInput,
        ipAddress
      );

      return res.status(200).json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      console.error("❌ Error en verificarCaptchaRequerido:", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar",
      });
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection.remoteAddress ||
      "unknown";

    const user_agent = req.headers["user-agent"];

    try {
      // ✅ Log: Logout
      if (req.usuario?.usuario_id) {
        await logService.auth.logout({
          usuario_id: req.usuario.usuario_id,
          ip: ipAddress,
          user_agent,
          detalles: {
            nombre: req.usuario.nombre_usuario,
          },
        });

        console.log(`👋 Logout: ${req.usuario.nombre_usuario}`);
      }

      // Aquí podrías invalidar el token si usas una blacklist
      // Por ahora solo confirmamos el logout

      return res.status(200).json({
        success: true,
        message: "Logout exitoso",
      });
    } catch (error) {
      console.error("❌ Error en logout:", error);

      // ❌ Log: Error
      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "authController",
        mensaje: `Error en logout: ${error.message}`,
        stack_trace: error.stack,
        ip: ipAddress,
        user_agent,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      return res.status(500).json({
        success: false,
        error: "Error en logout",
      });
    }
  },

  /**
   * GET /api/auth/verificar-token
   */
  async verificarToken(req, res) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          error: "Token no proporcionado",
        });
      }

      const resultado = await authService.verificarToken(token);

      if (!resultado.valid) {
        return res.status(401).json({
          success: false,
          error: resultado.error,
        });
      }

      return res.status(200).json({
        success: true,
        data: resultado.usuario,
      });
    } catch (error) {
      console.error("❌ Error en verificarToken:", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar token",
      });
    }
  },

  /**
   * POST /api/auth/cambiar-password
   */
  async cambiarPassword(req, res) {
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection.remoteAddress ||
      "unknown";

    try {
      const { usuario_id } = req.usuario; // Del middleware de auth
      const { passwordActual, passwordNuevo } = req.body;

      if (!passwordActual || !passwordNuevo) {
        return res.status(400).json({
          success: false,
          error: "Faltan campos requeridos",
        });
      }

      await authService.cambiarPassword(
        usuario_id,
        passwordActual,
        passwordNuevo
      );

      // ✅ Log: Cambio de contraseña exitoso
      await logService.sistema.registrar({
        usuario_id,
        categoria: "configuracion",
        accion: "cambio_password",
        detalles: {
          nombre_usuario: req.usuario.nombre_usuario,
        },
        ip: ipAddress,
      });

      console.log(`✅ Contraseña cambiada: Usuario ${usuario_id}`);

      return res.status(200).json({
        success: true,
        message: "Contraseña actualizada correctamente",
      });
    } catch (error) {
      console.error("❌ Error en cambiarPassword:", error);

      // ❌ Log: Error en cambio de contraseña
      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "authController",
        mensaje: `Error en cambio de contraseña: ${error.message}`,
        stack_trace: error.stack,
        ip: ipAddress,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      if (error.message === "Contraseña actual incorrecta") {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: "Error al cambiar contraseña",
      });
    }
  },
};

module.exports = authController;

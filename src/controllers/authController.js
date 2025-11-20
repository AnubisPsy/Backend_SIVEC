// src/controllers/authController.js - CON reCAPTCHA
const authService = require("../services/authService");

const authController = {
  /**
   * POST /api/auth/login
   * Login con protección reCAPTCHA
   */
  async login(req, res) {
    try {
      const { loginInput, password, recaptchaToken } = req.body;

      // Validar campos requeridos
      if (!loginInput || !password) {
        return res.status(400).json({
          success: false,
          error: "Faltan campos requeridos",
        });
      }

      // Obtener IP del usuario
      const ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.headers["x-real-ip"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        "unknown";

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
        return res.status(401).json({
          success: false,
          error: result.error,
          message: result.message,
          requiereCaptcha: result.requiereCaptcha || false,
        });
      }

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
    try {
      // Aquí podrías invalidar el token si usas una blacklist
      // Por ahora solo confirmamos el logout

      return res.status(200).json({
        success: true,
        message: "Logout exitoso",
      });
    } catch (error) {
      console.error("❌ Error en logout:", error);
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

      return res.status(200).json({
        success: true,
        message: "Contraseña actualizada correctamente",
      });
    } catch (error) {
      console.error("❌ Error en cambiarPassword:", error);

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

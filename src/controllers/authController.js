// src/controllers/authController.js
const authService = require("../services/authService");

const authController = {
  /**
   * POST /auth/login - Iniciar sesión
   */
  async login(req, res) {
    console.log("📥 Body recibido:", req.body);
    console.log("📥 Headers:", req.headers);
    try {
      // Cambiar de 'correo' a 'loginInput'
      const { loginInput, password } = req.body;

      if (!loginInput || !password) {
        return res.status(400).json({
          success: false,
          error: "Usuario/correo y contraseña son requeridos",
          message: "Datos incompletos",
        });
      }

      console.log(`🔐 Intento de login: ${loginInput}`);

      const resultado = await authService.login(loginInput, password);

      res.json({
        success: true,
        data: resultado,
        message: "Login exitoso",
      });
    } catch (error) {
      console.error("❌ Error en login:", error.message);

      res.status(401).json({
        success: false,
        error: error.message,
        message: "Error de autenticación",
      });
    }
  },

  /**
   * POST /auth/verificar - Verificar si el token es válido
   */
  async verificarToken(req, res) {
    try {
      // El middleware verificarAuth ya validó el token
      // Solo devolvemos los datos del usuario

      res.json({
        success: true,
        data: {
          usuario: req.usuario,
          token_valido: true,
        },
        message: "Token válido",
      });
    } catch (error) {
      console.error("❌ Error al verificar token:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al verificar token",
      });
    }
  },

  /**
   * POST /auth/cambiar-password - Cambiar contraseña
   */
  async cambiarPassword(req, res) {
    try {
      const { password_actual, password_nuevo } = req.body;

      if (!password_actual || !password_nuevo) {
        return res.status(400).json({
          success: false,
          error: "password_actual y password_nuevo son requeridos",
          message: "Datos incompletos",
        });
      }

      if (password_nuevo.length < 6) {
        return res.status(400).json({
          success: false,
          error: "La nueva contraseña debe tener al menos 6 caracteres",
          message: "Contraseña muy corta",
        });
      }

      await authService.cambiarPassword(
        req.usuario.usuario_id,
        password_actual,
        password_nuevo
      );

      console.log(`✅ Contraseña cambiada para: ${req.usuario.correo}`);

      res.json({
        success: true,
        message: "Contraseña actualizada exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al cambiar contraseña:", error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al cambiar contraseña",
      });
    }
  },

  /**
   * POST /auth/logout - Cerrar sesión (solo cliente)
   */
  async logout(req, res) {
    try {
      // En JWT no hay logout real en el servidor
      // El cliente debe eliminar el token

      console.log(`👋 Logout para: ${req.usuario.correo}`);

      res.json({
        success: true,
        message: "Sesión cerrada. Elimine el token del cliente.",
      });
    } catch (error) {
      console.error("❌ Error en logout:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error en logout",
      });
    }
  },
};

module.exports = authController;

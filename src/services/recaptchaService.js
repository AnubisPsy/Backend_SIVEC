// src/services/recaptchaService.js
const axios = require("axios");

// 🔒 Almacén temporal de intentos fallidos (en producción usar Redis)
const intentosFallidos = new Map();

// ⏰ Tiempo de expiración de intentos (15 minutos)
const EXPIRACION_INTENTOS = 15 * 60 * 1000;

const recaptchaService = {
  /**
   * VALIDAR reCAPTCHA con Google
   */
  async verificarRecaptcha(token) {
    try {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;

      if (!secretKey) {
        throw new Error("RECAPTCHA_SECRET_KEY no configurada");
      }

      // Hacer petición a Google para validar el token
      const response = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        null,
        {
          params: {
            secret: secretKey,
            response: token,
          },
        }
      );

      const { success, score, "error-codes": errorCodes } = response.data;

      if (!success) {
        console.log("❌ reCAPTCHA inválido:", errorCodes);
        return {
          valido: false,
          error: "reCAPTCHA inválido o expirado",
        };
      }

      console.log("✅ reCAPTCHA válido", score ? `(score: ${score})` : "");

      return {
        valido: true,
        score: score || null,
      };
    } catch (error) {
      console.error("❌ Error al verificar reCAPTCHA:", error.message);
      return {
        valido: false,
        error: "Error al validar reCAPTCHA",
      };
    }
  },

  /**
   * REGISTRAR intento fallido de login
   */
  registrarIntentoFallido(ip, usuario) {
    const clave = `${ip}_${usuario}`;
    const ahora = Date.now();

    // Obtener intentos previos
    let datos = intentosFallidos.get(clave);

    if (!datos || ahora - datos.primerIntento > EXPIRACION_INTENTOS) {
      // Primer intento o intentos expirados
      datos = {
        intentos: 1,
        primerIntento: ahora,
        ultimoIntento: ahora,
      };
    } else {
      // Incrementar intentos
      datos.intentos++;
      datos.ultimoIntento = ahora;
    }

    intentosFallidos.set(clave, datos);

    console.log(
      `⚠️ Intento fallido #${datos.intentos} para ${usuario} desde ${ip}`
    );

    return datos.intentos;
  },

  /**
   * OBTENER cantidad de intentos fallidos
   */
  obtenerIntentos(ip, usuario) {
    const clave = `${ip}_${usuario}`;
    const ahora = Date.now();
    const datos = intentosFallidos.get(clave);

    if (!datos) {
      return 0;
    }

    // Verificar si expiraron los intentos
    if (ahora - datos.primerIntento > EXPIRACION_INTENTOS) {
      intentosFallidos.delete(clave);
      return 0;
    }

    return datos.intentos;
  },

  /**
   * LIMPIAR intentos fallidos (después de login exitoso)
   */
  limpiarIntentos(ip, usuario) {
    const clave = `${ip}_${usuario}`;
    intentosFallidos.delete(clave);
    console.log(`🧹 Intentos limpiados para ${usuario} desde ${ip}`);
  },

  /**
   * VERIFICAR si se requiere captcha
   */
  requiereCaptcha(ip, usuario) {
    const intentos = this.obtenerIntentos(ip, usuario);
    // Activar captcha después de 3 intentos fallidos
    return intentos >= 3;
  },

  /**
   * LIMPIAR intentos expirados (ejecutar periódicamente)
   */
  limpiarExpirados() {
    const ahora = Date.now();
    let eliminados = 0;

    for (const [clave, datos] of intentosFallidos.entries()) {
      if (ahora - datos.primerIntento > EXPIRACION_INTENTOS) {
        intentosFallidos.delete(clave);
        eliminados++;
      }
    }

    if (eliminados > 0) {
      console.log(`🧹 ${eliminados} intentos expirados eliminados`);
    }
  },
};

// Limpiar intentos expirados cada 5 minutos
setInterval(() => {
  recaptchaService.limpiarExpirados();
}, 5 * 60 * 1000);

module.exports = recaptchaService;

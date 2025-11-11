// src/middleware/auth.js
const authService = require("../services/authService");
const { supabase } = require("../config/database");

/**
 * MIDDLEWARE PRINCIPAL DE AUTENTICACIÓN
 * Verifica que el usuario tenga un token JWT válido
 * ✅ CORREGIDO: Actualiza sucursal desde BD en cada request
 */
const verificarAuth = async (req, res, next) => {
  console.log("🔐 ================================");
  console.log("🔐 MIDDLEWARE verificarAuth");
  console.log("🔐 Método:", req.method);
  console.log("🔐 URL:", req.url);
  console.log("🔐 Path:", req.path);
  console.log("🔐 ================================");

  try {
    // 1. Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    console.log(
      "🔐 PASO 1: Header Authorization:",
      authHeader ? "Presente" : "Ausente"
    );

    if (!authHeader) {
      console.log("❌ No hay header de autorización");
      return res.status(401).json({
        success: false,
        error: "Token de autorización requerido",
        message: "Acceso denegado",
      });
    }

    // 2. Extraer token (formato: "Bearer TOKEN_AQUI")
    const token = authHeader.split(" ")[1];

    console.log(
      "🔐 PASO 2: Token extraído:",
      token ? `${token.substring(0, 20)}...` : "null"
    );

    if (!token) {
      console.log("❌ Token mal formateado");
      return res.status(401).json({
        success: false,
        error: "Token mal formateado",
        message: "Use el formato: Authorization: Bearer <token>",
      });
    }

    // 3. Verificar token
    console.log("🔐 PASO 3: Verificando token...");
    const verificacion = await authService.verificarToken(token);

    console.log(
      "🔐 PASO 4: Resultado verificación:",
      verificacion.valid ? "Válido" : "Inválido"
    );

    if (!verificacion.valid) {
      console.log("❌ Token inválido:", verificacion.error);
      return res.status(401).json({
        success: false,
        error: verificacion.error,
        message: "Token inválido",
      });
    }

    // 4. Agregar datos del usuario a la request (desde token)
    req.usuario = verificacion.usuario;

    console.log(
      `✅ Usuario del token: ${req.usuario.correo} (${req.usuario.nombre_rol})`
    );
    console.log("📦 sucursal_id del token:", req.usuario.sucursal_id);

    // 🔥 5. REFRESH SUCURSAL DESDE BD (para admins que cambiaron de sucursal)
    if (req.usuario.usuario_id) {
      console.log("🔄 Refrescando sucursal desde BD...");

      const { data: usuarioActualizado, error: errorConsulta } = await supabase
        .from("usuario")
        .select(
          `
          sucursal_id,
          sucursales:sucursal_id (
            sucursal_id,
            nombre_sucursal
          )
        `
        )
        .eq("usuario_id", req.usuario.usuario_id)
        .single();

      if (errorConsulta) {
        console.log(
          "⚠️ No se pudo obtener sucursal actualizada:",
          errorConsulta.message
        );
        // Continuar con la sucursal del token
      } else if (usuarioActualizado) {
        console.log(
          "📦 Sucursal actualizada desde BD:",
          usuarioActualizado.sucursal_id
        );

        // Actualizar sucursal_id (campo directo)
        req.usuario.sucursal_id = usuarioActualizado.sucursal_id;

        // Actualizar objeto sucursal (si existe)
        if (usuarioActualizado.sucursales) {
          req.usuario.sucursal = {
            sucursal_id: usuarioActualizado.sucursales.sucursal_id,
            nombre_sucursal: usuarioActualizado.sucursales.nombre_sucursal,
          };
          console.log("✅ Objeto sucursal actualizado:", req.usuario.sucursal);
        }
      }
    }

    console.log(
      `✅ Usuario final: ${req.usuario.correo} - Sucursal: ${req.usuario.sucursal_id}`
    );
    console.log("🔐 PASO 6: Pasando al siguiente middleware...");
    console.log("🔐 ================================");

    next();
  } catch (error) {
    console.error("❌❌❌ ERROR EN MIDDLEWARE AUTH ❌❌❌");
    console.error("Tipo:", error.name);
    console.error("Mensaje:", error.message);
    console.error("Stack:", error.stack);
    console.error("❌❌❌ FIN ERROR ❌❌❌");

    return res.status(500).json({
      success: false,
      error: "Error interno de autenticación",
      message: "Error al verificar token",
    });
  }
};

/**
 * MIDDLEWARE PARA VERIFICAR ROL ESPECÍFICO
 * Verifica que el usuario tenga un rol específico
 */
const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    try {
      // Este middleware debe ejecutarse después de verificarAuth
      if (!req.usuario) {
        return res.status(500).json({
          success: false,
          error: "Error de configuración: verificarAuth debe ejecutarse antes",
          message: "Error interno",
        });
      }

      // Permitir array de roles o rol único
      const roles = Array.isArray(rolesPermitidos)
        ? rolesPermitidos
        : [rolesPermitidos];

      if (!roles.includes(req.usuario.rol_id)) {
        return res.status(403).json({
          success: false,
          error: "Permisos insuficientes",
          message: `Esta operación requiere rol: ${roles.join(" o ")}`,
        });
      }

      console.log(`✅ Rol verificado: ${req.usuario.nombre_rol}`);
      next();
    } catch (error) {
      console.error("❌ Error en middleware rol:", error);

      return res.status(500).json({
        success: false,
        error: "Error interno de autorización",
        message: "Error al verificar permisos",
      });
    }
  };
};

/**
 * MIDDLEWARE ESPECÍFICOS PARA SIVEC
 */

// Solo jefes de yarda y admins
const soloJefes = verificarRol([2, 3]); // 2=Jefe, 3=Admin

// Solo pilotos
const soloPilotos = verificarRol(1); // 1=Piloto

// Solo admins
const soloAdmin = verificarRol(3); // 3=Admin

module.exports = {
  verificarAuth,
  verificarRol,
  soloJefes,
  soloPilotos,
  soloAdmin,
};

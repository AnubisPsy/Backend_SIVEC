// src/middleware/auth.js
const authService = require('../services/authService');

/**
 * MIDDLEWARE PRINCIPAL DE AUTENTICACIÓN
 * Verifica que el usuario tenga un token JWT válido
 */
const verificarAuth = async (req, res, next) => {
  try {
    // 1. Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token de autorización requerido',
        message: 'Acceso denegado'
      });
    }

    // 2. Extraer token (formato: "Bearer TOKEN_AQUI")
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token mal formateado',
        message: 'Use el formato: Authorization: Bearer <token>'
      });
    }

    // 3. Verificar token
    const verificacion = await authService.verificarToken(token);
    
    if (!verificacion.valid) {
      return res.status(401).json({
        success: false,
        error: verificacion.error,
        message: 'Token inválido'
      });
    }

    // 4. Agregar datos del usuario a la request
    req.usuario = verificacion.usuario;
    
    console.log(`✅ Usuario autenticado: ${req.usuario.correo} (${req.usuario.nombre_rol})`);
    
    next();

  } catch (error) {
    console.error('❌ Error en middleware auth:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Error interno de autenticación',
      message: 'Error al verificar token'
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
          error: 'Error de configuración: verificarAuth debe ejecutarse antes',
          message: 'Error interno'
        });
      }

      // Permitir array de roles o rol único
      const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
      
      if (!roles.includes(req.usuario.rol_id)) {
        return res.status(403).json({
          success: false,
          error: 'Permisos insuficientes',
          message: `Esta operación requiere rol: ${roles.join(' o ')}`
        });
      }

      console.log(`✅ Rol verificado: ${req.usuario.nombre_rol}`);
      next();

    } catch (error) {
      console.error('❌ Error en middleware rol:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Error interno de autorización',
        message: 'Error al verificar permisos'
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
  soloAdmin
};
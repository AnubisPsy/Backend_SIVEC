// src/routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const { verificarAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /auth/login - Iniciar sesión
 * Body: { correo, password }
 */
router.post('/login', authController.login);

/**
 * POST /auth/verificar - Verificar token válido
 * Headers: Authorization: Bearer <token>
 */
router.post('/verificar', verificarAuth, authController.verificarToken);

/**
 * POST /auth/cambiar-password - Cambiar contraseña
 * Headers: Authorization: Bearer <token>
 * Body: { password_actual, password_nuevo }
 */
router.post('/cambiar-password', verificarAuth, authController.cambiarPassword);

/**
 * POST /auth/logout - Cerrar sesión
 * Headers: Authorization: Bearer <token>
 */
router.post('/logout', verificarAuth, authController.logout);

module.exports = router;
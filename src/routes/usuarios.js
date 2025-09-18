// src/routes/usuarios.js
const express = require("express");
const usuarioController = require("../controllers/usuarioController");
const { verificarAuth, soloAdmin, soloJefes } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// RUTAS CRUD BÁSICAS
// ==========================================

/**
 * POST /api/usuarios - Crear usuario (solo admins)
 */
router.post("/", verificarAuth, soloAdmin, usuarioController.crear);

/**
 * GET /api/usuarios - Obtener todos los usuarios (requiere auth)
 */
router.get("/", verificarAuth, usuarioController.obtenerTodos);

/**
 * GET /api/usuarios/:id - Obtener usuario por ID (requiere auth)
 */
router.get("/:id", verificarAuth, usuarioController.obtenerPorId);

/**
 * PUT /api/usuarios/:id - Actualizar usuario (solo admins)
 */
router.put("/:id", verificarAuth, soloAdmin, usuarioController.actualizar);

/**
 * DELETE /api/usuarios/:id - Eliminar usuario (solo admins)
 */
router.delete("/:id", verificarAuth, soloAdmin, usuarioController.eliminar);

// ==========================================
// RUTAS ESPECÍFICAS PARA SIVEC
// ==========================================

/**
 * GET /api/usuarios/roles/pilotos - Solo pilotos activos (jefes y admins)
 */
router.get(
  "/roles/pilotos",
  verificarAuth,
  soloJefes,
  usuarioController.obtenerPilotos
);

/**
 * GET /api/usuarios/roles/jefes-yarda - Solo jefes de yarda activos (solo admins)
 */
router.get(
  "/roles/jefes-yarda",
  verificarAuth,
  soloAdmin,
  usuarioController.obtenerJefesYarda
);

module.exports = router;

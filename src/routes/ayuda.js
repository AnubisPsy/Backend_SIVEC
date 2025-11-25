// src/routes/ayuda.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const ayudaController = require("../controllers/ayudaController");
const { verificarAuth } = require("../middleware/auth");

// Configurar multer directamente aquí
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes (JPEG, PNG, GIF, WebP)"));
    }
  },
});

/**
 * @route   POST /ayuda/reportar
 * @desc    Enviar un reporte de ayuda con imágenes opcionales
 * @access  Privado (requiere token)
 */
router.post(
  "/reportar",
  verificarAuth,
  upload.array("imagenes", 5),
  ayudaController.enviarReporte
);

/**
 * @route   GET /ayuda/verificar
 * @desc    Verificar configuración del servicio de correo
 * @access  Privado (solo para desarrollo/testing)
 */
router.get("/verificar", verificarAuth, ayudaController.verificarConfiguracion);

module.exports = router;

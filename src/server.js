// src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// Importar rutas
const usuarioRoutes = require("./routes/usuarios");
const authRoutes = require("./routes/auth");
const facturaRoutes = require("./routes/facturas");
const vehiculoRoutes = require("./routes/vehiculos");
const pilotoRoutes = require("./routes/pilotos");

// Importar configuración
const { probarConexiones } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// RUTAS
// ==========================================

// API Routes
app.use("/api/usuarios", usuarioRoutes);
app.use("/auth", authRoutes);
app.use("/api/facturas", facturaRoutes);
app.use("/api/vehiculos", vehiculoRoutes);
app.use("/api/pilotos", pilotoRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "SIVEC Backend API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV,
  });
});

// Ruta de health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      supabase: process.env.SUPABASE_URL ? "configurado" : "no configurado",
      sqlserver: process.env.SQL_SERVER_HOST ? "configurado" : "no configurado",
    },
  });
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// Manejo de errores básico
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`,
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, async () => {
  console.log("🚀 ===============================");
  console.log(`   SIVEC Backend iniciado`);
  console.log(`   Puerto: ${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log("🚀 ===============================");

  // Probar conexiones a las bases de datos
  await probarConexiones();
});

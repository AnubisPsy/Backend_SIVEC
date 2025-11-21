// src/server.js
require("dotenv").config();
const { iniciarDeteccionAutomatica } = require("./services/integracionService");
const express = require("express");
const http = require("http"); // ← AGREGAR
const cors = require("cors");
const helmet = require("helmet");
const { setupSocketIO } = require("./sockets/socketManager"); // ← AGREGAR

// Importar rutas
const usuarioRoutes = require("./routes/usuarios");
const authRoutes = require("./routes/auth");
const facturasRoutes = require("./routes/facturas");
const vehiculoRoutes = require("./routes/vehiculos");
const pilotoRoutes = require("./routes/pilotos");
const viajesRoutes = require("./routes/viajes");
const gpsRoutes = require("./routes/gps");
const sucursalesRoutes = require("./routes/sucursales");
const pilotosTemporalesRoutes = require("./routes/pilotos-temporales");
const guiasRoutes = require("./routes/guias");
const estadisticasRoutes = require("./routes/estadisticas");

// Importar configuración
const { probarConexiones } = require("./config/database");

const app = express();
const httpServer = http.createServer(app); // ← CAMBIAR: crear http server
const PORT = process.env.PORT || 3000;

// ==========================================
// WEBSOCKETS
// ==========================================
const io = setupSocketIO(httpServer); // ← AGREGAR: configurar Socket.io
app.set("io", io); // ← AGREGAR: hacer io disponible en toda la app

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
app.use("/api/guias", guiasRoutes);
app.use("/api/facturas", facturasRoutes);
app.use("/api/vehiculos", vehiculoRoutes);
app.use("/api/pilotos", pilotoRoutes);
app.use("/api/viajes", viajesRoutes);
app.use("/api/gps", gpsRoutes);
app.use("/api/sucursales", sucursalesRoutes);
app.use("/api/pilotos-temporales", pilotosTemporalesRoutes);
app.use("/api/estadisticas", estadisticasRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "SIVEC Backend API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV,
    websockets: "enabled", // ← AGREGAR
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
    websockets: io ? "activo" : "inactivo", // ← AGREGAR
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

iniciarDeteccionAutomatica();

// ==========================================
// INICIAR SERVIDOR
// ==========================================
httpServer.listen(PORT, async () => {
  // ← CAMBIAR: usar httpServer en lugar de app
  console.log("🚀 ===============================");
  console.log(`   SIVEC Backend iniciado`);
  console.log(`   Puerto: ${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   🔌 WebSockets: HABILITADOS`); // ← AGREGAR
  console.log("🚀 ===============================");

  // Probar conexiones a las bases de datos
  await probarConexiones();
});

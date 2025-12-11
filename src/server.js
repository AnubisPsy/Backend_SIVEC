// src/server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const { setupSocketIO } = require("./sockets/socketManager");

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
const ubicacionesRoutes = require("./routes/ubicaciones");
const ayudaRoutes = require("./routes/ayuda");

// Importar servicios
const ubicacionesService = require("./services/ubicacionesService"); // ← AGREGAR

// Importar configuración
const { probarConexiones } = require("./config/database");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ==========================================
// WEBSOCKETS
// ==========================================
const io = setupSocketIO(httpServer);
app.set("io", io);

// Emisor de ubicaciones en tiempo real
let intervalId = null;

const iniciarEmisionUbicaciones = () => {
 // console.log(" Iniciando emisión de ubicaciones en tiempo real...");

  intervalId = setInterval(async () => {
    try {
      const datos = await ubicacionesService.obtenerTodasUbicaciones();
      io.emit("ubicaciones_actualizadas", datos);
      //  console.log(` ${datos.total} ubicaciones emitidas vía WebSocket`);
    } catch (error) {
      console.error(" Error emitiendo ubicaciones:", error.message);
    }
  }, 15000); // 15 segundos
};

// Detener emisión al cerrar servidor
process.on("SIGTERM", () => {
  // console.log(" Deteniendo emisión de ubicaciones...");
  if (intervalId) {
    clearInterval(intervalId);
  }
});

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
app.use("/api/ubicaciones", ubicacionesRoutes);
app.use("/ayuda", ayudaRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "SIVEC Backend API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV,
    websockets: "enabled",
    ubicaciones_tiempo_real: "activo", // ← AGREGAR
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
    websockets: io ? "activo" : "inactivo",
    ubicaciones_interval: intervalId ? "activo" : "inactivo", // ← AGREGAR
  });
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// Manejo de errores básico
app.use((err, req, res, next) => {
  console.error(" Error:", err.stack);
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
httpServer.listen(PORT, async () => {
  console.log(" ===============================");
  console.log(`   SIVEC Backend iniciado`);
  console.log(`   Puerto: ${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   WebSockets: HABILITADOS`);
  console.log(" ===============================");

  // Probar conexiones a las bases de datos
  await probarConexiones();

  //  INICIAR EMISIÓN DE UBICACIONES
  iniciarEmisionUbicaciones();
});

// backend/src/sockets/socketManager.js
const { Server } = require("socket.io");
const authService = require("../services/authService");

function setupSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3001",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // ✅ MIDDLEWARE DE AUTENTICACIÓN (CORREGIDO)
  io.use(async (socket, next) => {
    // ← AGREGAR async
    const token = socket.handshake.auth.token;

    console.log("🔑 Token recibido:", token ? "SÍ" : "NO");

    if (!token) {
      console.log("❌ No hay token");
      return next(new Error("Authentication error"));
    }

    try {
      // ✅ AGREGAR await
      const verification = await authService.verificarToken(token);

      console.log("🔍 Verificación:", verification);

      if (!verification.valid) {
        console.log("❌ Token inválido:", verification.error);
        return next(new Error("Invalid token"));
      }

      socket.usuario = verification.usuario;
      console.log("✅ Usuario autenticado:", socket.usuario.nombre_usuario);
      next();
    } catch (error) {
      console.error("❌ Error verificando token:", error.message);
      return next(new Error("Invalid token"));
    }
  });

  // Conexión establecida
  io.on("connection", (socket) => {
    console.log(`✅ WebSocket: ${socket.usuario.nombre_usuario} conectado`);

    // Unir a rooms por rol
    socket.join(`rol_${socket.usuario.rol_id}`);
    socket.join(`usuario_${socket.usuario.usuario_id}`);

    // Room para sucursal (si tiene)
    if (socket.usuario.sucursal_id) {
      socket.join(`sucursal_${socket.usuario.sucursal_id}`);
      console.log(
        `  📍 Usuario unido a sucursal_${socket.usuario.sucursal_id}`
      );
    }

    // Evento de unirse a viaje específico
    socket.on("join:viaje", (viajeId) => {
      socket.join(`viaje_${viajeId}`);
      console.log(`  🚛 Usuario unido a viaje_${viajeId}`);
    });

    // Evento de salir de viaje
    socket.on("leave:viaje", (viajeId) => {
      socket.leave(`viaje_${viajeId}`);
      console.log(`  🚫 Usuario salió de viaje_${viajeId}`);
    });

    // Desconexión
    socket.on("disconnect", () => {
      console.log(
        `❌ WebSocket: ${socket.usuario.nombre_usuario} desconectado`
      );
    });
  });

  return io;
}

module.exports = { setupSocketIO };

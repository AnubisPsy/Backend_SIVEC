// src/sockets/socketManager.js
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

  // ✅ MIDDLEWARE DE AUTENTICACIÓN (OPCIONAL)
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    console.log("🔑 Token recibido:", token ? "SÍ" : "NO");

    if (!token) {
      console.log("⚠️ Conexión sin autenticación - acceso limitado");
      socket.usuario = null; // ← Sin usuario
      return next(); // ← PERMITIR CONEXIÓN SIN TOKEN
    }

    try {
      const verification = await authService.verificarToken(token);

      if (!verification.valid) {
        console.log("❌ Token inválido:", verification.error);
        socket.usuario = null;
        return next(); // ← PERMITIR pero sin usuario
      }

      socket.usuario = verification.usuario;
      console.log("✅ Usuario autenticado:", socket.usuario.nombre_usuario);
      next();
    } catch (error) {
      console.error("❌ Error verificando token:", error.message);
      socket.usuario = null;
      next(); // ← PERMITIR pero sin usuario
    }
  });

  // Conexión establecida
  io.on("connection", (socket) => {
    if (socket.usuario) {
      console.log(`✅ WebSocket: ${socket.usuario.nombre_usuario} conectado`);

      // Unir a rooms por rol
      socket.join(`rol_${socket.usuario.rol_id}`);
      socket.join(`usuario_${socket.usuario.usuario_id}`);

      // Room para sucursal
      if (socket.usuario.sucursal_id) {
        socket.join(`sucursal_${socket.usuario.sucursal_id}`);
        console.log(
          `  📍 Usuario unido a sucursal_${socket.usuario.sucursal_id}`
        );
      }
    } else {
      console.log("✅ WebSocket: Cliente anónimo conectado (solo ubicaciones)");
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
      if (socket.usuario) {
        console.log(
          `❌ WebSocket: ${socket.usuario.nombre_usuario} desconectado`
        );
      } else {
        console.log("❌ WebSocket: Cliente anónimo desconectado");
      }
    });
  });

  return io;
}

module.exports = { setupSocketIO };

// src/services/logService.js
const { supabase } = require("../config/database");

/**
 * Servicio de Logs para SIVEC
 * Registra eventos en diferentes tablas según su tipo
 */
const logService = {
  // ============================================================
  // 1. LOGS DE AUTENTICACIÓN
  // ============================================================
  auth: {
    /**
     * Registrar login exitoso
     */
    async login({ usuario_id, ip, user_agent, detalles = {} }) {
      try {
        const { data, error } = await supabase
          .from("logs_autenticacion")
          .insert({
            usuario_id,
            accion: "login",
            ip,
            user_agent,
            detalles: {
              navegador: extraerNavegador(user_agent),
              ...detalles,
            },
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`✅ [LOG] Login exitoso - Usuario: ${usuario_id}`);
        return data;
      } catch (error) {
        console.error("❌ Error registrando log de login:", error.message);
      }
    },

    /**
     * Registrar logout
     */
    async logout({ usuario_id, ip, user_agent, detalles = {} }) {
      try {
        const { data, error } = await supabase
          .from("logs_autenticacion")
          .insert({
            usuario_id,
            accion: "logout",
            ip,
            user_agent,
            detalles,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`✅ [LOG] Logout - Usuario: ${usuario_id}`);
        return data;
      } catch (error) {
        console.error("❌ Error registrando log de logout:", error.message);
      }
    },

    /**
     * Registrar intento de login fallido
     */
    async loginFallido({ usuario_id = null, ip, user_agent, detalles = {} }) {
      try {
        const { data, error } = await supabase
          .from("logs_autenticacion")
          .insert({
            usuario_id,
            accion: "login_fallido",
            ip,
            user_agent,
            detalles: {
              motivo: detalles.motivo || "credenciales_incorrectas",
              usuario_intentado: detalles.usuario_intentado,
              ...detalles,
            },
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`⚠️ [LOG] Login fallido - IP: ${ip}`);
        return data;
      } catch (error) {
        console.error(
          "❌ Error registrando log de login fallido:",
          error.message
        );
      }
    },

    /**
     * Registrar sesión expirada
     */
    async sesionExpirada({ usuario_id, ip, user_agent, detalles = {} }) {
      try {
        const { data, error } = await supabase
          .from("logs_autenticacion")
          .insert({
            usuario_id,
            accion: "sesion_expirada",
            ip,
            user_agent,
            detalles,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`⚠️ [LOG] Sesión expirada - Usuario: ${usuario_id}`);
        return data;
      } catch (error) {
        console.error(
          "❌ Error registrando log de sesión expirada:",
          error.message
        );
      }
    },
  },

  // ============================================================
  // 2. LOGS DE OPERACIONES
  // ============================================================
  operaciones: {
    /**
     * Registrar asignación de factura
     */
    async facturaAsignada({
      usuario_id,
      factura_id,
      numero_factura,
      detalles,
      ip,
    }) {
      try {
        const { data, error } = await supabase
          .from("logs_operaciones")
          .insert({
            usuario_id,
            tipo: "factura",
            accion: "asignada",
            entidad_id: factura_id,
            entidad_referencia: numero_factura,
            detalles: {
              piloto: detalles.piloto,
              vehiculo: detalles.vehiculo,
              fecha_asignacion: detalles.fecha_asignacion,
              viaje_id: detalles.viaje_id,
              viaje_nuevo: detalles.viaje_nuevo,
              ...detalles,
            },
            ip,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(
          `✅ [LOG] Factura asignada: ${numero_factura} - Usuario: ${usuario_id}`
        );
        return data;
      } catch (error) {
        console.error(
          "❌ Error registrando log de factura asignada:",
          error.message
        );
      }
    },

    /**
     * Registrar vinculación de guía
     */
    async guiaVinculada({ usuario_id, guia_id, numero_guia, detalles, ip }) {
      try {
        const { data, error } = await supabase
          .from("logs_operaciones")
          .insert({
            usuario_id,
            tipo: "guia",
            accion: "vinculada",
            entidad_id: guia_id,
            entidad_referencia: numero_guia,
            detalles: {
              numero_factura: detalles.numero_factura,
              viaje_id: detalles.viaje_id,
              piloto: detalles.piloto,
              ...detalles,
            },
            ip,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(
          `✅ [LOG] Guía vinculada: ${numero_guia} - Usuario: ${usuario_id}`
        );
        return data;
      } catch (error) {
        console.error(
          "❌ Error registrando log de guía vinculada:",
          error.message
        );
      }
    },

    /**
     * Registrar guía entregada
     */
    async guiaEntregada({ usuario_id, guia_id, numero_guia, detalles, ip }) {
      try {
        const { data, error } = await supabase
          .from("logs_operaciones")
          .insert({
            usuario_id,
            tipo: "guia",
            accion: "entregada",
            entidad_id: guia_id,
            entidad_referencia: numero_guia,
            detalles: {
              viaje_id: detalles.viaje_id,
              fecha_entrega: detalles.fecha_entrega,
              ...detalles,
            },
            ip,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(
          `✅ [LOG] Guía entregada: ${numero_guia} - Usuario: ${usuario_id}`
        );
        return data;
      } catch (error) {
        console.error(
          "❌ Error registrando log de guía entregada:",
          error.message
        );
      }
    },

    /**
     * Registrar guía no entregada
     */
    async guiaNoEntregada({ usuario_id, guia_id, numero_guia, detalles, ip }) {
      try {
        const { data, error } = await supabase
          .from("logs_operaciones")
          .insert({
            usuario_id,
            tipo: "guia",
            accion: "no_entregada",
            entidad_id: guia_id,
            entidad_referencia: numero_guia,
            detalles: {
              viaje_id: detalles.viaje_id,
              fecha_entrega: detalles.fecha_entrega,
              motivo: detalles.motivo,
              ...detalles,
            },
            ip,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(
          `⚠️ [LOG] Guía NO entregada: ${numero_guia} - Usuario: ${usuario_id}`
        );
        return data;
      } catch (error) {
        console.error(
          "❌ Error registrando log de guía no entregada:",
          error.message
        );
      }
    },

    /**
     * Registrar cambio de estado de viaje
     */
    async viajeEstadoCambiado({
      usuario_id,
      viaje_id,
      estado_anterior,
      estado_nuevo,
      detalles,
      ip,
    }) {
      try {
        const estados = {
          7: "pendiente",
          8: "en_proceso",
          9: "completado",
        };

        const { data, error } = await supabase
          .from("logs_operaciones")
          .insert({
            usuario_id,
            tipo: "viaje",
            accion: `cambio_estado_${estados[estado_nuevo]}`,
            entidad_id: viaje_id,
            entidad_referencia: `VIAJE-${viaje_id}`,
            detalles: {
              estado_anterior: estados[estado_anterior],
              estado_nuevo: estados[estado_nuevo],
              piloto: detalles.piloto,
              vehiculo: detalles.vehiculo,
              ...detalles,
            },
            ip,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(
          `✅ [LOG] Viaje ${viaje_id}: ${estados[estado_anterior]} → ${estados[estado_nuevo]}`
        );
        return data;
      } catch (error) {
        console.error(
          "❌ Error registrando log de cambio de estado:",
          error.message
        );
      }
    },

    /**
     * Registrar operación genérica
     */
    async registrar({
      usuario_id,
      tipo,
      accion,
      entidad_id,
      entidad_referencia,
      detalles,
      ip,
    }) {
      try {
        const { data, error } = await supabase
          .from("logs_operaciones")
          .insert({
            usuario_id,
            tipo,
            accion,
            entidad_id,
            entidad_referencia,
            detalles,
            ip,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(
          `✅ [LOG] Operación: ${tipo}_${accion} - Usuario: ${usuario_id}`
        );
        return data;
      } catch (error) {
        console.error("❌ Error registrando log de operación:", error.message);
      }
    },
  },

  // ============================================================
  // 3. LOGS DE ERRORES
  // ============================================================
  errores: {
    /**
     * Registrar error general
     */
    async registrar({
      usuario_id = null,
      nivel = "error",
      origen = "backend",
      modulo,
      mensaje,
      stack_trace = null,
      detalles = {},
      ip = null,
      user_agent = null,
      endpoint = null,
      metodo = null,
    }) {
      try {
        const { data, error } = await supabase
          .from("logs_errores")
          .insert({
            usuario_id,
            nivel,
            origen,
            modulo,
            mensaje,
            stack_trace,
            detalles,
            ip,
            user_agent,
            endpoint,
            metodo,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(
          `❌ [LOG] Error ${nivel}: ${modulo} - ${mensaje.substring(0, 50)}...`
        );
        return data;
      } catch (error) {
        console.error("❌ Error registrando log de error:", error.message);
      }
    },

    /**
     * Registrar error de nivel ERROR
     */
    async error(params) {
      return this.registrar({ ...params, nivel: "error" });
    },

    /**
     * Registrar error de nivel CRITICAL
     */
    async critical(params) {
      return this.registrar({ ...params, nivel: "critical" });
    },

    /**
     * Registrar error de nivel FATAL
     */
    async fatal(params) {
      return this.registrar({ ...params, nivel: "fatal" });
    },
  },

  // ============================================================
  // 4. LOGS DE SISTEMA
  // ============================================================
  sistema: {
    /**
     * Registrar operación de sistema
     */
    async registrar({ usuario_id, categoria, accion, detalles, ip = null }) {
      try {
        const { data, error } = await supabase
          .from("logs_sistema")
          .insert({
            usuario_id,
            categoria,
            accion,
            detalles,
            ip,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(
          `⚙️ [LOG] Sistema: ${categoria}_${accion} - Usuario: ${usuario_id}`
        );
        return data;
      } catch (error) {
        console.error("❌ Error registrando log de sistema:", error.message);
      }
    },

    /**
     * Registrar creación de usuario
     */
    async usuarioCreado({ usuario_id, nuevo_usuario, detalles, ip }) {
      return this.registrar({
        usuario_id,
        categoria: "configuracion",
        accion: "usuario_creado",
        detalles: {
          nuevo_usuario_id: nuevo_usuario.usuario_id,
          nuevo_usuario_nombre: nuevo_usuario.nombre_usuario,
          rol: nuevo_usuario.rol_id,
          ...detalles,
        },
        ip,
      });
    },

    /**
     * Registrar cambio de configuración
     */
    async configuracionCambiada({ usuario_id, detalles, ip }) {
      return this.registrar({
        usuario_id,
        categoria: "configuracion",
        accion: "cambio_configuracion",
        detalles,
        ip,
      });
    },
  },

  // ============================================================
  // 5. UTILIDADES
  // ============================================================

  /**
   * Consultar logs recientes (para dashboard)
   */
  async obtenerRecientes({ tipo = null, limite = 50, usuario_id = null }) {
    try {
      let query = supabase
        .from("vista_logs_consolidados")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limite);

      if (tipo) {
        query = query.eq("tipo_log", tipo);
      }

      if (usuario_id) {
        query = query.eq("usuario_id", usuario_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("❌ Error obteniendo logs recientes:", error.message);
      return [];
    }
  },

  /**
   * Limpiar logs antiguos
   */
  async limpiarAntiguos(dias = 90) {
    try {
      const { data, error } = await supabase.rpc("limpiar_logs_antiguos", {
        dias_retencion: dias,
      });

      if (error) throw error;
      console.log(`🧹 [LOG] Logs antiguos limpiados (>${dias} días)`);
      return data;
    } catch (error) {
      console.error("❌ Error limpiando logs antiguos:", error.message);
      return null;
    }
  },
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Extraer nombre del navegador del user-agent
 */
function extraerNavegador(userAgent) {
  if (!userAgent) return "Desconocido";

  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Opera")) return "Opera";

  return "Otro";
}

module.exports = logService;

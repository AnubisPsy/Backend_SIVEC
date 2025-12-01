// src/controllers/guiaController.js
const guiaService = require("../services/guiaService");
const logService = require("../services/logService");

const guiaController = {
  /**
   * GET /api/guias/:id - Obtener guía por ID
   */
  async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de guía inválido",
          message: "El ID debe ser un número válido",
        });
      }

      console.log(`🔍 Buscando guía ID: ${id}`);

      const guia = await guiaService.obtenerPorId(parseInt(id));

      if (!guia) {
        return res.status(404).json({
          success: false,
          error: "Guía no encontrada",
          message: `No existe una guía con ID ${id}`,
        });
      }

      console.log(`✅ Guía encontrada: ${guia.numero_guia}`);

      res.json({
        success: true,
        data: guia,
        message: "Guía obtenida exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo guía:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener guía",
      });
    }
  },

  /**
   * GET /api/guias/factura/:numero_factura - Obtener guías de una factura
   */
  async obtenerPorFactura(req, res) {
    try {
      const { numero_factura } = req.params;

      if (!numero_factura) {
        return res.status(400).json({
          success: false,
          error: "Número de factura requerido",
          message: "Debe proporcionar un número de factura",
        });
      }

      console.log(`🔍 Obteniendo guías de factura: ${numero_factura}`);

      const guias = await guiaService.obtenerPorFactura(numero_factura);

      console.log(`✅ ${guias.length} guías encontradas`);

      res.json({
        success: true,
        data: guias,
        total: guias.length,
        message: "Guías obtenidas exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo guías:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener guías",
      });
    }
  },

  /**
   * POST /api/guias - Crear guía (vincular a factura)
   */
  /**
   * POST /api/guias - Crear guía (vincular a factura)
   */
  async crear(req, res) {
    const ip = req.ip || req.connection.remoteAddress;
    try {
      const {
        numero_guia,
        numero_factura,
        detalle_producto,
        direccion,
        fecha_emision,
      } = req.body;

      console.log("🔗 Enlazando guía:", {
        numero_guia,
        numero_factura,
        usuario: req.usuario.nombre_usuario,
      });

      // Validaciones
      if (!numero_guia || !numero_factura) {
        return res.status(400).json({
          success: false,
          error: "numero_guia y numero_factura son requeridos",
          message: "Datos incompletos",
        });
      }

      // Verificar que la guía no exista ya
      const existe = await guiaService.existeGuia(numero_guia);

      if (existe) {
        return res.status(400).json({
          success: false,
          error: "Esta guía ya fue vinculada anteriormente",
          message: "Guía duplicada",
        });
      }

      // Obtener el viaje_id de la factura
      const viaje_id = await guiaService.obtenerViajeIdDeFactura(
        numero_factura
      );

      if (!viaje_id) {
        return res.status(404).json({
          success: false,
          error: "No se encontró la factura asignada",
          message: "La factura no tiene un viaje asociado",
        });
      }

      console.log(`✅ Vinculando guía al viaje: ${viaje_id}`);

      // Crear guía
      const guia = await guiaService.crear({
        numero_guia,
        numero_factura,
        detalle_producto,
        direccion,
        fecha_emision,
        viaje_id,
      });

      console.log(
        `✅ Guía enlazada: ${guia.numero_guia} (ID: ${guia.guia_id})`
      );

      await logService.operaciones.guiaVinculada({
        usuario_id: req.usuario.usuario_id,
        guia_id: guia.guia_id,
        numero_guia: guia.numero_guia,
        detalles: {
          numero_factura: guia.numero_factura,
          viaje_id: guia.viaje_id,
          piloto: req.usuario.nombre_usuario,
          detalle_producto: detalle_producto || "Sin descripción",
          direccion: direccion || "Sin dirección",
        },
        ip,
      });

      // ✅ EMITIR EVENTO: Guía asignada
      const io = req.app.get("io");
      io.emit("factura:guia_asignada", {
        factura_id: guia.factura_id,
        numero_factura: guia.numero_factura,
        numero_guia: guia.numero_guia,
        viaje_id: guia.viaje_id,
        timestamp: new Date().toISOString(),
      });
      console.log(`🔔 Evento: factura:guia_asignada (viaje ${viaje_id})`);

      // ✅ VERIFICAR SI TODAS LAS FACTURAS YA TIENEN GUÍA
      try {
        const todasTienenGuia =
          await guiaService.verificarTodasFacturasTienenGuia(viaje_id);

        if (todasTienenGuia) {
          // Cambiar viaje a estado 8 (En proceso)
          await guiaService.actualizarEstadoViaje(viaje_id, 8);

          console.log(
            `✅ Viaje ${viaje_id} → Estado 8 (En proceso) - Todas las facturas tienen guía`
          );

          await logService.operaciones.viajeEstadoCambiado({
            usuario_id: null, // Sistema automático
            viaje_id,
            estado_anterior: 7,
            estado_nuevo: 8,
            detalles: {
              motivo: "todas_guias_vinculadas",
              usuario_ultima_guia: req.usuario.nombre_usuario,
            },
            ip: "sistema",
          });

          // ✅ EMITIR EVENTO: Estado del viaje actualizado
          io.emit("viaje:estado_actualizado", {
            viaje_id,
            estado_id: 8,
            estado_nombre: "En proceso",
            todas_guias_asignadas: true,
            timestamp: new Date().toISOString(),
          });
          console.log(
            `🔔 Evento: viaje:estado_actualizado (viaje ${viaje_id} → En proceso)`
          );
        } else {
          console.log(
            `ℹ️ Viaje ${viaje_id} aún tiene facturas sin guía asignada`
          );
        }
      } catch (errorViaje) {
        console.error("⚠️ Error verificando estado del viaje:", errorViaje);
      }

      res.status(201).json({
        success: true,
        data: guia,
        message: "Guía vinculada exitosamente",
      });
    } catch (error) {
      console.error("❌ Error enlazando guía:", error);

      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "guiaController",
        mensaje: `Error enlazando guía: ${error.message}`,
        stack_trace: error.stack,
        detalles: {
          input: req.body,
        },
        ip,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al enlazar guía",
      });
    }
  },

  /**
   * PATCH /api/guias/:id/estado - Actualizar estado de guía
   */
  async actualizarEstado(req, res) {
    const ip = req.ip || req.connection.remoteAddress;
    try {
      const { id } = req.params;
      const { estado_id } = req.body;

      console.log(`🔄 Actualizando estado de guía ${id} a estado ${estado_id}`);

      // Validaciones
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de guía inválido",
          message: "El ID debe ser un número válido",
        });
      }

      if (![3, 4, 5].includes(estado_id)) {
        return res.status(400).json({
          success: false,
          error: "Estado inválido (debe ser 3, 4 o 5)",
          message: "Estado no válido",
        });
      }

      // Actualizar estado
      const guia = await guiaService.actualizarEstado(parseInt(id), estado_id);

      console.log(
        `✅ Estado actualizado: ${guia.numero_guia} → ${guia.estados.nombre}`
      );

      if (estado_id === 4) {
        // Guía entregada
        await logService.operaciones.guiaEntregada({
          usuario_id: req.usuario.usuario_id,
          guia_id: guia.guia_id,
          numero_guia: guia.numero_guia,
          detalles: {
            viaje_id: guia.viaje_id,
            numero_factura: guia.numero_factura,
            fecha_entrega: new Date().toISOString(),
            piloto: req.usuario.nombre_usuario,
          },
          ip,
        });
      } else if (estado_id === 5) {
        // Guía NO entregada
        await logService.operaciones.guiaNoEntregada({
          usuario_id: req.usuario.usuario_id,
          guia_id: guia.guia_id,
          numero_guia: guia.numero_guia,
          detalles: {
            viaje_id: guia.viaje_id,
            numero_factura: guia.numero_factura,
            fecha_entrega: new Date().toISOString(),
            piloto: req.usuario.nombre_usuario,
            motivo: req.body.motivo || "No especificado",
          },
          ip,
        });
      }

      // ✅ EMITIR EVENTO: Estado de guía actualizado
      const io = req.app.get("io");
      io.emit("guia:estado_actualizado", {
        guia_id: guia.guia_id,
        numero_guia: guia.numero_guia,
        estado_id: guia.estado_id,
        estado_nombre: guia.estados.nombre,
        viaje_id: guia.viaje_id,
        timestamp: new Date().toISOString(),
      });
      console.log(`🔔 Evento: guia:estado_actualizado (${guia.numero_guia})`);

      // Si la guía fue marcada como entregada o no entregada
      if ((estado_id === 4 || estado_id === 5) && guia.viaje_id) {
        console.log(`🔍 Verificando progreso del viaje ${guia.viaje_id}...`);

        try {
          // Obtener todas las guías del viaje
          const guiasViaje = await guiaService.obtenerGuiasDeViaje(
            guia.viaje_id
          );

          const totalGuias = guiasViaje.length;
          const guiasEntregadas = guiasViaje.filter(
            (g) => g.estado_id === 4
          ).length;
          const guiasNoEntregadas = guiasViaje.filter(
            (g) => g.estado_id === 5
          ).length;
          const guiasFinalizadas = guiasEntregadas + guiasNoEntregadas;
          const porcentaje =
            totalGuias > 0
              ? Math.round((guiasFinalizadas / totalGuias) * 100)
              : 0;

          // ✅ EMITIR EVENTO: Progreso del viaje actualizado
          io.emit("viaje:progreso_actualizado", {
            viaje_id: guia.viaje_id,
            total_guias: totalGuias,
            guias_entregadas: guiasEntregadas,
            guias_no_entregadas: guiasNoEntregadas,
            guias_pendientes: totalGuias - guiasFinalizadas,
            porcentaje,
            timestamp: new Date().toISOString(),
          });
          console.log(`🔔 Evento: viaje:progreso_actualizado (${porcentaje}%)`);

          // Verificar si el viaje está completado
          const viajeCompletado = await guiaService.verificarViajeCompletado(
            guia.viaje_id
          );

          if (viajeCompletado) {
            await guiaService.actualizarEstadoViaje(guia.viaje_id, 9);
            console.log(`✅ Viaje ${guia.viaje_id} → Estado 9 (Completado)`);

            await logService.operaciones.viajeEstadoCambiado({
              usuario_id: req.usuario.usuario_id,
              viaje_id: guia.viaje_id,
              estado_anterior: 8,
              estado_nuevo: 9,
              detalles: {
                total_guias: totalGuias,
                guias_entregadas: guiasEntregadas,
                guias_no_entregadas: guiasNoEntregadas,
                porcentaje_exito:
                  totalGuias > 0
                    ? Math.round((guiasEntregadas / totalGuias) * 100)
                    : 0,
                piloto: req.usuario.nombre_usuario,
              },
              ip,
            });

            // ✅ EMITIR EVENTO: Viaje completado
            io.emit("viaje:completado", {
              viaje_id: guia.viaje_id,
              total_guias: totalGuias,
              guias_entregadas: guiasEntregadas,
              guias_no_entregadas: guiasNoEntregadas,
              porcentaje_exito:
                totalGuias > 0
                  ? Math.round((guiasEntregadas / totalGuias) * 100)
                  : 0,
              timestamp: new Date().toISOString(),
            });
            console.log(`🔔 Evento: viaje:completado (viaje ${guia.viaje_id})`);
          } else {
            const pendientes = guiasViaje.filter(
              (g) => g.estado_id === 3
            ).length;
            console.log(
              `ℹ️ Viaje ${guia.viaje_id}: ${pendientes} guías pendientes de ${totalGuias}`
            );
          }
        } catch (errorViaje) {
          console.error("⚠️ Error verificando viaje:", errorViaje);
        }
      }

      res.json({
        success: true,
        data: guia,
        message: "Estado actualizado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error actualizando estado:", error);

      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "guiaController",
        mensaje: `Error actualizando estado: ${error.message}`,
        stack_trace: error.stack,
        detalles: {
          guia_id: req.params.id,
          estado_solicitado: req.body.estado_id,
        },
        ip,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al actualizar estado",
      });
    }
  },
};

module.exports = guiaController;

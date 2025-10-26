// src/controllers/guiaController.js
const guiaService = require("../services/guiaService");

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
  async crear(req, res) {
    try {
      const {
        numero_guia,
        numero_factura,
        detalle_producto,
        direccion,
        fecha_emision,
      } = req.body;

      console.log("🔍 Creando guía:", {
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

      console.log(`✅ Guía creada: ${guia.numero_guia} (ID: ${guia.guia_id})`);

      // Actualizar estado del viaje a "En proceso"
      try {
        await guiaService.actualizarEstadoViaje(viaje_id, 8);
        console.log(
          `✅ Viaje actualizado a estado 8 (En proceso): ${viaje_id}`
        );
      } catch (errorViaje) {
        console.error("⚠️ Error actualizando viaje:", errorViaje);
        // No fallar la operación si no se puede actualizar el viaje
      }

      res.status(201).json({
        success: true,
        data: guia,
        message: "Guía vinculada exitosamente",
      });
    } catch (error) {
      console.error("❌ Error creando guía:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al crear guía",
      });
    }
  },

  /**
   * PATCH /api/guias/:id/estado - Actualizar estado de guía
   */
  async actualizarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado_id } = req.body;

      console.log(`🔍 Actualizando estado de guía ${id} a estado ${estado_id}`);

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

      // Si la guía fue marcada como entregada o no entregada, verificar si el viaje está completo
      if ((estado_id === 4 || estado_id === 5) && guia.viaje_id) {
        console.log(
          `🔍 Verificando si viaje ${guia.viaje_id} está completado...`
        );

        try {
          const viajeCompletado = await guiaService.verificarViajeCompletado(
            guia.viaje_id
          );

          if (viajeCompletado) {
            await guiaService.actualizarEstadoViaje(guia.viaje_id, 9);
            console.log(
              `✅ Viaje ${guia.viaje_id} completado - Todas las guías finalizadas`
            );
          } else {
            const guiasViaje = await guiaService.obtenerGuiasDeViaje(
              guia.viaje_id
            );
            const pendientes = guiasViaje.filter(
              (g) => g.estado_id === 3
            ).length;
            console.log(
              `ℹ️ Viaje ${guia.viaje_id} aún tiene guías pendientes (${pendientes} de ${guiasViaje.length})`
            );
          }
        } catch (errorViaje) {
          console.error("⚠️ Error verificando viaje:", errorViaje);
          // No fallar la operación si hay error verificando el viaje
        }
      }

      res.json({
        success: true,
        data: guia,
        message: "Estado actualizado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error actualizando estado:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al actualizar estado",
      });
    }
  },
};

module.exports = guiaController;

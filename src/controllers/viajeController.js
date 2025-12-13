// src/controllers/viajeController.js
const viajeService = require("../services/viajeService");
const { supabase } = require("../config/database");
const logService = require("../services/logService");

const viajeController = {
  /**
   * GET /api/viajes - Obtener viajes filtrados por sucursal
   */
  async obtenerTodos(req, res) {
    try {
      const { estado, numero_vehiculo } = req.query;
      const usuario = req.usuario;

      console.log(
        `🔍 Usuario: ${usuario.nombre_usuario} | Rol: ${usuario.rol_id} | Sucursal: ${usuario.sucursal_id}`
      );

      // Obtener viajes con filtros
      const viajes = await viajeService.obtenerViajes({
        estado,
        numero_vehiculo,
      });

      console.log(`📋 Total viajes encontrados: ${viajes.length}`);

      // Procesar cada viaje
      const viajesCompletos = await Promise.all(
        viajes.map(async (viaje) => {
          // Obtener vehículo con sucursal
          const vehiculo = await viajeService.obtenerVehiculo(
            viaje.numero_vehiculo
          );

          console.log(
            `🚛 Viaje ${viaje.viaje_id} | Vehículo: ${viaje.numero_vehiculo} | Sucursal: ${vehiculo?.sucursal_id}`
          );

          // Filtrar: Admin ve todos, otros solo su sucursal
          if (
            usuario.rol_id !== 3 &&
            vehiculo?.sucursal_id !== usuario.sucursal_id
          ) {
            console.log(
              `❌ Viaje ${viaje.viaje_id} FILTRADO (sucursal ${vehiculo?.sucursal_id} != ${usuario.sucursal_id})`
            );
            return null;
          }

          console.log(`✅ Viaje ${viaje.viaje_id} PERMITIDO`);

          // Obtener facturas del viaje
          const facturas = await viajeService.obtenerFacturasDeViaje(
            viaje.viaje_id
          );

          // Para cada factura, obtener sus guías
          const facturasConGuias = await Promise.all(
            facturas.map(async (factura) => {
              console.log(
                `🔍 Buscando guías para factura: ${factura.numero_factura}`
              );

              const guias = await viajeService.obtenerGuiasDeFactura(
                factura.numero_factura
              );

              console.log(`📦 Guías encontradas: ${guias.length}`);

              return {
                ...factura,
                guias,
              };
            })
          );

          return {
            ...viaje,
            vehiculo,
            facturas: facturasConGuias,
            total_guias: facturasConGuias.reduce(
              (sum, f) => sum + f.guias.length,
              0
            ),
            guias_entregadas: facturasConGuias.reduce(
              (sum, f) => sum + f.guias.filter((g) => g.estado_id === 4).length,
              0
            ),
            guias_no_entregadas: facturasConGuias.reduce(
              (sum, f) => sum + f.guias.filter((g) => g.estado_id === 5).length,
              0
            ),
            total_facturas: facturasConGuias.length,
          };
        })
      );

      const viajesFiltrados = viajesCompletos.filter((v) => v !== null);

      console.log(
        `✅ Viajes mostrados: ${viajesFiltrados.length} de ${viajes.length}`
      );

      res.json({
        success: true,
        data: viajesFiltrados,
      });
    } catch (error) {
      console.error("❌ Error obteniendo viajes:", error);

      // ❌ AGREGAR: Log de error
      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "viajeController",
        mensaje: `Error obteniendo viajes: ${error.message}`,
        stack_trace: error.stack,
        detalles: {
          filtros: req.query,
        },
        ip: req.ip,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message,
      });
    }
  },

  /**
   * GET /api/viajes/:id - Obtener detalle específico
   */
  async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      const usuario = req.usuario;

      // Validación
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de viaje inválido",
          message: "El ID debe ser un número válido",
        });
      }

      console.log(`🔍 Buscando viaje ID: ${id}`);

      // Obtener viaje
      const viaje = await viajeService.obtenerViajePorId(parseInt(id));

      if (!viaje) {
        return res.status(404).json({
          success: false,
          error: "Viaje no encontrado",
          message: `No existe un viaje con ID ${id}`,
        });
      }

      // Validar permisos
      if (
        usuario.rol_id !== 3 &&
        viaje.vehiculo?.sucursal_id !== usuario.sucursal_id
      ) {
        return res.status(403).json({
          success: false,
          error: "No tienes permiso para ver este viaje",
          message: "Solo puedes ver viajes de tu sucursal",
        });
      }

      // Obtener facturas completas
      const facturas = await viajeService.obtenerFacturasCompletasDeViaje(
        parseInt(id)
      );

      // Para cada factura, obtener guías completas
      const facturasConGuias = await Promise.all(
        facturas.map(async (factura) => {
          const guias = await viajeService.obtenerGuiasCompletasDeFactura(
            factura.numero_factura
          );

          return {
            ...factura,
            guias,
          };
        })
      );

      // Calcular totales
      const total_guias = facturasConGuias.reduce(
        (sum, f) => sum + f.guias.length,
        0
      );

      const guias_entregadas = facturasConGuias.reduce(
        (sum, f) => sum + f.guias.filter((g) => g.estado_id === 4).length,
        0
      );

      const guias_no_entregadas = facturasConGuias.reduce(
        (sum, f) => sum + f.guias.filter((g) => g.estado_id === 5).length,
        0
      );

      const total_facturas = facturasConGuias.length;

      console.log(`✅ Viaje encontrado: ${viaje.viaje_id}`);

      res.json({
        success: true,
        data: {
          ...viaje,
          facturas: facturasConGuias,
          total_guias,
          guias_entregadas,
          guias_no_entregadas,
          total_facturas,
        },
        message: "Viaje obtenido exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo viaje:", error);

      // ❌ AGREGAR: Log de error
      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "viajeController",
        mensaje: `Error obteniendo viaje: ${error.message}`,
        stack_trace: error.stack,
        detalles: {
          viaje_id: req.params.id,
        },
        ip: req.ip,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message,
      });
    }
  },

  /**
   * GET /api/viajes/recientes - Obtener viajes de las últimas 24 horas
   */
  async obtenerRecientes(req, res) {
    try {
      const { sucursal_id } = req.usuario;

      if (!sucursal_id) {
        return res.status(400).json({
          success: false,
          error: "Usuario sin sucursal asignada",
          message: "Tu usuario no tiene una sucursal asignada",
        });
      }

      console.log(`📊 Obteniendo viajes recientes de sucursal: ${sucursal_id}`);

      // Calcular fecha de hace 24 horas
      const hace24Horas = new Date();
      hace24Horas.setHours(hace24Horas.getHours() - 24);

      // Obtener viajes completados de las últimas 24h
      const viajes = await viajeService.obtenerViajesRecientes(
        hace24Horas.toISOString()
      );

      // Filtrar por vehículos de la sucursal del usuario
      const vehiculosSucursal = await viajeService.obtenerVehiculosPorSucursal(
        sucursal_id
      );

      const numerosVehiculos = vehiculosSucursal.map((v) => v.numero_vehiculo);

      const viajesFiltrados = viajes.filter((v) =>
        numerosVehiculos.includes(v.numero_vehiculo)
      );

      // Para cada viaje, obtener detalles
      const viajesConDetalles = await Promise.all(
        viajesFiltrados.map(async (viaje) => {
          // Facturas
          const facturas = await viajeService.obtenerFacturasDeViaje(
            viaje.viaje_id
          );

          // Guías
          const guias = await viajeService.obtenerGuiasDeViaje(viaje.viaje_id);

          const totalGuias = guias.length;
          const guiasEntregadas = guias.filter((g) => g.estado_id === 4).length;
          const guiasNoEntregadas = guias.filter(
            (g) => g.estado_id === 5
          ).length;

          return {
            ...viaje,
            facturas,
            guias,
            estadisticas: {
              total_facturas: facturas.length,
              total_guias: totalGuias,
              guias_entregadas: guiasEntregadas,
              guias_no_entregadas: guiasNoEntregadas,
              porcentaje_exito:
                totalGuias > 0
                  ? Math.round((guiasEntregadas / totalGuias) * 100)
                  : 0,
            },
          };
        })
      );

      // Estadísticas rápidas
      const estadisticas = {
        total_viajes: viajesConDetalles.length,
        total_facturas: viajesConDetalles.reduce(
          (sum, v) => sum + v.estadisticas.total_facturas,
          0
        ),
        total_guias: viajesConDetalles.reduce(
          (sum, v) => sum + v.estadisticas.total_guias,
          0
        ),
        total_entregadas: viajesConDetalles.reduce(
          (sum, v) => sum + v.estadisticas.guias_entregadas,
          0
        ),
      };

      console.log(
        `✅ ${viajesConDetalles.length} viajes recientes de sucursal ${sucursal_id}`
      );

      res.json({
        success: true,
        data: viajesConDetalles,
        estadisticas,
        periodo: "Últimas 24 horas",
        message: "Viajes recientes obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo viajes recientes:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener viajes recientes",
      });
    }
  },

  /**
   * GET /api/viajes/historial - Obtener viajes completados con filtros
   */
  async obtenerHistorial(req, res) {
    try {
      const {
        fecha_desde,
        fecha_hasta,
        piloto,
        numero_vehiculo,
        sucursal_id,
        estado_viaje,
        porcentaje_minimo,
        agrupacion,
      } = req.query;

      console.log("📊 Obteniendo historial de viajes:", {
        fecha_desde,
        fecha_hasta,
        piloto,
        numero_vehiculo,
      });

      // Obtener viajes con filtros
      const viajes = await viajeService.obtenerViajesHistorial({
        fecha_desde,
        fecha_hasta,
        piloto,
        numero_vehiculo,
      });

      // Para cada viaje, obtener detalles
      const viajesConDetalles = await Promise.all(
        viajes.map(async (viaje) => {
          // Obtener vehículo con sucursal
          const vehiculo = await viajeService.obtenerVehiculo(
            viaje.numero_vehiculo
          );

          // Obtener facturas
          const facturas = await viajeService.obtenerFacturasDeViaje(
            viaje.viaje_id
          );

          // Obtener guías
          const guias = await viajeService.obtenerGuiasDeViaje(viaje.viaje_id);

          // Calcular estadísticas
          const totalGuias = guias.length;
          const guiasEntregadas = guias.filter((g) => g.estado_id === 4).length;
          const guiasNoEntregadas = guias.filter(
            (g) => g.estado_id === 5
          ).length;
          const porcentajeExito =
            totalGuias > 0
              ? Math.round((guiasEntregadas / totalGuias) * 100)
              : 0;

          return {
            ...viaje,
            vehiculo,
            facturas,
            guias,
            estadisticas: {
              total_facturas: facturas.length,
              total_guias: totalGuias,
              guias_entregadas: guiasEntregadas,
              guias_no_entregadas: guiasNoEntregadas,
              porcentaje_exito: porcentajeExito,
            },
          };
        })
      );

      // Aplicar filtros post-procesamiento
      let viajesFiltrados = viajesConDetalles;

      // Filtro por sucursal
      if (sucursal_id) {
        viajesFiltrados = viajesFiltrados.filter(
          (v) => v.vehiculo?.sucursal_id === parseInt(sucursal_id)
        );
      }

      // Filtro por agrupación
      if (agrupacion) {
        viajesFiltrados = viajesFiltrados.filter((v) =>
          v.vehiculo?.agrupacion
            ?.toLowerCase()
            .includes(agrupacion.toLowerCase())
        );
      }

      // Filtro por porcentaje mínimo
      if (porcentaje_minimo) {
        viajesFiltrados = viajesFiltrados.filter(
          (v) => v.estadisticas.porcentaje_exito >= parseInt(porcentaje_minimo)
        );
      }

      // Estadísticas generales
      const estadisticasGenerales = {
        total_viajes: viajesFiltrados.length,
        total_facturas: viajesFiltrados.reduce(
          (sum, v) => sum + v.estadisticas.total_facturas,
          0
        ),
        total_guias: viajesFiltrados.reduce(
          (sum, v) => sum + v.estadisticas.total_guias,
          0
        ),
        total_entregadas: viajesFiltrados.reduce(
          (sum, v) => sum + v.estadisticas.guias_entregadas,
          0
        ),
        pilotos_activos: [...new Set(viajesFiltrados.map((v) => v.piloto))]
          .length,
        sucursales_activas: [
          ...new Set(viajesFiltrados.map((v) => v.vehiculo?.sucursal_id)),
        ].length,
      };

      console.log(`✅ ${viajesFiltrados.length} viajes en historial`);

      res.json({
        success: true,
        data: viajesFiltrados,
        estadisticas: estadisticasGenerales,
        filtros: req.query,
        message: "Historial obtenido exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo historial:", error);

      // ❌ AGREGAR: Log de error
      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "viajeController",
        mensaje: `Error obteniendo historial: ${error.message}`,
        stack_trace: error.stack,
        detalles: {
          filtros: req.query,
        },
        ip: req.ip,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener historial",
      });
    }
  },

  /**
   * GET /api/viajes/reportes/dinamico - Reportes con agrupaciones
   */
  async obtenerReporteDinamico(req, res) {
    try {
      const {
        fecha_desde,
        fecha_hasta,
        piloto,
        numero_vehiculo,
        sucursal_id,
        modo, // 'agregado' o 'especificar'
        agrupar_por, // 'piloto', 'vehiculo', 'sucursal', 'fecha', 'ninguno'
      } = req.query;

      console.log("📊 Generando reporte dinámico:", {
        modo,
        agrupar_por,
        fecha_desde,
        fecha_hasta,
      });

      // Validar modo
      if (!modo || !["agregado", "especificar"].includes(modo)) {
        return res.status(400).json({
          success: false,
          error: "Modo inválido",
          message: "El modo debe ser 'agregado' o 'especificar'",
        });
      }

      let resultado;

      if (modo === "agregado") {
        resultado = await viajeService.obtenerReporteAgregado({
          fecha_desde,
          fecha_hasta,
          piloto,
          numero_vehiculo,
          sucursal_id,
          agrupar_por: agrupar_por || "piloto",
        });
      } else {
        resultado = await viajeService.obtenerReporteEspecificado({
          fecha_desde,
          fecha_hasta,
          piloto,
          numero_vehiculo,
          sucursal_id,
          agrupar_por: agrupar_por || "piloto",
        });
      }

      res.json({
        success: true,
        modo,
        agrupar_por: agrupar_por || "piloto",
        ...resultado,
      });
    } catch (error) {
      console.error("❌ Error generando reporte dinámico:", error);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al generar reporte",
      });
    }
  },

  /**
   * GET /api/viajes/piloto/:piloto_id - Obtener viajes de un piloto específico
   */
  async obtenerViajesPiloto(req, res) {
    try {
      const { piloto_id } = req.params;

      console.log(`🔍 Obteniendo viajes del piloto: ${piloto_id}`);

      // 1. Obtener usuario y su vinculación
      const { data: usuario, error: errorUsuario } = await supabase
        .from("usuario")
        .select("piloto_sql_id, piloto_temporal_id, nombre_usuario")
        .eq("usuario_id", piloto_id)
        .single();

      if (errorUsuario) throw errorUsuario;

      let nombrePiloto = null;

      // 2. Obtener nombre del piloto
      if (usuario.piloto_temporal_id) {
        const { data: pilotoTemp } = await supabase
          .from("piloto_temporal")
          .select("nombre")
          .eq("piloto_temporal_id", usuario.piloto_temporal_id)
          .single();

        if (pilotoTemp) nombrePiloto = pilotoTemp.nombre;
      } else if (usuario.piloto_sql_id) {
        const sql = require("mssql");
        const { sqlConfig } = require("../config/database");
        const pool = await sql.connect(sqlConfig);

        const result = await pool
          .request()
          .input("piloto_id", sql.Int, usuario.piloto_sql_id)
          .query("SELECT nombre FROM pilotos WHERE piloto_id = @piloto_id");

        await pool.close();

        if (result.recordset.length > 0) {
          nombrePiloto = result.recordset[0].nombre;
        }
      }

      if (!nombrePiloto) {
        nombrePiloto = usuario.nombre_usuario;
      }

      console.log(`👤 Nombre del piloto: ${nombrePiloto}`);

      // 3. Obtener viajes del piloto
      const { data: viajes, error: errorViajes } = await supabase
        .from("viaje")
        .select("*")
        .or(`piloto.eq.${nombrePiloto},piloto.eq.${usuario.nombre_usuario}`)
        .order("created_at", { ascending: false });

      if (errorViajes) throw errorViajes;

      // 4. Para cada viaje, obtener detalles
      const viajesConDetalles = await Promise.all(
        viajes.map(async (viaje) => {
          // Obtener facturas del viaje
          const facturas = await viajeService.obtenerFacturasDeViaje(
            viaje.viaje_id
          );

          // Para cada factura, obtener guías
          const facturasConGuias = await Promise.all(
            facturas.map(async (factura) => {
              const guias = await viajeService.obtenerGuiasDeFactura(
                factura.numero_factura
              );

              return {
                ...factura,
                guias,
              };
            })
          );

          return {
            ...viaje,
            facturas: facturasConGuias,
            total_guias: facturasConGuias.reduce(
              (sum, f) => sum + f.guias.length,
              0
            ),
            guias_entregadas: facturasConGuias.reduce(
              (sum, f) => sum + f.guias.filter((g) => g.estado_id === 4).length,
              0
            ),
            guias_no_entregadas: facturasConGuias.reduce(
              (sum, f) => sum + f.guias.filter((g) => g.estado_id === 5).length,
              0
            ),
            total_facturas: facturasConGuias.length,
          };
        })
      );

      console.log(`✅ ${viajesConDetalles.length} viajes encontrados`);

      res.json({
        success: true,
        data: viajesConDetalles,
        message: "Viajes del piloto obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error obteniendo viajes del piloto:", error);

      // ❌ AGREGAR: Log de error
      await logService.errores.error({
        usuario_id: req.usuario?.usuario_id,
        origen: "backend",
        modulo: "viajeController",
        mensaje: `Error obteniendo viajes del piloto: ${error.message}`,
        stack_trace: error.stack,
        detalles: {
          piloto_id: req.params.piloto_id,
        },
        ip: req.ip,
        endpoint: req.originalUrl,
        metodo: req.method,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener viajes del piloto",
      });
    }
  },

  /**
   * GET /api/viajes/sucursales - Obtener todas las sucursales
   */
  async obtenerSucursales(req, res) {
    try {
      const sucursales = await viajeService.obtenerSucursales();

      res.json({
        success: true,
        data: sucursales,
      });
    } catch (error) {
      console.error("Error obteniendo sucursales:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * GET /api/viajes/pilotos - Obtener todos los pilotos
   */
  async obtenerTodosPilotos(req, res) {
    try {
      const pilotos = await viajeService.obtenerTodosPilotos();

      res.json({
        success: true,
        data: pilotos,
      });
    } catch (error) {
      console.error("Error obteniendo pilotos:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * GET /api/viajes/vehiculos - Obtener vehículos (opcionalmente filtrados por sucursal)
   */
  async obtenerVehiculosPorSucursal(req, res) {
    try {
      const { sucursal_id } = req.query;

      const vehiculos = await viajeService.obtenerVehiculosPorSucursal(
        sucursal_id
      );

      res.json({
        success: true,
        data: vehiculos,
      });
    } catch (error) {
      console.error("Error obteniendo vehículos:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};

module.exports = viajeController;

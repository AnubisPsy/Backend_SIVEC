// src/controllers/usuarioController.js
const usuarioService = require("../services/usuarioService");
const bcrypt = require("bcrypt");
const { validarPassword } = require("../utils/passwordValidator");
const { supabase } = require("../config/database");
const sql = require("mssql");

const usuarioController = {
  /**
   * POST /api/usuarios - Crear usuario
   */
  async crear(req, res) {
    try {
      console.log("📝 Creando usuario:", {
        email: req.body.email,
        tipo_usuario: req.body.tipo_usuario,
      });

      const usuario = await usuarioService.crearUsuario(req.body);

      console.log("✅ Usuario creado con ID:", usuario.id);

      res.status(201).json({
        success: true,
        data: usuario,
        message: "Usuario creado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al crear usuario:", error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al crear usuario",
      });
    }
  },

  /**
   * GET /api/usuarios - Obtener usuarios
   */
  async obtenerTodos(req, res) {
    try {
      const filtros = {};

      // Aplicar filtros desde query params
      if (req.query.tipo_usuario) filtros.tipo_usuario = req.query.tipo_usuario;
      if (req.query.activo) filtros.activo = req.query.activo === "true";
      if (req.query.sucursal_id)
        filtros.sucursal_id = parseInt(req.query.sucursal_id);

      console.log("🔍 Obteniendo usuarios con filtros:", filtros);

      const usuarios = await usuarioService.obtenerUsuarios(filtros);

      console.log(`📋 ${usuarios.length} usuarios encontrados`);

      res.json({
        success: true,
        data: usuarios,
        total: usuarios.length,
        filtros: filtros,
        message: "Usuarios obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener usuarios:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener usuarios",
      });
    }
  },

  /**
   * GET /api/usuarios/:id - Obtener usuario por ID
   */
  async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de usuario inválido",
          message: "El ID debe ser un número válido",
        });
      }

      console.log("🔍 Buscando usuario ID:", id);

      const usuario = await usuarioService.obtenerUsuarioPorId(parseInt(id));

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
          message: `No existe un usuario con ID ${id}`,
        });
      }

      console.log("✅ Usuario encontrado:", usuario.nombre_usuario);

      res.json({
        success: true,
        data: usuario,
        message: "Usuario obtenido exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener usuario:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener usuario",
      });
    }
  },

  /**
   * PUT /api/usuarios/:id - Actualizar usuario
   */
  async actualizar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de usuario inválido",
        });
      }

      console.log("🔍 Actualizando usuario ID:", id);

      const usuario = await usuarioService.actualizarUsuario(
        parseInt(id),
        req.body
      );

      console.log("✅ Usuario actualizado:", usuario.nombre_usuario);

      res.json({
        success: true,
        data: usuario,
        message: "Usuario actualizado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al actualizar usuario:", error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al actualizar usuario",
      });
    }
  },

  /**
   * DELETE /api/usuarios/:id - Eliminar usuario
   */
  async eliminar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "ID de usuario inválido",
        });
      }

      console.log("🗑️ Eliminando usuario ID:", id);

      await usuarioService.eliminarUsuario(parseInt(id));

      console.log("✅ Usuario eliminado (marcado como inactivo)");

      res.json({
        success: true,
        message: "Usuario eliminado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al eliminar usuario:", error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al eliminar usuario",
      });
    }
  },

  // ==========================================
  // ENDPOINTS ESPECÍFICOS PARA SIVEC
  // ==========================================

  /**
   * GET /api/usuarios/pilotos - Obtener solo pilotos
   */
  async obtenerPilotos(req, res) {
    try {
      console.log("🚛 Obteniendo pilotos disponibles");

      const pilotos = await usuarioService.obtenerPilotos();

      console.log(`✅ ${pilotos.length} pilotos encontrados`);

      res.json({
        success: true,
        data: pilotos,
        total: pilotos.length,
        message: "Pilotos obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener pilotos:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener pilotos",
      });
    }
  },

  /**
   * GET /api/usuarios/jefes-yarda - Obtener jefes de yarda
   */
  async obtenerJefesYarda(req, res) {
    try {
      console.log("👔 Obteniendo jefes de yarda");

      const jefes = await usuarioService.obtenerJefesYarda();

      console.log(`✅ ${jefes.length} jefes de yarda encontrados`);

      res.json({
        success: true,
        data: jefes,
        total: jefes.length,
        message: "Jefes de yarda obtenidos exitosamente",
      });
    } catch (error) {
      console.error("❌ Error al obtener jefes de yarda:", error.message);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error al obtener jefes de yarda",
      });
    }
  },

  /**
   * PUT /api/usuarios/:id/sucursal - Actualizar solo la sucursal del usuario
   */
  async actualizarSucursal(req, res) {
    try {
      const { id } = req.params;
      const { sucursal_id } = req.body;

      console.log("═══════════════════════════════════════════════════");
      console.log("🔄 ACTUALIZAR SUCURSAL - CONTROLLER");
      console.log("═══════════════════════════════════════════════════");
      console.log("Usuario ID:", id);
      console.log("Nueva sucursal_id:", sucursal_id);

      // Validar ID de usuario
      if (!id || isNaN(parseInt(id))) {
        console.log("❌ ID de usuario inválido");
        return res.status(400).json({
          success: false,
          error: "ID de usuario inválido",
          message: "El ID debe ser un número válido",
        });
      }

      // Validar ID de sucursal
      if (!sucursal_id || isNaN(parseInt(sucursal_id))) {
        console.log("❌ ID de sucursal inválido");
        return res.status(400).json({
          success: false,
          error: "ID de sucursal inválido",
          message: "El ID de sucursal debe ser un número válido",
        });
      }

      console.log("✅ Validaciones pasadas, llamando al servicio...");

      // Llamar al servicio
      const usuarioActualizado = await usuarioService.actualizarSucursal(
        parseInt(id),
        parseInt(sucursal_id)
      );

      console.log("✅ Sucursal actualizada exitosamente");
      console.log("Usuario actualizado:", usuarioActualizado);
      console.log("═══════════════════════════════════════════════════");

      res.json({
        success: true,
        data: usuarioActualizado,
        message: "Sucursal actualizada exitosamente",
      });
    } catch (error) {
      console.error("❌ ERROR en actualizarSucursal:", error);
      console.log("═══════════════════════════════════════════════════");

      res.status(400).json({
        success: false,
        error: error.message,
        message: "Error al actualizar sucursal",
      });
    }
  },

  async cambiarContrasena(req, res) {
    try {
      const { passwordActual, passwordNuevo } = req.body;
      const usuarioId = req.usuario.usuario_id; // Del middleware de autenticación

      console.log("═══════════════════════════════════════════════");
      console.log("🔐 CAMBIAR CONTRASEÑA - CONTROLLER");
      console.log("═══════════════════════════════════════════════");
      console.log("Usuario ID:", usuarioId);

      // Validaciones básicas
      if (!passwordActual || !passwordNuevo) {
        console.log("❌ Faltan campos requeridos");
        return res.status(400).json({
          success: false,
          message:
            "Por favor proporciona la contraseña actual y la nueva contraseña",
        });
      }

      // 1. Obtener usuario de Supabase
      const { data: usuario, error: errorUsuario } = await supabase
        .from("usuario")
        .select("*")
        .eq("usuario_id", usuarioId)
        .single();

      if (errorUsuario || !usuario) {
        console.log("❌ Usuario no encontrado:", errorUsuario);
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      console.log("✅ Usuario encontrado:", usuario.nombre_usuario);

      // 2. Verificar que la contraseña actual sea correcta
      const passwordCorrecta = await bcrypt.compare(
        passwordActual,
        usuario.contraseña
      );

      if (!passwordCorrecta) {
        console.log("❌ Contraseña actual incorrecta");
        return res.status(401).json({
          success: false,
          message: "La contraseña actual es incorrecta",
        });
      }

      console.log("✅ Contraseña actual verificada");

      // 3. Validar fortaleza de la nueva contraseña
      const validacion = validarPassword(passwordNuevo, usuario.nombre_usuario);

      if (!validacion.isValid) {
        console.log(
          "❌ Contraseña nueva no cumple requisitos:",
          validacion.errors
        );
        return res.status(400).json({
          success: false,
          message:
            "La nueva contraseña no cumple con los requisitos de seguridad",
          errors: validacion.errors,
        });
      }

      console.log("✅ Nueva contraseña cumple requisitos");

      // 4. Verificar que la nueva contraseña sea diferente a la actual
      const esLaMisma = await bcrypt.compare(passwordNuevo, usuario.contraseña);

      if (esLaMisma) {
        console.log("❌ Nueva contraseña es igual a la actual");
        return res.status(400).json({
          success: false,
          message: "La nueva contraseña debe ser diferente a la actual",
        });
      }

      console.log("✅ Nueva contraseña es diferente");

      // 5. Hashear la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(passwordNuevo, salt);

      console.log("✅ Contraseña hasheada");

      // 6. Actualizar la contraseña en la base de datos
      const { error: errorActualizar } = await supabase
        .from("usuario")
        .update({
          contraseña: passwordHash,
          updated_at: new Date().toISOString(),
        })
        .eq("usuario_id", usuarioId);

      if (errorActualizar) {
        console.error("❌ Error al actualizar contraseña:", errorActualizar);
        return res.status(500).json({
          success: false,
          message: "Error al actualizar la contraseña",
        });
      }

      console.log("✅ Contraseña actualizada en BD");

      // 7. Registrar el cambio en logs
      await supabase.from("log_detecciones").insert({
        numero_factura: "SYSTEM",
        accion: "CAMBIO_CONTRASEÑA",
        detalles: `Usuario ${usuario.nombre_usuario} cambió su contraseña`,
        fecha_deteccion: new Date().toISOString(),
      });

      console.log(`✅ Cambio de contraseña registrado en logs`);
      console.log("═══════════════════════════════════════════════");

      return res.status(200).json({
        success: true,
        message: "Contraseña actualizada exitosamente",
      });
    } catch (error) {
      console.error("❌ Error en cambiarContrasena:", error);
      console.log("═══════════════════════════════════════════════");

      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  },

  async migrarPilotoAPermanente(req, res) {
    try {
      const { usuario_id } = req.params;
      const { piloto_sql_id, desactivar_temporal = true } = req.body;

      console.log("=== INICIO MIGRACIÓN ===");
      console.log("1. Datos recibidos:", {
        usuario_id,
        piloto_sql_id,
        desactivar_temporal,
      });

      // 1. Obtener usuario actual
      console.log("2. Obteniendo usuario de Supabase...");
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuario')
        .select(`
          usuario_id,
          nombre_usuario,
          correo,
          piloto_temporal_id,
          piloto_temporal!piloto_temporal_id (
            piloto_temporal_id,
            nombre,
            notas
          )
        `)
        .eq('usuario_id', usuario_id)
        .single();

      console.log("3. Usuario obtenido:", usuario);
      console.log("4. Error de Supabase:", errorUsuario);

      if (errorUsuario || !usuario) {
        console.log("❌ Usuario no encontrado");
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      if (!usuario.piloto_temporal_id) {
        console.log("❌ Usuario sin piloto temporal");
        return res.status(400).json({
          success: false,
          error: "El usuario no tiene un piloto temporal asignado",
        });
      }

      // 2. Verificar piloto SQL existe
      console.log("5. Verificando piloto en SQL Server...");

      // ✅ Usar la función que ya existe en database.js
      const { obtenerConexionSQL } = require("../config/database");
      const pool = await obtenerConexionSQL();

      const mssql = require("mssql");
      const resultPiloto = await pool
        .request()
        .input("pilotoId", mssql.Int, piloto_sql_id)
        .query(
          "SELECT piloto_id, nombre, activo FROM pilotos WHERE piloto_id = @pilotoId"
        );

      console.log("6. Piloto SQL encontrado:", resultPiloto.recordset);

      if (resultPiloto.recordset.length === 0) {
        console.log("❌ Piloto SQL no encontrado");
        return res.status(404).json({
          success: false,
          error: "El piloto especificado no existe en el sistema SQL Server",
        });
      }

      const pilotoSQL = resultPiloto.recordset[0];

      if (!pilotoSQL.activo) {
        console.log("❌ Piloto SQL inactivo");
        return res.status(400).json({
          success: false,
          error: "El piloto especificado está marcado como inactivo",
        });
      }

      // 3. Actualizar usuario
      console.log("7. Actualizando usuario en Supabase...");
      const { error: errorUpdate } = await supabase
        .from("usuario")
        .update({
          piloto_sql_id: piloto_sql_id,
          piloto_temporal_id: null,
          supabase_piloto_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("usuario_id", usuario_id);

      console.log("8. Error de actualización:", errorUpdate);

      if (errorUpdate) {
        console.log("❌ Error actualizando usuario");
        throw new Error(`Error al actualizar usuario: ${errorUpdate.message}`);
      }

      console.log("✅ Usuario actualizado");

      // 4. Desactivar piloto temporal
      if (desactivar_temporal && usuario.piloto_temporal_id) {
        console.log("9. Desactivando piloto temporal...");

        const notaMigracion = `Migrado a piloto SQL ID ${piloto_sql_id} el ${new Date().toISOString()}`;

        const { error: errorTemporal } = await supabase
          .from("piloto_temporal")
          .update({
            activo: false,
            notas: notaMigracion,
          })
          .eq("piloto_temporal_id", usuario.piloto_temporal_id);

        console.log("10. Error desactivando temporal:", errorTemporal);
        console.log("✅ Piloto temporal desactivado");
      }

      console.log("11. Preparando respuesta...");

      const respuesta = {
        success: true,
        message: "Piloto migrado exitosamente",
        data: {
          usuario_id: usuario.usuario_id,
          nombre_usuario: usuario.nombre_usuario,
          piloto_temporal_anterior: usuario.piloto_temporal?.nombre || "N/A",
          piloto_sql_nuevo: pilotoSQL.nombre,
          piloto_sql_id: piloto_sql_id,
        },
      };

      console.log("12. Respuesta preparada:", JSON.stringify(respuesta));
      console.log("=== FIN MIGRACIÓN EXITOSA ===");

      return res.json(respuesta);
    } catch (error) {
      console.error("❌ ERROR EN MIGRACIÓN:");
      console.error("Tipo:", error.constructor.name);
      console.error("Mensaje:", error.message);
      console.error("Stack:", error.stack);

      return res.status(500).json({
        success: false,
        error: error.message || "Error al migrar piloto",
      });
    }
  },
};

module.exports = usuarioController;

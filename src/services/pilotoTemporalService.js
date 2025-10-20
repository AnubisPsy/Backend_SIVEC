// src/services/pilotoTemporalService.js
const bcrypt = require("bcrypt");
const { supabase } = require("../config/database");

const pilotoTemporalService = {
  /**
   * Crear usuario temporal automáticamente
   */
  async crearPilotoTemporal(nombreCompleto, sucursal_id, creado_por) {
    try {
      // Generar nombre de usuario único
      const nombreBase = nombreCompleto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .split(" ")
        .slice(0, 2) // Primeros dos nombres
        .join("_");

      const timestamp = Date.now().toString().slice(-4);
      const nombre_usuario = `temp_${nombreBase}_${timestamp}`;

      // Contraseña fija para todos los temporales
      const password_temporal = "Temporal123!";
      const contraseña = await bcrypt.hash(password_temporal, 10);

      // Crear usuario
      const { data, error } = await supabase
        .from("usuario")
        .insert({
          nombre_usuario,
          correo: `${nombre_usuario}@temporal.sivec.com`, // Email ficticio
          contraseña,
          rol_id: 1, // Piloto
          sucursal_id,
          es_temporal: true,
          fecha_ultimo_uso: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Usuario temporal creado: ${nombre_usuario}`);

      return {
        success: true,
        usuario: data,
        credenciales: {
          usuario: nombre_usuario,
          contraseña: password_temporal,
        },
      };
    } catch (error) {
      console.error("❌ Error creando piloto temporal:", error);
      throw error;
    }
  },

  /**
   * Buscar si ya existe usuario para este piloto (por nombre)
   */
  async buscarUsuarioPorNombre(nombreCompleto) {
    try {
      // Buscar en usuarios permanentes
      const { data: usuarioPermanente } = await supabase
        .from("usuario")
        .select("usuario_id, nombre_usuario, es_temporal")
        .eq("es_temporal", false)
        .ilike("nombre_usuario", `%${nombreCompleto.split(" ")[0]}%`)
        .single();

      if (usuarioPermanente) return usuarioPermanente;

      // Buscar en usuarios temporales
      const { data: usuarioTemporal } = await supabase
        .from("usuario")
        .select("usuario_id, nombre_usuario, es_temporal")
        .eq("es_temporal", true)
        .ilike("nombre_usuario", `%${nombreCompleto.split(" ")[0]}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return usuarioTemporal || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Listar usuarios temporales (para el admin)
   */
  async listarTemporales(filtros = {}) {
    try {
      let query = supabase.from("usuario").select("*").eq("es_temporal", true);

      if (filtros.activo !== undefined) {
        query = query.eq("activo", filtros.activo);
      }

      if (filtros.sucursal_id) {
        query = query.eq("sucursal_id", filtros.sucursal_id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("❌ Error listando temporales:", error);
      throw error;
    }
  },
};

module.exports = pilotoTemporalService;

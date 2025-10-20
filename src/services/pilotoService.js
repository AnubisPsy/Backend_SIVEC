// src/services/pilotoService.js
const sql = require("mssql");
const { sqlConfig } = require("../config/database");

const pilotoService = {
  /**
   * OBTENER TODOS LOS PILOTOS ACTIVOS
   * Consulta directa a SQL Server (TestSIVEC)
   */
  async obtenerTodosPilotos() {
    let pool;

    try {
      console.log("👨‍✈️ Obteniendo pilotos desde SQL Server...");

      // Conectar a SQL Server
      pool = await sql.connect(sqlConfig);

      // Query para obtener pilotos activos
      const query = `
        SELECT 
          nombre as nombre_piloto
        FROM pilotos 
        WHERE activo = 1
        ORDER BY nombre
      `;

      const result = await pool.request().query(query);

      const pilotos = result.recordset.map((row) => ({
        nombre_piloto: row.nombre_piloto,
      }));

      console.log(`✅ ${pilotos.length} pilotos encontrados en SQL Server`);

      return pilotos;
    } catch (error) {
      console.error("❌ Error al obtener pilotos de SQL Server:", error);
      throw new Error(
        `Error de conexión con sistema externo: ${error.message}`
      );
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  },

  /**
   * BUSCAR PILOTO POR NOMBRE
   * Para validaciones cuando se asigne una factura
   */
  async buscarPilotoPorNombre(nombre_piloto) {
    let pool;

    try {
      console.log(`🔍 Buscando piloto: ${nombre_piloto}`);

      pool = await sql.connect(sqlConfig);

      const query = `
        SELECT 
          nombre as nombre_piloto
        FROM pilotos 
        WHERE nombre = @nombre_piloto AND activo = 1
      `;

      const result = await pool
        .request()
        .input("nombre_piloto", sql.VarChar(100), nombre_piloto)
        .query(query);

      if (result.recordset.length > 0) {
        console.log(`✅ Piloto encontrado: ${nombre_piloto}`);
        return result.recordset[0];
      } else {
        console.log(`❌ Piloto no encontrado: ${nombre_piloto}`);
        return null;
      }
    } catch (error) {
      console.error("❌ Error al buscar piloto:", error);
      throw new Error(`Error al buscar piloto: ${error.message}`);
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  },

  /**
   * OBTENER PILOTOS CON FILTRO DE BÚSQUEDA
   * Para implementar búsqueda en tiempo real en el frontend
   */
  async buscarPilotos(termino_busqueda = "") {
    let pool;

    try {
      console.log(`🔍 Buscando pilotos que contengan: "${termino_busqueda}"`);

      pool = await sql.connect(sqlConfig);

      let query = `
        SELECT 
          nombre as nombre_piloto
        FROM pilotos 
        WHERE activo = 1
      `;

      let request = pool.request();

      // Si hay término de búsqueda, agregar filtro LIKE
      if (termino_busqueda && termino_busqueda.trim() !== "") {
        query += ` AND nombre LIKE @termino_busqueda`;
        request = request.input(
          "termino_busqueda",
          sql.VarChar(100),
          `%${termino_busqueda.trim()}%`
        );
      }

      query += ` ORDER BY nombre`;

      const result = await request.query(query);

      const pilotos = result.recordset.map((row) => ({
        nombre_piloto: row.nombre_piloto,
      }));

      console.log(
        `✅ ${pilotos.length} pilotos encontrados con filtro "${termino_busqueda}"`
      );

      return pilotos;
    } catch (error) {
      console.error("❌ Error al buscar pilotos:", error);
      throw new Error(`Error de búsqueda: ${error.message}`);
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  },

  /**
   * VALIDAR PILOTO EXISTE
   * Método simple para validaciones rápidas
   */
  async validarPilotoExiste(nombre_piloto) {
    try {
      const piloto = await this.buscarPilotoPorNombre(nombre_piloto);
      return piloto !== null;
    } catch (error) {
      console.error("❌ Error al validar piloto:", error);
      return false;
    }
  },

  /**
   * OBTENER ESTADÍSTICAS DE PILOTOS
   * Para dashboards administrativos
   */
  async obtenerEstadisticas() {
    let pool;

    try {
      console.log("📊 Obteniendo estadísticas de pilotos...");

      pool = await sql.connect(sqlConfig);

      const query = `
        SELECT 
          COUNT(*) as total_pilotos,
          COUNT(CASE WHEN activo = 1 THEN 1 END) as pilotos_activos,
          COUNT(CASE WHEN activo = 0 THEN 1 END) as pilotos_inactivos
        FROM pilotos
      `;

      const result = await pool.request().query(query);
      const stats = result.recordset[0];

      console.log("✅ Estadísticas de pilotos calculadas");

      return {
        total: stats.total_pilotos,
        activos: stats.pilotos_activos,
        inactivos: stats.pilotos_inactivos,
      };
    } catch (error) {
      console.error("❌ Error al obtener estadísticas de pilotos:", error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  },
};

module.exports = pilotoService;

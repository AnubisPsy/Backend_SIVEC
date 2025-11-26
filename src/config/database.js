// src/config/database.js - VERSIÓN CORREGIDA
const { createClient } = require("@supabase/supabase-js");
const sql = require("mssql");

// ==========================================
// SUPABASE (Base de datos principal)
// ==========================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

// ==========================================
// SQL SERVER (Sistema externo - TestSIVEC)
// ==========================================
const sqlConfig = {
  server: process.env.SQL_SERVER_HOST || "localhost",
  database: process.env.SQL_SERVER_DATABASE || "TestSIVEC",
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: false, // ← MUY IMPORTANTE
    trustServerCertificate: true, // ← MUY IMPORTANTE
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
};

// Configurar autenticación
if (process.env.SQL_SERVER_TRUSTED_CONNECTION === "true") {
  // Windows Authentication - SIN especificar driver
  sqlConfig.authentication = {
    type: "ntlm",
  };
  console.log(
    ` Windows Authentication configurada para: ${sqlConfig.server}`
  );
} else {
  // SQL Server Authentication
  sqlConfig.user = process.env.SQL_SERVER_USER;
  sqlConfig.password = process.env.SQL_SERVER_PASSWORD;
  console.log(
    ` SQL Server Authentication configurada para: ${sqlConfig.server}`
  );
}

// Solo agregar puerto si está especificado explícitamente
if (process.env.SQL_SERVER_PORT) {
  sqlConfig.port = parseInt(process.env.SQL_SERVER_PORT);
  console.log(` Puerto SQL Server: ${sqlConfig.port}`);
}

// Función para probar conexiones mejorada
async function probarConexiones() {
  console.log(" Probando conexiones a bases de datos...");
  console.log("=".repeat(50));

  // Probar Supabase
  console.log(" Probando Supabase...");
  try {
    const { data, error } = await supabase
      .from("usuario")
      .select("count", { count: "exact", head: true });

    if (error) throw error;
    console.log(" Supabase: Conectado correctamente");
  } catch (error) {
    console.log(" Supabase:", error.message);
  }

  // Probar SQL Server
  console.log("\n Probando SQL Server...");
  console.log(`   Servidor: ${sqlConfig.server}`);
  console.log(`   Base de datos: ${sqlConfig.database}`);
  console.log(
    `   Windows Auth: ${sqlConfig.options.trustedConnection ? "Sí" : "No"}`
  );

  let pool;
  try {
    console.log("   Conectando...");
    pool = await sql.connect(sqlConfig);

    // Probar query básica
    const result = await pool.request().query(`
      SELECT 
        @@SERVERNAME as servidor,
        DB_NAME() as base_datos,
        SYSTEM_USER as usuario_actual,
        GETDATE() as fecha_hora
    `);

    const info = result.recordset[0];
    console.log(" SQL Server: Conectado correctamente");
    console.log(`   Servidor: ${info.servidor}`);
    console.log(`   Base de datos: ${info.base_datos}`);
    console.log(`   Usuario: ${info.usuario_actual}`);

    // Verificar tablas de SIVEC
   // console.log("\n Verificando tablas de SIVEC...");
    const tablas = await pool.request().query(`
      SELECT 
        TABLE_NAME,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) as columnas
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE TABLE_NAME IN ('piloto', 'factura', 'despachos')
      ORDER BY TABLE_NAME
    `);

    if (tablas.recordset.length === 0) {
      console.log(
        "No se encontraron las tablas esperadas (piloto, factura, despachos)"
      );
    } else {
      tablas.recordset.forEach((tabla) => {
      //  console.log(`    ${tabla.TABLE_NAME}: ${tabla.columnas} columnas`);
      });

      // Contar registros
     // console.log("\n Contando registros...");
      for (const tabla of tablas.recordset) {
        try {
          const count = await pool
            .request()
            .query(`SELECT COUNT(*) as total FROM ${tabla.TABLE_NAME}`);
         /*  console.log(
            `    ${tabla.TABLE_NAME}: ${count.recordset[0].total} registros`
          ); */
        } catch (error) {
          console.log(
            `    ${tabla.TABLE_NAME}: Error al contar - ${error.message}`
          );
        }
      }
    }
  } catch (error) {
    console.log("SQL Server:", error.message);

    // Sugerir soluciones comunes
    console.log("\n💡 Posibles soluciones:");
    if (error.message.includes("Login failed")) {
      console.log("   - Verificar que Windows Authentication esté habilitada");
      console.log("   - Ejecutar como el mismo usuario que instaló SQL Server");
    }
    if (error.message.includes("server was not found")) {
      console.log("   - Verificar el nombre del servidor en .env");
      console.log("   - Probar con 'localhost' en lugar de nombre de PC");
      console.log("   - Verificar que SQL Server esté corriendo");
    }
    if (
      error.message.includes("database") &&
      error.message.includes("not exist")
    ) {
      console.log("   - Verificar que la base de datos 'TestSIVEC' exista");
      console.log("   - Crear la base de datos si es necesario");
    }
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }
  }

  console.log("\n" + "=".repeat(50));
}

// Función para obtener conexión SQL Server
async function obtenerConexionSQL() {
  try {
    return await sql.connect(sqlConfig);
  } catch (error) {
    console.error("❌ Error al conectar SQL Server:", error.message);
    throw error;
  }
}

module.exports = {
  supabase,
  sqlConfig,
  obtenerConexionSQL,
  probarConexiones,
};

// src/config/database.js
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
// SQL SERVER (Sistema externo)
// ==========================================
const sqlConfig = {
  server: process.env.SQL_SERVER_HOST || "localhost",
  port: parseInt(process.env.SQL_SERVER_PORT) || 1434,
  database: process.env.SQL_SERVER_DATABASE || "TestSIVEC",
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === "true",
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 15000,
    requestTimeout: 15000,
  },
};

// Solo agregar user/password si NO es trusted connection
if (process.env.SQL_SERVER_TRUSTED_CONNECTION !== "true") {
  sqlConfig.user = process.env.SQL_SERVER_USER;
  sqlConfig.password = process.env.SQL_SERVER_PASSWORD;
}

// Función para probar conexiones
async function probarConexiones() {
  console.log("🔍 Probando conexiones a bases de datos...");

  // Probar Supabase
  try {
    const { data, error } = await supabase
      .from("usuario")
      .select("count", { count: "exact", head: true });
    if (error) throw error;
    console.log("✅ Supabase: Conectado correctamente");
  } catch (error) {
    console.log("❌ Supabase:", error.message);
  }

  // Probar SQL Server
  try {
    if (process.env.SQL_SERVER_TRUSTED_CONNECTION === "true") {
      // Usar autenticación de Windows
      delete sqlConfig.user;
      delete sqlConfig.password;
      sqlConfig.options.trustedConnection = true;
    }

    const pool = await sql.connect(sqlConfig);
    console.log("✅ SQL Server: Conectado correctamente");
    await pool.close();
  } catch (error) {
    console.log("❌ SQL Server:", error.message);
  }
}

module.exports = {
  supabase,
  sqlConfig,
  probarConexiones,
};

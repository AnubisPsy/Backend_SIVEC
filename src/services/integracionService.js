const { createClient } = require("@supabase/supabase-js");
const sql = require("mssql");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const sqlConfig = {
  server: process.env.SQL_SERVER_HOST || "localhost",
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  database: process.env.SQL_SERVER_DATABASE || "TestSIVEC",
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool global para reutilizar conexiones
let pool = null;

async function getPool() {
  if (!pool || !pool.connected) {
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

async function detectarYCrearGuias() {
  console.log("🔍 Iniciando detección de guías...");

  try {
    // 1. Obtener facturas asignadas que tienen viaje
    const { data: facturasAsignadas, error: facturaError } = await supabase
      .from("factura_asignada")
      .select("numero_factura, viaje_id, piloto")
      .not("viaje_id", "is", null)
      .eq("estado_id", 1);

    if (facturaError) throw facturaError;

    if (!facturasAsignadas || facturasAsignadas.length === 0) {
      console.log("ℹ️  No hay facturas pendientes de procesar");
      return { processed: 0, created: 0 };
    }

    console.log(
      `📋 Encontradas ${facturasAsignadas.length} facturas para verificar`
    );

    // 2. Obtener pool de conexiones (reutilizable)
    const currentPool = await getPool();

    let guiasCreadas = 0;

    for (const factura of facturasAsignadas) {
      try {
        // 3. Buscar guías en SQL Server para esta factura
        const query = `
          SELECT 
            d.referencia AS numero_guia,
            d.documento AS numero_factura,
            f.detalle_producto,
            d.fecha_emision,
            f.direccion,
            d.piloto
          FROM despachos d
          JOIN factura f ON d.documento = f.documento
          WHERE f.estado = 8 
            AND d.referencia IS NOT NULL
            AND d.documento = @numeroFactura
        `;

        const result = await currentPool
          .request()
          .input("numeroFactura", sql.VarChar, factura.numero_factura)
          .query(query);

        if (result.recordset.length === 0) {
          continue;
        }

        console.log(
          `📦 Encontradas ${result.recordset.length} guías para ${factura.numero_factura}`
        );

        // 4. Crear guías en Supabase
        for (const guia of result.recordset) {
          const { data: existe } = await supabase
            .from("guia_remision")
            .select("guia_id")
            .eq("numero_guia", guia.numero_guia)
            .single();

          if (!existe) {
            const { error: guiaError } = await supabase
              .from("guia_remision")
              .insert({
                numero_guia: guia.numero_guia,
                numero_factura: guia.numero_factura,
                detalle_producto: guia.detalle_producto,
                fecha_emision: guia.fecha_emision,
                cliente: "Cliente desde sistema externo",
                direccion: guia.direccion,
                piloto: guia.piloto,
                estado_id: 3,
                viaje_id: factura.viaje_id,
              });

            if (guiaError) {
              console.error("❌ Error creando guía:", guiaError);
              continue;
            }

            await supabase.from("log_detecciones").insert({
              numero_factura: guia.numero_factura,
              numero_guia: guia.numero_guia,
              accion: "guia_detectada",
              detalles: `Guía detectada automáticamente desde sistema externo`,
            });

            guiasCreadas++;
            console.log(`✅ Guía ${guia.numero_guia} creada`);
          }
        }

        // 5. Actualizar estado de factura
        if (result.recordset.length > 0) {
          await supabase
            .from("factura_asignada")
            .update({ estado_id: 2 })
            .eq("numero_factura", factura.numero_factura);
        }
      } catch (facturaError) {
        console.error(
          `❌ Error procesando factura ${factura.numero_factura}:`,
          facturaError.message
        );
      }
    }

    console.log(`✅ Detección completada. Guías creadas: ${guiasCreadas}`);
    return {
      processed: facturasAsignadas.length,
      created: guiasCreadas,
    };
  } catch (error) {
    console.error("❌ Error en detección:", error.message);
    // No lanzar error para que no crashee el servidor
    return { processed: 0, created: 0, error: error.message };
  }
}

let detectionInterval;

function iniciarDeteccionAutomatica() {
  console.log("🚀 Iniciando servicio de detección automática...");

  // Ejecutar después de 10 segundos (dar tiempo al servidor)
  setTimeout(() => {
    detectarYCrearGuias();
  }, 10000);

  // Ejecutar cada 5 minutos
  detectionInterval = setInterval(() => {
    detectarYCrearGuias().catch((err) => {
      console.error("❌ Error en detección automática:", err.message);
    });
  }, 5 * 60 * 1000);
}

function detenerDeteccionAutomatica() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    console.log("⏸️  Servicio de detección detenido");
  }
  if (pool) {
    pool.close();
  }
}

module.exports = {
  detectarYCrearGuias,
  iniciarDeteccionAutomatica,
  detenerDeteccionAutomatica,
};

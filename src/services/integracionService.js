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
    // 1. ✨ CAMBIO CRÍTICO: Obtener facturas que NO tienen viaje aún
    const { data: facturasAsignadas, error: facturaError } = await supabase
      .from("factura_asignada")
      .select("factura_id, numero_factura, piloto, numero_vehiculo")
      .is("viaje_id", null) // ✨ Cambio: buscar las que NO tienen viaje
      .eq("estado_id", 1); // ✨ Estado 1 = asignada/pendiente

    if (facturaError) throw facturaError;

    if (!facturasAsignadas || facturasAsignadas.length === 0) {
      console.log("ℹ️  No hay facturas pendientes de procesar");
      return { processed: 0, created: 0 };
    }

    console.log(
      `📋 Encontradas ${facturasAsignadas.length} facturas para verificar`
    );

    // 2. Obtener pool de conexiones
    const currentPool = await getPool();

    let viajesCreados = 0;
    let guiasCreadas = 0;

    // 3. Agrupar facturas por piloto + vehículo
    const gruposPilotoVehiculo = facturasAsignadas.reduce((acc, factura) => {
      const clave = `${factura.piloto}|${factura.numero_vehiculo}`;
      if (!acc[clave]) {
        acc[clave] = {
          piloto: factura.piloto,
          numero_vehiculo: factura.numero_vehiculo,
          facturas: [],
        };
      }
      acc[clave].facturas.push(factura);
      return acc;
    }, {});

    console.log(
      `📦 Grupos piloto-vehículo: ${Object.keys(gruposPilotoVehiculo).length}`
    );

    // 4. Para cada grupo, buscar guías en SQL Server
    for (const [clave, grupo] of Object.entries(gruposPilotoVehiculo)) {
      console.log(
        `\n🚛 Procesando: ${grupo.piloto} - ${grupo.numero_vehiculo}`
      );

      // Crear array de números de factura para el query
      const numerosFactura = grupo.facturas.map((f) => f.numero_factura);

      try {
        // Buscar guías en SQL Server para estas facturas
        const query = `
          SELECT 
            d.referencia AS numero_guia,
            d.documento AS numero_factura,
            vd.descripcion AS detalle_producto,
            d.created_at AS fecha_emision,
            vd.direccion_entrega AS direccion,
            p.nombre AS piloto
          FROM despachos d
          LEFT JOIN ventas_detalle vd ON d.venta_id = vd.venta_id
          LEFT JOIN pilotos p ON d.piloto_id = p.piloto_id
          WHERE d.estado = 8 
            AND d.referencia IS NOT NULL
            AND d.documento IN (${numerosFactura
              .map((_, i) => `@factura${i}`)
              .join(", ")})
        `;

        const request = currentPool.request();
        numerosFactura.forEach((num, i) => {
          request.input(`factura${i}`, sql.VarChar, num);
        });

        const result = await request.query(query);

        if (result.recordset.length === 0) {
          console.log(
            `   ⚠️  No se encontraron guías para: ${numerosFactura.join(", ")}`
          );
          continue;
        }

        console.log(
          `   📦 Encontradas ${result.recordset.length} guías en SQL Server`
        );

        // 5. Crear el viaje en Supabase
        const { data: viaje, error: viajeError } = await supabase
          .from("viaje")
          .insert({
            numero_vehiculo: grupo.numero_vehiculo,
            piloto: grupo.piloto,
            estado_viaje: "pendiente",
            creado_automaticamente: true,
          })
          .select()
          .single();

        if (viajeError) {
          console.error(`   ❌ Error creando viaje:`, viajeError);
          continue;
        }

        console.log(`   ✅ Viaje creado con ID: ${viaje.viaje_id}`);
        viajesCreados++;

        // 6. Crear las guías en Supabase
        for (const guia of result.recordset) {
          try {
            // Verificar si la guía ya existe
            const { data: guiaExistente } = await supabase
              .from("guia_remision")
              .select("guia_id")
              .eq("numero_guia", guia.numero_guia)
              .single();

            if (!guiaExistente) {
              const { error: guiaError } = await supabase
                .from("guia_remision")
                .insert({
                  numero_guia: guia.numero_guia,
                  numero_factura: guia.numero_factura,
                  detalle_producto: guia.detalle_producto || "Sin descripción",
                  fecha_emision: guia.fecha_emision || new Date().toISOString(),
                  cliente: "Cliente desde sistema externo",
                  direccion: guia.direccion || "Sin dirección",
                  estado_id: 3, // Estado 3 = guia_asignada
                  viaje_id: viaje.viaje_id,
                });

              if (guiaError) {
                console.error(`   ❌ Error creando guía:`, guiaError);
                continue;
              }

              // Log de detección
              await supabase.from("log_detecciones").insert({
                numero_factura: guia.numero_factura,
                numero_guia: guia.numero_guia,
                accion: "guia_detectada",
                detalles: `Guía detectada automáticamente desde SQL Server`,
              });

              guiasCreadas++;
              console.log(`   ✅ Guía ${guia.numero_guia} creada`);
            } else {
              console.log(`   ⚠️  Guía ${guia.numero_guia} ya existe`);
            }
          } catch (guiaError) {
            console.error(
              `   ❌ Error procesando guía ${guia.numero_guia}:`,
              guiaError.message
            );
          }
        }

        // 7. Actualizar facturas: asignar viaje_id y cambiar estado a despachada
        const facturasConGuia = result.recordset.map((g) => g.numero_factura);

        const { error: updateError } = await supabase
          .from("factura_asignada")
          .update({
            viaje_id: viaje.viaje_id,
            estado_id: 2, // Estado 2 = despachada
          })
          .in("numero_factura", facturasConGuia);

        if (updateError) {
          console.error(`   ❌ Error actualizando facturas:`, updateError);
        } else {
          console.log(
            `   ✅ ${facturasConGuia.length} facturas actualizadas a despachadas`
          );
        }
      } catch (facturaError) {
        console.error(
          `   ❌ Error procesando grupo ${clave}:`,
          facturaError.message
        );
      }
    }

    console.log(
      `\n✅ Detección completada. Viajes: ${viajesCreados}, Guías: ${guiasCreadas}`
    );
    return {
      processed: facturasAsignadas.length,
      viajes_creados: viajesCreados,
      guias_creadas: guiasCreadas,
    };
  } catch (error) {
    console.error("❌ Error en detección:", error.message);
    return { processed: 0, created: 0, error: error.message };
  }
}

let detectionInterval;

function iniciarDeteccionAutomatica() {
  console.log("🚀 Iniciando servicio de detección automática...");

  // Ejecutar después de 10 segundos
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

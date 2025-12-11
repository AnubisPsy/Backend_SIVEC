// src/services/ubicacionesService.js
const axios = require("axios");

const WIALON_URL =
  process.env.WIALON_URL || "https://hst-api.wialon.com/wialon/ajax.html";
const WIALON_TOKEN = process.env.WIALON_TOKEN;

const ubicacionesService = {
  /**
   * Crear sesión en Wialon
   */
  async crearSesion() {
    try {
      const response = await axios.post(WIALON_URL, null, {
        params: {
          svc: "token/login",
          params: JSON.stringify({ token: WIALON_TOKEN }),
        },
      });

      if (response.data.error) {
        throw new Error(`Error Wialon: ${response.data.error}`);
      }

      return response.data.eid; // Session ID
    } catch (error) {
      console.error("❌ Error creando sesión Wialon:", error.message);
      throw error;
    }
  },

  /**
   * Cerrar sesión en Wialon
   */
  async cerrarSesion(eid) {
    try {
      await axios.post(WIALON_URL, null, {
        params: {
          svc: "core/logout",
          sid: eid,
        },
      });
    } catch (error) {
      console.error("⚠️ Error cerrando sesión Wialon:", error.message);
    }
  },

  /**
   * Obtener todas las unidades (vehículos) de Wialon
   */
  async obtenerUnidadesWialon(eid) {
    try {
      const response = await axios.post(WIALON_URL, null, {
        params: {
          svc: "core/search_items",
          sid: eid,
          params: JSON.stringify({
            spec: {
              itemsType: "avl_unit", // Tipo: unidades de rastreo
              propName: "sys_name",
              propValueMask: "*",
              sortType: "sys_name",
            },
            force: 1,
            flags: 1025, // Flags para obtener info básica + posición
            from: 0,
            to: 0,
          }),
        },
      });

      if (response.data.error) {
        throw new Error(`Error Wialon: ${response.data.error}`);
      }

      return response.data.items || [];
    } catch (error) {
      console.error("❌ Error obteniendo unidades Wialon:", error.message);
      throw error;
    }
  },

  /**
   * Obtener todas las ubicaciones de vehículos activos
   */
  /**
   * Obtener todas las ubicaciones de vehículos activos
   */
  async obtenerTodasUbicaciones(sucursal_id = null) {
    let eid = null;

    try {
      if (!WIALON_TOKEN) {
        throw new Error("Token de Wialon no configurado");
      }

      //   console.log("🗺️ Obteniendo ubicaciones desde Wialon...");

      // 1. Crear sesión
      eid = await this.crearSesion();
      //   console.log(`🔐 Sesión Wialon creada: ${eid}`);

      // 2. Obtener todas las unidades de Wialon
      const unidadesWialon = await this.obtenerUnidadesWialon(eid);
      //  console.log(`📡 ${unidadesWialon.length} unidades encontradas en Wialon`);

      // 3. Obtener vehículos de la base de datos
      const { supabase } = require("../config/database");

      let queryVehiculos = supabase
        .from("vehiculo")
        .select(
          `
        vehiculo_id,
        numero_vehiculo,
        placa,
        sucursal_id,
        activo,
        sucursales:sucursal_id (
          nombre_sucursal
        )
      `
        )
        .eq("activo", true);

      if (sucursal_id) {
        queryVehiculos = queryVehiculos.eq("sucursal_id", sucursal_id);
      }

      const { data: vehiculos } = await queryVehiculos;

      // 4. Obtener viajes activos
      // 4. Obtener viajes activos
      const { data: viajes } = await supabase
        .from("viaje")
        .select(
          `
    viaje_id,
    numero_vehiculo,
    piloto,
    estado_viaje,
    fecha_viaje,
    estados:estado_viaje (
      nombre
    )
  `
        )
        .in("estado_viaje", [7, 8]);

      // ✅ AGREGAR ESTOS LOGS:
      console.log("🚛 VIAJES ACTIVOS ENCONTRADOS:", viajes?.length || 0);
      console.log("🚛 Viajes:", viajes);
      console.log("🚛 Ejemplo viaje:", viajes?.[0]);
      console.log(
        "🚛 Números de vehículo con viaje:",
        viajes?.map((v) => v.numero_vehiculo)
      );

      // 5. Correlacionar usando la MISMA lógica de gps.js
      //   console.log("\n🔗 CORRELACIONANDO POR PLACA (entre paréntesis)...");

      const ubicaciones = vehiculos.map((vehiculo) => {
        // ✅ BUSCAR POR PLACA DENTRO DE PARÉNTESIS (igual que gps.js)
        const unidadWialon = unidadesWialon.find((v) => {
          // Extraer texto entre paréntesis: "ASR004 (TCA0211) C-25" -> "TCA0211"
          const match = v.nm.match(/\(([^)]+)\)/);
          if (match) {
            const placaWialon = match[1].replace(/[-\s]/g, ""); // Eliminar guiones y espacios
            const placaComparar = vehiculo.placa.replace(/[-\s]/g, "");
            return placaWialon.toUpperCase() === placaComparar.toUpperCase();
          }
          return false;
        });

        // Log de coincidencias
        /*         if (unidadWialon) {
          console.log(
            `  ✅ ${vehiculo.numero_vehiculo} (${vehiculo.placa}) → Wialon: ${unidadWialon.nm}`
          );
        } else {
          console.log(
            `  ❌ ${vehiculo.numero_vehiculo} (${vehiculo.placa}) → SIN COINCIDENCIA`
          );
        } */

        // Extraer datos de posición
        let tiene_gps = false;
        let latitud = null;
        let longitud = null;
        let velocidad = 0;
        let direccion = 0;
        let ultima_actualizacion = null;

        if (unidadWialon && unidadWialon.pos) {
          const pos = unidadWialon.pos;
          tiene_gps = true;
          latitud = pos.y;
          longitud = pos.x;
          velocidad = pos.s || 0;
          ultima_actualizacion = pos.t
            ? new Date(pos.t * 1000).toISOString()
            : null;
          direccion = pos.c || 0;
        }

        // Buscar viaje activo
        const viaje = viajes?.find(
          (v) => v.numero_vehiculo === vehiculo.numero_vehiculo
        );

        // ✅ AGREGAR ESTE LOG:
        if (vehiculo.numero_vehiculo === "C-101") {
          console.log(`🔍 DEBUG C-101:`, {
            vehiculo_numero: vehiculo.numero_vehiculo,
            viaje_encontrado: !!viaje,
            viaje_data: viaje,
            todos_los_viajes: viajes?.map((v) => v.numero_vehiculo),
          });
        }

        return {
          vehiculo_id: vehiculo.vehiculo_id,
          numero_vehiculo: vehiculo.numero_vehiculo,
          placa: vehiculo.placa,
          sucursal_id: vehiculo.sucursal_id,
          sucursal: vehiculo.sucursales?.nombre_sucursal || "N/A",

          wialon_id: unidadWialon?.id || null,
          wialon_uid: unidadWialon?.uid || null,
          wialon_nombre: unidadWialon?.nm || null,

          tiene_gps: tiene_gps,
          latitud: latitud,
          longitud: longitud,
          velocidad: velocidad,
          ultima_actualizacion: ultima_actualizacion,

          tiene_viaje: !!viaje,
          viaje_id: viaje?.viaje_id || null,
          piloto: viaje?.piloto || null,
          estado_viaje: viaje?.estados?.nombre || "Sin viaje",
          estado_viaje_id: viaje?.estado_viaje || null,
        };
      });

      /*       console.log(`\n✅ ${ubicaciones.length} ubicaciones procesadas`);
      console.log(
        `   📍 Con GPS: ${ubicaciones.filter((u) => u.tiene_gps).length}`
      );
      console.log(
        `   ❌ Sin GPS: ${ubicaciones.filter((u) => !u.tiene_gps).length}`
      ); */

      // Cerrar sesión
      await this.cerrarSesion(eid);

      return {
        total: ubicaciones.length,
        con_gps: ubicaciones.filter((u) => u.tiene_gps).length,
        sin_gps: ubicaciones.filter((u) => !u.tiene_gps).length,
        en_viaje: ubicaciones.filter((u) => u.tiene_viaje).length,
        ubicaciones: ubicaciones,
      };
    } catch (error) {
      if (eid) {
        await this.cerrarSesion(eid);
      }
      console.error("❌ Error obteniendo ubicaciones:", error);
      throw error;
    }
  },

  /**
   * Obtener ubicación de un vehículo específico
   */
  async obtenerUbicacionVehiculo(numero_vehiculo) {
    let eid = null;

    try {
      if (!WIALON_TOKEN) {
        throw new Error("Token de Wialon no configurado");
      }

      //  console.log(`🔍 Buscando ubicación de: ${numero_vehiculo}`);

      // 1. Crear sesión
      eid = await this.crearSesion();

      // 2. Obtener unidades
      const unidadesWialon = await this.obtenerUnidadesWialon(eid);

      // 3. Buscar la unidad específica
      const unidadWialon = unidadesWialon.find(
        (u) => u.nm === numero_vehiculo || u.uid === numero_vehiculo
      );

      if (!unidadWialon) {
        throw new Error(`Unidad ${numero_vehiculo} no encontrada en Wialon`);
      }

      // 4. Obtener info del vehículo y viaje
      const { supabase } = require("../config/database");

      const { data: vehiculo } = await supabase
        .from("vehiculo")
        .select(
          `
          vehiculo_id,
          numero_vehiculo,
          placa,
          sucursal_id,
          sucursales:sucursal_id (
            nombre_sucursal
          )
        `
        )
        .eq("numero_vehiculo", numero_vehiculo)
        .single();

      const { data: viaje } = await supabase
        .from("viaje")
        .select(
          `
          viaje_id,
          piloto,
          estado_viaje,
          estados:estado_viaje (
            nombre
          )
        `
        )
        .eq("numero_vehiculo", numero_vehiculo)
        .in("estado_viaje", [7, 8])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const pos = unidadWialon.pos || {};

      const ubicacion = {
        numero_vehiculo: vehiculo.numero_vehiculo,
        placa: vehiculo.placa,
        sucursal: vehiculo.sucursales?.nombre_sucursal || "N/A",
        sucursal_id: vehiculo.sucursal_id,

        wialon_id: unidadWialon.id,
        wialon_uid: unidadWialon.uid,

        latitud: pos.y || null,
        longitud: pos.x || null,
        velocidad: pos.s || 0,
        ultima_actualizacion: pos.t
          ? new Date(pos.t * 1000).toISOString()
          : null,

        tiene_viaje: !!viaje,
        viaje_id: viaje?.viaje_id || null,
        piloto: viaje?.piloto || null,
        estado_viaje: viaje?.estados?.nombre || "Sin viaje",
      };

      // Cerrar sesión
      await this.cerrarSesion(eid);

      return ubicacion;
    } catch (error) {
      if (eid) {
        await this.cerrarSesion(eid);
      }
      console.error(
        `❌ Error obteniendo ubicación de ${numero_vehiculo}:`,
        error
      );
      throw error;
    }
  },
};

module.exports = ubicacionesService;

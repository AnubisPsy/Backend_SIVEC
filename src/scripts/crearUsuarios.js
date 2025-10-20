// src/scripts/crearUsuarios.js
require("dotenv").config();
const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function crearUsuarios() {
  console.log("🔧 Creando usuarios de prueba...");

  const usuarios = [
    {
      nombre_usuario: "admin",
      correo: "admin@sivec.com",
      password: "admin123",
      rol_id: 3, // Admin
      sucursal_id: 1,
    },
    {
      nombre_usuario: "jefe_yarda",
      correo: "jefe@sivec.com",
      password: "jefe123",
      rol_id: 2, // Jefe
      sucursal_id: 1, //Satuye
    },
    {
      nombre_usuario: "piloto_denuar",
      correo: "piloto@sivec.com",
      password: "piloto123",
      rol_id: 1, // Piloto
      sucursal_id: 1, // Satuye
    },
    {
      nombre_usuario: "jefe_yardacnt",
      correo: "jefecnt@sivec.com",
      password: "centro123",
      rol_id: 2, // Piloto
      sucursal_id: 3, // Centro
    },
  ];

  for (const usuario of usuarios) {
    try {
      // Verificar si ya existe
      const { data: existe } = await supabase
        .from("usuario")
        .select("usuario_id")
        .eq("correo", usuario.correo)
        .single();

      if (existe) {
        console.log(`⚠️  Usuario ${usuario.correo} ya existe`);
        continue;
      }

      // Encriptar contraseña
      const contraseña = await bcrypt.hash(usuario.password, 10);

      // Crear usuario
      const { data, error } = await supabase
        .from("usuario")
        .insert({
          nombre_usuario: usuario.nombre_usuario,
          correo: usuario.correo,
          contraseña: contraseña,
          rol_id: usuario.rol_id,
          sucursal_id: usuario.sucursal_id,
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creando ${usuario.correo}:`, error.message);
      } else {
        console.log(
          `✅ Usuario creado: ${usuario.correo} (${usuario.nombre_usuario}) - Password: ${usuario.password}`
        );
      }
    } catch (error) {
      console.error(`❌ Error con ${usuario.correo}:`, error.message);
    }
  }

  console.log("\n🎉 Proceso completado!");
  process.exit(0);
}

crearUsuarios();

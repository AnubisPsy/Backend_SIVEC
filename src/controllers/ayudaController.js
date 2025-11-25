// src/controllers/ayudaController.js
const { Resend } = require("resend");

// Configurar Resend con la API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// Correos destino para reportes
const CORREOS_DESTINO = [
  process.env.EMAIL_SOPORTE_1 || "soporte1@madeyso.com",
  process.env.EMAIL_SOPORTE_2 || "soporte2@madeyso.com",
].filter(Boolean);

/**
 * Enviar reporte de ayuda con Resend
 */
async function enviarReporte(req, res) {
  try {
    const {
      asunto,
      mensaje,
      categoria,
      usuario_nombre,
      usuario_correo,
      usuario_id,
      usuario_rol,
    } = req.body;

    // Validaciones
    if (!asunto || !mensaje || !categoria) {
      return res.status(400).json({
        success: false,
        message: "Asunto, mensaje y categoría son requeridos",
      });
    }

    // Obtener archivos adjuntos
    const imagenes = req.files || [];

    // Construir HTML del correo
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; color: #667eea; }
          .category-badge { display: inline-block; background: #667eea; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; }
          .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🆘 Nuevo Reporte de Ayuda - SIVEC</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="info-row">
                <span class="label">Categoría:</span>
                <span class="category-badge">${categoria}</span>
              </div>
              <div class="info-row">
                <span class="label">Asunto:</span>
                ${asunto}
              </div>
              <div class="info-row">
                <span class="label">Usuario:</span>
                ${usuario_nombre} (ID: ${usuario_id})
              </div>
              <div class="info-row">
                <span class="label">Rol:</span>
                ${usuario_rol || "No especificado"}
              </div>
              <div class="info-row">
                <span class="label">Correo de contacto:</span>
                ${usuario_correo || "No proporcionado"}
              </div>
              <div class="info-row">
                <span class="label">Fecha:</span>
                ${new Date().toLocaleString("es-HN", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </div>
            </div>

            <div class="message-box">
              <strong style="color: #667eea;">Descripción del problema:</strong><br><br>
              ${mensaje}
            </div>

            ${
              imagenes.length > 0
                ? `
              <div class="info-box">
                <strong style="color: #667eea;">📎 Capturas de pantalla adjuntas:</strong>
                ${imagenes.length} imagen(es)
              </div>
            `
                : ""
            }

            <div class="footer">
              <p>Este correo fue generado automáticamente por el Sistema SIVEC</p>
              <p>Por favor, responde directamente al usuario: ${
                usuario_correo || "correo no proporcionado"
              }</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Preparar attachments para Resend
    const attachments = imagenes.map((file, index) => ({
      filename: `captura_${index + 1}_${file.originalname}`,
      content: file.buffer,
    }));

    // Enviar correo con Resend
    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME || "SIVEC Soporte"} <${
        process.env.EMAIL_FROM
      }>`,
      to: CORREOS_DESTINO,
      replyTo: usuario_correo || undefined,
      subject: `🆘 [${categoria}] ${asunto}`,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log("✅ Reporte de ayuda enviado exitosamente con Resend");
    console.log(`   ID del correo: ${data.id}`);
    console.log(`   Usuario: ${usuario_nombre} (${usuario_correo})`);
    console.log(`   Categoría: ${categoria}`);
    console.log(`   Imágenes adjuntas: ${imagenes.length}`);
    console.log(`   Enviado a: ${CORREOS_DESTINO.join(", ")}`);

    res.json({
      success: true,
      message: "Reporte enviado exitosamente. Te contactaremos pronto.",
      email_id: data.id,
    });
  } catch (error) {
    console.error("❌ Error al enviar reporte de ayuda:", error);

    res.status(500).json({
      success: false,
      message: "Error al enviar el reporte. Por favor intenta nuevamente.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

/**
 * Verificar configuración de Resend (solo para desarrollo/testing)
 */
async function verificarConfiguracion(req, res) {
  try {
    // Verificar que la API Key esté configurada
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        message:
          "RESEND_API_KEY no está configurada en las variables de entorno",
      });
    }

    if (!process.env.EMAIL_FROM) {
      return res.status(500).json({
        success: false,
        message:
          "EMAIL_FROM no está configurado (debe ser un correo verificado en Resend)",
      });
    }

    // Enviar correo de prueba
    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME || "SIVEC Soporte"} <${
        process.env.EMAIL_FROM
      }>`,
      to: CORREOS_DESTINO[0],
      subject: "✅ Prueba de Configuración - SIVEC",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #667eea;">✅ Configuración exitosa</h2>
          <p>Este es un correo de prueba para verificar que Resend está configurado correctamente.</p>
          <p><strong>Configuración actual:</strong></p>
          <ul>
            <li>Email desde: ${process.env.EMAIL_FROM}</li>
            <li>Nombre: ${process.env.EMAIL_FROM_NAME || "SIVEC Soporte"}</li>
            <li>Correos destino: ${CORREOS_DESTINO.join(", ")}</li>
          </ul>
          <p>Si recibiste este correo, ¡todo está funcionando perfectamente! 🎉</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      message:
        "Configuración de Resend verificada correctamente. Revisa tu correo.",
      email_id: data.id,
      config: {
        email_from: process.env.EMAIL_FROM,
        email_from_name: process.env.EMAIL_FROM_NAME || "SIVEC Soporte",
        correos_destino: CORREOS_DESTINO,
      },
    });
  } catch (error) {
    console.error("❌ Error en configuración de Resend:", error);

    res.status(500).json({
      success: false,
      message: "Error en la configuración de Resend",
      error: error.message,
    });
  }
}

module.exports = {
  enviarReporte,
  verificarConfiguracion,
};

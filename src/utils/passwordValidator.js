// backend/utils/passwordValidator.js

// Lista de las contraseñas más comunes (simplificada)
const COMMON_PASSWORDS = [
  "123456",
  "password",
  "12345678",
  "qwerty",
  "123456789",
  "12345",
  "1234",
  "111111",
  "1234567",
  "dragon",
  "123123",
  "baseball",
  "iloveyou",
  "trustno1",
  "1234567890",
  "sunshine",
  "master",
  "welcome",
  "shadow",
  "ashley",
  "football",
  "jesus",
  "michael",
  "ninja",
  "mustang",
  "password1",
  "abc123",
  "letmein",
  "monkey",
  "654321",
  "admin",
  "admin123",
  "root",
  "pass",
  "test",
  "guest",
  "user",
  "123abc",
  "qwerty123",
  "password123",
];

/**
 * Valida la fortaleza de una contraseña
 * @param {string} password - Contraseña a validar
 * @param {string} username - Nombre de usuario (opcional)
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
function validarPassword(password, username = "") {
  const errors = [];

  // 1. Longitud mínima
  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }

  // 2. Al menos una mayúscula
  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra mayúscula");
  }

  // 3. Al menos una minúscula
  if (!/[a-z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra minúscula");
  }

  // 4. Al menos un número
  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe contener al menos un número");
  }

  // 5. Al menos un carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push("La contraseña debe contener al menos un carácter especial");
  }

  // 6. No debe estar en la lista de contraseñas comunes
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("Esta contraseña es demasiado común. Por favor elige otra");
  }

  // 7. No debe contener el nombre de usuario
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    errors.push("La contraseña no debe contener tu nombre de usuario");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = { validarPassword };

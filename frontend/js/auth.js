(function () {
  // Sanitizador básico
  function sanitize(str) {
    return (str || "").replace(/[^\w\s@.\-]/g, "");
  }

  // ======== LOGIN ========
  function initLogin() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = sanitize(document.getElementById("login-username").value);
      const password = document.getElementById("login-password").value;

      if (!username || !password) {
        alert("Por favor completa todos los campos.");
        return;
      }

      try {
        // Enviar credenciales al backend
        const data = await window.apiFetch("/api/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });

        // 🔐 Guardar token real y rol devuelto por el backend
        if (data.token) {
          localStorage.setItem("token", data.token);
        }

        localStorage.setItem("username", username);
        localStorage.setItem("role", data.role || "user");

        alert("Inicio de sesión exitoso ✅");

        // Redirigir según rol
        const role = localStorage.getItem("role");
        if (role === "admin" || role === "superadmin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "tienda.html";
        }
      } catch (err) {
        console.error("Error en inicio de sesión:", err);
        alert(err.message || "Error de autenticación.");
      }
    });
  }

  // ======== REGISTRO ========
  function initRegister() {
    const form = document.getElementById("register-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = sanitize(document.getElementById("reg-username").value);
      const password = document.getElementById("reg-password").value;
      const roleSel = document.getElementById("reg-role");
      const role = roleSel ? roleSel.value : "user";

      if (!username || !password) {
        alert("Completa todos los campos para registrarte.");
        return;
      }

      try {
        const data = await window.apiFetch("/api/register", {
          method: "POST",
          body: JSON.stringify({ username, password, role }),
        });

        alert(data.msg || "Registro exitoso ✅");
        window.location.href = "login.html";
      } catch (err) {
        console.error("Error en registro:", err);
        alert(err.message || "Error en el registro.");
      }
    });
  }

  // ======== EVENTO GLOBAL ========
  document.addEventListener("DOMContentLoaded", function () {
    initLogin();
    initRegister();
  });
})();

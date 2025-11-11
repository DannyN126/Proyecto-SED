(function(){
  function sanitize(str){ return (str || "").replace(/[^\w\s@.\-]/g,""); }

  function initLogin(){
    const form = document.getElementById("login-form");
    if(!form) return;
    form.addEventListener("submit", async function(e){
      e.preventDefault();
      const username = sanitize(document.getElementById("login-username").value);
      const password = document.getElementById("login-password").value;

      try{
        const data = await window.apiFetch("/api/login", {
          method:"POST",
          body: JSON.stringify({ username, password })
        });

        // Guardar información local (aunque no haya token todavía)
        localStorage.setItem("token", "dev-session"); // Token simulado
        localStorage.setItem("username", username);
        localStorage.setItem("role", data.role || "user");

        // Redirigir según rol
        const role = localStorage.getItem("role");
        if(role === "admin" || role === "superadmin"){
          window.location.href = "admin.html";
        } else {
          window.location.href = "tienda.html";
        }

      }catch(err){
        alert(err.message);
      }
    });
  }

  function initRegister(){
    const form = document.getElementById("register-form");
    if(!form) return;
    form.addEventListener("submit", async function(e){
      e.preventDefault();
      const username = sanitize(document.getElementById("reg-username").value);
      const password = document.getElementById("reg-password").value;
      const roleSel = document.getElementById("reg-role");
      const role = roleSel ? roleSel.value : "user";

      try{
        const data = await window.apiFetch("/api/register", {
          method:"POST",
          body: JSON.stringify({ username, password, role })
        });
        alert(data.msg || "Registro exitoso");
        window.location.href = "login.html";
      }catch(err){
        alert(err.message);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    initLogin();
    initRegister();
  });
})();

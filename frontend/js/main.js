(function(){
  function refreshAuthUI(){
    const isLogged = !!localStorage.getItem("token");
    const role = localStorage.getItem("role");

    const elLogin = document.getElementById("nav-login");
    const elRegister = document.getElementById("nav-register");
    const elLogout = document.getElementById("nav-logout");
    const elAdmin = document.getElementById("nav-admin");

    if(elLogin)   elLogin.classList.toggle("hidden", isLogged);
    if(elRegister)elRegister.classList.toggle("hidden", isLogged);
    if(elLogout)  elLogout.classList.toggle("hidden", !isLogged);
    if(elAdmin)   elAdmin.classList.toggle("hidden", !(isLogged && (role==="admin" || role==="superadmin")));
  }

  function setupLogout(){
    const btn = document.getElementById("btn-logout");
    if(!btn) return;
    btn.addEventListener("click", function(e){
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      window.location.href = "index.html";
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    refreshAuthUI();
    setupLogout();
  });
})();
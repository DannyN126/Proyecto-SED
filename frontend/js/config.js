// Config global de frontend
// Cambia este valor si tu backend corre en otro puerto/origen.
window.API_BASE_URL = window.API_BASE_URL || "http://localhost:5000";

// Helpers reusables
window.apiFetch = async function(path, opts = {}){
  const token = localStorage.getItem("token");
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    opts.headers || {},
    token ? { "Authorization": `Bearer ${token}` } : {}
  );

  // 🟢 Agregado: enviar credenciales de sesión al backend
  const res = await fetch(`${window.API_BASE_URL}${path}`, {
    ...opts,
    headers,
    credentials: "include" // 🔥 necesario para que se envíen cookies/sesiones
  });

  let data = null;
  try { data = await res.json(); } catch(e) {}
  if(!res.ok){
    const msg = (data && (data.msg || data.message)) || `Error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

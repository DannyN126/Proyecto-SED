(function(){
  function guardAdmin(){
    const role = localStorage.getItem("role");
    if(!role || (role!=="admin" && role!=="superadmin")){
      window.location.href = "login.html";
    }
  }

  async function loadAdminProducts(){
    const tbody = document.getElementById("admin-products-body");
    if(!tbody) return;
    tbody.innerHTML = "<tr><td colspan='5'>Cargando...</td></tr>";
    try{
      const products = await window.apiFetch("/api/products"); // ✅ Requiere estar autenticado
      tbody.innerHTML = "";
      products.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>$${Number(p.price||0).toFixed(2)}</td>
          <td>${p.stock ?? "-"}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger" data-del="${p.id}">Eliminar</button>
          </td>`;
        tbody.appendChild(tr);
      });

      tbody.addEventListener("click", async function(e){
        const del = e.target.closest("button[data-del]");
        if(!del) return;
        const id = del.getAttribute("data-del");
        if(!confirm("¿Eliminar producto " + id + "?")) return;
        try{
          await window.apiFetch(`/api/videogames/${id}`, { method:"DELETE" });
          loadAdminProducts();
        }catch(err){ alert(err.message); }
      });

    }catch(err){
      tbody.innerHTML = `<tr><td colspan='5'>${err.message}</td></tr>`;
    }
  }

  function setupCreateForm(){
    const form = document.getElementById("create-product-form");
    if(!form) return;
    form.addEventListener("submit", async function(e){
      e.preventDefault();
      const payload = {
        name: form.querySelector("#product-name").value.trim(),
        price: Number(form.querySelector("#product-price").value),
        stock: Number(form.querySelector("#product-stock").value), // 🟢 agregado
        description: form.querySelector("#product-desc").value.trim(), // 🟢 agregado
        image_url: form.querySelector("#product-image").value.trim()
      };
      try{
        await window.apiFetch("/api/product", { method:"POST", body: JSON.stringify(payload) });
        form.reset();
        alert("Producto creado ✅");
        loadAdminProducts();
      }catch(err){
        alert(err.message);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    guardAdmin();
    setupCreateForm();
    loadAdminProducts();
  });
})();

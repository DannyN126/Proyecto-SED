(function () {

  // ============================
  // 1. Proteger ruta de admin
  // ============================
  function guardAdmin() {
    const role = localStorage.getItem("role");
    if (!role || (role !== "admin" && role !== "superadmin")) {
      window.location.href = "login.html";
    }
  }

  // ============================
  // 2. Cargar productos del admin
  // ============================
  async function loadAdminProducts() {
    const tbody = document.getElementById("admin-products-body");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='5'>Cargando...</td></tr>";

    try {
      const data = await window.apiFetch("/api/product");
      const products = Array.isArray(data.products) ? data.products : [];

      tbody.innerHTML = "";

      if (products.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>No hay productos registrados</td></tr>";
        return;
      }

      products.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>$${Number(p.price || 0).toFixed(2)}</td>
          <td>${p.stock ?? "-"}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger" data-del="${p.id}">
              Eliminar
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5">Error: ${err.message}</td></tr>`;
    }
  }

  // ============================
  // 3. Listener global para eliminar (solo se registra UNA VEZ)
  // ============================
  function setupDeleteHandler() {
    const tbody = document.getElementById("admin-products-body");
    if (!tbody) return;

    tbody.addEventListener("click", async function (e) {
      const btn = e.target.closest("button[data-del]");
      if (!btn) return;

      const id = btn.getAttribute("data-del");

      if (!confirm(`¿Eliminar producto ${id}?`)) return;

      try {
        await window.apiFetch(`/api/product/${id}`, { method: "DELETE" });

        // recargar la tabla
        loadAdminProducts();

      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ============================
  // 4. Crear producto
  // ============================
  function setupCreateForm() {
    const form = document.getElementById("create-product-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const payload = {
        name: form.querySelector("#product-name").value.trim(),
        price: Number(form.querySelector("#product-price").value),
        stock: Number(form.querySelector("#product-stock").value),
        description: form.querySelector("#product-desc").value.trim(),
        image_url: form.querySelector("#product-image").value.trim()
      };

      try {
        await window.apiFetch("/api/product", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        form.reset();
        alert("Producto creado ✅");
        loadAdminProducts();

      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ============================
  // 5. Inicializar pantalla
  // ============================
  document.addEventListener("DOMContentLoaded", function () {
    guardAdmin();
    setupCreateForm();
    setupDeleteHandler(); // ✔️ se registra solo UNA VEZ
    loadAdminProducts();
  });

})();

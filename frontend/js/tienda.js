(function(){
  async function loadProducts(){
    const grid = document.getElementById("products-grid");
    if(!grid) return;
    grid.innerHTML = "<p>Cargando...</p>";
    try {
      const data = await window.apiFetch("/api/product"); // ✅ ruta corregida
      const products = data.products || [];

      if (!products.length) {
        grid.innerHTML = "<p>No hay productos disponibles.</p>";
        return;
      }

      grid.innerHTML = "";
      products.forEach(p => {
        const card = document.createElement("div");
        card.className = "card card-game";
        card.innerHTML = `
          <img src="${p.image_url || 'img/placeholder.png'}" class="card-img-top" alt="${p.name || ''}">
          <div class="card-body">
            <h5 class="card-title">${p.name}</h5>
            <p class="card-text mb-2">${p.description || 'Artículo de videojuegos'}</p>
            <span class="badge badge-pill badge-secondary mb-2">$${Number(p.price || 0).toFixed(2)}</span>
            <button class="btn btn-primary btn-sm" data-id="${p.id}">Añadir al carrito</button>
          </div>`;
        grid.appendChild(card);
      });

      // Guardar productos globalmente para referencia en evento
      window._loadedProducts = products;

    } catch(err) {
      grid.innerHTML = `<p>Error al cargar: ${err.message}</p>`;
    }
  }

  // ✅ Listener global único
  document.addEventListener("DOMContentLoaded", function(){
    const grid = document.getElementById("products-grid");
    if(!grid) return;

    grid.addEventListener("click", function(e){
      const btn = e.target.closest("button[data-id]");
      if(!btn) return;

      const id = btn.getAttribute("data-id");
      const prod = (window._loadedProducts || []).find(x => String(x.id) === String(id));
      if(!prod) return;

      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const idx = cart.findIndex(x => String(x.id) === String(id));

      if (idx >= 0) {
    alert("Este producto ya está en el carrito");
      } else {
    cart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
}

      localStorage.setItem("cart", JSON.stringify(cart));
      alert(`"${prod.name}" añadido al carrito ✅`);
    });

    loadProducts();
  });
})();

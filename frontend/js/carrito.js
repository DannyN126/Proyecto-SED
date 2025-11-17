(function () {
  function loadCart() {
    const tbody = document.getElementById("cart-body");
    const totalEl = document.getElementById("cart-total");

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (cart.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">El carrito está vacío</td>
        </tr>`;
      totalEl.textContent = "$0.00";
      return;
    }

    let total = 0;

    cart.forEach(item => {
      const price = Number(item.price) || 0;
      const subtotal = price; // siempre una unidad
      total += subtotal;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>$${price.toFixed(2)}</td>
        <td>$${subtotal.toFixed(2)}</td>
        <td>
          <button class="btn btn-danger btn-sm" data-del="${item.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    totalEl.textContent = `$${total.toFixed(2)}`;

    // Evento eliminar
    tbody.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-del]");
      if (!btn) return;

      const id = btn.getAttribute("data-del");

      const newCart = cart.filter(item => String(item.id) !== String(id));
      localStorage.setItem("cart", JSON.stringify(newCart));

      loadCart();
    });
  }

  document.addEventListener("DOMContentLoaded", loadCart);
})();

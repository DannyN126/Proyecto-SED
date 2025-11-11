(function(){
  function renderCart(){
    const tbody = document.getElementById("cart-body");
    const totalEl = document.getElementById("cart-total");
    if(!tbody || !totalEl) return;
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    tbody.innerHTML = "";
    let total = 0;
    cart.forEach((item, i) => {
      const line = item.price * item.qty;
      total += line;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>$${Number(item.price).toFixed(2)}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-outline-secondary btn-dec" data-idx="${i}">-</button>
            <span class="mx-2">${item.qty}</span>
            <button class="btn btn-sm btn-outline-secondary btn-inc" data-idx="${i}">+</button>
          </div>
        </td>
        <td>$${line.toFixed(2)}</td>
        <td><button class="btn btn-sm btn-danger btn-del" data-idx="${i}">Eliminar</button></td>`;
      tbody.appendChild(tr);
    });
    totalEl.textContent = `$${total.toFixed(2)}`;

    tbody.addEventListener("click", function(e){
      const dec = e.target.closest(".btn-dec");
      const inc = e.target.closest(".btn-inc");
      const rm  = e.target.closest(".btn-del");
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      if(dec){
        const i = Number(dec.dataset.idx);
        cart[i].qty = Math.max(1, (cart[i].qty||1)-1);
      } else if(inc){
        const i = Number(inc.dataset.idx);
        cart[i].qty = (cart[i].qty||1)+1;
      } else if(rm){
        const i = Number(rm.dataset.idx);
        cart.splice(i,1);
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      renderCart();
    });
  }

  document.addEventListener("DOMContentLoaded", renderCart);
})();

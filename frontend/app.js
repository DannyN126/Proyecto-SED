document.addEventListener('DOMContentLoaded', async () => {
    const role = localStorage.getItem('userRole');
    const catalogo = document.getElementById('catalogo');
    const carritoItems = document.getElementById('carrito-items');
    const carritoTotal = document.getElementById('carrito-total');
    const carrito = [];
    const addProductForm = document.getElementById('addProductForm');

    // Verificar si el usuario tiene rol
    if (!role) {
        window.location.href = 'Login.html'; // Redirigir al login si no hay rol
        return;
    }

    // Mostrar el rol actual
    const currentRoleElement = document.getElementById('currentRole');
    if (currentRoleElement) {
        currentRoleElement.textContent = `Rol actual: ${role}`;
    }

    // Limpiar el carrito al iniciar
    if (carritoItems) {
        carritoItems.innerHTML = '';
        carritoTotal.textContent = '$0.00';
    }

    // Cargar productos desde el backend
    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:5000/api/products');
            const products = await response.json();

            catalogo.innerHTML = ''; // Limpiar catálogo

            products.forEach((product) => {
                const productCard = document.createElement('div');
                productCard.classList.add('card');
                productCard.innerHTML = `
                    <img src="${product.image}" alt="${product.title}" class="product-image">
                    <div class="card-content">
                        <span class="titulo-item">${product.title}</span>
                        <span class="precio-item">$${product.price.toFixed(2)}</span>
                        ${
                            role === 'usuario'
                                ? `<button class="boton-item" onclick="addToCart(${product.id})">Agregar al Carrito</button>`
                                : `<button class="delete-item" onclick="deleteProduct(${product.id})">Eliminar</button>`
                        }
                    </div>
                `;
                catalogo.appendChild(productCard);
            });
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }

    // Agregar producto al carrito
    function addToCart(id) {
        const product = carrito.find((item) => item.id === id);
        if (!product) {
            carrito.push({ id, title: `Producto ${id}`, price: 10 }); // Ejemplo
            updateCart();
        }
    }

    // Eliminar producto del carrito
    function removeFromCart(index) {
        carrito.splice(index, 1);
        updateCart();
    }

    // Actualizar carrito
    function updateCart() {
        carritoItems.innerHTML = '';
        let total = 0;

        carrito.forEach((product, index) => {
            total += product.price;
            const productElement = document.createElement('div');
            productElement.classList.add('carrito-item');
            productElement.innerHTML = `
                <span>${product.title} - $${product.price.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})">Eliminar</button>
            `;
            carritoItems.appendChild(productElement);
        });

        carritoTotal.textContent = `$${total.toFixed(2)}`;
    }

    // Agregar producto al catálogo (solo admin/superadmin)
    async function addProduct(event) {
        event.preventDefault();
        const title = document.getElementById('productName').value;
        const price = document.getElementById('productPrice').value;
        const image = document.getElementById('productImage').value;

        try {
            await fetch('http://localhost:5000/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, price, image }),
            });

            alert('Producto agregado exitosamente');
            document.getElementById('productName').value = ''; // Limpia el campo de nombre
            document.getElementById('productPrice').value = ''; // Limpia el campo de precio
            document.getElementById('productImage').value = ''; // Limpia el campo de imagen
            await loadProducts();
        } catch (error) {
            console.error('Error al agregar producto:', error);
        }
    }

    // Eliminar producto del catálogo (solo admin/superadmin)
    async function deleteProduct(id) {
        try {
            await fetch(`http://localhost:5000/api/products/${id}`, {
                method: 'DELETE',
            });

            alert('Producto eliminado exitosamente');
            await loadProducts();
        } catch (error) {
            console.error('Error al eliminar producto:', error);
        }
    }

    // Configurar el formulario de agregar producto si está disponible
    if (addProductForm && (role === 'admin' || role === 'superadmin')) {
        addProductForm.addEventListener('submit', addProduct);
    }

    // Cargar productos al iniciar
    await loadProducts();
});

// Función para el inicio de sesión
document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('userRole', result.role);

            if (result.role === 'admin' || result.role === 'superadmin') {
                window.location.href = 'AdminView.html';
            } else if (result.role === 'usuario') {
                window.location.href = 'CartView.html';
            }
        } else {
            const loginError = document.getElementById('loginError');
            loginError.textContent = result.message;
            loginError.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
    }
});

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('userRole');
    window.location.href = 'Login.html';
}


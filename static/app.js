// ============================================================
// MOOD STICKER - FULL APPLICATION LOGIC (FastAPI + JS)
// ============================================================

const API_URL = window.location.origin;

// Application State
let products = [];
let cart = JSON.parse(localStorage.getItem('mood_cart') || '[]');
let token = localStorage.getItem('mood_token') || null;
let currentUser = null;
let currentCategory = 'all';
let pendingArrepentimientoOrderId = null;

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    setupCartDrawer();
    setupAuthModals();
    setupLegalTabs();
    setupProfileActions();
    
    // Check if user is logged in
    if (token) {
        await checkUserAuth();
    } else {
        updateAuthUI();
    }

    // Load products
    await fetchProducts();
    renderCart();
});

// ============================================================
// NOTIFICATIONS / TOASTS
// ============================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ============================================================
// NAVIGATION & VIEWS
// ============================================================
function setupNavigation() {
    const btnShopNav = document.getElementById('btn-shop-nav');
    const btnLegalNav = document.getElementById('btn-legal-nav');
    const btnProfileOpen = document.getElementById('btn-profile-open');
    const navHomeBtn = document.getElementById('nav-home-btn');
    const footerBtnShop = document.getElementById('footer-btn-shop');
    const footerBtnLegal = document.getElementById('footer-btn-legal');
    const footerBtnPrivacy = document.getElementById('footer-btn-privacy');
    const footerBtnTerms = document.getElementById('footer-btn-terms');
    const footerBtnArrepentimiento = document.getElementById('footer-btn-arrepentimiento');

    if (btnShopNav) btnShopNav.addEventListener('click', (e) => { e.preventDefault(); switchView('shop'); });
    if (navHomeBtn) navHomeBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('shop'); });
    if (footerBtnShop) footerBtnShop.addEventListener('click', (e) => { e.preventDefault(); switchView('shop'); });

    if (btnLegalNav) btnLegalNav.addEventListener('click', (e) => { e.preventDefault(); switchView('legal'); });
    if (footerBtnLegal) footerBtnLegal.addEventListener('click', (e) => { e.preventDefault(); switchView('legal'); });

    if (footerBtnPrivacy) footerBtnPrivacy.addEventListener('click', (e) => { e.preventDefault(); switchView('legal'); switchLegalTab('privacy'); });
    if (footerBtnTerms) footerBtnTerms.addEventListener('click', (e) => { e.preventDefault(); switchView('legal'); switchLegalTab('terms'); });
    if (footerBtnArrepentimiento) footerBtnArrepentimiento.addEventListener('click', (e) => { e.preventDefault(); switchView('legal'); switchLegalTab('arrepentimiento-info'); });

    if (btnProfileOpen) btnProfileOpen.addEventListener('click', (e) => { 
        e.preventDefault(); 
        if (currentUser) {
            switchView('profile'); 
            loadUserOrders();
        }
    });

    // Category Filter Buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category || 'all';
            fetchProducts(currentCategory);
        });
    });
}

function switchView(viewName) {
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.add('hidden'));

    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) activeView.classList.remove('hidden');

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(l => l.classList.remove('active'));

    if (viewName === 'shop') document.getElementById('btn-shop-nav')?.classList.add('active');
    if (viewName === 'legal') document.getElementById('btn-legal-nav')?.classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupLegalTabs() {
    const tabBtns = document.querySelectorAll('.legal-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchLegalTab(btn.dataset.tab);
        });
    });
}

function switchLegalTab(tabName) {
    const tabBtns = document.querySelectorAll('.legal-tab-btn');
    tabBtns.forEach(b => b.classList.remove('active'));

    const targetBtn = document.querySelector(`.legal-tab-btn[data-tab="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    const tabContents = document.querySelectorAll('.legal-tab-content');
    tabContents.forEach(tc => tc.classList.add('hidden'));

    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) activeContent.classList.remove('hidden');
}

// ============================================================
// PRODUCTS LOGIC
// ============================================================
async function fetchProducts(category = null) {
    const container = document.getElementById("product-list-container");
    if (!container) return;

    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i> Cargando catálogo de stickers...
        </div>
    `;

    try {
        let url = `${API_URL}/api/products?limit=50`;
        if (category && category !== 'all') {
            url += `&category=${encodeURIComponent(category)}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error ${response.status}`);

        products = await response.json();
        renderProducts();

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="empty-state text-red">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>No se pudieron cargar los productos. Verificá la conexión con el servidor.</p>
            </div>
        `;
    }
}

function renderProducts() {
    const container = document.getElementById("product-list-container");
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <p>No hay stickers disponibles en esta categoría.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image-container">
                <img src="${product.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80'}" alt="${product.name}" class="product-img" />
                <span class="product-category-tag">${product.category || 'Sticker'}</span>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-desc">${product.description || ''}</p>
                <div class="product-footer">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm btn-add-cart" onclick="addToCart(${product.id})">
                        <i class="fa-solid fa-cart-plus"></i> Agregar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================================
// CART & CHECKOUT LOGIC
// ============================================================
function setupCartDrawer() {
    const toggleBtn = document.getElementById('cart-toggle-btn');
    const closeBtn = document.getElementById('cart-close-btn');
    const overlay = document.getElementById('cart-overlay');
    const drawer = document.getElementById('cart-drawer');
    const checkoutBtn = document.getElementById('btn-checkout');
    const consentCheckbox = document.getElementById('cart-data-consent');

    const openCart = () => {
        drawer?.classList.add('open');
        overlay?.classList.add('open');
    };

    const closeCart = () => {
        drawer?.classList.remove('open');
        overlay?.classList.remove('open');
    };

    if (toggleBtn) toggleBtn.addEventListener('click', openCart);
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);

    if (consentCheckbox && checkoutBtn) {
        consentCheckbox.addEventListener('change', () => {
            checkoutBtn.disabled = !consentCheckbox.checked || cart.length === 0;
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.product.id === productId);
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
            showToast(`Se agregó otra unidad de "${product.name}"`, 'success');
        } else {
            showToast(`Sin stock suficiente para agregar más de "${product.name}"`, 'error');
            return;
        }
    } else {
        cart.push({ product, quantity: 1 });
        showToast(`"${product.name}" agregado al carrito`, 'success');
    }

    saveCart();
    renderCart();

    // Animación visual del botón de carrito en el navbar
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.classList.remove('pulse');
        void badge.offsetWidth; // Force reflow
        badge.classList.add('pulse');
    }
}

function updateCartQuantity(productId, newQty) {
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }

    const item = cart.find(i => i.product.id === productId);
    if (item) {
        item.quantity = newQty;
        saveCart();
        renderCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.product.id !== productId);
    saveCart();
    renderCart();
    showToast('Producto eliminado del carrito', 'info');
}

function saveCart() {
    localStorage.setItem('mood_cart', JSON.stringify(cart));
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const countBadge = document.getElementById('cart-count');
    const totalPriceEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('btn-checkout');
    const consentCheckbox = document.getElementById('cart-data-consent');

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    if (countBadge) countBadge.textContent = totalCount;
    if (totalPriceEl) totalPriceEl.textContent = `$${totalPrice.toFixed(2)}`;

    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0 || (consentCheckbox && !consentCheckbox.checked);
    }

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-state">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>El carrito está vacío</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.product.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80'}" alt="${item.product.name}" class="cart-item-img" />
            <div class="cart-item-details">
                <h4>${item.product.name}</h4>
                <p class="cart-item-price">$${item.product.price.toFixed(2)}</p>
                <div class="cart-quantity-controls">
                    <button onclick="updateCartQuantity(${item.product.id}, ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartQuantity(${item.product.id}, ${item.quantity + 1})">+</button>
                </div>
            </div>
            <button class="cart-remove-btn" onclick="removeFromCart(${item.product.id})">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

async function handleCheckout() {
    if (!token) {
        showToast('Debés iniciar sesión para realizar una compra', 'error');
        document.getElementById('modal-login')?.classList.add('open');
        return;
    }

    if (cart.length === 0) return;

    const orderPayload = {
        items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity
        }))
    };

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderPayload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al procesar la orden');
        }

        const newOrder = await response.json();

        // Clear cart
        cart = [];
        saveCart();
        renderCart();

        // Close drawer
        document.getElementById('cart-drawer')?.classList.remove('open');
        document.getElementById('cart-overlay')?.classList.remove('open');

        showToast(`¡Compra realizada con éxito! Orden #${newOrder.id}`, 'success');
        
        switchView('profile');
        await loadUserOrders();

    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    }
}

// ============================================================
// AUTHENTICATION LOGIC
// ============================================================
function setupAuthModals() {
    const modalLogin = document.getElementById('modal-login');
    const modalRegister = document.getElementById('modal-register');
    const btnLoginOpen = document.getElementById('btn-login-open');
    const btnRegisterOpen = document.getElementById('btn-register-open');
    const btnLogout = document.getElementById('btn-logout');

    const closeLogin = document.getElementById('modal-login-close');
    const closeRegister = document.getElementById('modal-register-close');
    const linkGoRegister = document.getElementById('link-go-register');
    const linkGoLogin = document.getElementById('link-go-login');

    if (btnLoginOpen) btnLoginOpen.addEventListener('click', () => modalLogin?.classList.add('open'));
    if (btnRegisterOpen) btnRegisterOpen.addEventListener('click', () => modalRegister?.classList.add('open'));

    if (closeLogin) closeLogin.addEventListener('click', () => modalLogin?.classList.remove('open'));
    if (closeRegister) closeRegister.addEventListener('click', () => modalRegister?.classList.remove('open'));

    if (linkGoRegister) linkGoRegister.addEventListener('click', (e) => {
        e.preventDefault();
        modalLogin?.classList.remove('open');
        modalRegister?.classList.add('open');
    });

    if (linkGoLogin) linkGoLogin.addEventListener('click', (e) => {
        e.preventDefault();
        modalRegister?.classList.remove('open');
        modalLogin?.classList.add('open');
    });

    if (btnLogout) btnLogout.addEventListener('click', handleLogout);

    // Form Submissions
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch(`${API_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || 'Credenciales incorrectas');
                }

                const data = await response.json();
                token = data.access_token;
                localStorage.setItem('mood_token', token);

                modalLogin?.classList.remove('open');
                formLogin.reset();

                await checkUserAuth();
                showToast(`¡Bienvenido de nuevo, ${currentUser?.name || ''}!`, 'success');

            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    const formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const dataConsent = document.getElementById('register-data-consent').checked;

            try {
                const response = await fetch(`${API_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        data_consent: dataConsent
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || 'Error en el registro');
                }

                showToast('Cuenta creada con éxito. Iniciando sesión...', 'success');
                modalRegister?.classList.remove('open');
                formRegister.reset();

                // Auto login after registration
                const loginRes = await fetch(`${API_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                if (loginRes.ok) {
                    const loginData = await loginRes.json();
                    token = loginData.access_token;
                    localStorage.setItem('mood_token', token);
                    await checkUserAuth();
                }

            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

async function checkUserAuth() {
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            handleLogout();
            return;
        }

        currentUser = await response.json();
        updateAuthUI();

    } catch (err) {
        console.error(err);
        handleLogout();
    }
}

function updateAuthUI() {
    const authNavContainer = document.getElementById('auth-nav-container');
    const userMenuContainer = document.getElementById('user-menu-container');
    const userDisplayName = document.getElementById('user-display-name');

    if (currentUser) {
        authNavContainer?.classList.add('hidden');
        userMenuContainer?.classList.remove('hidden');
        if (userDisplayName) userDisplayName.textContent = currentUser.name;

        // Profile View Data
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileRole = document.getElementById('profile-role');
        const profileCreated = document.getElementById('profile-created');

        if (profileName) profileName.textContent = currentUser.name;
        if (profileEmail) profileEmail.textContent = currentUser.email;
        if (profileRole) profileRole.textContent = currentUser.role.toUpperCase();
        if (profileCreated && currentUser.created_at) {
            profileCreated.textContent = new Date(currentUser.created_at).toLocaleDateString('es-AR');
        }
    } else {
        authNavContainer?.classList.remove('hidden');
        userMenuContainer?.classList.add('hidden');
        if (userDisplayName) userDisplayName.textContent = 'Mi Cuenta';
    }
}

function handleLogout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('mood_token');
    updateAuthUI();
    switchView('shop');
    showToast('Sesión cerrada correctamente', 'info');
}

// ============================================================
// PROFILE & ORDERS LOGIC
// ============================================================
function setupProfileActions() {
    const btnExportData = document.getElementById('btn-export-data');
    const btnDeleteAccount = document.getElementById('btn-delete-account');
    const modalDelete = document.getElementById('modal-confirm-delete');
    const modalDeleteClose = document.getElementById('modal-delete-close');
    const btnDeleteCancel = document.getElementById('btn-delete-cancel');
    const btnDeleteConfirm = document.getElementById('btn-delete-confirm');

    // Export user personal data JSON (Ley 25.326 compliance)
    if (btnExportData) {
        btnExportData.addEventListener('click', async () => {
            if (!token) return;
            try {
                showToast('Generando descarga de tus datos...', 'info');
                const response = await fetch(`${API_URL}/api/users/me/exportar`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Error al exportar los datos');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `mis_datos_personales.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                showToast('Archivo de datos descargado con éxito', 'success');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    if (btnDeleteAccount) btnDeleteAccount.addEventListener('click', () => modalDelete?.classList.add('open'));
    if (modalDeleteClose) modalDeleteClose.addEventListener('click', () => modalDelete?.classList.remove('open'));
    if (btnDeleteCancel) btnDeleteCancel.addEventListener('click', () => modalDelete?.classList.remove('open'));

    if (btnDeleteConfirm) {
        btnDeleteConfirm.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_URL}/api/auth/delete-data`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Error al suprimir los datos de la cuenta');

                modalDelete?.classList.remove('open');
                showToast('Tu cuenta y datos fueron eliminados permanentemente (Ley 25.326)', 'info');
                handleLogout();

            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Modal Arrepentimiento
    const modalArrepentimiento = document.getElementById('modal-confirm-arrepentimiento');
    const modalArrepClose = document.getElementById('modal-arrepentimiento-close');
    const btnArrepCancel = document.getElementById('btn-arrepentirse-cancel');
    const btnArrepConfirm = document.getElementById('btn-arrepentirse-confirm');

    if (modalArrepClose) modalArrepClose.addEventListener('click', () => modalArrepentimiento?.classList.remove('open'));
    if (btnArrepCancel) btnArrepCancel.addEventListener('click', () => modalArrepentimiento?.classList.remove('open'));

    if (btnArrepConfirm) {
        btnArrepConfirm.addEventListener('click', async () => {
            if (!pendingArrepentimientoOrderId) return;

            try {
                const response = await fetch(`${API_URL}/api/orders/${pendingArrepentimientoOrderId}/arrepentirse`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || 'Error al procesar el arrepentimiento');
                }

                const resData = await response.json();
                modalArrepentimiento?.classList.remove('open');
                showToast(`Compra #${pendingArrepentimientoOrderId} cancelada. Código de trámite: ${resData.codigo || 'OK'}`, 'success');
                pendingArrepentimientoOrderId = null;

                await loadUserOrders();
                await fetchProducts(); // Stock updated

            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

async function loadUserOrders() {
    const container = document.getElementById('orders-list-container');
    if (!container || !token) return;

    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i> Cargando historial de compras...
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar órdenes');

        const orders = await response.json();

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    <p>Aún no realizaste ninguna compra.</p>
                    <button class="btn btn-primary" onclick="switchView('shop')">Ir a la Tienda</button>
                </div>
            `;
            return;
        }

        const now = new Date();

        container.innerHTML = orders.map(order => {
            const orderDate = new Date(order.created_at);
            const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
            const isCancelled = order.status === 'cancelado' || order.status === 'Cancelled/Arrepentido';
            const isArrepentimientoEligible = !isCancelled && diffDays <= 10;
            const displayStatus = isCancelled ? 'Arrepentido / Cancelado' : (order.status === 'Paid' ? 'Pagado' : order.status);
            const statusClass = isCancelled ? 'status-cancelado' : `status-${order.status.toLowerCase()}`;

            return `
                <div class="order-card card">
                    <div class="order-header">
                        <div>
                            <h3>Orden #${order.id}</h3>
                            <span class="order-date">${orderDate.toLocaleDateString('es-AR')} ${orderDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span class="order-status ${statusClass}">${displayStatus}</span>
                    </div>

                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item-row">
                                <span>${item.quantity}x ${item.product?.name || 'Sticker'}</span>
                                <span>$${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="order-footer">
                        <span class="order-total">Total: $${order.total_price.toFixed(2)}</span>
                        ${isArrepentimientoEligible ? `
                            <button class="btn btn-outline-danger btn-sm" onclick="openArrepentimientoModal(${order.id})">
                                <i class="fa-solid fa-rotate-left"></i> Botón de Arrepentimiento
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="empty-state text-red">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>No se pudieron cargar las órdenes.</p>
            </div>
        `;
    }
}

function openArrepentimientoModal(orderId) {
    pendingArrepentimientoOrderId = orderId;
    document.getElementById('modal-confirm-arrepentimiento')?.classList.add('open');
}

// Exponer funciones globales en window para garantizar funcionamiento de botones inline (onclick)
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.switchView = switchView;
window.openArrepentimientoModal = openArrepentimientoModal;
window.switchLegalTab = switchLegalTab;

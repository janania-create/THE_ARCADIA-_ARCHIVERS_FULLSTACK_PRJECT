// ===== CONFIGURATION =====
const API_BASE = 'http://localhost:5000/api';
let sessionId = localStorage.getItem('sessionId') || 'session_' + Date.now();
localStorage.setItem('sessionId', sessionId);

// ===== HELPER FUNCTIONS =====
function getProductCard(product) {
    return `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.image_url || '/static/images/placeholder.jpg'}" alt="${product.name}" class="product-image" />
            <div class="product-info">
                <div class="product-brand">${product.brand || 'The Arcadia Archives'}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="addToCart(${product.id})">
                        <i class="fas fa-shopping-bag"></i> Add to Bag
                    </button>
                    <button class="btn-view" onclick="viewProduct(${product.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== FETCH PRODUCTS =====
async function fetchProducts() {
    const productGrid = document.getElementById('productGrid');
    const featuredGrid = document.getElementById('featuredProducts');
    
    if (productGrid) productGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    if (featuredGrid) featuredGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const products = await response.json();
        
        // Render product grid
        if (productGrid) {
            if (products.length === 0) {
                productGrid.innerHTML = '<p class="empty-message">No products available.</p>';
            } else {
                productGrid.innerHTML = products.map(getProductCard).join('');
            }
        }
        
        // Render featured products (first 4)
        if (featuredGrid) {
            const featured = products.slice(0, 4);
            if (featured.length === 0) {
                featuredGrid.innerHTML = '<p class="empty-message">No featured products.</p>';
            } else {
                featuredGrid.innerHTML = featured.map(getProductCard).join('');
            }
        }
        
        return products;
    } catch (error) {
        console.error('Error fetching products:', error);
        if (productGrid) {
            productGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Unable to load products. Please check your connection.</p>
                    <button onclick="fetchProducts()" class="btn-secondary">Retry</button>
                </div>
            `;
        }
        return [];
    }
}

// ===== ADD TO CART =====
async function addToCart(productId, quantity = 1) {
    try {
        const response = await fetch(`${API_BASE}/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity,
                session_id: sessionId
            })
        });
        
        if (!response.ok) throw new Error('Failed to add to cart');
        
        const data = await response.json();
        showNotification('Item added to bag!', 'success');
        updateCartCount();
        return data;
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add item to bag. Please try again.', 'error');
    }
}

// ===== VIEW PRODUCT =====
function viewProduct(productId) {
    window.location.href = `/product/${productId}`;
}

// ===== FETCH CART =====
async function fetchCart() {
    const cartItems = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    
    if (cartItems) cartItems.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    
    try {
        const response = await fetch(`${API_BASE}/cart?session_id=${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch cart');
        
        const items = await response.json();
        
        if (cartItems) {
            if (items.length === 0) {
                cartItems.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-shopping-bag" style="font-size: 48px; color: var(--gold);"></i>
                        <p>Your bag is empty.</p>
                        <a href="/shop" class="btn-primary" style="display: inline-block; margin-top: 20px;">Start Shopping</a>
                    </div>
                `;
            } else {
                let total = 0;
                cartItems.innerHTML = items.map(item => {
                    const subtotal = parseFloat(item.price) * item.quantity;
                    total += subtotal;
                    return `
                        <div class="cart-item">
                            <img src="${item.image_url || '/static/images/placeholder.jpg'}" alt="${item.name}" class="cart-item-image" />
                            <div class="cart-item-info">
                                <h4>${item.name}</h4>
                                <p>${item.brand || 'The Arcadia Archives'}</p>
                                <p>Qty: ${item.quantity}</p>
                            </div>
                            <div>
                                <p class="cart-item-price">$${subtotal.toFixed(2)}</p>
                                <button onclick="removeFromCart(${item.id})" class="btn-danger">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Update summary
                if (cartSummary) {
                    const tax = total * 0.08;
                    const shipping = total > 500 ? 0 : 25;
                    const grandTotal = total + tax + shipping;
                    
                    cartSummary.innerHTML = `
                        <h3>Order Summary</h3>
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span>$${total.toFixed(2)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Tax (8%)</span>
                            <span>$${tax.toFixed(2)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Shipping</span>
                            <span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
                        </div>
                        <div class="summary-row summary-total">
                            <span>Total</span>
                            <span>$${grandTotal.toFixed(2)}</span>
                        </div>
                        <button onclick="checkout()" class="btn-primary" style="width: 100%; margin-top: 20px;">
                            Proceed to Checkout
                        </button>
                        <button onclick="clearCart()" class="btn-secondary" style="width: 100%; margin-top: 10px;">
                            Clear Bag
                        </button>
                    `;
                }
            }
        }
        
        updateCartCount();
        return items;
    } catch (error) {
        console.error('Error fetching cart:', error);
        if (cartItems) {
            cartItems.innerHTML = `
                <div class="error-message">
                    <p>Unable to load your bag. Please check your connection.</p>
                    <button onclick="fetchCart()" class="btn-secondary">Retry</button>
                </div>
            `;
        }
        return [];
    }
}

// ===== REMOVE FROM CART =====
async function removeFromCart(itemId) {
    try {
        const response = await fetch(`${API_BASE}/cart/${itemId}?session_id=${sessionId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove from cart');
        
        showNotification('Item removed from bag.', 'info');
        fetchCart();
        updateCartCount();
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification('Failed to remove item. Please try again.', 'error');
    }
}

// ===== CLEAR CART =====
async function clearCart() {
    if (!confirm('Are you sure you want to clear your bag?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/cart/clear?session_id=${sessionId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to clear cart');
        
        showNotification('Bag cleared.', 'info');
        fetchCart();
        updateCartCount();
    } catch (error) {
        console.error('Error clearing cart:', error);
        showNotification('Failed to clear bag. Please try again.', 'error');
    }
}

// ===== CHECKOUT =====
function checkout() {
    showNotification('Coming soon! This is a demo.', 'info');
}

// ===== UPDATE CART COUNT =====
async function updateCartCount() {
    const countElement = document.getElementById('cartCount');
    if (!countElement) return;
    
    try {
        const response = await fetch(`${API_BASE}/cart?session_id=${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch cart count');
        
        const items = await response.json();
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        countElement.textContent = count;
        
        // Animate count
        countElement.style.transform = 'scale(1.3)';
        setTimeout(() => {
            countElement.style.transform = 'scale(1)';
        }, 200);
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// ===== FETCH PRODUCT DETAIL =====
async function fetchProductDetail(productId) {
    const container = document.getElementById('productDetail');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    
    try {
        const response = await fetch(`${API_BASE}/products/${productId}`);
        if (!response.ok) throw new Error('Product not found');
        
        const product = await response.json();
        
        container.innerHTML = `
            <div class="product-detail-image-container">
                <img src="${product.image_url || '/static/images/placeholder.jpg'}" alt="${product.name}" class="product-detail-image" />
            </div>
            <div class="product-detail-info">
                <div class="product-brand">${product.brand || 'The Arcadia Archives'}</div>
                <h1>${product.name}</h1>
                <p class="product-detail-price">$${parseFloat(product.price).toFixed(2)}</p>
                <p class="product-detail-description">${product.description || 'A curated piece from The Arcadia Archives collection.'}</p>
                <div class="quantity-selector">
                    <label>Quantity:</label>
                    <input type="number" id="quantityInput" value="1" min="1" max="10" />
                </div>
                <button onclick="addToCart(${product.id}, parseInt(document.getElementById('quantityInput').value))" class="btn-primary">
                    <i class="fas fa-shopping-bag"></i> Add to Bag
                </button>
                <button onclick="window.history.back()" class="btn-secondary" style="margin-left: 10px;">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching product:', error);
        container.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1;">
                <h3>Product not found</h3>
                <p>We couldn't find the product you're looking for.</p>
                <a href="/shop" class="btn-primary" style="display: inline-block; margin-top: 20px;">Browse Collection</a>
            </div>
        `;
    }
}

// ===== FILTER AND SORT PRODUCTS =====
async function applyFilters() {
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const sort = document.getElementById('sortFilter')?.value || 'default';
    
    try {
        const response = await fetch(`${API_BASE}/products`);
        const products = await response.json();
        
        let filtered = products;
        
        // Apply category filter
        if (category !== 'all') {
            filtered = filtered.filter(p => p.category === category);
        }
        
        // Apply sorting
        switch(sort) {
            case 'price-low':
                filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case 'price-high':
                filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }
        
        const grid = document.getElementById('productGrid');
        if (grid) {
            if (filtered.length === 0) {
                grid.innerHTML = '<p class="empty-message">No products match your filters.</p>';
            } else {
                grid.innerHTML = filtered.map(getProductCard).join('');
            }
        }
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', function() {
    // Mobile hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }
    
    // Close mobile menu on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks) navLinks.classList.remove('active');
        });
    });
    
    // Initialize page-specific functionality
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index') {
        fetchProducts();
    } else if (path === '/shop') {
        fetchProducts();
        
        // Set up filter listeners
        const categoryFilter = document.getElementById('categoryFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
        if (sortFilter) sortFilter.addEventListener('change', applyFilters);
    } else if (path.startsWith('/product/')) {
        const productId = path.split('/')[2];
        fetchProductDetail(productId);
    } else if (path === '/cart') {
        fetchCart();
    }
    
    // Update cart count on all pages
    updateCartCount();
});

// ===== ADD NOTIFICATION STYLES =====
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 25px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        max-width: 400px;
        animation: slideIn 0.3s ease;
        border-left: 4px solid var(--gold);
    }
    
    .notification-success {
        border-left-color: #28a745;
    }
    
    .notification-error {
        border-left-color: #dc3545;
    }
    
    .notification-info {
        border-left-color: #17a2b8;
    }
    
    .notification i {
        font-size: 20px;
    }
    
    .notification-success i {
        color: #28a745;
    }
    
    .notification-error i {
        color: #dc3545;
    }
    
    .notification-info i {
        color: #17a2b8;
    }
    
    .notification button {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
        margin-left: auto;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .error-message {
        text-align: center;
        padding: 40px;
        grid-column: 1 / -1;
    }
    
    .error-message i {
        font-size: 48px;
        color: #dc3545;
        margin-bottom: 15px;
    }
`;
document.head.appendChild(style);
// ===== ADMIN LOGIN =====
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            
            if (errorDiv) errorDiv.textContent = '';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    window.location.href = '/admin_dashboard';
                } else {
                    if (errorDiv) {
                        errorDiv.textContent = data.error || 'Login failed. Please try again.';
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                if (errorDiv) {
                    errorDiv.textContent = 'Connection error. Please check your network.';
                }
            }
        });
    }
    
    // ===== ADMIN DASHBOARD =====
    if (window.location.pathname === '/admin_dashboard') {
        loadDashboardStats();
    }
    
    // ===== LOGOUT =====
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/admin_login';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
});

// ===== LOAD DASHBOARD STATS =====
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to load stats');
        
        const stats = await response.json();
        
        // Update stat cards
        document.getElementById('totalProducts').textContent = stats.total_products || 0;
        document.getElementById('totalOrders').textContent = stats.total_orders || 0;
        document.getElementById('totalRevenue').textContent = '$' + (stats.revenue || 0).toFixed(2);
        
        // Render top products
        const topProductsDiv = document.getElementById('topProducts');
        if (topProductsDiv && stats.top_products) {
            if (stats.top_products.length === 0) {
                topProductsDiv.innerHTML = '<p class="empty-message">No sales data available.</p>';
            } else {
                topProductsDiv.innerHTML = stats.top_products.map((p, index) => `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                        <span>${index + 1}. ${p.name}</span>
                        <span>${p.total_sold} sold</span>
                    </div>
                `).join('');
            }
        }
        
        // Render recent orders
        const recentOrdersDiv = document.getElementById('recentOrders');
        if (recentOrdersDiv && stats.recent_orders) {
            if (stats.recent_orders.length === 0) {
                recentOrdersDiv.innerHTML = '<p class="empty-message">No recent orders.</p>';
            } else {
                recentOrdersDiv.innerHTML = stats.recent_orders.map(order => `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                        <span>${order.product_name}</span>
                        <span>Qty: ${order.quantity}</span>
                        <span>$${(parseFloat(order.price) * order.quantity).toFixed(2)}</span>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        document.querySelector('.dashboard-grid').innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load dashboard data. Please refresh.</p>
                <button onclick="loadDashboardStats()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
}
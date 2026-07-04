from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_cors import CORS
import pymysql
import os
import hashlib
import secrets
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = os.urandom(24)
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Janani4906!',
    'database': 'arcadia_archives',
    'cursorclass': pymysql.cursors.DictCursor
}

def get_db_connection():
    """Create database connection"""
    try:
        return pymysql.connect(**DB_CONFIG)
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# ===== ADMIN AUTHENTICATION DECORATOR =====
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or not session.get('is_admin'):
            flash('Please login as admin to access this page', 'error')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# ==================== PAGE ROUTES ====================

@app.route('/')
def index():
    """Page 1: Homepage - The Arcadia Archives"""
    return render_template('index.html')

@app.route('/shop')
def shop():
    """Page 2: Shop catalog"""
    return render_template('shop.html')

@app.route('/product/<int:product_id>')
def product_detail(product_id):
    """Page 3: Single product view"""
    return render_template('product.html', product_id=product_id)

@app.route('/cart')
def cart():
    """Page 4: Shopping cart"""
    return render_template('cart.html')

@app.route('/profile')
def profile():
    """Page 5: User profile"""
    if 'user_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template('profile.html')

@app.route('/about')
def about():
    """Page 6: About The Arcadia Archives"""
    return render_template('about.html')

@app.route('/contact')
def contact():
    """Page 7: Contact page"""
    return render_template('contact.html')

@app.route('/admin_login')
def admin_login():
    """Page 8: Admin login"""
    return render_template('admin_login.html')

@app.route('/admin_dashboard')
def admin_dashboard():
    """Page 9: Admin dashboard"""
    if not session.get('is_admin'):
        return redirect(url_for('admin_login'))
    return render_template('admin_dashboard.html')

# ==================== API ENDPOINTS ====================

@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all products"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM products WHERE in_stock = TRUE ORDER BY id")
            products = cursor.fetchall()
        connection.close()
        return jsonify(products), 200
    except Exception as e:
        connection.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Get single product"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
            product = cursor.fetchone()
        connection.close()
        if product:
            return jsonify(product), 200
        return jsonify({'error': 'Product not found'}), 404
    except Exception as e:
        connection.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/cart', methods=['GET'])
def get_cart():
    """Get cart items"""
    session_id = request.args.get('session_id', 'default_session')
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT ci.*, p.name, p.price, p.image_url, p.brand 
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                WHERE ci.session_id = %s
            """, (session_id,))
            cart_items = cursor.fetchall()
        connection.close()
        return jsonify(cart_items), 200
    except Exception as e:
        connection.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    """Add item to cart"""
    data = request.json
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    session_id = data.get('session_id', 'default_session')
    
    if not product_id:
        return jsonify({'error': 'Product ID required'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if product exists and is in stock
            cursor.execute("SELECT * FROM products WHERE id = %s AND in_stock = TRUE", (product_id,))
            product = cursor.fetchone()
            if not product:
                return jsonify({'error': 'Product not available'}), 404
            
            # Check if item already in cart
            cursor.execute("""
                SELECT * FROM cart_items 
                WHERE product_id = %s AND session_id = %s
            """, (product_id, session_id))
            existing = cursor.fetchone()
            
            if existing:
                # Update quantity
                cursor.execute("""
                    UPDATE cart_items 
                    SET quantity = quantity + %s 
                    WHERE product_id = %s AND session_id = %s
                """, (quantity, product_id, session_id))
            else:
                # Insert new item
                cursor.execute("""
                    INSERT INTO cart_items (product_id, quantity, session_id) 
                    VALUES (%s, %s, %s)
                """, (product_id, quantity, session_id))
            
            connection.commit()
        connection.close()
        return jsonify({'message': 'Item added to cart successfully'}), 200
    except Exception as e:
        connection.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/cart/<int:cart_item_id>', methods=['DELETE'])
def remove_from_cart(cart_item_id):
    """Remove item from cart"""
    session_id = request.args.get('session_id', 'default_session')
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM cart_items 
                WHERE id = %s AND session_id = %s
            """, (cart_item_id, session_id))
            connection.commit()
        connection.close()
        return jsonify({'message': 'Item removed from cart'}), 200
    except Exception as e:
        connection.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/cart/clear', methods=['DELETE'])
def clear_cart():
    """Clear entire cart"""
    session_id = request.args.get('session_id', 'default_session')
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM cart_items WHERE session_id = %s", (session_id,))
            connection.commit()
        connection.close()
        return jsonify({'message': 'Cart cleared'}), 200
    except Exception as e:
        connection.close()
        return jsonify({'error': str(e)}), 500

# ===== ADMIN LOGIN API - HARDCODED VERSION =====

@app.route('/api/admin/login', methods=['POST'])
def admin_login_api():
    """Simple admin login - hardcoded for testing"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        print(f"Login attempt - Username: '{username}', Password: '{password}'")  # Debug
        
        # Simple hardcoded check
        if username == 'admin' and password == 'admin123':
            session['user_id'] = 1
            session['username'] = 'admin'
            session['is_admin'] = True
            session['full_name'] = 'Arcadia Admin'
            session['email'] = 'admin@arcadiaarchives.com'
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'id': 1,
                    'username': 'admin',
                    'full_name': 'Arcadia Admin',
                    'email': 'admin@arcadiaarchives.com'
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500

# ===== LEGACY LOGIN (for backwards compatibility) =====

@app.route('/api/login', methods=['POST'])
def login():
    """Regular login"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            cursor.execute("""
                SELECT * FROM users 
                WHERE username = %s AND password_hash = %s
            """, (username, password_hash))
            user = cursor.fetchone()
            
            if user:
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['is_admin'] = user.get('is_admin', False)
                return jsonify({
                    'message': 'Login successful',
                    'user': {
                        'id': user['id'],
                        'username': user['username'],
                        'full_name': user['full_name'],
                        'is_admin': user.get('is_admin', False)
                    }
                }), 200
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        connection.close()
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get admin dashboard statistics"""
    if 'user_id' not in session or not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            # Get total products
            cursor.execute("SELECT COUNT(*) as total FROM products WHERE in_stock = TRUE")
            total_products = cursor.fetchone()
            
            # Get total orders (simplified)
            cursor.execute("SELECT COUNT(*) as total FROM cart_items")
            total_orders = cursor.fetchone()
            
            # Get total revenue (simplified)
            cursor.execute("""
                SELECT SUM(p.price * ci.quantity) as revenue 
                FROM cart_items ci 
                JOIN products p ON ci.product_id = p.id
            """)
            revenue = cursor.fetchone()
            
            # Get top selling products
            cursor.execute("""
                SELECT p.name, SUM(ci.quantity) as total_sold
                FROM cart_items ci 
                JOIN products p ON ci.product_id = p.id
                GROUP BY p.id
                ORDER BY total_sold DESC
                LIMIT 5
            """)
            top_products = cursor.fetchall()
            
            # Get recent orders
            cursor.execute("""
                SELECT ci.*, p.name as product_name, p.price
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                ORDER BY ci.added_at DESC
                LIMIT 10
            """)
            recent_orders = cursor.fetchall()
            
        connection.close()
        return jsonify({
            'total_products': total_products['total'],
            'total_orders': total_orders['total'],
            'revenue': revenue['revenue'] or 0,
            'top_products': top_products,
            'recent_orders': recent_orders
        }), 200
    except Exception as e:
        connection.close()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
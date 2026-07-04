-- Create database
CREATE DATABASE IF NOT EXISTS arcadia_archives;
USE arcadia_archives;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    brand VARCHAR(50) DEFAULT 'The Arcadia Archives',
    in_stock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    session_id VARCHAR(100),
    user_id INT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Users table (for profile and admin)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert luxury products with The Arcadia Archives brand
INSERT INTO products (name, category, price, description, image_url, brand) VALUES
('Classic Oxford Brogue', 'shoes', 895.00, 'Handcrafted Italian leather oxford shoes with intricate brogue detailing from The Arcadia Archives', '/static/images/oxford.jpg', 'The Arcadia Archives'),
('Chelsea Boot', 'shoes', 1250.00, 'Premium suede Chelsea boots with elastic side panels and leather sole, archived collection', '/static/images/chelsea.jpg', 'The Arcadia Archives'),
('Leather Tote', 'bags', 2450.00, 'Full-grain leather tote bag with gold hardware and interior pockets, signature Arcadia piece', '/static/images/tote.jpg', 'The Arcadia Archives'),
('Crossbody Saddle', 'bags', 1850.00, 'Premium leather saddle bag with adjustable strap and embossed Arcadia logo', '/static/images/saddle.jpg', 'The Arcadia Archives'),
('Loafer Penny', 'shoes', 750.00, 'Classic penny loafers in polished calfskin leather, timeless Arcadia design', '/static/images/loafer.jpg', 'The Arcadia Archives'),
('Weekender Duffel', 'bags', 2150.00, 'Spacious duffel bag in waxed canvas and leather trim, adventure-ready Arcadia piece', '/static/images/duffel.jpg', 'The Arcadia Archives');

-- Insert admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, is_admin) VALUES
('admin', 'admin@arcadiaarchives.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Arcadia Admin', TRUE);
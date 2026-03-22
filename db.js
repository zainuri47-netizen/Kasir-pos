/**
 * Database Module
 * Mengelola koneksi dan schema SQLite untuk aplikasi POS
 */

const Database = require('better-sqlite3');
const path = require('path');

// Buat database file di direktori yang sama dengan server.js
const dbPath = path.join(__dirname, 'pos.db');
const db = new Database(dbPath);

// Aktifkan foreign keys untuk relasi antar tabel
db.pragma('foreign_keys = ON');

/**
 * Inisialisasi schema database
 * Membuat tabel products dan transactions jika belum ada
 */
function initializeDatabase() {
    // Tabel untuk menyimpan produk
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            barcode TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabel untuk menyimpan detail transaksi
    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total_amount REAL NOT NULL,
            paid REAL NOT NULL DEFAULT 0,
            change_amount REAL NOT NULL DEFAULT 0,
            items_count INTEGER NOT NULL,
            payment_method TEXT DEFAULT 'cash',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Migrasi: Tambahkan kolom paid dan change_amount jika belum ada
    try {
        const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
        const columns = tableInfo.map(col => col.name);
        
        if (!columns.includes('paid')) {
            db.exec("ALTER TABLE transactions ADD COLUMN paid REAL NOT NULL DEFAULT 0");
        }
        if (!columns.includes('change_amount')) {
            db.exec("ALTER TABLE transactions ADD COLUMN change_amount REAL NOT NULL DEFAULT 0");
        }
    } catch (e) {
        // Kolom sudah ada, abaikan
    }

    // Tabel untuk menyimpan item-item dalam setiap transaksi
    db.exec(`
        CREATE TABLE IF NOT EXISTS transaction_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        )
    `);

    // Seed data produk awal jika tabel kosong
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    if (productCount.count === 0) {
        seedProducts();
    }

    console.log('Database initialized successfully');
}

/**
 * Seed data produk awal untuk demonstrasi
 */
function seedProducts() {
    const sampleProducts = [
        { name: 'Kopi Sachet', price: 2500, stock: 100, barcode: '899990001001' },
        { name: 'Mie Instan', price: 3500, stock: 80, barcode: '899990001002' },
        { name: 'Air Mineral 600ml', price: 3000, stock: 120, barcode: '899990001003' },
        { name: 'Roti Tawar', price: 12000, stock: 30, barcode: '899990001004' },
        { name: 'Susu Kotak', price: 8000, stock: 50, barcode: '899990001005' },
        { name: 'Snack Cup', price: 5000, stock: 60, barcode: '899990001006' },
        { name: 'Teh Botol', price: 4500, stock: 40, barcode: '899990001007' },
        { name: 'Kopi Hitam', price: 4000, stock: 45, barcode: '899990001008' },
        { name: 'Coklat Bar', price: 10000, stock: 35, barcode: '899990001009' },
        { name: 'Keripik Singkong', price: 8000, stock: 25, barcode: '899990001010' },
        { name: 'Es Krim Cup', price: 15000, stock: 20, barcode: '899990001011' },
        { name: 'Minuman Energi', price: 12000, stock: 30, barcode: '899990001012' }
    ];

    const stmt = db.prepare('INSERT INTO products (name, price, stock, barcode) VALUES (?, ?, ?, ?)');
    
    for (const product of sampleProducts) {
        stmt.run(product.name, product.price, product.stock, product.barcode);
    }

    console.log('Sample products seeded successfully');
}

// CRUD Operations untuk Products

/**
 * Ambil semua produk
 * @returns {Array} Array dari objek produk
 */
function getAllProducts() {
    return db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
}

/**
 * Ambil produk berdasarkan ID
 * @param {number} id - ID produk
 * @returns {Object} Objek produk
 */
function getProductById(id) {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

/**
 * Ambil produk berdasarkan barcode
 * @param {string} barcode - Barcode produk
 * @returns {Object} Objek produk
 */
function getProductByBarcode(barcode) {
    return db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
}

/**
 * Tambah produk baru
 * @param {Object} product - Objek produk {name, price, stock, barcode}
 * @returns {Object} Produk yang baru ditambahkan
 */
function addProduct(product) {
    const stmt = db.prepare('INSERT INTO products (name, price, stock, barcode) VALUES (?, ?, ?, ?)');
    const result = stmt.run(product.name, product.price, product.stock || 0, product.barcode || null);
    
    return getProductById(result.lastInsertRowid);
}

/**
 * Hapus produk berdasarkan ID
 * @param {number} id - ID produk
 * @returns {boolean} true jika berhasil, false jika tidak
 */
function deleteProduct(id) {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * Update produk berdasarkan ID
 * @param {number} id - ID produk
 * @param {Object} updates - Field yang diupdate
 * @returns {Object} Produk yang sudah diupdate
 */
function updateProduct(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.price !== undefined) {
        fields.push('price = ?');
        values.push(updates.price);
    }
    if (updates.stock !== undefined) {
        fields.push('stock = ?');
        values.push(updates.stock);
    }
    if (updates.barcode !== undefined) {
        fields.push('barcode = ?');
        values.push(updates.barcode);
    }
    
    if (fields.length === 0) return getProductById(id);
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    return getProductById(id);
}

// Transaction Operations

/**
 * Simpan transaksi checkout
 * @param {Array} items - Array item cart [{productId, name, price, quantity}]
 * @param {number} totalAmount - Total harga
 * @param {number} paid - Jumlah uang dibayar
 * @param {number} changeAmount - Jumlah kembalian
 * @returns {Object} Transaksi yang disimpan
 */
function saveTransaction(items, totalAmount, paid = 0, changeAmount = 0) {
    const transactionStmt = db.prepare(`
        INSERT INTO transactions (total_amount, paid, change_amount, items_count) VALUES (?, ?, ?, ?)
    `);
    
    const transactionResult = transactionStmt.run(totalAmount, paid, changeAmount, items.length);
    const transactionId = transactionResult.lastInsertRowid;
    
    const itemStmt = db.prepare(`
        INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const updateStockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    const getStockStmt = db.prepare('SELECT stock FROM products WHERE id = ?');
    
    const transaction = db.transaction(() => {
        for (const item of items) {
            const product = getStockStmt.get(item.productId);
            if (!product) {
                throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
            }
            if (product.stock < item.quantity) {
                throw new Error(`Stok "${item.name}" tidak mencukupi (tersedia: ${product.stock})`);
            }
            
            itemStmt.run(
                transactionId,
                item.productId,
                item.name,
                item.quantity,
                item.price,
                item.price * item.quantity
            );
            
            updateStockStmt.run(item.quantity, item.productId);
        }
    });
    
    transaction();
    
    return {
        id: transactionId,
        total_amount: totalAmount,
        paid: paid,
        change_amount: changeAmount,
        items_count: items.length,
        created_at: new Date().toISOString()
    };
}

/**
 * Ambil semua transaksi
 * @returns {Array} Array transaksi dengan item-nya
 */
function getAllTransactions() {
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all();
    
    const getTransactionItems = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?');
    
    return transactions.map(t => ({
        ...t,
        items: getTransactionItems.all(t.id)
    }));
}

/**
 * Ambil transaksi berdasarkan ID
 * @param {number} id - ID transaksi
 * @returns {Object} Transaksi dengan item-nya
 */
function getTransactionById(id) {
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!transaction) return null;
    
    const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(id);
    
    return { ...transaction, items };
}

// Export semua fungsi dan objek database
module.exports = {
    db,
    initializeDatabase,
    getAllProducts,
    getProductById,
    getProductByBarcode,
    addProduct,
    deleteProduct,
    updateProduct,
    saveTransaction,
    getAllTransactions,
    getTransactionById
};

/**
 * POS Kasir - Server Entry Point
 * Express.js REST API untuk aplikasi Point of Sale
 */

const express = require('express');
const path = require('path');
const db = require('./db');

// Inisialisasi Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk parsing JSON dan static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi database
db.initializeDatabase();

// ============================================
// CORS Middleware untuk development
// ============================================
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ============================================
// Request Logging Middleware
// ============================================
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// REST API Routes - Products
// ============================================

/**
 * GET /api/products
 * Mengambil semua produk, dengan opsi pencarian barcode
 */
app.get('/api/products', (req, res) => {
    try {
        const { barcode } = req.query;
        
        if (barcode) {
            const product = db.getProductByBarcode(barcode);
            if (product) {
                return res.json({
                    success: true,
                    data: [product],
                    count: 1
                });
            } else {
                return res.json({
                    success: true,
                    data: [],
                    count: 0
                });
            }
        }
        
        const products = db.getAllProducts();
        res.json({
            success: true,
            data: products,
            count: products.length
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data produk',
            error: error.message
        });
    }
});

/**
 * GET /api/products/:id
 * Mengambil produk berdasarkan ID
 */
app.get('/api/products/:id', (req, res) => {
    try {
        const product = db.getProductById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produk tidak ditemukan'
            });
        }
        
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data produk',
            error: error.message
        });
    }
});

/**
 * GET /api/products/barcode/:code
 * Mengambil produk berdasarkan barcode
 */
app.get('/api/products/barcode/:code', (req, res) => {
    try {
        const product = db.getProductByBarcode(req.params.code);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produk tidak ditemukan'
            });
        }
        
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product by barcode:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data produk',
            error: error.message
        });
    }
});

/**
 * POST /api/products
 * Menambah produk baru
 */
app.post('/api/products', (req, res) => {
    try {
        const { name, price, stock, barcode } = req.body;
        
        if (name === undefined || name === null || typeof name !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Input tidak valid'
            });
        }
        
        const trimmedName = name.trim();
        
        if (trimmedName === '') {
            return res.status(400).json({
                success: false,
                message: 'Input tidak valid'
            });
        }
        
        if (trimmedName.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Input tidak valid'
            });
        }
        
        if (price === undefined || price === null) {
            return res.status(400).json({
                success: false,
                message: 'Input tidak valid'
            });
        }
        
        if (typeof price !== 'number' || isNaN(price)) {
            return res.status(400).json({
                success: false,
                message: 'Input tidak valid'
            });
        }
        
        if (price < 0) {
            return res.status(400).json({
                success: false,
                message: 'Input tidak valid'
            });
        }
        
        const allProducts = db.getAllProducts();
        const duplicateName = allProducts.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
        if (duplicateName) {
            return res.status(400).json({
                success: false,
                message: 'Nama produk sudah ada'
            });
        }
        
        const product = db.addProduct({
            name: trimmedName,
            price: parseFloat(price),
            stock: parseInt(stock) || 0,
            barcode: barcode ? barcode.trim() : null
        });
        
        res.status(201).json({
            success: true,
            message: 'Produk berhasil ditambahkan',
            data: product
        });
    } catch (error) {
        console.error('Error adding product:', error);
        
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({
                success: false,
                message: 'Barcode sudah terdaftar'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan produk',
            error: error.message
        });
    }
});

/**
 * PUT /api/products/:id
 * Mengupdate produk
 */
app.put('/api/products/:id', (req, res) => {
    try {
        const { name, price, stock, barcode } = req.body;
        const id = parseInt(req.params.id);
        
        // Cek apakah produk exists
        const existingProduct = db.getProductById(id);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Produk tidak ditemukan'
            });
        }
        
        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (price !== undefined) updates.price = parseFloat(price);
        if (stock !== undefined) updates.stock = parseInt(stock);
        if (barcode !== undefined) updates.barcode = barcode || null;
        
        const updatedProduct = db.updateProduct(id, updates);
        
        res.json({
            success: true,
            message: 'Produk berhasil diupdate',
            data: updatedProduct
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate produk',
            error: error.message
        });
    }
});

/**
 * DELETE /api/products/:id
 * Menghapus produk
 */
app.delete('/api/products/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const deleted = db.deleteProduct(id);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Produk tidak ditemukan'
            });
        }
        
        res.json({
            success: true,
            message: 'Produk berhasil dihapus'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus produk',
            error: error.message
        });
    }
});

// ============================================
// REST API Routes - Transactions
// ============================================

/**
 * POST /api/checkout
 * Memproses checkout transaksi dengan pembayaran
 */
app.post('/api/checkout', (req, res) => {
    try {
        const { items, paid } = req.body;
        
        // Validasi items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Keranjang belanja kosong'
            });
        }
        
        // Hitung total
        let totalAmount = 0;
        const validatedItems = [];
        
        for (const item of items) {
            if (!item.productId || !item.name || !item.price || !item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Data item tidak valid'
                });
            }
            
            const quantity = parseInt(item.quantity);
            const price = parseFloat(item.price);
            
            if (quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Jumlah "${item.name}" harus lebih dari 0`
                });
            }
            
            if (price < 0) {
                return res.status(400).json({
                    success: false,
                    message: `Harga "${item.name}" tidak valid`
                });
            }
            
            validatedItems.push({
                productId: parseInt(item.productId),
                name: item.name,
                price: price,
                quantity: quantity
            });
            
            totalAmount += price * quantity;
        }
        
        // Validasi pembayaran
        if (paid === undefined || paid === null || paid === '') {
            return res.status(400).json({
                success: false,
                message: 'Jumlah uang dibayar wajib diisi'
            });
        }
        
        let paidAmount;
        if (typeof paid === 'string') {
            paidAmount = parseInt(paid.replace(/\./g, ''), 10);
        } else {
            paidAmount = parseInt(paid, 10);
        }
        
        if (isNaN(paidAmount) || paidAmount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah uang dibayar tidak valid'
            });
        }
        
        if (paidAmount < totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Uang dibayar kurang dari total belanja'
            });
        }
        
        // Hitung kembalian
        const changeAmount = paidAmount - totalAmount;
        
        // Simpan transaksi
        let transaction;
        try {
            transaction = db.saveTransaction(validatedItems, totalAmount, paidAmount, changeAmount);
        } catch (dbError) {
            console.error('Database error during save:', dbError);
            return res.status(400).json({
                success: false,
                message: dbError.message
            });
        }
        
        res.status(201).json({
            success: true,
            message: 'Checkout berhasil!',
            data: {
                transaction_id: transaction.id,
                total_amount: totalAmount,
                paid: paidAmount,
                change_amount: changeAmount,
                items_count: validatedItems.length,
                created_at: transaction.created_at
            }
        });
    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memproses checkout'
        });
    }
});

/**
 * GET /api/transactions
 * Mengambil semua riwayat transaksi
 */
app.get('/api/transactions', (req, res) => {
    try {
        const transactions = db.getAllTransactions();
        res.json({
            success: true,
            data: transactions,
            count: transactions.length
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil riwayat transaksi',
            error: error.message
        });
    }
});

/**
 * GET /api/transactions/:id
 * Mengambil detail transaksi
 */
app.get('/api/transactions/:id', (req, res) => {
    try {
        const transaction = db.getTransactionById(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaksi tidak ditemukan'
            });
        }
        
        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail transaksi',
            error: error.message
        });
    }
});

// ============================================
// Error Handling Middleware
// ============================================
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    // Jika request bukan untuk API, serve index.html (SPA support)
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({
            success: false,
            message: 'Endpoint tidak ditemukan'
        });
    }
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log('===========================================');
    console.log('  POS Kasir Server Running');
    console.log('===========================================');
    console.log(`  Port: ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log('===========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    db.db.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    db.db.close();
    process.exit(0);
});

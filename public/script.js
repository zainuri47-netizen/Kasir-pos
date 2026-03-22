/**
 * POS Kasir - Frontend Application
 * Vanilla JavaScript untuk aplikasi Point of Sale
 * Dengan fitur QR Code Scanner dan UI Modern
 */

// ============================================
// State Management
// ============================================
const state = {
    products: [],
    cart: [],
    isLoading: false,
    searchQuery: '',
    currentPage: 'kasir',
    qrScanner: null,
    qrScannerProduct: null,
    isScanning: false,
    isScanningProduct: false,
    scannedProductData: null,
    lastScannedCode: null,
    lastScanTime: 0,
    scanLocked: false,
    scanCooldownTimeout: null,
    lastNotifiedCode: null,
    notificationTimeout: null
};

// ============================================
// DOM Elements
// ============================================
const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    pages: document.querySelectorAll('.page'),
    themeToggle: document.getElementById('themeToggle'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),

    // Products (Kasir)
    productsList: document.getElementById('productsList'),
    searchInput: document.getElementById('searchInput'),
    scanQRBtn: document.getElementById('scanQRBtn'),

    // Products (Produk Page)
    productsListFull: document.getElementById('productsListFull'),
    addProductForm: document.getElementById('addProductForm'),
    productName: document.getElementById('productName'),
    productPrice: document.getElementById('productPrice'),
    productStock: document.getElementById('productStock'),
    productBarcode: document.getElementById('productBarcode'),

    // Cart
    cartItems: document.getElementById('cartItems'),
    cartCount: document.getElementById('cartCount'),
    subtotalAmount: document.getElementById('subtotalAmount'),
    totalAmount: document.getElementById('totalAmount'),
    clearCartBtn: document.getElementById('clearCartBtn'),
    checkoutBtn: document.getElementById('checkoutBtn'),

    // QR Scanner (Kasir)
    qrScannerModal: document.getElementById('qrScannerModal'),
    closeQRScannerModal: document.getElementById('closeQRScannerModal'),
    stopScanBtn: document.getElementById('stopScanBtn'),

    // QR Scanner (Produk)
    qrScannerProductModal: document.getElementById('qrScannerProductModal'),
    closeQRScannerProductModal: document.getElementById('closeQRScannerProductModal'),
    stopScanProductBtn: document.getElementById('stopScanProductBtn'),
    scanQRProductBtn: document.getElementById('scanQRProductBtn'),
    qrReaderProduct: document.getElementById('qr-reader-product'),
    scanPreview: document.getElementById('scan-preview'),
    previewName: document.getElementById('previewName'),
    previewPrice: document.getElementById('previewPrice'),
    confirmScanBtn: document.getElementById('confirmScanBtn'),

    // QR Code Display
    qrCodeModal: document.getElementById('qrCodeModal'),
    closeQRCodeModal: document.getElementById('closeQRCodeModal'),
    closeQRCodeBtn: document.getElementById('closeQRCodeBtn'),
    downloadQRBtn: document.getElementById('downloadQRBtn'),
    qrCodeDisplay: document.getElementById('qr-code-display'),
    qrProductName: document.getElementById('qrProductName'),
    qrProductPrice: document.getElementById('qrProductPrice'),

    // Payment Modal
    paymentModal: document.getElementById('paymentModal'),
    paymentTotal: document.getElementById('paymentTotal'),
    paidInput: document.getElementById('paidInput'),
    paymentChange: document.getElementById('paymentChange'),
    quickAmountBtns: document.querySelectorAll('.quick-amount-btn'),
    confirmPaymentBtn: document.getElementById('confirmPaymentBtn'),
    cancelPaymentBtn: document.getElementById('cancelPaymentBtn'),
    closePaymentModal: document.getElementById('closePaymentModal'),

    // Receipt Modal
    receiptModal: document.getElementById('receiptModal'),
    receiptContent: document.getElementById('receiptContent'),
    printReceiptBtn: document.getElementById('printReceiptBtn'),
    closeReceiptBtn: document.getElementById('closeReceiptBtn'),
    closeReceiptModal: document.getElementById('closeReceiptModal'),

    // History
    historyList: document.getElementById('historyList'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ============================================
// Audio Context for Beep Sound
// ============================================
let audioContext = null;

function playBeepSound() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 1200;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// ============================================
// API Functions
// ============================================
const api = {
    baseUrl: '/api',
    
    async getProducts() {
        const response = await fetch(`${this.baseUrl}/products`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data.data;
    },
    
    async getProductByBarcode(barcode) {
        const response = await fetch(`${this.baseUrl}/products/barcode/${encodeURIComponent(barcode)}`);
        const data = await response.json();
        if (!response.ok) return null;
        return data.data;
    },
    
    async addProduct(product) {
        const response = await fetch(`${this.baseUrl}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data.data;
    },
    
    async deleteProduct(id) {
        const response = await fetch(`${this.baseUrl}/products/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    },
    
    async checkout(items, paid) {
        const response = await fetch(`${this.baseUrl}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, paid })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data.data;
    },
    
    async getTransactions() {
        const response = await fetch(`${this.baseUrl}/transactions`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data.data;
    }
};

// ============================================
// Utility Functions
// ============================================
function formatRupiah(number) {
    if (isNaN(number) || number === null || number === undefined) return '0';
    return Math.floor(number).toLocaleString('id-ID');
}

function formatCurrency(amount) {
    return 'Rp ' + formatRupiah(amount);
}

function parseRupiah(str) {
    if (!str || typeof str !== 'string') return 0;
    const cleaned = str.replace(/\./g, '').replace(/[^0-9]/g, '');
    if (cleaned === '') return 0;
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
}

function parseCurrency(str) {
    return parseRupiah(str);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// Product Validation Functions
// ============================================

function validateProduct(name, price) {
    const errors = {
        name: '',
        price: ''
    };
    let isValid = true;

    const trimmedName = name ? name.trim() : '';
    const trimmedPrice = price ? price.trim() : '';

    if (!trimmedName) {
        errors.name = 'Nama produk tidak boleh kosong';
        isValid = false;
    } else if (trimmedName.length < 2) {
        errors.name = 'Nama produk minimal 2 karakter';
        isValid = false;
    } else if (/^\s+$/.test(trimmedName)) {
        errors.name = 'Nama produk tidak boleh hanya spasi';
        isValid = false;
    }

    const priceNum = parseFloat(trimmedPrice.replace(/\./g, '').replace(/,/g, ''));
    if (!trimmedPrice) {
        errors.price = 'Harga tidak boleh kosong';
        isValid = false;
    } else if (isNaN(priceNum)) {
        errors.price = 'Harga harus berupa angka';
        isValid = false;
    } else if (priceNum <= 0) {
        errors.price = 'Harga harus lebih dari 0';
        isValid = false;
    } else if (priceNum < 0) {
        errors.price = 'Harga tidak boleh negatif';
        isValid = false;
    }

    return { isValid, errors };
}

function checkDuplicateName(name) {
    const trimmedName = name.trim().toLowerCase();
    const exists = state.products.some(p => p.name.toLowerCase() === trimmedName);
    return exists;
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
    const inputId = elementId.replace('Error', '');
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
        inputElement.classList.add('input-error');
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
    }
    const inputId = elementId.replace('Error', '');
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
        inputElement.classList.remove('input-error');
    }
}

function clearAllErrors() {
    clearError('productNameError');
    clearError('productPriceError');
}

function updateSubmitButton(isValid) {
    const submitBtn = document.getElementById('submitProductBtn');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
    }
}

function validateAndUpdateUI() {
    const name = elements.productName ? elements.productName.value : '';
    const price = elements.productPrice ? elements.productPrice.value : '';

    const { isValid, errors } = validateProduct(name, price);

    if (errors.name) {
        showError('productNameError', errors.name);
    } else {
        clearError('productNameError');
    }

    if (errors.price) {
        showError('productPriceError', errors.price);
    } else {
        clearError('productPriceError');
    }

    updateSubmitButton(isValid);
    return isValid;
}

function formatPriceInput(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        value = parseInt(value, 10).toLocaleString('id-ID');
    }
    input.value = value;
}

// ============================================
// Navigation System
// ============================================
function initNavigation() {
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(pageName) {
    if (state.currentPage === pageName) return;
    
    state.currentPage = pageName;
    
    elements.navItems.forEach(item => {
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    elements.pages.forEach(page => {
        const pageId = page.id.replace('page-', '');
        if (pageId === pageName) {
            page.classList.add('active');
            page.classList.add('fade-in');
        } else {
            page.classList.remove('active');
            page.classList.remove('fade-in');
        }
    });
    
    if (pageName === 'riwayat') {
        loadHistory();
    } else if (pageName === 'produk') {
        loadProductsToFullList();
    }
}

// ============================================
// Toast Notification System
// ============================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconPaths = {
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
        error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>'
    };
    
    toast.innerHTML = `
        <svg class="toast-icon ${type}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${iconPaths[type]}
        </svg>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// Theme Management - Dark Mode Default
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        elements.sunIcon.style.display = 'none';
        elements.moonIcon.style.display = 'block';
    } else {
        elements.sunIcon.style.display = 'block';
        elements.moonIcon.style.display = 'none';
    }
}

// ============================================
// Products Management
// ============================================
async function loadProducts() {
    try {
        state.isLoading = true;
        renderProductsLoading();
        
        state.products = await api.getProducts();
        renderProducts();
    } catch (error) {
        showToast('Gagal memuat produk: ' + error.message, 'error');
        renderProductsError('Gagal memuat produk');
    } finally {
        state.isLoading = false;
    }
}

async function loadProductsToFullList() {
    try {
        state.isLoading = true;
        renderProductsFullLoading();
        
        state.products = await api.getProducts();
        renderProductsFull();
    } catch (error) {
        showToast('Gagal memuat produk: ' + error.message, 'error');
        renderProductsFullError('Gagal memuat produk');
    } finally {
        state.isLoading = false;
    }
}

function renderProductsLoading() {
    elements.productsList.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Memuat produk...</p>
        </div>
    `;
}

function renderProductsError(message) {
    elements.productsList.innerHTML = `
        <div class="loading">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>${message}</p>
        </div>
    `;
}

function renderProducts() {
    const filteredProducts = state.products.filter(product => {
        if (!state.searchQuery) return true;
        const query = state.searchQuery.toLowerCase();
        return product.name.toLowerCase().includes(query) ||
               (product.barcode && product.barcode.toLowerCase().includes(query));
    });
    
    if (filteredProducts.length === 0) {
        elements.productsList.innerHTML = `
            <div class="loading">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p>${state.searchQuery ? 'Produk tidak ditemukan' : 'Belum ada produk'}</p>
            </div>
        `;
        return;
    }
    
    elements.productsList.innerHTML = filteredProducts.map(product => {
        const isOutOfStock = product.stock <= 0;
        const isLowStock = product.stock > 0 && product.stock <= 5;
        
        let stockClass = '';
        if (isOutOfStock) stockClass = 'out';
        else if (isLowStock) stockClass = 'low';
        
        return `
            <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-id="${product.id}" onclick="addToCart(${product.id})">
                <div class="product-name" title="${product.name}">${product.name}</div>
                <div class="product-price">${formatCurrency(product.price)}</div>
                <div class="product-stock ${stockClass}">
                    ${isOutOfStock ? 'Stok habis' : `Stok: ${product.stock}`}
                </div>
                <button class="btn-add-product" onclick="event.stopPropagation(); addToCart(${product.id})" ${isOutOfStock ? 'disabled' : ''}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Tambah
                </button>
            </div>
        `;
    }).join('');
}

function renderProductsFullLoading() {
    elements.productsListFull.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Memuat produk...</p>
        </div>
    `;
}

function renderProductsFullError(message) {
    elements.productsListFull.innerHTML = `
        <div class="loading">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>${message}</p>
        </div>
    `;
}

function renderProductsFull() {
    if (state.products.length === 0) {
        elements.productsListFull.innerHTML = `
            <div class="empty-list">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <p>Belum ada produk</p>
                <span>Tambahkan produk menggunakan form di atas</span>
            </div>
        `;
        return;
    }
    
    elements.productsListFull.innerHTML = `
        <table class="products-table">
            <thead>
                <tr>
                    <th>Nama Produk</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Barcode</th>
                    <th>QR</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                ${state.products.map(product => {
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock > 0 && product.stock <= 5;
                    
                    let stockClass = '';
                    if (isOutOfStock) stockClass = 'out';
                    else if (isLowStock) stockClass = 'low';
                    
                    return `
                        <tr class="${isOutOfStock ? 'out-of-stock-row' : ''}">
                            <td class="product-name-cell">${product.name}</td>
                            <td class="product-price-cell">${formatCurrency(product.price)}</td>
                            <td class="product-stock-cell ${stockClass}">
                                ${isOutOfStock ? 'Habis' : product.stock}
                            </td>
                            <td class="product-barcode-cell">${product.barcode || '-'}</td>
                            <td class="product-qr-cell">
                                <button class="btn btn-sm btn-qr-cell" onclick="showProductQRCode(${JSON.stringify(product).replace(/"/g, '&quot;')})" title="Generate QR Code">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="3" width="7" height="7"></rect>
                                        <rect x="3" y="14" width="7" height="7"></rect>
                                        <rect x="14" y="14" width="3" height="3"></rect>
                                        <rect x="18" y="14" width="3" height="3"></rect>
                                        <rect x="14" y="18" width="3" height="3"></rect>
                                        <rect x="18" y="18" width="3" height="3"></rect>
                                    </svg>
                                </button>
                            </td>
                            <td class="product-actions-cell">
                                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})" title="Hapus produk">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function addProduct(product) {
    try {
        const submitBtn = document.getElementById('submitProductBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
            Menambah...
        `;
        
        const newProduct = await api.addProduct(product);
        state.products.unshift(newProduct);
        renderProductsFull();
        
        if (state.currentPage === 'kasir') {
            renderProducts();
        }
        
        showToast(`Produk "${newProduct.name}" berhasil ditambahkan`, 'success');
        elements.addProductForm.reset();
        clearAllErrors();
        updateSubmitButton(false);
        
        submitBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Tambah Produk
        `;
        
        elements.productName.focus();
    } catch (error) {
        showToast(error.message, 'error');
        const submitBtn = document.getElementById('submitProductBtn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Tambah Produk
        `;
    }
}

async function deleteProduct(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    
    try {
        await api.deleteProduct(id);
        state.products = state.products.filter(p => p.id !== id);
        renderProductsFull();
        renderProducts();
        showToast('Produk berhasil dihapus', 'success');
        
        const cartItem = state.cart.find(item => item.productId === id);
        if (cartItem) {
            state.cart = state.cart.filter(item => item.productId !== id);
            renderCart();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// Cart Management
// ============================================
function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        showToast('Produk tidak tersedia', 'warning');
        return;
    }
    
    const existingItem = state.cart.find(item => item.productId === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showToast('Stok tidak mencukupi', 'warning');
            return;
        }
        existingItem.quantity++;
    } else {
        state.cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
        });
    }
    
    renderCart();
    showToast(`${product.name} ditambahkan ke keranjang`, 'success');
    highlightProductCard(productId);
}

function highlightProductCard(productId) {
    setTimeout(() => {
        const card = document.querySelector(`.product-card[data-id="${productId}"]`);
        if (card) {
            card.classList.add('highlight');
            setTimeout(() => {
                card.classList.remove('highlight');
            }, 800);
        }
    }, 100);
}

function updateCartQuantity(productId, change) {
    const item = state.cart.find(item => item.productId === productId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > item.maxStock) {
        showToast('Stok tidak mencukupi', 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    renderCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.productId !== productId);
    renderCart();
}

function clearCart() {
    if (state.cart.length === 0) return;
    if (!confirm('Hapus semua item dari keranjang?')) return;
    
    state.cart = [];
    renderCart();
    showToast('Keranjang dikosongkan', 'success');
}

function renderCart() {
    if (state.cart.length === 0) {
        elements.cartItems.innerHTML = `
            <div class="empty-cart">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <p>Keranjang kosong</p>
                <span>Scan QR atau klik produk untuk memulai</span>
            </div>
        `;
    } else {
        elements.cartItems.innerHTML = state.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-total">${formatCurrency(item.price * item.quantity)}</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.productId}, -1)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.productId}, 1)" ${item.quantity >= item.maxStock ? 'disabled' : ''}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.productId})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    updateCartSummary();
    updateCartButtons();
}

function updateCartSummary() {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    elements.cartCount.textContent = `${totalItems} item`;
    elements.subtotalAmount.textContent = formatCurrency(subtotal);
    elements.totalAmount.textContent = formatCurrency(subtotal);
}

function updateCartButtons() {
    const hasItems = state.cart.length > 0;
    elements.clearCartBtn.disabled = !hasItems;
    elements.checkoutBtn.disabled = !hasItems;
}

// ============================================
// QR Code Scanner
// ============================================
function initQRScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        console.error('html5-qrcode library not loaded');
        return;
    }
    
    state.qrScanner = new Html5Qrcode('qr-reader');
}

async function startScanner() {
    try {
        initQRScanner();
        
        const cameras = await Html5Qrcode.getCameras();
        
        if (!cameras || cameras.length === 0) {
            showToast('Kamera tidak ditemukan', 'error');
            return;
        }
        
        let cameraId = cameras[0].id;
        const backCamera = cameras.find(c => 
            c.label.toLowerCase().includes('back') || 
            c.label.toLowerCase().includes('rear')
        );
        if (backCamera) {
            cameraId = backCamera.id;
        }
        
        state.lastScannedCode = null;
        state.lastScanTime = 0;
        state.scanLocked = false;
        state.lastNotifiedCode = null;
        
        openQRScannerModal();
        updateScannerStatus('scanning');
        elements.stopScanBtn.disabled = false;
        state.isScanning = true;
        
        await state.qrScanner.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            onScanSuccess,
            onScanFailure
        );
        
    } catch (err) {
        console.error('Error starting scanner:', err);
        showToast('Gagal mengakses kamera: ' + err.message, 'error');
        closeQRScannerModal();
    }
}

async function stopScanner() {
    try {
        if (state.qrScanner && state.isScanning) {
            await state.qrScanner.stop();
        }
        
        if (state.scanCooldownTimeout) {
            clearTimeout(state.scanCooldownTimeout);
            state.scanCooldownTimeout = null;
        }
        
        state.isScanning = false;
        state.scanLocked = false;
        elements.stopScanBtn.disabled = true;
        updateScannerStatus('stopped');
    } catch (err) {
        console.error('Error stopping scanner:', err);
    }
}

function onScanSuccess(decodedText) {
    if (state.scanLocked) {
        return;
    }
    
    const now = Date.now();
    if (state.lastScannedCode === decodedText && state.lastScanTime && (now - state.lastScanTime) < 2000) {
        return;
    }
    
    state.scanLocked = true;
    state.lastScannedCode = decodedText;
    state.lastScanTime = now;
    
    playBeepSound();
    triggerVibration();
    showScanSuccessFeedback();
    
    const product = findProductByQRCode(decodedText);
    
    if (product) {
        addToCart(product.id);
        showToast(`Produk ditemukan: ${product.name}`, 'success');
    } else {
        showLimitedNotification(decodedText);
    }
    
    state.scanCooldownTimeout = setTimeout(() => {
        state.scanLocked = false;
        updateScannerStatus('scanning');
    }, 1500);
}

function showLimitedNotification(code) {
    if (state.lastNotifiedCode === code) {
        return;
    }
    
    state.lastNotifiedCode = code;
    
    if (code.length >= 8 && /^\d+$/.test(code)) {
        showToast(`Barcode "${code}" tidak terdaftar di database`, 'warning');
    } else {
        showToast(`QR/Barcode tidak dikenali: "${code}"`, 'warning');
    }
}

function showScanSuccessFeedback() {
    const qrReader = document.getElementById('qr-reader');
    if (qrReader) {
        qrReader.classList.add('scan-success-flash');
        setTimeout(() => {
            qrReader.classList.remove('scan-success-flash');
        }, 500);
    }
    
    updateScannerStatus('success');
}

function updateScannerStatus(status) {
    const statusEl = document.getElementById('qr-reader-status');
    if (!statusEl) return;
    
    const statusText = statusEl.querySelector('p');
    if (!statusText) return;
    
    switch (status) {
        case 'scanning':
            statusText.textContent = 'Arahkan QR/Barcode ke kamera';
            statusEl.className = 'qr-reader-status';
            break;
        case 'success':
            statusText.textContent = 'Scan berhasil!';
            statusEl.className = 'qr-reader-status status-success';
            break;
        case 'cooldown':
            statusText.textContent = 'Tunggu sebentar...';
            statusEl.className = 'qr-reader-status status-cooldown';
            break;
        case 'stopped':
            statusText.textContent = 'Scanner berhenti';
            statusEl.className = 'qr-reader-status';
            break;
    }
}

function triggerVibration() {
    if ('vibrate' in navigator) {
        navigator.vibrate(100);
    }
}

function onScanFailure(error) {
    // Silent failure - scan terus berjalan
}

function findProductByQRCode(qrData) {
    const trimmedData = qrData.trim();
    
    if (trimmedData.length >= 8 && /^\d+$/.test(trimmedData)) {
        const byBarcode = state.products.find(p => 
            p.barcode && p.barcode === trimmedData
        );
        if (byBarcode) return byBarcode;
    }
    
    if (trimmedData.startsWith('{')) {
        try {
            const jsonData = JSON.parse(trimmedData);
            if (jsonData.id) {
                const byId = state.products.find(p => p.id === parseInt(jsonData.id));
                if (byId) return byId;
            }
        } catch (e) {}
    }
    
    const byId = state.products.find(p => p.id === parseInt(trimmedData));
    if (byId) return byId;
    
    const byName = state.products.find(p => 
        p.name.toLowerCase().includes(trimmedData.toLowerCase())
    );
    if (byName) return byName;
    
    return null;
}

function openQRScannerModal() {
    elements.qrScannerModal.classList.add('active');
}

function closeQRScannerModal() {
    stopScanner();
    state.lastScannedCode = null;
    state.lastScanTime = 0;
    state.lastNotifiedCode = null;
    const rescanBtn = document.getElementById('rescanBtn');
    if (rescanBtn) rescanBtn.style.display = 'none';
    elements.qrScannerModal.classList.remove('active');
}

// ============================================
// QR Code Scanner for Product Form
// ============================================
function parseQRCodeData(data) {
    const trimmedData = data.trim();
    
    if (!trimmedData) {
        return null;
    }
    
    if (trimmedData.length >= 8 && /^\d+$/.test(trimmedData)) {
        return { type: 'barcode', value: trimmedData };
    }
    
    if (trimmedData.startsWith('{')) {
        try {
            const jsonData = JSON.parse(trimmedData);
            if (jsonData.name && jsonData.price !== undefined) {
                return {
                    type: 'json',
                    name: String(jsonData.name).trim(),
                    price: parseFloat(jsonData.price)
                };
            }
        } catch (e) {}
    }
    
    if (trimmedData.includes('|')) {
        const parts = trimmedData.split('|');
        if (parts.length >= 2) {
            const name = parts[0].trim();
            const price = parseFloat(parts[1].trim());
            if (name && !isNaN(price)) {
                return { type: 'pipe', name, price };
            }
        }
    }
    
    return null;
}

function initQRScannerProduct() {
    if (typeof Html5Qrcode === 'undefined') {
        console.error('html5-qrcode library not loaded');
        return;
    }
    
    if (!state.qrScannerProduct) {
        state.qrScannerProduct = new Html5Qrcode('qr-reader-product');
    }
}

async function startScannerProduct() {
    try {
        initQRScannerProduct();
        
        const cameras = await Html5Qrcode.getCameras();
        
        if (!cameras || cameras.length === 0) {
            showToast('Kamera tidak ditemukan', 'error');
            return;
        }
        
        let cameraId = cameras[0].id;
        const backCamera = cameras.find(c => 
            c.label.toLowerCase().includes('back') || 
            c.label.toLowerCase().includes('rear')
        );
        if (backCamera) {
            cameraId = backCamera.id;
        }
        
        elements.qrReaderProduct.style.display = 'block';
        elements.scanPreview.style.display = 'none';
        elements.stopScanProductBtn.disabled = false;
        state.isScanningProduct = true;
        state.scannedProductData = null;
        
        openQRScannerProductModal();
        
        await state.qrScannerProduct.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            onScanSuccessProduct,
            onScanFailure
        );
        
    } catch (err) {
        console.error('Error starting product scanner:', err);
        showToast('Gagal mengakses kamera: ' + err.message, 'error');
        closeQRScannerProductModal();
    }
}

let productScanLocked = false;
let productLastScannedCode = null;

async function stopScannerProduct() {
    try {
        if (state.qrScannerProduct && state.isScanningProduct) {
            await state.qrScannerProduct.stop();
        }
        state.isScanningProduct = false;
        productScanLocked = false;
        elements.stopScanProductBtn.disabled = true;
    } catch (err) {
        console.error('Error stopping product scanner:', err);
    }
}

async function onScanSuccessProduct(decodedText) {
    if (productScanLocked) {
        return;
    }
    
    if (productLastScannedCode === decodedText) {
        return;
    }
    
    productScanLocked = true;
    productLastScannedCode = decodedText;
    
    playBeepSound();
    triggerVibration();
    
    const productData = parseQRCodeData(decodedText);
    
    if (productData) {
        if (productData.type === 'barcode') {
            const product = await api.getProductByBarcode(productData.value);
            
            if (product) {
                state.scannedProductData = { type: 'barcode', product };
                
                elements.qrReaderProduct.style.display = 'none';
                elements.scanPreview.style.display = 'block';
                elements.previewName.textContent = product.name;
                elements.previewPrice.textContent = formatCurrency(product.price);
                
                showToast('Produk ditemukan: ' + product.name, 'success');
            } else {
                showToast('Barcode "' + productData.value + '" tidak ditemukan. Silakan isi manual.', 'warning');
                state.scannedProductData = { type: 'barcode_not_found', value: productData.value };
                
                elements.qrReaderProduct.style.display = 'none';
                elements.scanPreview.style.display = 'block';
                elements.previewName.textContent = 'Barcode: ' + productData.value;
                elements.previewPrice.textContent = 'Produk tidak ditemukan';
            }
        } else {
            state.scannedProductData = productData;
            
            elements.qrReaderProduct.style.display = 'none';
            elements.scanPreview.style.display = 'block';
            elements.previewName.textContent = productData.name;
            elements.previewPrice.textContent = formatCurrency(productData.price);
            
            showToast('QR Code terdeteksi!', 'success');
        }
        
        stopScannerProduct();
    } else {
        showToast('QR/Barcode tidak dikenali. Gunakan format JSON atau "Nama|Harga"', 'error');
        
        setTimeout(() => {
            productScanLocked = false;
        }, 2000);
    }
}

function confirmScanData() {
    if (state.scannedProductData) {
        if (state.scannedProductData.type === 'barcode') {
            const product = state.scannedProductData.product;
            elements.productName.value = product.name;
            elements.productPrice.value = product.price;
            elements.productBarcode.value = product.barcode || '';
        } else if (state.scannedProductData.type === 'barcode_not_found') {
            elements.productBarcode.value = state.scannedProductData.value;
        } else {
            elements.productName.value = state.scannedProductData.name;
            elements.productPrice.value = state.scannedProductData.price;
        }
        
        elements.productName.classList.add('scan-success');
        elements.productPrice.classList.add('scan-success');
        setTimeout(() => {
            elements.productName.classList.remove('scan-success');
            elements.productPrice.classList.remove('scan-success');
        }, 1500);
        
        if (state.scannedProductData.type === 'barcode_not_found') {
            showToast('Barcode terisi. Silakan lengkapi data produk.', 'warning');
        } else {
            showToast('Form terisi otomatis!', 'success');
        }
        closeQRScannerProductModal();
        
        elements.productName.focus();
    }
}

function openQRScannerProductModal() {
    elements.qrScannerProductModal.classList.add('active');
}

function closeQRScannerProductModal() {
    stopScannerProduct();
    productLastScannedCode = null;
    elements.qrScannerProductModal.classList.remove('active');
    elements.qrReaderProduct.style.display = 'block';
    elements.scanPreview.style.display = 'none';
    state.scannedProductData = null;
}

// ============================================
// QR Code Generation
// ============================================
function generateQRCodeData(product) {
    return JSON.stringify({
        name: product.name,
        price: product.price
    });
}

let currentQRProduct = null;

function showProductQRCode(product) {
    currentQRProduct = product;
    
    elements.qrProductName.textContent = product.name;
    elements.qrProductPrice.textContent = formatCurrency(product.price);
    
    const qrData = generateQRCodeData(product);
    elements.qrCodeDisplay.innerHTML = '';
    
    const qr = new QRCode(elements.qrCodeDisplay, {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
    
    elements.qrCodeModal.classList.add('active');
}

function closeQRCodeModal() {
    elements.qrCodeModal.classList.remove('active');
    currentQRProduct = null;
}

function downloadQRCode() {
    if (!currentQRProduct) return;
    
    const canvas = elements.qrCodeDisplay.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `QR_${currentQRProduct.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('QR Code berhasil diunduh!', 'success');
    }
}

// ============================================
// Checkout
// ============================================
let currentTotal = 0;

async function processCheckout() {
    if (state.cart.length === 0) {
        showToast('Keranjang kosong', 'warning');
        return;
    }
    
    currentTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    elements.paymentTotal.textContent = formatCurrency(currentTotal);
    elements.paidInput.value = '';
    elements.paymentChange.textContent = formatCurrency(0);
    elements.confirmPaymentBtn.disabled = true;
    
    openPaymentModal();
}

function openPaymentModal() {
    elements.paymentModal.classList.add('active');
    setTimeout(() => elements.paidInput.focus(), 100);
}

function closePaymentModal() {
    elements.paymentModal.classList.remove('active');
}

function calculateChange() {
    const paidValue = parseCurrency(elements.paidInput.value);
    const change = paidValue - currentTotal;
    
    if (paidValue > 0) {
        elements.paymentChange.textContent = formatCurrency(Math.max(0, change));
        elements.confirmPaymentBtn.disabled = paidValue < currentTotal;
        
        if (paidValue < currentTotal) {
            elements.paymentChange.parentElement.classList.add('insufficient');
        } else {
            elements.paymentChange.parentElement.classList.remove('insufficient');
        }
    } else {
        elements.paymentChange.textContent = formatCurrency(0);
        elements.confirmPaymentBtn.disabled = true;
        elements.paymentChange.parentElement.classList.remove('insufficient');
    }
}

async function confirmPayment() {
    const paidAmount = parseCurrency(elements.paidInput.value);
    
    if (paidAmount < currentTotal) {
        showToast('Uang dibayar kurang dari total belanja', 'error');
        return;
    }
    
    try {
        elements.confirmPaymentBtn.disabled = true;
        elements.confirmPaymentBtn.innerHTML = `
            <div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
            Memproses...
        `;
        
        const items = state.cart.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));
        
        const result = await api.checkout(items, paidAmount);
        
        closePaymentModal();
        
        playBeepSound();
        setTimeout(() => playBeepSound(), 200);
        
        showToast(`Transaksi berhasil! Kembalian: ${formatCurrency(result.change_amount)}`, 'success');
        
        generateReceipt(result, items);
        openReceiptModal();
        
        state.cart = [];
        renderCart();
        
        await loadProducts();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        elements.confirmPaymentBtn.disabled = false;
        elements.confirmPaymentBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Bayar
        `;
    }
}

// ============================================
// Receipt Generation
// ============================================
function generateReceipt(transaction, items) {
    const date = new Date(transaction.created_at);
    const formattedDate = date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const itemsHtml = items.map(item => `
        <div class="receipt-item">
            <div class="receipt-item-left">
                <span class="receipt-item-name">${item.name}</span>
                <span class="receipt-item-qty">${item.quantity} x ${formatCurrency(item.price)}</span>
            </div>
            <span class="receipt-item-price">${formatCurrency(item.price * item.quantity)}</span>
        </div>
    `).join('');
    
    elements.receiptContent.innerHTML = `
        <div class="receipt" id="receiptPrint">
            <div class="receipt-header">
                <div class="receipt-title">TOKO KASIR POS</div>
                <div class="receipt-info">${formattedDate} ${formattedTime}</div>
                <div class="receipt-info">No: #${String(transaction.transaction_id).padStart(6, '0')}</div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-items">
                ${itemsHtml}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-summary">
                <div class="receipt-row">
                    <span>Total</span>
                    <span>${formatCurrency(transaction.total_amount)}</span>
                </div>
                <div class="receipt-row">
                    <span>Tunai</span>
                    <span>${formatCurrency(transaction.paid)}</span>
                </div>
                <div class="receipt-row receipt-change">
                    <span>Kembalian</span>
                    <span>${formatCurrency(transaction.change_amount)}</span>
                </div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-footer">
                <p>Terima kasih atas kunjungan Anda!</p>
            </div>
        </div>
    `;
}

function openReceiptModal() {
    elements.receiptModal.classList.add('active');
}

function closeReceiptModal() {
    elements.receiptModal.classList.remove('active');
}

function printReceipt() {
    const printContent = document.getElementById('receiptPrint').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk Pembayaran</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
                .receipt { max-width: 300px; margin: 0 auto; }
                .receipt-header { text-align: center; margin-bottom: 10px; }
                .receipt-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
                .receipt-info { font-size: 10px; color: #666; }
                .receipt-divider { border-top: 1px dashed #000; margin: 10px 0; }
                .receipt-item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .receipt-item-left { display: flex; flex-direction: column; }
                .receipt-item-name { font-weight: bold; }
                .receipt-item-qty { font-size: 10px; color: #666; }
                .receipt-summary { margin-top: 10px; }
                .receipt-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                .receipt-change { font-weight: bold; font-size: 14px; }
                .receipt-footer { text-align: center; margin-top: 15px; font-size: 10px; }
                .receipt-footer p { margin-bottom: 3px; }
                @media print {
                    body { padding: 0; }
                    .receipt { max-width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="receipt">${printContent}</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ============================================
// History
// ============================================
async function loadHistory() {
    try {
        elements.historyList.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Memuat riwayat...</p>
            </div>
        `;
        
        const transactions = await api.getTransactions();
        
        if (transactions.length === 0) {
            elements.historyList.innerHTML = `
                <div class="empty-history">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p>Belum ada riwayat transaksi</p>
                    <span>Mulai transaksi di halaman Kasir</span>
                </div>
            `;
            return;
        }
        
        elements.historyList.innerHTML = transactions.map(t => {
            const date = new Date(t.created_at);
            const formattedDate = date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const itemsList = t.items.map(item => `
                <div class="history-item-row">
                    <span>${item.quantity}x ${item.product_name}</span>
                    <span>${formatCurrency(item.subtotal)}</span>
                </div>
            `).join('');
            
            const paid = t.paid || 0;
            const change = t.change_amount || 0;
            
            return `
                <div class="history-item">
                    <div class="history-header">
                        <div>
                            <div class="history-id">Transaksi #${t.id}</div>
                            <div class="history-date">${formattedDate}</div>
                        </div>
                        <div class="history-total">${formatCurrency(t.total_amount)}</div>
                    </div>
                    <div class="history-items">
                        ${itemsList}
                    </div>
                    <div class="history-payment-info">
                        <div class="history-payment-row">
                            <span>Uang Dibayar:</span>
                            <span>${formatCurrency(paid)}</span>
                        </div>
                        <div class="history-payment-row">
                            <span>Kembalian:</span>
                            <span>${formatCurrency(change)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        elements.historyList.innerHTML = `
            <div class="empty-history">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <p>Gagal memuat riwayat</p>
                <span>${error.message}</span>
            </div>
        `;
    }
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    elements.searchInput.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value.trim();
        renderProducts();
    }, 300));
    
    elements.addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = elements.productName.value.trim();
        const priceValue = elements.productPrice.value.trim();
        
        const { isValid, errors } = validateProduct(name, priceValue);
        
        if (!isValid) {
            if (errors.name) {
                showError('productNameError', errors.name);
                elements.productName.focus();
            }
            if (errors.price) {
                showError('productPriceError', errors.price);
                if (!errors.name) elements.productPrice.focus();
            }
            return;
        }
        
        if (checkDuplicateName(name)) {
            showError('productNameError', 'Nama produk sudah ada');
            elements.productName.focus();
            return;
        }
        
        const priceNum = parseFloat(priceValue.replace(/\./g, '').replace(/,/g, ''));
        
        const product = {
            name: name,
            price: priceNum,
            stock: parseInt(elements.productStock.value) || 0,
            barcode: elements.productBarcode.value.trim() || null
        };
        
        addProduct(product);
    });
    
    elements.productName.addEventListener('input', debounce(() => {
        validateAndUpdateUI();
    }, 300));
    
    elements.productPrice.addEventListener('input', () => {
        formatPriceInput(elements.productPrice);
        validateAndUpdateUI();
    });
    
    elements.productName.addEventListener('blur', () => {
        if (elements.productName.value.trim()) {
            if (checkDuplicateName(elements.productName.value)) {
                showError('productNameError', 'Nama produk sudah ada');
                updateSubmitButton(false);
            } else {
                validateAndUpdateUI();
            }
        } else {
            validateAndUpdateUI();
        }
    });
    
    elements.clearCartBtn.addEventListener('click', clearCart);
    elements.checkoutBtn.addEventListener('click', processCheckout);
    
    // QR Scanner events (Kasir)
    elements.scanQRBtn.addEventListener('click', startScanner);
    elements.stopScanBtn.addEventListener('click', stopScanner);
    elements.closeQRScannerModal.addEventListener('click', closeQRScannerModal);
    elements.qrScannerModal.querySelector('.modal-overlay').addEventListener('click', closeQRScannerModal);
    
    const rescanBtn = document.getElementById('rescanBtn');
    if (rescanBtn) {
        rescanBtn.addEventListener('click', () => {
            state.lastScannedCode = null;
            state.scanLocked = false;
            rescanBtn.style.display = 'none';
            startScanner();
        });
    }
    
    // QR Scanner events (Produk)
    elements.scanQRProductBtn.addEventListener('click', startScannerProduct);
    elements.stopScanProductBtn.addEventListener('click', stopScannerProduct);
    elements.closeQRScannerProductModal.addEventListener('click', closeQRScannerProductModal);
    elements.qrScannerProductModal.querySelector('.modal-overlay').addEventListener('click', closeQRScannerProductModal);
    elements.confirmScanBtn.addEventListener('click', confirmScanData);
    
    // QR Code Modal events
    elements.closeQRCodeModal.addEventListener('click', closeQRCodeModal);
    elements.closeQRCodeBtn.addEventListener('click', closeQRCodeModal);
    elements.qrCodeModal.querySelector('.modal-overlay').addEventListener('click', closeQRCodeModal);
    elements.downloadQRBtn.addEventListener('click', downloadQRCode);
    
    elements.closePaymentModal.addEventListener('click', closePaymentModal);
    elements.cancelPaymentBtn.addEventListener('click', closePaymentModal);
    elements.paymentModal.querySelector('.modal-overlay').addEventListener('click', closePaymentModal);
    elements.confirmPaymentBtn.addEventListener('click', confirmPayment);
    
    elements.paidInput.addEventListener('input', (e) => {
        const input = e.target;
        const rawValue = input.value.replace(/[^0-9]/g, '');
        const cursorPos = input.selectionStart;
        const oldLength = input.value.length;
        
        if (rawValue) {
            input.value = formatRupiah(parseInt(rawValue, 10));
        } else {
            input.value = '';
        }
        
        const newLength = input.value.length;
        const newCursorPos = cursorPos + (newLength - oldLength);
        input.setSelectionRange(newCursorPos, newCursorPos);
        
        calculateChange();
    });
    
    elements.quickAmountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.dataset.amount);
            elements.paidInput.value = formatRupiah(amount);
            calculateChange();
        });
    });
    
    elements.closeReceiptModal.addEventListener('click', closeReceiptModal);
    elements.closeReceiptBtn.addEventListener('click', closeReceiptModal);
    elements.receiptModal.querySelector('.modal-overlay').addEventListener('click', closeReceiptModal);
    elements.printReceiptBtn.addEventListener('click', printReceipt);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.paymentModal.classList.contains('active')) {
                closePaymentModal();
            }
            if (elements.receiptModal.classList.contains('active')) {
                closeReceiptModal();
            }
            if (elements.qrScannerModal.classList.contains('active')) {
                closeQRScannerModal();
            }
            if (elements.qrScannerProductModal.classList.contains('active')) {
                closeQRScannerProductModal();
            }
            if (elements.qrCodeModal.classList.contains('active')) {
                closeQRCodeModal();
            }
        }
        
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            if (state.currentPage === 'kasir') {
                elements.searchInput.focus();
            }
        }
    });
}

// ============================================
// Initialize Application
// ============================================
async function initApp() {
    initTheme();
    initNavigation();
    initEventListeners();
    await loadProducts();
}

document.addEventListener('DOMContentLoaded', initApp);

// ============================================
// Expose functions to window
// ============================================
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.deleteProduct = deleteProduct;
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.startScannerProduct = startScannerProduct;
window.stopScannerProduct = stopScannerProduct;
window.showProductQRCode = showProductQRCode;

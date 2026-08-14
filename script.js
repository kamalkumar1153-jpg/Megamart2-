// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyCuhd6WeneZFqkScgyahmkzGPV-U78Zb0s",
    authDomain: "sanitarymart-65014.firebaseapp.com",
    databaseURL: "https://sanitarymart-65014-default-rtdb.firebaseio.com",
    projectId: "sanitarymart-65014",
    storageBucket: "sanitarymart-65014.firebasestorage.app",
    messagingSenderId: "285578370716",
    appId: "1:285578370716:web:f04f48933219f97cb25759"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// State variables
let allProducts = [];
let displayedProducts = [];
let cart = [];
let wishlist = new Set();
let activeCategory = 'All';
let appliedDiscount = 0;
let currentModalProductId = null;

// Load Products from Firebase
db.ref('products').on('value', (snapshot) => {
    allProducts = [];
    if (snapshot.exists()) {
        snapshot.forEach((child) => {
            const item = child.val();
            item.id = child.key;
            item.title = item.title || item.name || item.item_name || item.product_name || 'Unnamed Item';
            item.price = Number(item.price || item.original_price || item.mrp || 0);
            item.discount = Number(item.discount || 0);
            item.finalPrice = item.finalPrice || Math.round(item.price - (item.price * (item.discount / 100)));
            item.image = item.imageUrl || item.image || item.img || 'https://via.placeholder.com/200';
            item.category = item.category || 'General';
            allProducts.push(item);
        });
    }
    renderProducts(allProducts);
});

// Render Product Grid
function renderProducts(products) {
    const grid = document.getElementById('showroomGrid');
    displayedProducts = products;

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 20px;">No products found.</p>';
        return;
    }

    grid.innerHTML = products.map(item => {
        const isWish = wishlist.has(item.id) ? '❤️' : '🤍';
        return `
            <div class="product-card">
                <span class="wishlist-heart" onclick="toggleWishlist('${item.id}')">${isWish}</span>
                <img src="${item.image}" class="product-img" onclick="openProductModal('${item.id}')" onerror="this.src='https://via.placeholder.com/200'">
                <div>
                    <div class="product-title">${item.title}</div>
                    <div class="price-row">
                        <span class="price-current">₹${item.finalPrice}</span>
                        ${item.discount > 0 ? `<span class="price-original">₹${item.price}</span>` : ''}
                    </div>
                </div>
                <button class="action-btn" onclick="addToCart('${item.id}')">Add to Cart</button>
            </div>
        `;
    }).join('');
}

// Category Filter
window.filterCategory = function(cat, el) {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    activeCategory = cat;

    if (cat === 'Wishlist') {
        const wishProducts = allProducts.filter(p => wishlist.has(p.id));
        renderProducts(wishProducts);
    } else if (cat === 'All') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category.toLowerCase().includes(cat.toLowerCase()));
        renderProducts(filtered);
    }
};

// Wishlist Handling
window.toggleWishlist = function(id) {
    if (wishlist.has(id)) wishlist.delete(id);
    else wishlist.add(id);
    showToast("Wishlist updated!");
    filterCategory(activeCategory, null);
};

// Search & Price Range Filters
window.handleSearch = function() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allProducts.filter(p => p.title.toLowerCase().includes(query));
    renderProducts(filtered);
};

window.handlePriceFilter = function(val) {
    document.getElementById('priceVal').innerText = val;
    const filtered = allProducts.filter(p => p.finalPrice <= Number(val));
    renderProducts(filtered);
};

window.handleSort = function(type) {
    let sorted = [...displayedProducts];
    if (type === 'low-high') sorted.sort((a, b) => a.finalPrice - b.finalPrice);
    else if (type === 'high-low') sorted.sort((a, b) => b.finalPrice - a.finalPrice);
    else if (type === 'discount') sorted.sort((a, b) => b.discount - a.discount);
    renderProducts(sorted);
};

// Cart Logic
window.addToCart = function(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;

    const exist = cart.find(item => item.id === id);
    if (exist) {
        exist.qty += 1;
    } else {
        cart.push({ ...prod, qty: 1 });
    }
    updateCartUI();
    showToast("Added to Cart!");
};

function updateCartUI() {
    const cartList = document.getElementById('cartItemsList');
    const cartCount = document.getElementById('cartCount');
    const couponBox = document.getElementById('couponBox');
    const orderSummary = document.getElementById('orderSummary');
    const addressBox = document.getElementById('addressBox');
    const checkoutBtns = document.getElementById('checkoutBtns');

    const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
    cartCount.innerText = totalQty;

    if (cart.length === 0) {
        cartList.innerHTML = '<p>Cart is empty</p>';
        couponBox.style.display = 'none';
        orderSummary.style.display = 'none';
        addressBox.style.display = 'none';
        checkoutBtns.style.display = 'none';
        return;
    }

    couponBox.style.display = 'flex';
    orderSummary.style.display = 'block';
    addressBox.style.display = 'block';
    checkoutBtns.style.display = 'flex';

    cartList.innerHTML = cart.map(item => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:13px;">
            <div>
                <b>${item.title}</b><br>
                <small>₹${item.finalPrice} x ${item.qty}</small>
            </div>
            <div>
                <button onclick="changeQty('${item.id}', -1)" style="padding:2px 6px;">-</button>
                <span>${item.qty}</span>
                <button onclick="changeQty('${item.id}', 1)" style="padding:2px 6px;">+</button>
            </div>
        </div>
    `).join('');

    const subtotal = cart.reduce((acc, item) => acc + (item.finalPrice * item.qty), 0);
    const discountAmt = Math.round((subtotal * appliedDiscount) / 100);
    const finalTotal = subtotal - discountAmt;

    document.getElementById('summarySubtotal').innerText = `₹${subtotal}`;
    document.getElementById('couponDiscount').innerText = `-₹${discountAmt}`;
    document.getElementById('cartTotal').innerText = finalTotal;

    // Delivery Estimation Date
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 3);
    document.getElementById('estDeliveryDate').innerText = estDate.toDateString();
}

window.changeQty = function(id, amt) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += amt;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        updateCartUI();
    }
};

window.applyCoupon = function() {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    if (code === 'SAVE10') {
        appliedDiscount = 10;
        showToast("10% Coupon Applied!");
    } else {
        appliedDiscount = 0;
        showToast("Invalid Coupon Code!");
    }
    updateCartUI();
};

window.verifyPincode = function() {
    const pin = document.getElementById('checkPincode').value;
    const res = document.getElementById('pincodeResult');
    if (pin.length === 6) {
        res.innerHTML = '<span style="color:green; font-size:12px;">✓ Delivery Available in 3-4 Days</span>';
    } else {
        res.innerHTML = '<span style="color:red; font-size:12px;">Enter valid 6-digit Pincode</span>';
    }
};

// WhatsApp Order
window.proceedToWhatsApp = function() {
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const addr = document.getElementById('custAddress').value;

    if (!name || !addr) {
        alert("Please enter Name and Address");
        return;
    }

    let msg = `*New Order from MegaMart Enterprise*\n\n`;
    msg += `*Name:* ${name}\n*Phone:* ${phone}\n*Address:* ${addr}\n\n*Items:*\n`;
    cart.forEach(i => {
        msg += `- ${i.title} (${i.qty} x ₹${i.finalPrice})\n`;
    });
    msg += `\n*Total Amount:* ₹${document.getElementById('cartTotal').innerText}`;

    window.open(`https://wa.me/919024686665?text=${encodeURIComponent(msg)}`, '_blank');
};

// Flash Timer
function startTimer(duration) {
    let timer = duration, hours, minutes, seconds;
    setInterval(() => {
        hours = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt(timer % 60, 10);

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        document.getElementById('flashTimer').innerText = `${hours}:${minutes}:${seconds}`;
        if (--timer < 0) timer = duration;
    }, 1000);
}
startTimer(20712); // 5 hrs 45 mins

// Modal & Voice
window.openProductModal = function(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;
    currentModalProductId = id;

    document.getElementById('modalImg').src = prod.image;
    document.getElementById('modalTitle').innerText = prod.title;
    document.getElementById('modalPrice').innerText = `₹${prod.finalPrice}`;
    document.getElementById('modalAddBtn').onclick = () => { addToCart(id); closeModal(); };
    document.getElementById('productModal').style.display = 'flex';
};

window.closeModal = function() {
    document.getElementById('productModal').style.display = 'none';
};

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// PDF Invoice Generation
window.generateInvoicePDF = function() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("MegaMart Enterprise - Tax Invoice", 14, 20);
    doc.setFontSize(10);
    doc.text(`Inquiry Call: 9024686665`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 34);

    let y = 46;
    doc.text("Item", 14, y);
    doc.text("Qty", 120, y);
    doc.text("Price", 160, y);
    doc.line(14, y + 2, 190, y + 2);

    y += 10;
    cart.forEach(item => {
        doc.text(item.title.substring(0, 30), 14, y);
        doc.text(`${item.qty}`, 120, y);
        doc.text(`Rs. ${item.finalPrice * item.qty}`, 160, y);
        y += 8;
    });

    doc.line(14, y, 190, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: Rs. ${document.getElementById('cartTotal').innerText}`, 14, y);

    doc.save("MegaMart_Invoice.pdf");
};


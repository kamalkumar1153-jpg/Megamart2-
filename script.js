const firebaseConfig = {
    apiKey: "AIzaSyCuhd6WeneZFqkScgyVv2-8k5_xZz5N5o",
    databaseURL: "https://sanitarymart-65014-default-rtdb.firebaseio.com/",
    projectId: "sanitarymart-65014",
    appId: "1:285578370716:web:c47f43f25ad2ab86b25759"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allProducts = [];
let cart = [];
let wishlist = [];
let selectedCategory = 'All';
let searchQuery = '';
let maxPriceLimit = 50000;
let sortOption = 'default';
let discountAmount = 0;
let lastPlacedOrder = null;
let currentModalProductId = null;

// Flash Sale Timer Engine
let timeInSeconds = 5 * 3600 + 45 * 60;
setInterval(() => {
    if(timeInSeconds > 0) timeInSeconds--;
    let h = String(Math.floor(timeInSeconds / 3600)).padStart(2, '0');
    let m = String(Math.floor((timeInSeconds % 3600) / 60)).padStart(2, '0');
    let s = String(timeInSeconds % 60).padStart(2, '0');
    const timerElem = document.getElementById('flashTimer');
    if(timerElem) timerElem.innerText = `${h}:${m}:${s}`;
}, 1000);

database.ref('ecommerce_products').on('value', (snap) => {
    allProducts = [];
    snap.forEach((child) => { allProducts.push({...child.val(), id: child.key}); });
    renderProducts();
});

function playBeep() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 600;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function filterCategory(category, element) {
    selectedCategory = category;
    document.querySelectorAll('.cat-tab').forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');
    renderProducts();
}

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    renderProducts();
}

function handlePriceFilter(val) {
    maxPriceLimit = parseInt(val);
    document.getElementById('priceVal').innerText = val;
    renderProducts();
}

function startVoiceSearch() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        showToast("Listening... Speak now 🎙️");
        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('searchInput').value = transcript;
            handleSearch();
        };
    } else {
        alert("Voice Search is not supported on this browser.");
    }
}

function speakProduct(title, price) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`${title}, Price ${price} Rupees`);
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
    }
}

function handleSort(option) {
    sortOption = option;
    renderProducts();
}

function toggleWishlist(id) {
    playBeep();
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(item => item !== id);
        showToast("Removed from Wishlist");
    } else {
        wishlist.push(id);
        showToast("Added to Wishlist ❤️");
    }
    renderProducts();
}

function verifyPincode() {
    const pin = document.getElementById('checkPincode').value.trim();
    const resBox = document.getElementById('pincodeResult');
    if(pin.length === 6) {
        resBox.style.color = "green";
        resBox.innerText = "✓ Delivery available! Free Express Shipping applied.";
    } else {
        resBox.style.color = "red";
        resBox.innerText = "✕ Please enter a valid 6-digit Pincode.";
    }
}

function openAdminPanel() {
    document.getElementById('adminModal').style.display = 'flex';
    const listDiv = document.getElementById('adminOrdersList');
    listDiv.innerHTML = "Fetching orders from database...";

    database.ref('orders').on('value', (snap) => {
        listDiv.innerHTML = "";
        if(!snap.exists()) {
            listDiv.innerHTML = "<p>No orders found in database.</p>";
            return;
        }
        snap.forEach((child) => {
            let ord = child.val();
            listDiv.innerHTML += `
                <div class="admin-order-card">
                    <b>Order ID:</b> ${ord.orderId || 'N/A'} | <b>Date:</b> ${ord.orderDate}<br>
                    <b>Customer:</b> ${ord.customerName} (${ord.phone})<br>
                    <b>Address:</b> ${ord.address}<br>
                    <b>Payment:</b> ${ord.paymentMode} | <b>Total:</b> ₹${ord.totalAmount}<br>
                    <b>Status:</b> <span style="color:orange; font-weight:bold;">${ord.status || 'Pending'}</span>
                </div>
            `;
        });
    });
}

function closeAdminPanel() {
    document.getElementById('adminModal').style.display = 'none';
}

function renderProducts() {
    const grid = document.getElementById('showroomGrid');
    if (!grid) return;
    grid.innerHTML = "";
    
    let filteredProducts = allProducts.filter(p => {
        let finalPrice = Math.round(p.price - (p.price * p.discount / 100));
        if (selectedCategory === 'Wishlist') return wishlist.includes(p.id);
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery);
        const matchesPrice = finalPrice <= maxPriceLimit;
        return matchesCategory && matchesSearch && matchesPrice;
    });

    if (sortOption === 'low-high') {
        filteredProducts.sort((a, b) => (a.price - (a.price * a.discount / 100)) - (b.price - (b.price * b.discount / 100)));
    } else if (sortOption === 'high-low') {
        filteredProducts.sort((a, b) => (b.price - (b.price * b.discount / 100)) - (a.price - (a.price * a.discount / 100)));
    } else if (sortOption === 'discount') {
        filteredProducts.sort((a, b) => b.discount - a.discount);
    }

    if(filteredProducts.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #777;">No products found.</p>`;
        return;
    }

    filteredProducts.forEach(p => {
        let finalPrice = Math.round(p.price - (p.price * p.discount / 100));
        let isWishlist = wishlist.includes(p.id) ? 'active' : '';
        let stockAlert = p.stock && p.stock < 5 ? `<span class="stock-badge">Only ${p.stock} left</span>` : '';

        grid.innerHTML += `
            <div class="product-card">
                <button class="audio-read-btn" onclick="speakProduct('${p.title.replace(/'/g, "")}', ${finalPrice})" title="Listen Details">🔊</button>
                <button class="wishlist-btn ${isWishlist}" onclick="toggleWishlist('${p.id}')">♥</button>
                <div>
                    <span class="badge">${p.discount}% OFF</span> ${stockAlert}
                    <img src="${p.image}" class="product-img" onclick="openModal('${p.id}')">
                    <h4 class="product-title" onclick="openModal('${p.id}')">${p.title}</h4>
                    <div class="rating" onclick="openModal('${p.id}')">★★★★☆ (4.2)</div>
                </div>
                <div>
                    <div>
                        <span class="final-price">₹${finalPrice}</span>
                        <span class="mrp-price">₹${p.price}</span>
                    </div>
                    <div class="delivery-tag">FREE Delivery</div>
                    <button class="action-btn" onclick="addToCart('${p.id}', '${p.title.replace(/'/g, "")}', ${finalPrice}, ${p.price})">Add to Cart</button>
                </div>
            </div>
        `;
    });
}

function applyCoupon() {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    if(code === "SAVE10") {
        let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        discountAmount = Math.round(total * 0.10);
        showToast("Coupon Applied! 10% Discount");
        playBeep();
    } else {
        showToast("Invalid Coupon Code!");
        discountAmount = 0;
    }
    updateCartUI();
}

function getDeliveryDate() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toDateString();
}

function openModal(id) {
    currentModalProductId = id;
    const product = allProducts.find(p => p.id === id);
    if(!product) return;
    
    let finalPrice = Math.round(product.price - (product.price * product.discount / 100));
    document.getElementById('modalImg').src = product.image;
    document.getElementById('modalTitle').innerText = product.title;
    document.getElementById('modalPrice').innerText = `₹${finalPrice} (MRP: ₹${product.price})`;
    
    loadReviews(id);

    document.getElementById('modalAddBtn').onclick = () => {
        addToCart(product.id, product.title.replace(/'/g, ""), finalPrice, product.price);
        closeModal();
    };
    document.getElementById('productModal').style.display = 'flex';
}

function loadReviews(productId) {
    const rList = document.getElementById('reviewsList');
    rList.innerHTML = "Loading reviews...";
    database.ref(`reviews/${productId}`).once('value', (snap) => {
        if(!snap.exists()) {
            rList.innerHTML = "No reviews yet. Be the first to write one!";
            return;
        }
        rList.innerHTML = "";
        snap.forEach((child) => {
            rList.innerHTML += `<div style="border-bottom:1px solid #ddd; padding:3px 0;">• ${child.val().text}</div>`;
        });
    });
}

function submitReview() {
    const text = document.getElementById('userReviewInput').value.trim();
    if(!text) return;
    database.ref(`reviews/${currentModalProductId}`).push({ text, date: new Date().toLocaleDateString() });
    document.getElementById('userReviewInput').value = "";
    showToast("Review Posted Successfully!");
    loadReviews(currentModalProductId);
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
}

function showToast(text) {
    const x = document.getElementById("toast");
    x.innerText = text;
    x.className = "show";
    setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
}

function addToCart(id, title, price, mrp) {
    playBeep();
    const existingItem = cart.find(item => item.id === id);
    if(existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ id, title, price, mrp: mrp || price, qty: 1 });
    }
    showToast(`${title} added to cart!`);
    updateCartUI();
}

function updateQty(id, change) {
    const item = cart.find(i => i.id === id);
    if(item) {
        item.qty += change;
        if(item.qty <= 0) cart = cart.filter(i => i.id !== id);
    }
    updateCartUI();
}

function removeItem(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

function toggleCart() {
    const cartSec = document.getElementById('cartSection');
    cartSec.style.display = cartSec.style.display === 'block' ? 'none' : 'block';
}

function updateCartUI() {
    const list = document.getElementById('cartItemsList');
    const checkoutBtns = document.getElementById('checkoutBtns');
    const addressBox = document.getElementById('addressBox');
    const orderSummary = document.getElementById('orderSummary');
    const couponBox = document.getElementById('couponBox');
    
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').innerText = totalCount;

    if (cart.length === 0) {
        list.innerHTML = "Cart is empty";
        checkoutBtns.style.display = "none";
        addressBox.style.display = "none";
        orderSummary.style.display = "none";
        couponBox.style.display = "none";
        discountAmount = 0;
        return;
    }

    let html = "";
    let total = 0;

    cart.forEach((item) => {
        let itemTotal = item.price * item.qty;
        total += itemTotal;
        
        html += `
            <div class="cart-item">
                <div>
                    <b>${item.title}</b><br>
                    <small>₹${item.price} x ${item.qty} = ₹${itemTotal}</small>
                </div>
                <div class="cart-controls">
                    <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
                    <button class="remove-btn" onclick="removeItem('${item.id}')">✕</button>
                </div>
            </div>`;
    });

    let finalTotal = total - discountAmount;
    if(finalTotal < 0) finalTotal = 0;

    list.innerHTML = html;
    document.getElementById('summarySubtotal').innerText = `₹${total}`;
    document.getElementById('couponDiscount').innerText = `-₹${discountAmount}`;
    document.getElementById('cartTotal').innerText = finalTotal;
    document.getElementById('estDeliveryDate').innerText = getDeliveryDate();

    addressBox.style.display = "block";
    orderSummary.style.display = "block";
    couponBox.style.display = "flex";
    checkoutBtns.style.display = "flex";
}

function getCustomerDetails() {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();

    if(!name || !phone || !address) {
        alert("कृपया नाम, मोबाइल नंबर और पूरा डिलीवरी एड्रेस भरें!");
        return null;
    }
    return { name, phone, address };
}

function saveOrderToFirebase(details, total, payMode) {
    lastPlacedOrder = {
        orderId: 'ORD' + Math.floor(100000 + Math.random() * 900000),
        customerName: details.name,
        phone: details.phone,
        address: details.address,
        paymentMode: payMode,
        items: [...cart],
        totalAmount: total,
        orderDate: new Date().toLocaleString(),
        status: 'Pending'
    };
    database.ref('orders').push(lastPlacedOrder);
    document.getElementById('pdfBtn').style.display = "block";
}

function generateInvoicePDF() {
    if(!lastPlacedOrder) {
        alert("कोई हालिया ऑर्डर नहीं मिला!");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("MEGAMART ENTERPRISE INVOICE", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Order ID: ${lastPlacedOrder.orderId}`, 14, 30);
    doc.text(`Date: ${lastPlacedOrder.orderDate}`, 14, 37);
    doc.text(`Customer Name: ${lastPlacedOrder.customerName}`, 14, 44);
    doc.text(`Phone: ${lastPlacedOrder.phone}`, 14, 51);
    doc.text(`Address: ${lastPlacedOrder.address}`, 14, 58);
    doc.text(`Payment Mode: ${lastPlacedOrder.paymentMode}`, 14, 65);

    doc.line(14, 70, 196, 70);
    doc.text("Items Purchased:", 14, 78);

    let y = 86;
    lastPlacedOrder.items.forEach((item, i) => {
        doc.text(`${i+1}. ${item.title} (Qty: ${item.qty}) - Rs.${item.price * item.qty}`, 14, y);
        y += 7;
    });

    doc.line(14, y, 196, y);
    doc.setFontSize(13);
    doc.text(`Total Amount Paid: Rs.${lastPlacedOrder.totalAmount}`, 14, y + 10);

    doc.save(`Invoice_${lastPlacedOrder.orderId}.pdf`);
}

function proceedToPayment() {
    const details = getCustomerDetails();
    if(!details) return;

    let total = parseInt(document.getElementById('cartTotal').innerText);
    const payMode = document.querySelector('input[name="payMode"]:checked').value;

    saveOrderToFirebase(details, total, payMode);

    if(payMode === "COD") {
        alert(`🎉 Order Placed Successfully (Cash on Delivery)!\n\nOrder ID: ${lastPlacedOrder.orderId}\nName: ${details.name}\nTotal: ₹${total}\n\nExpected Delivery: ${getDeliveryDate()}`);
        cart = [];
        updateCartUI();
        return;
    }

    const upiID = "9024686665@ptyes";
    const note = encodeURIComponent(`Order by ${details.name}`);
    const upiUrl = `upi://pay?pa=${upiID}&pn=MegaMart&am=${total}&cu=INR&tn=${note}`;

    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = upiUrl;
    } else {
        alert(`Payment Details:\nOrder ID: ${lastPlacedOrder.orderId}\nTotal: ₹${total}\nUPI ID: ${upiID}`);
    }
}

function proceedToWhatsApp() {
    const details = getCustomerDetails();
    if(!details) return;

    let total = document.getElementById('cartTotal').innerText;
    const payMode = document.querySelector('input[name="payMode"]:checked').value;
    
    saveOrderToFirebase(details, total, payMode);

    let itemsList = "";
    cart.forEach((item, index) => {
        let itemTotal = item.price * item.qty;
        itemsList += `${index + 1}. ${item.title} (x${item.qty}) - ₹${itemTotal}\n`;
    });

    let waText = `🛍️ *NEW ORDER - MEGAMART*\n\n` +
                 `🆔 *Order ID:* ${lastPlacedOrder.orderId}\n` +
                 `👤 *Customer Name:* ${details.name}\n` +
                 `📞 *Phone:* ${details.phone}\n` +
                 `📍 *Address:* ${details.address}\n` +
                 `💳 *Payment Mode:* ${payMode}\n\n` +
                 `📦 *Order Items:*\n${itemsList}\n` +
                 `💰 *Final Amount:* ₹${total}\n` +
                 `🚚 *Expected Delivery:* ${getDeliveryDate()}\n\n` +
                 `Please confirm my order!`;

    let waUrl = `https://wa.me/919024686665?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank');
}

// Megamart Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD0aELM0j9gkkRQvpxsX_Ewuq4OBLfAGP4",
  authDomain: "megamart-cdc21.firebaseapp.com",
  databaseURL: "https://megamart-cdc21-default-rtdb.firebaseio.com",
  projectId: "megamart-cdc21",
  storageBucket: "megamart-cdc21.firebasestorage.app",
  messagingSenderId: "743279390922",
  appId: "1:743279390922:web:1d2884416ef9dc14b80433",
  measurementId: "G-25Q3V0ME9Z"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let allProducts = [];
let cart = [];
let wishlist = [];
let selectedProduct = null;
let currentCategory = 'all';
let currentImgIndex = 0;
let deliveryFee = 0;
let lastOrderData = null;

// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const icon = document.getElementById('themeIcon');
  if (document.body.classList.contains('dark-mode')) {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
  }
}

// Banner Slider
let currentSlide = 0;
setInterval(() => {
  const slides = document.querySelectorAll('.slide');
  if (slides.length > 0) {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }
}, 3000);

// Fetch Products from Firebase
const productsRef = db.ref('products');
productsRef.on('value', (snapshot) => {
  const data = snapshot.val();
  allProducts = [];

  if (data) {
    Object.keys(data).forEach((key, idx) => {
      allProducts.push({ _id: key, _index: idx, ...data[key] });
    });
    filterProducts();
  } else {
    document.getElementById('productGrid').innerHTML = 
      `<p class="loading-text">Database me koi product nahi mila.</p>`;
  }
});

// Price Calculator
function calculatePrice(p) {
  let mrp = Number(p.mrp || p.price || 0);
  let disc = Number(p.discount || 30);
  let finalPrice = Math.round(mrp - (mrp * (disc / 100)));
  return { mrp, finalPrice, disc };
}

// Render Products Grid
function renderProducts(products) {
  const container = document.getElementById('productGrid');
  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = `<p class="loading-text">Koi product nahi mila.</p>`;
    return;
  }

  products.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openProductModal(p);

    const title = p.name || p.title || 'Megamart Product';
    const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image || p.imageUrl || 'https://via.placeholder.com/150');
    const priceData = calculatePrice(p);
    const isWish = wishlist.some(w => w._id === p._id);

    card.innerHTML = `
      <div>
        <span class="discount-badge">${priceData.disc}% OFF</span>
        <button class="wishlist-btn ${isWish ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p._id}')">
          <i class="fa-solid fa-heart"></i>
        </button>
        <img src="${img}" class="prod-img">
        <h3 class="prod-title">${title}</h3>
        <div class="price-box">
          <span class="mrp">₹${priceData.mrp}</span>
          <span class="final-price">₹${priceData.finalPrice}</span>
        </div>
      </div>
      <button class="add-btn" onclick="event.stopPropagation(); addToCart('${p._id}')">Add to Cart</button>
    `;
    container.appendChild(card);
  });
}

// Filter and Search
function filterProducts() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const clearBtn = document.getElementById('clearSearchBtn');
  clearBtn.style.display = query.length > 0 ? 'block' : 'none';

  let filtered = allProducts.filter(p => {
    const name = (p.name || p.title || '').toLowerCase();
    const cat = (p.category || p.cat || '').toLowerCase();
    
    const matchesSearch = name.includes(query) || cat.includes(query);
    const matchesCat = currentCategory === 'all' || cat.includes(currentCategory);

    return matchesSearch && matchesCat;
  });

  renderProducts(filtered);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  filterProducts();
}

function filterCategory(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCategory = cat.toLowerCase();
  filterProducts();
}

// Wishlist Functionality
function toggleWishlist(id) {
  const item = allProducts.find(p => p._id === id);
  if (!item) return;

  const index = wishlist.findIndex(w => w._id === id);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast("Removed from Wishlist");
  } else {
    wishlist.push(item);
    showToast("Added to Wishlist ❤️");
  }

  document.getElementById('wishlistCount').innerText = wishlist.length;
  filterProducts();
}

function openWishlistModal() {
  const container = document.getElementById('wishlistContainer');
  container.innerHTML = '';

  if (wishlist.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:12px;">Wishlist khali hai.</p>`;
  } else {
    wishlist.forEach(item => {
      const priceData = calculatePrice(item);
      const title = item.name || item.title || 'Product';
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <div><strong>${title}</strong><br><span style="color:#64748b;">₹${priceData.finalPrice}</span></div>
        <button onclick="addToCart('${item._id}')" class="btn-sm">Add to Cart</button>
      `;
      container.appendChild(row);
    });
  }
  document.getElementById('wishlistModal').style.display = 'flex';
}

// Product Details & Gallery Carousel Modal
function openProductModal(product) {
  selectedProduct = product;
  currentImgIndex = 0;
  
  const priceData = calculatePrice(product);
  const title = product.name || product.title || 'Megamart Product';
  
  updateModalImage();
  document.getElementById('m-title').innerText = title;
  document.getElementById('m-price').innerText = `₹${priceData.finalPrice}`;
  document.getElementById('m-wa').href = `https://wa.me/919024686665?text=Hi,%20I%20want%20to%20buy%20${encodeURIComponent(title)}%20for%20Rs.${priceData.finalPrice}`;
  
  document.getElementById('prodModal').style.display = 'flex';
}

function getProductImages() {
  if (!selectedProduct) return [];
  if (selectedProduct.images && selectedProduct.images.length > 0) return selectedProduct.images;
  return [selectedProduct.image || selectedProduct.imageUrl || 'https://via.placeholder.com/150'];
}

function updateModalImage() {
  const imgs = getProductImages();
  document.getElementById('m-img').src = imgs[currentImgIndex];
}

function prevModalImage() {
  const imgs = getProductImages();
  currentImgIndex = (currentImgIndex - 1 + imgs.length) % imgs.length;
  updateModalImage();
}

function nextModalImage() {
  const imgs = getProductImages();
  currentImgIndex = (currentImgIndex + 1) % imgs.length;
  updateModalImage();
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// Cart System
function addToCart(id) {
  const p = allProducts.find(item => item._id === id);
  if (!p) return;

  const priceData = calculatePrice(p);
  const title = p.name || p.title || 'Megamart Item';

  const exist = cart.find(item => item._id === p._id);
  if (exist) {
    exist.qty += 1;
  } else {
    cart.push({ ...p, cartTitle: title, cartPrice: priceData.finalPrice, qty: 1 });
  }

  updateCartUI();
  showToast(`${title} cart me add ho gaya!`);
}

function addSelectedToCart() {
  if (selectedProduct) {
    addToCart(selectedProduct._id);
    closeModal('prodModal');
  }
}

// Pincode & Delivery Calculator
function checkPincode() {
  const pin = document.getElementById('pincodeInput').value.trim();
  const info = document.getElementById('deliveryInfo');

  if (pin.length !== 6) {
    info.style.color = '#ef4444';
    info.innerText = "Kripya 6-digit ka valid Pincode daalein!";
    return;
  }

  if (pin.startsWith('30') || pin.startsWith('31')) {
    deliveryFee = 0;
    info.style.color = '#10b981';
    info.innerText = "✅ Free Delivery Available!";
  } else {
    deliveryFee = 50;
    info.style.color = '#3b82f6';
    info.innerText = "🚚 Express Delivery Available (₹50 Charge)";
  }

  updateCartUI();
}

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const cartList = document.getElementById('cartList');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const deliveryChargeElem = document.getElementById('deliveryCharge');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutSection = document.getElementById('checkoutSection');

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.innerText = totalQty;

  if (cart.length === 0) {
    cartList.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:12px;">Cart khali hai.</p>`;
    cartTotal.innerText = '0';
    checkoutSection.style.display = 'none';
    return;
  }

  checkoutSection.style.display = 'block';
  cartList.innerHTML = '';
  let subtotal = 0;

  cart.forEach((item, idx) => {
    const itemSub = item.cartPrice * item.qty;
    subtotal += itemSub;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <strong>${item.cartTitle}</strong><br>
        <span style="color:#64748b;">₹${item.cartPrice} x ${item.qty}</span>
      </div>
      <div>
        <button onclick="changeQty(${idx}, -1)" style="padding:2px 6px;">-</button>
        <span style="margin:0 4px; font-weight:bold;">${item.qty}</span>
        <button onclick="changeQty(${idx}, 1)" style="padding:2px 6px;">+</button>
      </div>
    `;
    cartList.appendChild(row);
  });

  cartSubtotal.innerText = subtotal.toLocaleString('en-IN');
  deliveryChargeElem.innerText = deliveryFee;
  cartTotal.innerText = (subtotal + deliveryFee).toLocaleString('en-IN');
}

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) {
    cart.splice(idx, 1);
  }
  updateCartUI();
}

function openCartModal() {
  updateCartUI();
  document.getElementById('cartModal').style.display = 'flex';
}

// 📄 Bill & Order Processing
function processOrderAndBill() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const pin = document.getElementById('pincodeInput').value.trim();

  if (!name || !phone || !address) {
    alert("Kripya Apna Naam, Mobile Number aur Poora Pata (Address) bharein!");
    return;
  }

  let subtotal = 0;
  cart.forEach(item => { subtotal += (item.cartPrice * item.qty); });
  const grandTotal = subtotal + deliveryFee;
  const orderId = "MM" + Math.floor(100000 + Math.random() * 900000);
  const todayDate = new Date().toLocaleDateString('en-IN');

  lastOrderData = {
    orderId,
    date: todayDate,
    name,
    phone,
    address,
    pincode: pin,
    items: [...cart],
    subtotal,
    deliveryFee,
    grandTotal
  };

  // Push Order to Firebase Database
  db.ref('orders/' + orderId).set({
    ...lastOrderData,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });

  // Populate Bill Modal Elements
  document.getElementById('invOrderId').innerText = "#" + orderId;
  document.getElementById('invDate').innerText = todayDate;
  document.getElementById('invName').innerText = name;
  document.getElementById('invPhone').innerText = phone;
  document.getElementById('invAddress').innerText = address + (pin ? ` (${pin})` : '');

  const itemsTable = document.getElementById('invItems');
  itemsTable.innerHTML = '';
  lastOrderData.items.forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i.cartTitle}</td>
      <td>${i.qty}</td>
      <td>₹${i.cartPrice}</td>
      <td>₹${i.cartPrice * i.qty}</td>
    `;
    itemsTable.appendChild(tr);
  });

  document.getElementById('invSubtotal').innerText = subtotal;
  document.getElementById('invDelivery').innerText = deliveryFee;
  document.getElementById('invTotal').innerText = grandTotal;

  closeModal('cartModal');
  document.getElementById('billModal').style.display = 'flex';
  
  cart = [];
  updateCartUI();
}

// Download Bill as PDF
function downloadPDF() {
  const element = document.getElementById('invoiceArea');
  const opt = {
    margin:       10,
    filename:     `Megamart_Bill_${lastOrderData ? lastOrderData.orderId : 'receipt'}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
  showToast("Bill PDF downloading...");
}

// Send Order Confirmation via WhatsApp
function shareWhatsAppBill() {
  if (!lastOrderData) return;

  let itemsText = "";
  lastOrderData.items.forEach(item => {
    itemsText += `• ${item.cartTitle} (Qty: ${item.qty}) - ₹${item.cartPrice * item.qty}\n`;
  });

  const message = `🛒 *NEW ORDER & BILL - MEGAMART*\n\n` +
    `🧾 *Order ID:* #${lastOrderData.orderId}\n` +
    `👤 *Name:* ${lastOrderData.name}\n` +
    `📞 *Phone:* ${lastOrderData.phone}\n` +
    `📍 *Address:* ${lastOrderData.address}\n\n` +
    `📦 *Items:*\n${itemsText}\n` +
    `🚚 *Delivery Fee:* ₹${lastOrderData.deliveryFee}\n` +
    `💰 *Grand Total:* ₹${lastOrderData.grandTotal}\n\n` +
    `Mera bill generate ho gaya hai, kripya order confirm karein!`;

  window.open(`https://wa.me/919024686665?text=${encodeURIComponent(message)}`, '_blank');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2000);
}




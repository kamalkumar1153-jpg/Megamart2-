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
let selectedProduct = null;
let currentCategory = 'all';

// Fetch Products
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

// Price Calculator (Auto 30% OFF if not specified)
function calculatePrice(p) {
  let mrp = Number(p.mrp || p.price || 0);
  let disc = Number(p.discount || 30);
  let finalPrice = Math.round(mrp - (mrp * (disc / 100)));
  return { mrp, finalPrice, disc };
}

// Render Products
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
    const img = p.image || p.imageUrl || 'https://via.placeholder.com/150';
    const priceData = calculatePrice(p);

    card.innerHTML = `
      <div>
        <span class="discount-badge">${priceData.disc}% OFF</span>
        <img src="${img}" class="prod-img">
        <h3 class="prod-title">${title}</h3>
        <div class="price-box">
          <span class="mrp">₹${priceData.mrp}</span>
          <span class="final-price">₹${priceData.finalPrice}</span>
        </div>
      </div>
      <button class="add-btn" onclick="event.stopPropagation(); addToCart(${index})">Add to Cart</button>
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

// Modals
function openProductModal(product) {
  selectedProduct = product;
  const priceData = calculatePrice(product);
  const title = product.name || product.title || 'Megamart Product';
  const img = product.image || product.imageUrl || 'https://via.placeholder.com/150';

  document.getElementById('m-img').src = img;
  document.getElementById('m-title').innerText = title;
  document.getElementById('m-price').innerText = `₹${priceData.finalPrice}`;
  document.getElementById('m-wa').href = `https://wa.me/919024686665?text=Hi,%20I%20want%20to%20buy%20${encodeURIComponent(title)}%20for%20Rs.${priceData.finalPrice}`;
  
  document.getElementById('prodModal').style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// Cart System
function addToCart(index) {
  const p = allProducts[index];
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
  showToast(`${title} added to cart!`);
}

function addSelectedToCart() {
  if (selectedProduct) {
    const idx = allProducts.findIndex(p => p._id === selectedProduct._id);
    addToCart(idx);
    closeModal('prodModal');
  }
}

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const cartList = document.getElementById('cartList');
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
  let total = 0;

  cart.forEach((item, idx) => {
    const subtotal = item.cartPrice * item.qty;
    total += subtotal;

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

  cartTotal.innerText = total.toLocaleString('en-IN');
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

// Order via WhatsApp
function sendWhatsAppOrder() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();

  if (!name || !phone) {
    alert("Kripya apna Naam aur Mobile Number bharein!");
    return;
  }

  let totalBill = 0;
  let itemsText = "";

  cart.forEach(item => {
    const sub = item.cartPrice * item.qty;
    totalBill += sub;
    itemsText += `• ${item.cartTitle} (Qty: ${item.qty}) - ₹${sub}\n`;
  });

  const message = `🛒 *NEW ORDER - MEGAMART*\n\n` +
    `👤 *Name:* ${name}\n` +
    `📞 *Phone:* ${phone}\n\n` +
    `📦 *Items:*\n${itemsText}\n` +
    `💰 *Total:* ₹${totalBill}\n\n` +
    `Please confirm my order.`;

  window.open(`https://wa.me/919024686665?text=${encodeURIComponent(message)}`, '_blank');
  
  cart = [];
  updateCartUI();
  closeModal('cartModal');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2000);
}



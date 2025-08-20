// EcoShop Frontend (vanilla JS + hash routing)
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];

// --- Data layer (localStorage as mock DB) ---
const STORAGE_KEYS = {
  PRODUCTS: 'ecoshop.products',
  CART: 'ecoshop.cart',
  REVIEWS: 'ecoshop.reviews',
};

const seedProducts = [
  {
    id: 'p1',
    name: 'Reusable Water Bottle (Steel)',
    price: 18.99,
    category: 'Accessories',
    stock: 48,
    image: 'https://images.unsplash.com/photo-1555952517-2e8e729e0b44?q=80&w=1200&auto=format&fit=crop',
    description: 'Durable stainless-steel bottle. Keeps drinks cold for 24h, hot for 12h. 750ml.',
    tags: ['reusable','plastic-free'],
  },
  {
    id: 'p2',
    name: 'Organic Cotton Tote Bag',
    price: 9.5,
    category: 'Bags',
    stock: 120,
    image: 'https://images.unsplash.com/photo-1585386959984-a41552231693?q=80&w=1200&auto=format&fit=crop',
    description: 'Sturdy everyday tote. 100% organic cotton, machine washable.',
    tags: ['organic','reusable'],
  },
  {
    id: 'p3',
    name: 'Bamboo Toothbrush (Pack of 4)',
    price: 7.99,
    category: 'Hygiene',
    stock: 200,
    image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?q=80&w=1200&auto=format&fit=crop',
    description: 'Soft bristles, biodegradable bamboo handle.',
    tags: ['biodegradable','zero-waste'],
  },
  {
    id: 'p4',
    name: 'Glass Food Containers (Set of 3)',
    price: 24.0,
    category: 'Kitchen',
    stock: 64,
    image: 'https://images.unsplash.com/photo-1603048297172-c92544798f53?q=80&w=1200&auto=format&fit=crop',
    description: 'Oven-safe borosilicate glass with bamboo lids.',
    tags: ['plastic-free','reusable'],
  },
  {
    id: 'p5',
    name: 'Compostable Trash Bags',
    price: 6.5,
    category: 'Home',
    stock: 85,
    image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop',
    description: 'Certified compostable (EN 13432). 20 bags per roll.',
    tags: ['compostable','home'],
  },
  {
    id: 'p6',
    name: 'Solar-Powered LED Lantern',
    price: 29.99,
    category: 'Outdoor',
    stock: 30,
    image: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?q=80&w=1200&auto=format&fit=crop',
    description: 'Foldable lantern with solar panel. Perfect for camping.',
    tags: ['renewable-energy','outdoor'],
  },
];

function loadProducts(){
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if(raw){
    try{ return JSON.parse(raw); }catch(e){}
  }
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(seedProducts));
  return seedProducts;
}
function saveProducts(list){ localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(list)); }

function loadCart(){
  const raw = localStorage.getItem(STORAGE_KEYS.CART);
  return raw ? JSON.parse(raw) : {};
}
function saveCart(cart){ localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); }

function loadReviews(){
  const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
  return raw ? JSON.parse(raw) : {}; // { [productId]: [{rating, comment, date}] }
}
function saveReviews(map){ localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(map)); }

let products = loadProducts();
let cart = loadCart();
let reviews = loadReviews();

// --- Utils ---
function currency(n){ return '$' + n.toFixed(2); }
function sumCart(){
  return Object.entries(cart).reduce((acc,[pid,qty])=>{
    const p = products.find(x=>x.id===pid);
    return acc + (p ? p.price*qty : 0);
  },0);
}
function cartCount(){
  return Object.values(cart).reduce((a,b)=>a+b,0);
}
function setCartCount(){
  $('#cart-count').textContent = cartCount();
}
function notify(msg){
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(()=>{div.remove();}, 1800);
}

// --- Router ---
const routes = {
  '#catalog': renderCatalog,
  '#cart': renderCart,
  '#checkout': renderCheckout,
  '#admin': renderAdmin,
};
function router(){
  const hash = location.hash || '#catalog';
  const view = routes[hash] || renderCatalog;
  view();
  $('#app').focus();
}
window.addEventListener('hashchange', router);

// --- Catalog ---
function renderCatalog(){
  const app = $('#app');
  app.innerHTML = `
    <section>
      <h1>EcoShop Catalog</h1>
      <div class="controls" role="region" aria-label="Catalog controls">
        <input id="search" class="input" placeholder="Search products..." aria-label="Search"/>
        <select id="category" aria-label="Category">
          <option value="">All categories</option>
          ${[...new Set(products.map(p=>p.category))].map(c=>`<option>${c}</option>`).join('')}
        </select>
        <select id="sort" aria-label="Sort">
          <option value="">Sort by</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Name: A → Z</option>
        </select>
        <input id="maxPrice" class="input" type="number" min="0" step="0.01" placeholder="Max price" aria-label="Max price"/>
      </div>
      <div id="grid" class="grid" aria-live="polite"></div>
    </section>
  `;
  const grid = $('#grid');
  function renderList(list){
    grid.innerHTML = list.map(p => `
      <article class="card">
        <img src="${p.image}" alt="${p.name}"/>
        <div class="card-content">
          <div class="row">
            <h3 style="margin:0">${p.name}</h3>
            <div class="price">${currency(p.price)}</div>
          </div>
          <p class="muted">${p.description}</p>
          <div class="row">
            <div class="tag">${p.category}</div>
            <div>${renderStars(avgRating(p.id))}</div>
          </div>
          <div class="row">
            <button class="btn" data-add="${p.id}" aria-label="Add ${p.name} to cart">Add to cart</button>
            <button class="btn secondary" data-details="${p.id}">Details</button>
          </div>
        </div>
      </article>
    `).join('');
    // Bind buttons
    $$('#grid [data-add]').forEach(b=> b.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-add');
      cart[id] = (cart[id]||0) + 1;
      saveCart(cart); setCartCount();
    }));
    $$('#grid [data-details]').forEach(b=> b.addEventListener('click', e=>{
      const id = e.currentTarget.getAttribute('data-details');
      openProductModal(id);
    }));
  }

  // filters
  const state = { q:'', category:'', sort:'', maxPrice:'' };
  const apply = ()=>{
    let list = [...products];
    if(state.q){
      const q = state.q.toLowerCase();
      list = list.filter(p=> p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if(state.category){ list = list.filter(p=> p.category===state.category); }
    if(state.maxPrice){ list = list.filter(p=> p.price <= Number(state.maxPrice)); }
    if(state.sort==='price-asc') list.sort((a,b)=>a.price-b.price);
    if(state.sort==='price-desc') list.sort((a,b)=>b.price-a.price);
    if(state.sort==='name-asc') list.sort((a,b)=>a.name.localeCompare(b.name));
    renderList(list);
  };

  $('#search').addEventListener('input', e=>{state.q=e.target.value;apply();});
  $('#category').addEventListener('change', e=>{state.category=e.target.value;apply();});
  $('#sort').addEventListener('change', e=>{state.sort=e.target.value;apply();});
  $('#maxPrice').addEventListener('input', e=>{state.maxPrice=e.target.value;apply();});

  apply();
}

// --- Product Modal & Reviews ---
function avgRating(pid){
  const list = reviews[pid] || [];
  if(!list.length) return 0;
  return list.reduce((a,b)=>a+b.rating,0)/list.length;
}
function renderStars(value){
  const full = Math.round(value);
  return `<div class="stars" aria-label="Rating ${value.toFixed(1)} out of 5">
    ${[1,2,3,4,5].map(i=>`<span class="star ${i<=full?'filled':''}">&#9733;</span>`).join('')}
  </div>`;
}
function openProductModal(pid){
  const p = products.find(x=>x.id===pid);
  if(!p) return;
  const modal = $('#modal');
  const content = $('#modal-content');
  const list = reviews[pid] || [];
  content.innerHTML = `
    <div class="row" style="padding:14px 14px 0 14px">
      <h2 style="margin:0">${p.name}</h2>
      <div class="price">${currency(p.price)}</div>
    </div>
    <img src="${p.image}" alt="${p.name}" style="width:100%;max-height:360px;object-fit:cover"/>
    <div style="padding:14px;display:grid;gap:10px">
      <p class="muted">${p.description}</p>
      <div class="row">
        <span class="tag">${p.category}</span>
        <span>${renderStars(avgRating(pid))}</span>
      </div>
      <div class="row">
        <button class="btn" data-add="${p.id}">Add to cart</button>
      </div>
      <hr style="border-color:var(--border)"/>
      <h3 style="margin:0">Reviews</h3>
      <div id="reviews">
        ${list.length? list.map(r=>`
          <div>
            ${renderStars(r.rating)}
            <p class="muted" style="margin:.2rem 0">${r.comment}</p>
            <small class="muted">${new Date(r.date).toLocaleString()}</small>
          </div>
          <hr style="border-color:var(--border)"/>
        `).join('') : '<p class="muted">No reviews yet.</p>'}
      </div>
      <form id="review-form" class="form">
        <label for="rating">Your rating</label>
        <div id="rating" class="stars" role="radiogroup" aria-label="Set rating">
          ${[1,2,3,4,5].map(i=>`<button type="button" class="star" data-rate="${i}" aria-label="${i} star">&#9733;</button>`).join('')}
        </div>
        <label for="comment">Comment</label>
        <textarea id="comment" class="input" rows="3" placeholder="Share your thoughts..."></textarea>
        <button class="btn" type="submit">Submit review</button>
        <div id="review-error" class="error" aria-live="polite"></div>
      </form>
    </div>
  `;
  // bind
  content.querySelector('[data-add]').addEventListener('click', ()=>{
    cart[pid] = (cart[pid]||0) + 1; saveCart(cart); setCartCount();
  });
  let chosen = 5;
  content.querySelectorAll('[data-rate]').forEach(b=> b.addEventListener('click', e=>{
    chosen = Number(e.currentTarget.dataset.rate);
    content.querySelectorAll('[data-rate]').forEach(x=>x.classList.toggle('filled', Number(x.dataset.rate)<=chosen));
  }));
  content.querySelector('#review-form').addEventListener('submit', e=>{
    e.preventDefault();
    const comment = content.querySelector('#comment').value.trim();
    if(!comment){ $('#review-error').textContent = 'Please write a short comment.'; return; }
    const entry = { rating: chosen, comment, date: new Date().toISOString() };
    reviews[pid] = (reviews[pid]||[]);
    reviews[pid].unshift(entry);
    saveReviews(reviews);
    openProductModal(pid); // re-render
  });

  modal.classList.add('show');
  modal.setAttribute('open','');
  modal.setAttribute('aria-hidden','false');
}
document.addEventListener('click', e=>{
  if(e.target.matches('[data-close]')){
    const m = $('#modal');
    m.classList.remove('show');
    m.removeAttribute('open');
    m.setAttribute('aria-hidden','true');
  }
});

// --- Cart ---
function renderCart(){
  const app = $('#app');
  const items = Object.entries(cart).map(([pid,qty])=>{
    const p = products.find(x=>x.id===pid);
    return { p, qty };
  }).filter(x=>x.p);
  app.innerHTML = `
    <section>
      <h1>Your Cart</h1>
      ${items.length? `
      <table class="table">
        <thead>
          <tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr>
        </thead>
        <tbody>
          ${items.map(({p,qty})=>`
            <tr data-id="${p.id}">
              <td>
                <div class="row">
                  <img src="${p.image}" alt="${p.name}" style="width:56px;height:56px;object-fit:cover;border-radius:8px"/>
                  <div>
                    <div>${p.name}</div>
                    <div class="muted">${p.category}</div>
                  </div>
                </div>
              </td>
              <td>${currency(p.price)}</td>
              <td>
                <div class="qty">
                  <button data-dec aria-label="Decrease quantity">−</button>
                  <input type="number" min="1" value="${qty}" aria-label="Quantity"/>
                  <button data-inc aria-label="Increase quantity">+</button>
                </div>
              </td>
              <td>${currency(p.price*qty)}</td>
              <td><button class="btn danger" data-remove>Remove</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <strong>Subtotal: ${currency(sumCart())}</strong>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:12px;gap:8px">
        <a href="#catalog" class="btn secondary">Continue shopping</a>
        <a href="#checkout" class="btn">Proceed to Checkout</a>
      </div>
      ` : `<p class="empty">Your cart is empty. <a href="#catalog">Browse products</a>.</p>`}
    </section>
  `;

  // bind qty & remove
  $$('#app tr[data-id]').forEach(row=>{
    const pid = row.getAttribute('data-id');
    row.querySelector('[data-dec]').addEventListener('click', ()=>{
      cart[pid] = Math.max(1,(cart[pid]||1)-1); saveCart(cart); renderCart(); setCartCount();
    });
    row.querySelector('[data-inc]').addEventListener('click', ()=>{
      cart[pid] = (cart[pid]||1)+1; saveCart(cart); renderCart(); setCartCount();
    });
    row.querySelector('input[type="number"]').addEventListener('change', e=>{
      const v = Math.max(1, Number(e.target.value||1));
      cart[pid]=v; saveCart(cart); renderCart(); setCartCount();
    });
    row.querySelector('[data-remove]').addEventListener('click', ()=>{
      delete cart[pid]; saveCart(cart); renderCart(); setCartCount();
    });
  });
}

// --- Checkout ---
function renderCheckout(){
  const app = $('#app');
  const count = cartCount();
  app.innerHTML = `
    <section>
      <h1>Checkout</h1>
      ${count? `
        <form id="checkout-form" class="form" novalidate>
          <div class="row" style="gap:12px">
            <div style="flex:1">
              <label for="name">Full name</label>
              <input id="name" class="input" required placeholder="John Smith"/>
            </div>
            <div style="flex:1">
              <label for="email">Email</label>
              <input id="email" type="email" class="input" required placeholder="john@example.com"/>
            </div>
          </div>
          <label for="address">Address</label>
          <input id="address" class="input" required placeholder="Street, City, ZIP"/>
          <div class="row" style="gap:12px">
            <div style="flex:1">
              <label for="delivery">Delivery method</label>
              <select id="delivery" class="input" required>
                <option value="">Choose</option>
                <option>Courier</option>
                <option>Pickup point</option>
              </select>
            </div>
            <div style="flex:1">
              <label for="notes">Order notes (optional)</label>
              <input id="notes" class="input" placeholder="Leave at the door..."/>
            </div>
          </div>
          <div class="row" style="justify-content:space-between;margin-top:8px">
            <strong>Total: ${currency(sumCart())}</strong>
            <button class="btn" type="submit">Place order</button>
          </div>
          <div id="checkout-error" class="error" aria-live="polite"></div>
        </form>
      ` : `<p class="empty">Your cart is empty. <a href="#catalog">Add items</a> to proceed.</p>`}
    </section>
  `;
  if(!count) return;
  $('#checkout-form').addEventListener('submit', e=>{
    e.preventDefault();
    const name = $('#name').value.trim();
    const email = $('#email').value.trim();
    const address = $('#address').value.trim();
    const delivery = $('#delivery').value.trim();
    if(!name || !email || !address || !delivery){
      $('#checkout-error').textContent = 'Please fill in all required fields.';
      return;
    }
    // Simulate order success
    const orderId = 'ORD-' + Math.random().toString(36).slice(2,8).toUpperCase();
    cart = {}; saveCart(cart); setCartCount();
    $('#app').innerHTML = `
      <section class="empty">
        <h2>Thank you for your order!</h2>
        <p>Your order <strong>${orderId}</strong> has been placed.</p>
        <a class="btn" href="#catalog">Back to Catalog</a>
      </section>
    `;
  });
}

// --- Admin (local only) ---
function renderAdmin(){
  const app = $('#app');
  app.innerHTML = `
    <section>
      <h1>Admin (local demo)</h1>
      <p class="muted">This page lets you add products locally (saved to your browser only).</p>
      <form id="pform" class="form">
        <label for="pname">Name</label>
        <input id="pname" class="input" required/>
        <label for="pprice">Price</label>
        <input id="pprice" class="input" type="number" step="0.01" required/>
        <label for="pcat">Category</label>
        <input id="pcat" class="input" required/>
        <label for="pimg">Image URL</label>
        <input id="pimg" class="input" placeholder="https://..."/>
        <label for="pdesc">Description</label>
        <textarea id="pdesc" class="input" rows="3"></textarea>
        <button class="btn" type="submit">Add product</button>
        <div id="perr" class="error" aria-live="polite"></div>
      </form>
      <div style="margin-top:20px">
        <button class="btn danger" id="reset">Reset to seed data</button>
      </div>
      <h2 style="margin-top:24px">Current products</h2>
      <ul id="plist"></ul>
    </section>
  `;
  const ul = $('#plist');
  function refresh(){
    ul.innerHTML = products.map(p=>`<li>${p.name} — ${currency(p.price)} <span class="tag">${p.category}</span></li>`).join('');
  }
  refresh();
  $('#pform').addEventListener('submit', e=>{
    e.preventDefault();
    const name = $('#pname').value.trim();
    const price = Number($('#pprice').value);
    const category = $('#pcat').value.trim();
    const image = $('#pimg').value.trim() || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop';
    const description = $('#pdesc').value.trim() || 'Eco-friendly product';
    if(!name || !price || !category){
      $('#perr').textContent = 'Name, price and category are required.';
      return;
    }
    const id = 'p' + (Math.random().toString(36).slice(2,8));
    const obj = { id, name, price, category, image, description, stock: 50, tags: [] };
    products.push(obj); saveProducts(products); refresh();
    $('#perr').textContent='';
    e.target.reset();
    notify('Product added!');
  });
  $('#reset').addEventListener('click', ()=>{
    products = [...seedProducts]; saveProducts(products); refresh();
    notify('Reset done.');
  });
}

// --- Init ---
function init(){
  document.getElementById('year').textContent = new Date().getFullYear();
  setCartCount();
  router();
}
init();

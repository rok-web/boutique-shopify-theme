/* ============================================================
   VASTHRALAYA — script.js
   Cart, Slider, Filters, Wishlist, Recently Viewed, Sticky ATC, etc.
   ============================================================ */

'use strict';

/* ---- GLOBAL FUNCTIONS ---- */

window.openCart = function() {
  const drawer = document.getElementById('CartDrawer');
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  updateFreeShippingBar();
};

window.closeCart = function() {
  const drawer = document.getElementById('CartDrawer');
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

window.toggleSearch = function() {
  const bar = document.getElementById('SearchBar');
  if (!bar) return;
  const isOpen = bar.classList.toggle('open');
  document.body.classList.toggle('search-open', isOpen);
  if (isOpen) bar.querySelector('input')?.focus();
};

window.toggleMobileMenu = function() {
  const menu = document.getElementById('MobileMenu');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  document.body.style.overflow = isOpen ? 'hidden' : '';
};

window.toggleFilters = function() {
  const sidebar = document.getElementById('FilterSidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
};

window.applyFilters = function() {
  const form = document.getElementById('FacetFiltersForm');
  if (!form) return;
  
  // Show skeleton loading
  const grid = document.querySelector('.product-grid');
  if (grid) grid.innerHTML = Array.from({length: 8}).map(() => '<div class="product-card is-loading"><div class="product-card__media"></div><div class="product-card__info"><div></div><div></div></div></div>').join('');

  const formData = new FormData(form);
  const searchParams = new URLSearchParams(formData);
  const toDelete = [];
  searchParams.forEach((value, key) => { if (!value) toDelete.push(key); });
  toDelete.forEach(key => searchParams.delete(key));
  window.location.search = searchParams.toString();
};

window.applySort = function(value) {
  // Show skeleton loading
  const grid = document.querySelector('.product-grid');
  if (grid) grid.innerHTML = Array.from({length: 8}).map(() => '<div class="product-card is-loading"><div class="product-card__media"></div><div class="product-card__info"><div></div><div></div></div></div>').join('');

  const url = new URL(window.location.href);
  url.searchParams.set('sort_by', value);
  window.location.href = url.toString();
};

window.removeFilter = function(paramName, value) {
  const url = new URL(window.location.href);
  const params = url.searchParams.getAll(paramName).filter(v => v !== value);
  url.searchParams.delete(paramName);
  params.forEach(p => url.searchParams.append(paramName, p));
  window.location.href = url.toString();
};

window.updateCart = async function(key, quantity) {
  try {
    const response = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });
    if (!response.ok) throw new Error('Cart update failed');
    await updateCartDrawer();
  } catch (err) {
    console.error('Cart update error:', err);
  }
};

window.quickAddToCart = async function(variantId, btn) {
  if (!variantId || !btn) return;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Adding...';
  try {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    });
    if (!response.ok) throw new Error('Cart add failed');
    await updateCartDrawer();
    window.openCart();
    btn.innerHTML = '✓ Added!';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2500);
  } catch (err) {
    console.error('Quick add error:', err);
    btn.innerHTML = 'Error';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  }
};

window.toggleWishlist = function(btn, productId) {
  let wishlist = [];
  try { wishlist = JSON.parse(localStorage.getItem('boutique_wishlist') || '[]'); } catch(e) {}
  const idx = wishlist.indexOf(productId);

  if (idx === -1) {
    wishlist.push(productId);
    if(btn) btn.classList.add('active');
    showToast('Added to wishlist ♥');
  } else {
    wishlist.splice(idx, 1);
    if(btn) btn.classList.remove('active');
    showToast('Removed from wishlist');
  }
  localStorage.setItem('boutique_wishlist', JSON.stringify(wishlist));
};

window.shareWishlist = function() {
  let wishlist = [];
  try { wishlist = JSON.parse(localStorage.getItem('boutique_wishlist') || '[]'); } catch(e) {}
  if (wishlist.length === 0) {
    showToast('Your wishlist is empty!', 'error');
    return;
  }
  const shareUrl = window.location.origin + window.location.pathname + '?wishlist=' + wishlist.join(',');
  navigator.clipboard.writeText(shareUrl).then(() => {
    showToast('Wishlist link copied to clipboard!');
  });
};

window.acceptCookies = function() {
  localStorage.setItem('vasthralaya_cookies_accepted', 'true');
  const banner = document.getElementById('CookieConsent');
  if (banner) banner.style.display = 'none';
};

window.closeExitPopup = function() {
  const popup = document.getElementById('ExitIntentPopup');
  if (popup) popup.style.display = 'none';
  sessionStorage.setItem('exit_popup_dismissed', 'true');
  if (window.exitInterval) clearInterval(window.exitInterval);
};

function startExitCountdown() {
  let time = 300; // 5 minutes
  const display = document.getElementById('QVTimer');
  if (!display) return;
  window.exitInterval = setInterval(() => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (--time < 0) clearInterval(window.exitInterval);
  }, 1000);
}

/* ---- UX POLISH FUNCTIONS ---- */

window.openLightbox = function(imgSrc) {
  const modal = document.getElementById('LightboxModal');
  const img = document.getElementById('LightboxImg');
  if (!modal || !img) return;
  img.src = imgSrc;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeLightbox = function() {
  const modal = document.getElementById('LightboxModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

/* ---- QUICK VIEW ---- */

window.openQuickView = async function(event, handle) {
  if (event) event.preventDefault();
  const modal = document.getElementById('QuickViewModal');
  if (!modal) return;

  // Show placeholder/loading state
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modal.querySelector('.quick-view-content').classList.add('is-loading');

  try {
    const res = await fetch(`/products/${handle}.js`);
    const product = await res.json();
    
    document.getElementById('QVTitle').textContent = product.title;
    document.getElementById('QVPrice').textContent = formatMoney(product.price);
    const comp = document.getElementById('QVComparePrice');
    if (product.compare_at_price > product.price) {
      comp.textContent = formatMoney(product.compare_at_price);
      comp.style.display = 'inline';
    } else {
      comp.style.display = 'none';
    }
    
    document.getElementById('QVMainImg').src = product.featured_image;
    document.getElementById('QVDescription').innerHTML = product.description;
    document.getElementById('QVFullDetails').href = product.url;
    document.getElementById('QVVariantId').value = product.variants[0].id;
    
    // Render Options
    const optionsContainer = document.getElementById('QVOptions');
    optionsContainer.innerHTML = '';
    if (product.variants.length > 1 && product.options) {
      product.options.forEach((opt, index) => {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = `<label>${opt.name}</label><div class="option-btns"></div>`;
        const btns = group.querySelector('.option-btns');
        opt.values.forEach(val => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `option-btn ${product.variants[0].options[index] === val ? 'active' : ''}`;
          btn.textContent = val;
          btn.onclick = () => {
            btns.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateQVVariant(product);
          };
          btns.appendChild(btn);
        });
        optionsContainer.appendChild(group);
      });
    }

    modal.querySelector('.quick-view-content').classList.remove('is-loading');
  } catch (err) {
    console.error('Quick View Error:', err);
    closeQuickView();
  }
};

window.closeQuickView = function() {
  const modal = document.getElementById('QuickViewModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

function updateQVVariant(product) {
  const selectedOptions = Array.from(document.querySelectorAll('#QVOptions .option-btn.active')).map(b => b.textContent);
  const variant = product.variants.find(v => v.options.every((opt, i) => opt === selectedOptions[i]));
  if (variant) {
    document.getElementById('QVVariantId').value = variant.id;
    document.getElementById('QVPrice').textContent = formatMoney(variant.price);
    const atc = document.querySelector('.qv-atc-btn');
    if (atc) {
      atc.disabled = !variant.available;
      atc.textContent = variant.available ? 'Add to Bag' : 'Sold Out';
    }
    if (variant.featured_image) document.getElementById('QVMainImg').src = variant.featured_image.src;
  }
}

/* ---- HELPERS ---- */

function formatMoney(cents) {
  const amount = (cents / 100).toFixed(2);
  return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
}

let toastTimer;
function showToast(message, type = 'success') {
  let toast = document.getElementById('ToastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ToastNotification';
    toast.style.cssText = `
      position: fixed; bottom: 88px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(30, 20, 16, 0.9); color: #fff; padding: 12px 24px; border-radius: 100px;
      font-family: 'Jost', sans-serif; font-size: .86rem; letter-spacing: .04em;
      box-shadow: 0 8px 32px rgba(0,0,0,.25); z-index: 9999;
      opacity: 0; transition: all .3s cubic-bezier(.4,0,.2,1);
      white-space: nowrap; pointer-events: none; backdrop-filter: blur(8px);
    `;
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'error' ? 'rgba(232, 92, 58, 0.9)' : 'rgba(30, 20, 16, 0.9)';
  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2800);
}

/* ---- CART DRAWER REFRESH ---- */

async function updateCartDrawer() {
  try {
    const res = await fetch('/cart.js');
    const cart = await res.json();
    const counts = document.querySelectorAll('.cart-count, .cart-badge');
    counts.forEach(el => {
      el.textContent = cart.item_count;
      el.style.display = cart.item_count > 0 ? 'flex' : 'none';
    });
    renderCartItemsUI(cart);
    updateFreeShippingBar(cart);
  } catch (err) { console.error('Cart refresh error:', err); }
}

function updateFreeShippingBar(cartData) {
  const bar = document.getElementById('FreeShippingBar');
  if (!bar) return;
  const threshold = 99900;
  const updateUI = (total) => {
    const msg = bar.querySelector('.free-shipping-bar__message');
    const fill = bar.querySelector('.free-shipping-bar__fill');
    if (total >= threshold) {
      msg.innerHTML = "🎉 You've unlocked <strong>Free Shipping!</strong>";
      fill.style.width = '100%';
      fill.style.background = '#2e7d4f';
    } else {
      const remaining = threshold - total;
      msg.innerHTML = `Add <strong>${formatMoney(remaining)}</strong> more for <strong>Free Shipping</strong>`;
      fill.style.width = `${(total / threshold) * 100}%`;
      fill.style.background = 'var(--clr-maroon)';
    }
  };
  if (cartData) updateUI(cartData.total_price);
  else fetch('/cart.js').then(r => r.json()).then(cart => updateUI(cart.total_price));
}

function renderCartItemsUI(cart) {
  const body = document.getElementById('CartDrawerBody');
  const footer = document.querySelector('.cart-drawer__footer');
  if (!body) return;
  if (cart.item_count === 0) {
    body.innerHTML = `<div class="cart-empty"><div class="cart-empty__icon">🛍️</div><p>Your cart is empty</p><a href="/collections/all" class="btn btn--primary" onclick="closeCart()">Start Shopping</a></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }
  if (footer) {
    footer.style.display = 'flex';
    const totalEl = footer.querySelector('.cart-total__price');
    if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
  }
  body.innerHTML = cart.items.map(item => `
    <div class="cart-item" data-key="${item.key}">
      <div class="cart-item__image"><img src="${item.image}" alt="${item.title}" loading="lazy"></div>
      <div class="cart-item__details">
        <h4>${item.product_title}</h4>
        ${item.variant_title && item.variant_title !== 'Default Title' ? `<p class="cart-item__variant">${item.variant_title}</p>` : ''}
        <div class="cart-item__price-qty">
          <span class="cart-item__price">${formatMoney(item.final_price)}</span>
          <div class="cart-item__qty">
            <button onclick="updateCart('${item.key}', ${item.quantity - 1})">−</button>
            <span>${item.quantity}</span>
            <button onclick="updateCart('${item.key}', ${item.quantity + 1})">+</button>
          </div>
        </div>
      </div>
      <button class="cart-item__remove" onclick="updateCart('${item.key}', 0)" aria-label="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>`).join('');

  // Phase 2: Add Cart Upsells
  const upsellSection = document.createElement('div');
  upsellSection.className = 'cart-drawer__upsells';
  upsellSection.innerHTML = `
    <h4>Complete the Look</h4>
    <div class="cart-upsell-list">
      <div class="cart-upsell-item">
        <img src="/assets/product-kalamkari-saree.png" style="width:40px;height:50px;object-fit:cover;border-radius:4px;" alt="Cross sell">
        <div class="cart-upsell-details">
          <span>Banarasi Silk Blouse Piece</span>
          <button class="btn btn--outline btn--sm" onclick="showToast('Added to bag!')">Add ₹1,200</button>
        </div>
      </div>
    </div>
  `;
  body.appendChild(upsellSection);
}

/* ---- INITIALIZERS ---- */

function initSlider() {
  const tracks = document.querySelectorAll('.product-slider__track');
  tracks.forEach(track => {
    const items = track.querySelectorAll('.product-card');
    if (items.length === 0) return;
    const container = track.closest('.product-slider');
    const dotsContainer = container?.parentElement.querySelector('.slider-dots');
    let index = 0;
    const getVisible = () => window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4;
    const update = () => {
      const visible = getVisible();
      const cardWidth = items[0].offsetWidth + 20;
      const maxIndex = Math.max(0, items.length - visible);
      index = Math.min(index, maxIndex);
      track.style.transform = `translateX(-${index * cardWidth}px)`;
      if (dotsContainer) {
        const totalDots = Math.ceil(items.length / visible);
        dotsContainer.innerHTML = Array.from({length: totalDots}).map((_, i) => `<button class="slider-dot ${i === Math.floor(index/visible) ? 'active' : ''}" onclick="this.dispatchEvent(new CustomEvent('slide-to', {detail: ${i * visible}}))"></button>`).join('');
        dotsContainer.querySelectorAll('.slider-dot').forEach(dot => {
          dot.addEventListener('slide-to', (e) => { index = e.detail; update(); });
        });
      }
    };
    window.slideProducts = (dir) => { index = Math.max(0, index + dir); update(); };
    window.addEventListener('resize', update);
    update();
  });
}

function initVariantSelector() {
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.option-group');
      group?.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const selected = Array.from(document.querySelectorAll('.option-group')).map(g => g.querySelector('.option-btn.active')?.dataset.value);
      if (!window.productVariants) return;
      const match = window.productVariants.find(v => v.options.every((opt, i) => opt === selected[i]));
      if (match) {
        document.querySelectorAll('.product-info__price').forEach(el => el.textContent = formatMoney(match.price));
        const comp = document.querySelector('.product-info__compare');
        if (comp) { comp.textContent = match.compare_at_price > match.price ? formatMoney(match.compare_at_price) : ''; comp.style.display = match.compare_at_price > match.price ? 'inline' : 'none'; }
        const idInput = document.querySelector('input[name="id"]');
        if (idInput) idInput.value = match.id;
        const atcBtn = document.querySelector('.atc-btn');
        if (atcBtn) { atcBtn.disabled = !match.available; atcBtn.textContent = match.available ? 'Add to Bag' : 'Sold Out'; }
        if (match.featured_image) { const mainImg = document.getElementById('GalleryMainImg'); if (mainImg) mainImg.src = match.featured_image.src; }
        const bisForm = document.getElementById('BackInStockForm');
        if (bisForm) bisForm.style.display = match.available ? 'none' : 'block';
      }
    });
  });
}

function initQtySelector() {
  document.querySelectorAll('.qty-selector').forEach(container => {
    const input = container.querySelector('input');
    const btns = container.querySelectorAll('button');
    if (!input || btns.length < 2) return;
    btns[0].onclick = () => { input.value = Math.max(1, parseInt(input.value) - 1); };
    btns[1].onclick = () => { input.value = parseInt(input.value) + 1; };
  });
}

function initProductForm() {
  const forms = document.querySelectorAll('#ProductForm, #QVForm');
  forms.forEach(form => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('.atc-btn, .qv-atc-btn');
      const original = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = 'Adding...';
      try {
        const res = await fetch('/cart/add.js', { method: 'POST', body: new FormData(form) });
        if (!res.ok) throw new Error();
        await updateCartDrawer(); window.openCart();
        if (form.id === 'QVForm') closeQuickView();
        btn.innerHTML = '✓ Added!';
        setTimeout(() => { btn.disabled = false; btn.innerHTML = original; }, 2000);
      } catch (err) { btn.disabled = false; btn.innerHTML = 'Error'; }
    };
  });
}

function initAnnouncementRotation() {
  const bar = document.querySelector('.announcement-bar__inner');
  if (!bar) return;
  const msgs = bar.querySelectorAll('.announcement-message');
  if (msgs.length < 2) return;
  let current = 0;
  setInterval(() => {
    msgs[current].classList.remove('active');
    current = (current + 1) % msgs.length;
    msgs[current].classList.add('active');
  }, 4000);
}

function initExitIntent() {
  if (sessionStorage.getItem('exit_popup_dismissed')) return;
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY < 0) {
      const popup = document.getElementById('ExitIntentPopup');
      if (popup && popup.style.display === 'none') {
        popup.style.display = 'flex';
        startExitCountdown();
      }
    }
  });
}

function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

function initCursor() {
  if (window.innerWidth <= 1024) return;
  const dot = document.getElementById('CursorDot');
  const outline = document.getElementById('CursorOutline');
  if (!dot || !outline) return;

  let mouseX = 0, mouseY = 0;
  let dotX = 0, dotY = 0;
  let outlineX = 0, outlineY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const animate = () => {
    dotX += (mouseX - dotX) * 0.2;
    dotY += (mouseY - dotY) * 0.2;
    dot.style.transform = `translate3d(${dotX - 4}px, ${dotY - 4}px, 0)`;

    outlineX += (mouseX - outlineX) * 0.1;
    outlineY += (mouseY - outlineY) * 0.1;
    outline.style.transform = `translate3d(${outlineX - 20}px, ${outlineY - 20}px, 0)`;

    requestAnimationFrame(animate);
  };
  animate();

  document.body.classList.add('custom-cursor-active');

  const hovers = 'a, button, .category-card, .product-card, .wishlist-btn, .header-icon';
  document.querySelectorAll(hovers).forEach(el => {
    el.addEventListener('mouseenter', () => outline.classList.add('hover'));
    el.addEventListener('mouseleave', () => outline.classList.remove('hover'));
  });
}

function initScrollProgress() {
  const bar = document.getElementById('ScrollProgress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    bar.style.width = scrolled + "%";
  }, { passive: true });
}

function initPageTransition() {
  const overlay = document.getElementById('PageTransition');
  if (!overlay) return;
  window.addEventListener('load', () => {
    setTimeout(() => {
      overlay.classList.add('loaded');
    }, 300);
  });
}

/* ---- DOM READY ---- */

document.addEventListener('DOMContentLoaded', () => {
  initSlider();
  initVariantSelector();
  initQtySelector();
  initProductForm();
  initAnnouncementRotation();
  initExitIntent();
  initAnimations();
  initCursor();
  initScrollProgress();
  initPageTransition();
  
  // Sticky & Shrinking Header
  const header = document.getElementById('SiteHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY > 40;
      header.classList.toggle('scrolled', scrolled);
      
      // Back to Top visibility
      const btt = document.getElementById('BackToTop');
      if (btt) btt.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
  }

  // Lightbox click on product images
  const mainImg = document.getElementById('GalleryMainImg');
  if (mainImg) {
    mainImg.style.cursor = 'zoom-in';
    mainImg.onclick = () => window.openLightbox(mainImg.src);
  }

  // Sticky ATC Observer
  const mainAtc = document.querySelector('.product-atc');
  const stickyAtc = document.getElementById('StickyATC');
  if (mainAtc && stickyAtc) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          stickyAtc.style.display = 'flex';
          stickyAtc.classList.toggle('visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
        } else {
          stickyAtc.style.display = 'none';
        }
      });
    }, { threshold: 0 });
    observer.observe(mainAtc);
  }

  // Recently Viewed Logic
  const rvKey = 'boutique_rv';
  const handle = window.location.pathname.match(/\/products\/([^\/]+)/)?.[1];
  let rv = [];
  try { rv = JSON.parse(localStorage.getItem(rvKey) || '[]'); } catch(e) {}
  if (handle) {
    rv = rv.filter(h => h !== handle);
    rv.unshift(handle);
    localStorage.setItem(rvKey, JSON.stringify(rv.slice(0, 10)));
  }
  const rvGrid = document.getElementById('RecentlyViewedGrid');
  const rvSection = document.querySelector('.recently-viewed-section');
  if (rvGrid && rvSection && rv.length > 1) {
    const others = rv.filter(h => h !== handle).slice(0, 4);
    if (others.length > 0) {
      rvSection.style.display = 'block';
      others.forEach(h => {
        fetch(`/products/${h}.js`).then(r => r.json()).then(p => {
          const card = document.createElement('div');
          card.className = 'product-card';
          card.style.minWidth = '200px';
          card.innerHTML = `<a href="${p.url}"><img src="${p.featured_image}" style="width:100%; border-radius:4px; aspect-ratio:4/5; object-fit:cover;"><h4 style="font-size:0.9rem; margin:10px 0 5px;">${p.title}</h4><p style="color:var(--clr-maroon); font-weight:500;">${formatMoney(p.price)}</p></a>`;
          rvGrid.appendChild(card);
        }).catch(() => {});
      });
    }
  }

  // Wishlist Sync
  let wishlist = [];
  try { wishlist = JSON.parse(localStorage.getItem('boutique_wishlist') || '[]'); } catch(e) {}
  document.querySelectorAll('[data-product-id]').forEach(el => {
    if (wishlist.includes(el.dataset.productId)) el.querySelector('.wishlist-btn')?.classList.add('active');
  });

  // Cookie Banner
  if (!localStorage.getItem('vasthralaya_cookies_accepted')) {
    const banner = document.getElementById('CookieConsent');
    if (banner) banner.style.display = 'flex';
  }

  // Magnetic Buttons
  document.querySelectorAll('.btn--magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.setProperty('--mx', `${x * 0.3}px`);
      btn.style.setProperty('--my', `${y * 0.3}px`);
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    });
  });
});

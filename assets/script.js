/* ============================================================
   VASTHRALAYA — script.js
   Cart, Slider, Filters, Wishlist, Sticky Header, etc.
   ============================================================ */

'use strict';

/* ---- STICKY HEADER ---- */
(function () {
  const header = document.getElementById('SiteHeader');
  if (!header) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 40);
    lastY = y;
  }, { passive: true });
})();

/* ---- SEARCH BAR ---- */
function toggleSearch() {
  const bar = document.getElementById('SearchBar');
  if (!bar) return;
  const isOpen = bar.classList.toggle('open');
  if (isOpen) bar.querySelector('input')?.focus();
}

/* ---- MOBILE MENU ---- */
function toggleMobileMenu() {
  const menu = document.getElementById('MobileMenu');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  document.body.style.overflow = isOpen ? 'hidden' : '';
  menu.style.display = isOpen ? 'flex' : 'none';
}

/* Initialize mobile menu display */
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('MobileMenu');
  if (menu) menu.style.display = 'none';
});

/* ---- CART DRAWER ---- */
function openCart() {
  const drawer = document.getElementById('CartDrawer');
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const drawer = document.getElementById('CartDrawer');
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* Close cart on Escape key */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCart();
    toggleMobileMenuClose();
  }
});

function toggleMobileMenuClose() {
  const menu = document.getElementById('MobileMenu');
  if (menu && menu.classList.contains('open')) {
    toggleMobileMenu();
  }
}

/* ---- QUICK ADD TO CART ---- */
async function quickAddToCart(variantId, btn) {
  if (!variantId || !btn) return;

  const originalText = btn.textContent;
  btn.textContent = 'Adding…';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  try {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    });

    if (!response.ok) throw new Error('Cart add failed');

    btn.textContent = '✓ Added!';
    btn.style.background = '#2e7d4f';
    btn.style.opacity = '1';

    await updateCartDrawer();
    openCart();

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 2500);

  } catch (err) {
    btn.textContent = 'Try again';
    btn.style.background = '#e85c3a';
    btn.style.opacity = '1';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
    console.error('Quick add error:', err);
  }
}

/* ---- UPDATE CART ITEM QUANTITY ---- */
async function updateCart(key, quantity) {
  try {
    const response = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });

    if (!response.ok) throw new Error('Cart update failed');

    await updateCartDrawer();
    updateCartCount();

  } catch (err) {
    console.error('Cart update error:', err);
  }
}

/* ---- UPDATE CART DRAWER HTML ---- */
async function updateCartDrawer() {
  try {
    const res = await fetch('/?section_id=cart-drawer');
    // Fallback: fetch full cart JSON and rebuild UI
    const cartRes = await fetch('/cart.js');
    const cart = await cartRes.json();

    updateCartCount(cart.item_count);
    renderCartItems(cart);
  } catch (err) {
    console.error('Cart refresh error:', err);
  }
}

function renderCartItems(cart) {
  const body = document.getElementById('CartDrawerBody');
  const footer = document.querySelector('.cart-drawer__footer');
  if (!body) return;

  if (cart.item_count === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛍️</div>
        <p>Your cart is empty</p>
        <a href="/collections/all" class="btn btn--primary" onclick="closeCart()">Start Shopping</a>
      </div>`;
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
      <div class="cart-item__image">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
      </div>
      <div class="cart-item__details">
        <h4>${item.product_title}</h4>
        ${item.variant_title && item.variant_title !== 'Default Title'
          ? `<p class="cart-item__variant">${item.variant_title}</p>` : ''}
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function updateCartCount(count) {
  fetch('/cart.js')
    .then(r => r.json())
    .then(cart => {
      const counts = document.querySelectorAll('.cart-count, .cart-badge');
      counts.forEach(el => {
        const n = cart.item_count;
        el.textContent = n;
        el.style.display = n > 0 ? 'block' : 'none';
      });
    })
    .catch(() => {});
}

function formatMoney(cents) {
  const amount = (cents / 100).toFixed(2);
  return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
}

/* ---- PRODUCT SLIDER ---- */
let sliderIndex = 0;
let sliderItems = [];

function initSlider() {
  const track = document.getElementById('SliderTrack');
  const dotsContainer = document.getElementById('SliderDots');
  if (!track) return;

  sliderItems = track.querySelectorAll('.product-card');
  if (sliderItems.length === 0) return;

  // Determine visible items based on viewport
  function getVisible() {
    if (window.innerWidth < 640) return 2;
    if (window.innerWidth < 1024) return 3;
    return 4;
  }

  let visible = getVisible();
  let maxIndex = Math.max(0, sliderItems.length - visible);

  // Build dots
  if (dotsContainer) {
    const totalDots = Math.ceil(sliderItems.length / visible);
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalDots; i++) {
      const dot = document.createElement('button');
      dot.className = `slider-dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i * visible));
      dotsContainer.appendChild(dot);
    }
  }

  window.slideProducts = function (direction) {
    visible = getVisible();
    maxIndex = Math.max(0, sliderItems.length - visible);
    sliderIndex = Math.max(0, Math.min(sliderIndex + direction, maxIndex));
    applySlider(visible);
  };

  function goToSlide(index) {
    visible = getVisible();
    sliderIndex = Math.min(index, maxIndex);
    applySlider(visible);
  }

  function applySlider(vis) {
    const cardWidth = sliderItems[0].offsetWidth + 20; // gap = 20
    track.style.transform = `translateX(-${sliderIndex * cardWidth}px)`;

    // Update dots
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.slider-dot');
      const activeDot = Math.floor(sliderIndex / vis);
      dots.forEach((d, i) => d.classList.toggle('active', i === activeDot));
    }
  }

  // Recalculate on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      visible = getVisible();
      maxIndex = Math.max(0, sliderItems.length - visible);
      sliderIndex = Math.min(sliderIndex, maxIndex);
      applySlider(visible);
    }, 200);
  });

  // Touch / swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      slideProducts(diff > 0 ? 1 : -1);
    }
  }, { passive: true });
}

/* ---- PRODUCT GALLERY (Product Page) ---- */
function initProductGallery() {
  const thumbs = document.querySelectorAll('.product-gallery__thumb');
  const mainImg = document.querySelector('.product-gallery__main img');
  if (!thumbs.length || !mainImg) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const newSrc = thumb.querySelector('img')?.src;
      if (!newSrc) return;

      mainImg.style.opacity = '0';
      setTimeout(() => {
        mainImg.src = newSrc;
        mainImg.style.opacity = '1';
      }, 200);

      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });
}

/* ---- VARIANT SELECTOR (Product Page) ---- */
function initVariantSelector() {
  const optionBtns = document.querySelectorAll('.option-btn');
  if (!optionBtns.length) return;

  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.option-group');
      group?.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSelectedVariant();
    });
  });
}

function updateSelectedVariant() {
  // Reads active option buttons and updates price + variant ID
  const groups = document.querySelectorAll('.option-group');
  const selectedOptions = [];
  groups.forEach(g => {
    const active = g.querySelector('.option-btn.active');
    if (active) selectedOptions.push(active.dataset.value);
  });

  // Find matching variant from window.productVariants (set in product template)
  if (!window.productVariants) return;

  const match = window.productVariants.find(v =>
    v.options.every((opt, i) => opt === selectedOptions[i])
  );

  if (!match) return;

  // Update price
  const priceEl = document.querySelector('.product-info__price');
  const compareEl = document.querySelector('.product-info__compare');
  if (priceEl) priceEl.textContent = formatMoney(match.price);
  if (compareEl && match.compare_at_price > match.price) {
    compareEl.textContent = formatMoney(match.compare_at_price);
    compareEl.style.display = 'inline';
  } else if (compareEl) {
    compareEl.style.display = 'none';
  }

  // Update ATC button variant
  const atcBtn = document.querySelector('[data-variant-id]');
  if (atcBtn) atcBtn.dataset.variantId = match.id;

  // Availability
  const atcBtnEl = document.querySelector('.atc-btn');
  if (atcBtnEl) {
    atcBtnEl.disabled = !match.available;
    atcBtnEl.textContent = match.available ? 'Add to Bag' : 'Sold Out';
  }
}

/* ---- ACCORDION (Product Page) ---- */
function initAccordions() {
  document.querySelectorAll('.accordion-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const item = toggle.closest('.accordion-item');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));

      // Open clicked (if it was closed)
      if (!isOpen) item.classList.add('open');
    });
  });

  // Open first by default
  document.querySelector('.accordion-item')?.classList.add('open');
}

/* ---- WISHLIST (UI only, localStorage) ---- */
const WISHLIST_KEY = 'boutique_wishlist';

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
  } catch {
    return [];
  }
}

function toggleWishlist(btn, productId) {
  const wishlist = getWishlist();
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

  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
}

function shareWishlist() {
  const wishlist = getWishlist();
  if (wishlist.length === 0) {
    showToast('Your wishlist is empty!', 'error');
    return;
  }
  const shareUrl = window.location.origin + window.location.pathname + '?wishlist=' + wishlist.join(',');
  navigator.clipboard.writeText(shareUrl).then(() => {
    showToast('Wishlist link copied to clipboard!');
  });
}

function syncWishlistUI() {
  // Check URL for shared wishlist items
  const urlParams = new URLSearchParams(window.location.search);
  const sharedItems = urlParams.get('wishlist');
  if (sharedItems) {
    const items = sharedItems.split(',');
    const currentList = getWishlist();
    let changed = false;
    items.forEach(item => {
      if (!currentList.includes(item)) {
        currentList.push(item);
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(currentList));
      showToast('Shared wishlist imported!');
    }
  }

  const wishlist = getWishlist();
  document.querySelectorAll('[data-product-id]').forEach(card => {
    const id = card.dataset.productId;
    const btn = card.querySelector('.wishlist-btn');
    if (btn && wishlist.includes(id)) {
      btn.classList.add('active');
    }
  });
  
  // Update full button on product page
  const fullBtn = document.querySelector('.wishlist-full-btn');
  if (fullBtn) {
    const handleMatch = fullBtn.getAttribute('onclick').match(/'([^']+)'/);
    if (handleMatch && wishlist.includes(handleMatch[1])) {
      fullBtn.classList.add('active');
    }
  }
}

/* ---- TOAST NOTIFICATION ---- */
let toastTimer;

function showToast(message, type = 'success') {
  let toast = document.getElementById('ToastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ToastNotification';
    toast.style.cssText = `
      position: fixed; bottom: 88px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #1e1410; color: #fff; padding: 12px 24px; border-radius: 100px;
      font-family: 'Jost', sans-serif; font-size: .86rem; letter-spacing: .04em;
      box-shadow: 0 8px 32px rgba(0,0,0,.25); z-index: 9999;
      opacity: 0; transition: all .3s cubic-bezier(.4,0,.2,1);
      white-space: nowrap; pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  if (type === 'error') toast.style.background = '#e85c3a';
  else toast.style.background = '#1e1410';

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

/* ---- FILTERS (Collection Page) ---- */
function toggleFilters() {
  const sidebar = document.getElementById('FilterSidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function applyFilters() {
  const form = document.createElement('form');
  form.method = 'GET';
  form.action = window.location.pathname;

  document.querySelectorAll('.filter-option input:checked').forEach(input => {
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = input.name;
    hidden.value = input.value;
    form.appendChild(hidden);
  });

  document.body.appendChild(form);
  form.submit();
}

function applySort(value) {
  const url = new URL(window.location.href);
  url.searchParams.set('sort_by', value);
  window.location.href = url.toString();
}

function removeFilter(paramName, value) {
  const url = new URL(window.location.href);
  const params = url.searchParams.getAll(paramName).filter(v => v !== value);
  url.searchParams.delete(paramName);
  params.forEach(p => url.searchParams.append(paramName, p));
  window.location.href = url.toString();
}

/* ---- QTY SELECTOR (Product Page) ---- */
function initQtySelector() {
  const qtyInput = document.querySelector('.qty-selector input');
  if (!qtyInput) return;

  document.querySelectorAll('.qty-selector button').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const current = parseInt(qtyInput.value) || 1;
      const newVal = i === 0 ? Math.max(1, current - 1) : current + 1;
      qtyInput.value = newVal;
    });
  });
}

/* ---- ADD TO CART (Product Page) ---- */
function initProductForm() {
  const form = document.getElementById('ProductForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('.atc-btn');
    const variantId = form.querySelector('[name="id"]')?.value;
    const quantity = parseInt(form.querySelector('[name="quantity"]')?.value || '1');

    if (!variantId) return;

    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<span style="display:flex;align-items:center;gap:8px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
      Adding…
    </span>`;
    btn.disabled = true;

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity })
      });

      if (!res.ok) throw new Error('Failed');

      btn.innerHTML = '✓ Added to Bag!';
      btn.style.background = '#2e7d4f';
      updateCartCount();
      await updateCartDrawer();
      openCart();

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
        btn.disabled = false;
      }, 3000);

    } catch (err) {
      showToast('Something went wrong. Try again.', 'error');
      btn.innerHTML = originalHTML;
      btn.style.background = '';
      btn.disabled = false;
    }
  });
}

/* ---- ANNOUNCEMENT BAR MARQUEE pause on hover & offscreen ---- */
(function () {
  const barWrapper = document.querySelector('.announcement-bar');
  const bar = document.querySelector('.announcement-bar p');
  if (!bar || !barWrapper) return;
  bar.addEventListener('mouseenter', () => bar.style.animationPlayState = 'paused');
  bar.addEventListener('mouseleave', () => bar.style.animationPlayState = 'running');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          bar.style.animationPlayState = 'running';
        } else {
          bar.style.animationPlayState = 'paused';
        }
      });
    }, { rootMargin: '0px' });
    observer.observe(barWrapper);
  }
})();

/* ---- LAZY IMAGE FADE IN ---- */
(function () {
  if (!('IntersectionObserver' in window)) return;
  const imgs = document.querySelectorAll('img[loading="lazy"]');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.transition = 'opacity .4s ease';
        obs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });
  imgs.forEach(img => obs.observe(img));
})();

/* ---- BACK TO TOP ---- */
(function () {
  const btn = document.getElementById('BackToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.style.opacity = window.scrollY > 600 ? '1' : '0';
    btn.style.pointerEvents = window.scrollY > 600 ? 'auto' : 'none';
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ---- COOKIE CONSENT ---- */
function acceptCookies() {
  localStorage.setItem('vasthralaya_cookies_accepted', 'true');
  document.getElementById('CookieConsent').style.display = 'none';
}

/* ---- ADD CSS FOR SPIN ANIMATION ---- */
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);

/* ---- INIT ALL ON DOM READY ---- */
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('vasthralaya_cookies_accepted')) {
    const banner = document.getElementById('CookieConsent');
    if (banner) banner.style.display = 'flex';
  }

  initSlider();
  initProductGallery();
  initVariantSelector();
  initAccordions();
  initQtySelector();
  initProductForm();
  syncWishlistUI();
  updateCartCount();

  // Open filter groups that have active selections
  document.querySelectorAll('.filter-group').forEach(group => {
    if (group.querySelector('input:checked')) {
      group.classList.add('open');
    }
  });

  /* ---- STICKY ATC OBSERVER ---- */
  const mainAtc = document.querySelector('.product-atc');
  const stickyAtc = document.getElementById('StickyATC');
  if (mainAtc && stickyAtc) {
    // Only on mobile
    if (window.innerWidth <= 768) {
      stickyAtc.style.display = 'flex';
      const atcObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            stickyAtc.classList.add('visible');
          } else {
            stickyAtc.classList.remove('visible');
          }
        });
      }, { threshold: 0 });
      atcObserver.observe(mainAtc);
    }
  }

  /* ---- RECENTLY VIEWED ---- */
  const rvKey = 'vasthralaya_rv';
  let rv = [];
  try { rv = JSON.parse(localStorage.getItem(rvKey) || '[]'); } catch(e) {}
  
  // If we are on a product page, record it
  const currentHandle = window.location.pathname.match(/\/products\/([^\/]+)/)?.[1];
  if (currentHandle) {
    rv = rv.filter(h => h !== currentHandle);
    rv.unshift(currentHandle);
    if (rv.length > 8) rv.pop();
    localStorage.setItem(rvKey, JSON.stringify(rv));
  }

  // Render Recently Viewed
  const rvSection = document.querySelector('.recently-viewed-section');
  const rvGrid = document.getElementById('RecentlyViewedGrid');
  if (rvSection && rvGrid && rv.length > 0) {
    const handlesToFetch = rv.filter(h => h !== currentHandle).slice(0, 4);
    if (handlesToFetch.length > 0) {
      rvSection.style.display = 'block';
      handlesToFetch.forEach(handle => {
        fetch('/products/' + handle + '.js')
          .then(r => r.json())
          .then(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.cssText = 'min-width: 200px; flex: 1; background: #fff; padding: 10px; border-radius: 4px;';
            card.innerHTML = `
              <a href="${product.url}">
                <img src="${product.featured_image}" alt="${product.title}" style="width: 100%; border-radius: 4px; aspect-ratio: 4/5; object-fit: cover;">
                <h4 style="font-size: 0.9rem; margin: 10px 0 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.title}</h4>
                <p style="color: var(--clr-maroon); font-weight: 500; margin: 0;">${formatMoney(product.price)}</p>
              </a>
            `;
            rvGrid.appendChild(card);
          }).catch(e => console.log('RV error', e));
      });
    }
  }
});

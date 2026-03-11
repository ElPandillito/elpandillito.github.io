(() => {
  const CART_KEY = 'jossa_cart_v1';
  const CODE_KEY = 'jossa_cart_code';
  const PRICE_BY_PRODUCT = {
    'INICIO': 699,
    'DARK LEGACY': 499,
    'DARK LEGACY MUJER': 499,
    'ASCENSO': 189,
    'SHORT AURA': 269,
    'SHORT AURA BLANCO': 269,
    'SHORT AURA AMARILLO': 269,
    'SHORT AURA GRIS': 269,
    'SHORT AURA ROSA': 269,
    'NOVA SHORTS': 269
  };
  let cart = [];
  let discountCode = '';
  let ui = {};
  let animatedTotal = 0;
  let totalAnimationFrame = null;

  const normalizeProductName = (name = '') =>
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

  const parsePriceValue = (text = '') => {
    const digits = String(text).replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  };

  const getPriceByName = (name = '') => PRICE_BY_PRODUCT[normalizeProductName(name)] || 0;
  const formatMoney = (value = 0) => `$${Math.round(value).toLocaleString('es-MX')} MXN`;
  const getUnitPrice = (item) => Number(item?.unitPrice) || getPriceByName(item?.name);
  const getCartSubtotal = () => cart.reduce((acc, item) => acc + (getUnitPrice(item) * item.qty), 0);

  const load = () => {
    try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { cart = []; }
    cart = cart.map(item => ({ ...item, unitPrice: getUnitPrice(item) }));
    try { discountCode = localStorage.getItem(CODE_KEY) || ''; }
    catch { discountCode = ''; }
  };
  const save = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const saveCode = () => localStorage.setItem(CODE_KEY, discountCode);

  const createUI = () => {
    const root = document.createElement('div');
    root.id = 'cart-root';
    root.innerHTML = `
      <div class="cart-drawer" aria-live="polite">
        <div class="cart-header">
          <div class="cart-title-row">
            <span class="cart-title">Tu carrito</span>
            <span class="cart-pill">Envío rápido</span>
          </div>
          <button class="cart-close" aria-label="Cerrar carrito">×</button>
        </div>

        <div class="cart-items"></div>

        <div class="cart-info">
          <div class="cart-alert">
            <span class="dot dot-success"></span>
            Listo para coordinar envío por WhatsApp.
          </div>
        </div>

        <div class="cart-code">
          <label for="cart-code-input">Código de descuento</label>
          <div class="cart-code-row">
            <input id="cart-code-input" type="text" placeholder="Ingresa tu código" value="">
            <button class="cart-apply">Aplicar</button>
          </div>
          <div class="cart-code-hint">Se validará al cerrar pedido por WhatsApp.</div>
        </div>

        <div class="cart-summary">
          <div class="summary-line">
            <span>Artículos</span>
            <span class="summary-items">0</span>
          </div>
          <div class="summary-line summary-line-total">
            <span>Total</span>
            <span class="summary-total">$0 MXN</span>
          </div>
          <div class="summary-line">
            <span>Código</span>
            <span class="summary-code">—</span>
          </div>
        </div>

        <div class="cart-footer">
          <button class="btn btn-primary cart-checkout">Comprar por WhatsApp</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    const toggle = document.createElement('span');
    toggle.className = 'cart-toggle';
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('tabindex', '0');
    toggle.setAttribute('aria-label', 'Abrir carrito');
    toggle.innerHTML = `
      <span class="cart-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="22" height="22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="23" cy="53" r="3"></circle>
          <circle cx="47" cy="53" r="3"></circle>
          <path d="M10 11h7l4 28h26l4-18H18"></path>
          <path d="M25 30h26"></path>
        </svg>
      </span>
      <span class="cart-count">0</span>`;

    const nav = document.querySelector('.navlinks');
    if (nav) nav.insertBefore(toggle, nav.firstChild);
    else root.appendChild(toggle);

    ui = {
      root,
      toggle,
      drawer: root.querySelector('.cart-drawer'),
      items: root.querySelector('.cart-items'),
      checkout: root.querySelector('.cart-checkout'),
      close: root.querySelector('.cart-close'),
      codeInput: root.querySelector('#cart-code-input'),
      codeApply: root.querySelector('.cart-apply'),
      summaryItems: root.querySelector('.summary-items'),
      summaryTotal: root.querySelector('.summary-total'),
      summaryCode: root.querySelector('.summary-code'),
    };
    const toggleHandler = () => root.classList.toggle('is-open');
    ui.toggle.addEventListener('click', toggleHandler);
    ui.toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHandler(); }
    });
    ui.close.addEventListener('click', () => root.classList.remove('is-open'));
    ui.checkout.addEventListener('click', checkout);
    ui.codeApply.addEventListener('click', () => {
      discountCode = (ui.codeInput.value || '').trim();
      saveCode();
      render();
    });
  };

  const animateSummaryTotal = (target, { instant = false } = {}) => {
    if (!ui.summaryTotal) return;
    const next = Number(target) || 0;
    if (totalAnimationFrame) cancelAnimationFrame(totalAnimationFrame);
    if (instant) {
      animatedTotal = next;
      ui.summaryTotal.textContent = formatMoney(next);
      return;
    }
    const start = Number(animatedTotal) || 0;
    if (start === next) {
      ui.summaryTotal.textContent = formatMoney(next);
      return;
    }
    const diff = Math.abs(next - start);
    const duration = Math.min(900, Math.max(300, 280 + diff * 0.8));
    const startTime = performance.now();
    ui.summaryTotal.classList.remove('is-bump');
    // Force reflow so the bump animation can replay on each change.
    void ui.summaryTotal.offsetWidth;
    ui.summaryTotal.classList.add('is-bump');

    const frame = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (next - start) * eased;
      animatedTotal = current;
      ui.summaryTotal.textContent = formatMoney(current);
      if (progress < 1) {
        totalAnimationFrame = requestAnimationFrame(frame);
      } else {
        animatedTotal = next;
        ui.summaryTotal.textContent = formatMoney(next);
        totalAnimationFrame = null;
      }
    };
    totalAnimationFrame = requestAnimationFrame(frame);
  };

  const render = ({ instantTotal = false } = {}) => {
    if (!ui.items) return;
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    const subtotal = getCartSubtotal();
    const countEl = ui.toggle.querySelector('.cart-count');
    if (countEl) countEl.textContent = count;
    if (!cart.length) {
      ui.items.innerHTML = `<p class="cart-empty">Tu carrito está vacío.</p>`;
      if (ui.summaryItems) ui.summaryItems.textContent = '0';
      animateSummaryTotal(0, { instant: instantTotal });
      if (ui.summaryCode) ui.summaryCode.textContent = '—';
      return;
    }
    ui.items.innerHTML = cart.map((item, idx) => `
      <div class="cart-item">
        <a class="cart-thumb" href="${item.image || '#'}" target="_blank" rel="noopener">
          <img src="${item.image || 'images/placeholder.png'}" alt="${item.name}">
        </a>
        <div class="cart-meta">
          <div class="cart-name">${item.name}</div>
          <div class="cart-size">Talla: ${item.size} | Cant: ${item.qty}</div>
          <div class="cart-price">${formatMoney(getUnitPrice(item))} c/u</div>
        </div>
        <button class="cart-remove" data-idx="${idx}" aria-label="Eliminar">×</button>
      </div>
    `).join('');
    ui.items.querySelectorAll('.cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        cart.splice(idx, 1);
        save(); render();
      });
    });

    if (ui.codeInput) ui.codeInput.value = discountCode;
    if (ui.summaryItems) ui.summaryItems.textContent = `${count}`;
    animateSummaryTotal(subtotal, { instant: instantTotal });
    if (ui.summaryCode) ui.summaryCode.textContent = discountCode ? discountCode : '—';
  };

  const getPriceFromButton = (btn, productName) => {
    const direct = parsePriceValue(btn?.dataset?.price || '');
    if (direct) return direct;

    const section = btn?.closest('.page-hero, .product-card, .card, section, body') || document.body;
    const priceEl = section.querySelector('.price-tag, .price');
    const visible = parsePriceValue(priceEl?.textContent || '');
    if (visible) return visible;

    return getPriceByName(productName);
  };

  const addItem = ({ id, name, size, image, link, unitPrice }) => {
    if (!size) return alert('Selecciona una talla antes de agregar.');
    const existing = cart.find(i => i.id === id && i.size === size);
    if (existing) {
      existing.qty += 1;
      if (!Number(existing.unitPrice)) existing.unitPrice = unitPrice || getPriceByName(name);
    } else {
      cart.push({ id, name, size, image, link, qty: 1, unitPrice: unitPrice || getPriceByName(name) });
    }
    save();
    render();
    openDrawer();
  };

  const openDrawer = () => ui.root?.classList.add('is-open');

  const initSizePickers = () => {
    document.querySelectorAll('.size-picker').forEach(picker => {
      const buttons = picker.querySelectorAll('.size-btn');
      const output = picker.querySelector('.size-picker__value');
      const fallback = buttons[0]?.dataset.size || 'M';
      let selected = picker.dataset.selected || fallback;

      const setSelected = (size) => {
        selected = size;
        if (output) output.textContent = size;
        buttons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.size === size));
      };

      buttons.forEach(btn => btn.addEventListener('click', () => setSelected(btn.dataset.size)));
      setSelected(selected);
    });
  };

  const checkout = () => {
    if (!cart.length) return alert('Tu carrito está vacío.');
    const lines = cart.map((item, i) =>
      `${i + 1}) ${item.name} | Talla: ${item.size} | Cant: ${item.qty} | ${formatMoney(getUnitPrice(item))} c/u`);
    const subtotal = getCartSubtotal();
    const msg = [
      'Hola JOSSA ATHLETICS 👋',
      'Pedido desde el sitio:',
      ...lines,
      '',
      `Total estimado: ${formatMoney(subtotal)}`,
      discountCode ? `Código: ${discountCode}` : '',
      '',
      'Envío:',
      'Nombre:',
      'Ciudad:',
      'Dirección:',
      'Método de pago:'
    ].join('%0A');
    const url = `https://wa.me/523332510644?text=${msg}`;
    window.open(url, '_blank');
  };

  const attachButtons = () => {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const sizeEl = btn.closest('body').querySelector('.size-picker__value');
        const size = sizeEl ? sizeEl.textContent.trim() : '';
        const productName = btn.dataset.product || 'Producto';
        const unitPrice = getPriceFromButton(btn, productName);
        addItem({
          id: `${btn.dataset.product || 'ITEM'}-${size}`,
          name: productName,
          size,
          image: btn.dataset.image || '',
          link: btn.dataset.link || location.pathname,
          unitPrice
        });
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    createUI();
    load();
    render({ instantTotal: true });
    initSizePickers();
    attachButtons();
  });

  // Expose for dynamic sections if needed
  window.initSizePickers = initSizePickers;
})();

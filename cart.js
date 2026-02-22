(() => {
  const CART_KEY = 'jossa_cart_v1';
  const CODE_KEY = 'jossa_cart_code';
  let cart = [];
  let discountCode = '';
  let ui = {};

  const load = () => {
    try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { cart = []; }
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

  const render = () => {
    if (!ui.items) return;
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    const countEl = ui.toggle.querySelector('.cart-count');
    if (countEl) countEl.textContent = count;
    if (!cart.length) {
      ui.items.innerHTML = `<p class="cart-empty">Tu carrito está vacío.</p>`;
      if (ui.summaryItems) ui.summaryItems.textContent = '0';
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
          <div class="cart-size">Talla: ${item.size}</div>
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
    if (ui.summaryCode) ui.summaryCode.textContent = discountCode ? discountCode : '—';
  };

  const addItem = ({ id, name, size, image, link }) => {
    if (!size) return alert('Selecciona una talla antes de agregar.');
    const existing = cart.find(i => i.id === id && i.size === size);
    if (existing) existing.qty += 1;
    else cart.push({ id, name, size, image, link, qty: 1 });
    save(); render(); openDrawer();
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
      `${i + 1}) ${item.name} | Talla: ${item.size} | Cant: ${item.qty}`);
    const msg = [
      'Hola JOSSA ATHLETICS 👋',
      'Pedido desde el sitio:',
      ...lines,
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
        addItem({
          id: `${btn.dataset.product || 'ITEM'}-${size}`,
          name: btn.dataset.product || 'Producto',
          size,
          image: btn.dataset.image || '',
          link: btn.dataset.link || location.pathname
        });
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    createUI();
    load();
    render();
    initSizePickers();
    attachButtons();
  });

  // Expose for dynamic sections if needed
  window.initSizePickers = initSizePickers;
})();

(() => {
  const config = window.productGalleryConfig;
  if (!config) return;

  const mainImage = document.getElementById(config.mainImageId || 'product-main-image');
  const thumbsWrap = document.getElementById(config.thumbsId || 'product-thumbs');
  if (!mainImage || !thumbsWrap) return;

  const galleryCopy = document.getElementById(config.galleryCopyId || 'product-gallery-copy');
  const colorValue = document.getElementById(config.colorValueId || 'product-color-value');
  const colorButtons = Array.from(document.querySelectorAll(config.colorButtonsSelector || '.aura-color[data-color]'));
  const addToCart = config.addToCartSelector ? document.querySelector(config.addToCartSelector) : document.querySelector('.add-to-cart');
  const buyNow = config.buyNowSelector ? document.querySelector(config.buyNowSelector) : null;
  const preloadPromises = new Map();

  mainImage.decoding = 'async';
  mainImage.fetchPriority = 'high';

  const preloadImage = (src) => {
    if (!src) return Promise.resolve('');
    if (preloadPromises.has(src)) return preloadPromises.get(src);

    const task = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(src);
      img.onerror = () => resolve('');
      img.src = src;
    });

    preloadPromises.set(src, task);
    return task;
  };

  const warmImages = (images = []) => {
    images.forEach((src) => {
      preloadImage(src);
    });
  };

  const imageExists = (src) =>
    new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(true);
      probe.onerror = () => resolve(false);
      probe.src = src;
    });

  const findImageByBase = async (basePath) => {
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    for (const ext of extensions) {
      const candidate = `${basePath}.${ext}`;
      // eslint-disable-next-line no-await-in-loop
      if (await imageExists(candidate)) return candidate;
    }
    return '';
  };

  const resolveImagesFromPrefix = async (prefix) => {
    const images = [];
    let misses = 0;
    for (let index = 1; index <= 40; index += 1) {
      const base = `${prefix}${String(index).padStart(2, '0')}`;
      // eslint-disable-next-line no-await-in-loop
      const found = await findImageByBase(base);
      if (found) {
        images.push(found);
        misses = 0;
      } else if (images.length > 0) {
        misses += 1;
        if (misses >= 3) break;
      }
    }
    return images;
  };

  const setMain = (src, alt, pos = config.objectPosition || 'center 12%') => {
    mainImage.src = src || config.defaultImage || '';
    mainImage.alt = alt || config.defaultAlt || config.productName || 'JOSSA ATHLETICS';
    mainImage.style.objectPosition = pos;
    if (addToCart && src) addToCart.dataset.image = src;
    preloadImage(src);
  };

  const updateCommerce = (meta = {}, images = []) => {
    const primaryImage = images[0] || config.defaultImage || '';
    const label = meta.label || '';

    if (colorValue && label) colorValue.textContent = label;
    if (galleryCopy) {
      galleryCopy.textContent = meta.copy || config.defaultCopy || '';
    }
    if (addToCart) {
      const productName = meta.product || config.productName || addToCart.dataset.product || 'Producto';
      addToCart.dataset.product = productName;
      if (primaryImage) addToCart.dataset.image = primaryImage;
    }
    if (buyNow && typeof config.buildBuyNowHref === 'function') {
      buyNow.href = config.buildBuyNowHref(meta, images);
    }
  };

  const renderThumbs = (images, meta = {}) => {
    if (!images.length) {
      thumbsWrap.innerHTML = `<div class="aura-loading">${config.emptyMessage || 'Agrega imagenes a esta coleccion.'}</div>`;
      setMain(config.defaultImage || '', config.defaultAlt || config.productName || 'JOSSA ATHLETICS');
      updateCommerce(meta, []);
      return;
    }

    thumbsWrap.innerHTML = '';
    images.forEach((path, index) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = `nova-thumb${index === 0 ? ' is-active' : ''}`;
      thumb.setAttribute('role', 'tab');
      thumb.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      thumb.setAttribute('aria-label', `Ver imagen ${index + 1}`);
      thumb.dataset.full = path;
      thumb.dataset.alt = meta.thumbAltBuilder
        ? meta.thumbAltBuilder(path, index)
        : `${meta.label || config.productName || 'JOSSA ATHLETICS'} ${String(index + 1).padStart(2, '0')}`;
      thumb.innerHTML = `<img src="${path}" alt="${thumb.dataset.alt}" loading="lazy" decoding="async">`;

      thumb.addEventListener('click', () => {
        Array.from(thumbsWrap.querySelectorAll('.nova-thumb')).forEach((button) => {
          button.classList.remove('is-active');
          button.setAttribute('aria-selected', 'false');
        });
        thumb.classList.add('is-active');
        thumb.setAttribute('aria-selected', 'true');
        setMain(thumb.dataset.full, thumb.dataset.alt, config.objectPosition || 'center 12%');
      });

      thumbsWrap.appendChild(thumb);
    });

    warmImages(images);
    setMain(images[0], thumbsWrap.querySelector('.nova-thumb')?.dataset.alt || config.defaultAlt || '');
    updateCommerce(meta, images);
  };

  const resolveMetaImages = async (meta = {}) => {
    if (Array.isArray(meta.images) && meta.images.length) return meta.images;

    const found = [];
    for (const prefix of meta.prefixes || []) {
      // eslint-disable-next-line no-await-in-loop
      const resolved = await resolveImagesFromPrefix(prefix);
      found.push(...resolved);
    }
    const unique = Array.from(new Set(found));
    if (unique.length) return unique;

    const fallback = [];
    for (const path of meta.fallback || []) {
      // eslint-disable-next-line no-await-in-loop
      if (await imageExists(path)) fallback.push(path);
    }
    return fallback;
  };

  let requestId = 0;

  const setVariant = async (key) => {
    const currentRequestId = ++requestId;
    const meta = (config.colors && config.colors[key]) || {};

    colorButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.color === key);
    });

    thumbsWrap.innerHTML = '<div class="aura-loading">Cargando fotos...</div>';
    const images = await resolveMetaImages(meta);
    if (currentRequestId !== requestId) return;
    renderThumbs(images, meta);
  };

  if (config.colors && colorButtons.length) {
    colorButtons.forEach((button) => {
      button.addEventListener('click', () => setVariant(button.dataset.color || config.defaultVariant || ''));
    });
    setVariant(config.defaultVariant || colorButtons.find((button) => button.classList.contains('is-active'))?.dataset.color || '');
    return;
  }

  renderThumbs(config.images || [], {
    label: config.productName || 'JOSSA ATHLETICS',
    copy: config.defaultCopy || '',
    product: config.productName || ''
  });
})();

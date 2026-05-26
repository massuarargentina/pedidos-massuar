const frame = document.getElementById('formFrame');
const formPanel = document.getElementById('formPanel');
const cartItems = document.getElementById('cartItems');
const selectedProducts = document.getElementById('selectedProducts');
const totalUnits = document.getElementById('totalUnits');
const clearCart = document.getElementById('clearCart');

let frameDoc = null;
let lastSignature = '';
let thankYouHandled = false;
let submitPending = false;

function getDoc() {
  try { return frame.contentDocument || frame.contentWindow.document; }
  catch (e) { return null; }
}

function cleanName(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/Precio:\s*\$?\s*0[,.]01/gi, '')
    .replace(/\$\s*0[,.]01/g, '')
    .trim();
}

function findProductName(product) {
  const selectors = ['.form-product-name', '.form-product-details b', '.form-product-details', 'label', '.form-product-container'];
  for (const selector of selectors) {
    const el = product.querySelector(selector);
    const name = cleanName(el && el.textContent);
    if (name && !/^\$?\s*0[,.]01$/.test(name)) return name;
  }
  return 'Producto sin nombre';
}

function getQuantityInputs() {
  const doc = getDoc();
  if (!doc) return [];
  return Array.from(doc.querySelectorAll('.form-product-custom_quantity, input[id*="_quantity_"]'));
}

function setEmptyCart(message = 'Todavía no seleccionaste productos.') {
  lastSignature = '';
  selectedProducts.textContent = '0';
  totalUnits.textContent = '0';
  cartItems.className = 'cart-items empty';
  cartItems.textContent = message;
}

function updateCart() {
  const doc = getDoc();
  if (!doc) return;
  if (isThankYouPage(doc)) return;

  const items = [];
  const quantityInputs = getQuantityInputs();

  quantityInputs.forEach(input => {
    const qty = parseInt(input.value, 10) || 0;
    if (qty <= 0) return;

    const product = input.closest('.form-product-item') || input.closest('li') || input.parentElement;
    const name = product ? findProductName(product) : 'Producto';
    items.push({ name, qty });
  });

  const signature = JSON.stringify(items);
  if (signature === lastSignature) return;
  lastSignature = signature;

  const total = items.reduce((sum, item) => sum + item.qty, 0);
  selectedProducts.textContent = items.length;
  totalUnits.textContent = total;

  if (!items.length) {
    setEmptyCart();
    return;
  }

  cartItems.className = 'cart-items';
  cartItems.innerHTML = items.map(item => `
    <div class="cart-item">
      <strong>${escapeHtml(item.name)}</strong>
      <span>Cantidad: ${item.qty}</span>
    </div>
  `).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isThankYouPage(doc) {
  const text = (doc.body && doc.body.innerText || '').toLowerCase();
  const hasThanks = text.includes('¡gracias') || (text.includes('gracias') && text.includes('orden de pedido')) || text.includes('thank you');
  const hasThankYouNode = !!doc.querySelector('.thankyou, .form-thankyou, #stage .thankyou, [class*="thank"], [id*="thank"]');
  return hasThanks || hasThankYouNode;
}

function markSubmitPending() {
  submitPending = true;
  setTimeout(handleThankYouIfNeeded, 1200);
  setTimeout(handleThankYouIfNeeded, 2500);
  setTimeout(handleThankYouIfNeeded, 4500);
}

function showSubmittedState() {
  if (thankYouHandled) return;
  thankYouHandled = true;
  submitPending = false;
  setEmptyCart('Pedido enviado correctamente. Gracias.');
  formPanel.classList.add('submitted');
  frame.style.height = '520px';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleThankYouIfNeeded() {
  const doc = getDoc();

  // Después de enviar, Jotform puede cargar una página externa dentro del iframe.
  // En ese caso el navegador no nos deja leerla, pero podemos limpiar carrito y ocultar el pie desde afuera.
  if (!doc && submitPending) {
    showSubmittedState();
    return;
  }

  if (!doc || thankYouHandled) return;

  if (isThankYouPage(doc)) {
    showSubmittedState();
    hideJotformBranding(doc);
    return;
  }
}

function hideJotformBranding(doc) {
  if (!doc || !doc.head) return;
  if (doc.getElementById('massuar-hide-jotform-branding')) return;

  const style = doc.createElement('style');
  style.id = 'massuar-hide-jotform-branding';
  style.textContent = `
    .jf-branding,
    .formFooter,
    .formFooter-wrapper,
    .formFooter-content,
    .formFooter-heightMask,
    .formFooter-leftSide,
    .formFooter-rightSide,
    [class*="branding"],
    [class*="Branding"],
    a[href*="jotform.com"],
    a[href*="jotfor.ms"] { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; }
  `;
  doc.head.appendChild(style);
}

function injectFrameHelpers() {
  const doc = getDoc();
  if (!doc) return;

  hideJotformBranding(doc);

  if (frameDoc === doc) return;
  frameDoc = doc;
  thankYouHandled = false;
  formPanel.classList.remove('submitted');

  const style = doc.createElement('style');
  style.textContent = `
    .form-product-item .form-product-details [class*="price"],
    .form-product-item .form-product-price,
    .form-product-item .payment-product-price,
    .form-product-item .currency_abr,
    .form-product-item .form-product-subtotal,
    .form-product-item [data-wrapper-react="true"] .form-product-price,
    #coupon-container,
    .form-payment-total,
    .form-payment-subtotal { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
  `;
  doc.head.appendChild(style);

  doc.addEventListener('input', updateCart, true);
  doc.addEventListener('change', updateCart, true);
  doc.addEventListener('keyup', updateCart, true);

  const form = doc.querySelector('form.jotform-form, form');
  if (form) form.addEventListener('submit', markSubmitPending, true);

  const submitButtons = doc.querySelectorAll('button[type="submit"], input[type="submit"], #input_2, .form-submit-button');
  submitButtons.forEach(btn => btn.addEventListener('click', markSubmitPending, true));
}

function resizeFrame() {
  if (formPanel.classList.contains('submitted')) return;
  const doc = getDoc();
  if (!doc || !doc.body) return;
  const height = Math.max(
    doc.body.scrollHeight,
    doc.documentElement ? doc.documentElement.scrollHeight : 0,
    900
  );
  frame.style.height = `${height + 60}px`;
}

clearCart.addEventListener('click', () => {
  getQuantityInputs().forEach(input => {
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  setEmptyCart();
  updateCart();
});

frame.addEventListener('load', () => {
  // Si el iframe cargó y ya no se puede leer, normalmente es porque Jotform mostró el agradecimiento remoto.
  if (submitPending && !getDoc()) {
    showSubmittedState();
    return;
  }
  injectFrameHelpers();
  handleThankYouIfNeeded();
  updateCart();
  resizeFrame();
});

setInterval(() => {
  injectFrameHelpers();
  handleThankYouIfNeeded();
  updateCart();
  resizeFrame();
}, 700);

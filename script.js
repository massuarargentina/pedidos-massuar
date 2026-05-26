const frame = document.getElementById('formFrame');
const cartItems = document.getElementById('cartItems');
const selectedProducts = document.getElementById('selectedProducts');
const totalUnits = document.getElementById('totalUnits');
const clearCart = document.getElementById('clearCart');
let frameDoc = null;
let lastSignature = '';

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

function updateCart() {
  const doc = getDoc();
  if (!doc) return;

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
    cartItems.className = 'cart-items empty';
    cartItems.textContent = 'Todavía no seleccionaste productos.';
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

function injectFrameHelpers() {
  const doc = getDoc();
  if (!doc || frameDoc === doc) return;
  frameDoc = doc;

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
    .form-payment-subtotal { display: none !important; }
  `;
  doc.head.appendChild(style);

  doc.addEventListener('input', updateCart, true);
  doc.addEventListener('change', updateCart, true);
  doc.addEventListener('keyup', updateCart, true);
}

function resizeFrame() {
  const doc = getDoc();
  if (!doc || !doc.body) return;
  const height = Math.max(
    doc.body.scrollHeight,
    doc.documentElement ? doc.documentElement.scrollHeight : 0,
    1400
  );
  frame.style.height = `${height + 60}px`;
}

clearCart.addEventListener('click', () => {
  getQuantityInputs().forEach(input => {
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  lastSignature = '';
  updateCart();
});

frame.addEventListener('load', () => {
  injectFrameHelpers();
  updateCart();
  resizeFrame();
});

setInterval(() => {
  injectFrameHelpers();
  updateCart();
  resizeFrame();
}, 700);

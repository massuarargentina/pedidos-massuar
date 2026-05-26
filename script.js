const frame = document.getElementById('formFrame');
const cartItems = document.getElementById('cartItems');
const selectedProducts = document.getElementById('selectedProducts');
const totalUnits = document.getElementById('totalUnits');
const clearCart = document.getElementById('clearCart');
let frameDoc = null;
let lastSignature = '';
let thankYouHandled = false;

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
  const hasThanks = text.includes('¡gracias') || text.includes('gracias') && text.includes('orden de pedido ha sido recibida');
  const hasThankYouNode = !!doc.querySelector('.thankyou, .form-thankyou, #stage .thankyou, [class*="thank"]');
  return hasThanks || hasThankYouNode;
}

function handleThankYouIfNeeded() {
  const doc = getDoc();
  if (!doc || thankYouHandled || !isThankYouPage(doc)) return;

  thankYouHandled = true;
  setEmptyCart('Pedido enviado correctamente. Gracias.');

  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resizeFrame();
  }, 5000);
}

function injectFrameHelpers() {
  const doc = getDoc();
  if (!doc || frameDoc === doc) return;
  frameDoc = doc;
  thankYouHandled = false;

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
    .form-payment-subtotal,
    .jf-branding,
    .formFooter,
    .formFooter-wrapper,
    .formFooter-content,
    .formFooter-heightMask,
    .formFooter-leftSide,
    .formFooter-rightSide,
    a[href*="jotform.com"],
    a[href*="jotfor.ms"] { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
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
  injectFrameHelpers();
  updateCart();
  handleThankYouIfNeeded();
  resizeFrame();
});

setInterval(() => {
  injectFrameHelpers();
  handleThankYouIfNeeded();
  updateCart();
  resizeFrame();
}, 700);



/* MASSUAR v3.3 - buscador, resaltado y aviso si no hay productos */
(function(){
  function qtyValue(input){
    const n = parseInt(String(input && input.value || '').replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function getProductFromInput(input){
    return input.closest('.form-product-item') ||
           input.closest('.form-product-container') ||
           input.closest('[data-wrapper-react="true"]') ||
           input.closest('li') ||
           input.parentElement;
  }

  function getProductText(product){
    return (product && product.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function allQtyInputs(){
    return Array.from(document.querySelectorAll('.form-product-custom_quantity'));
  }

  function selectedQtyInputs(){
    return allQtyInputs().filter(input => qtyValue(input) > 0);
  }

  function showWarning(message){
    let box = document.querySelector('.massuar-empty-order-warning');
    if(!box){
      box = document.createElement('div');
      box.className = 'massuar-empty-order-warning';
      document.body.appendChild(box);
    }
    box.textContent = message;
    clearTimeout(window.__massuarWarningTimer);
    window.__massuarWarningTimer = setTimeout(() => box.remove(), 3500);
  }

  function highlightSelectedProducts(){
    allQtyInputs().forEach(input => {
      const product = getProductFromInput(input);
      if(!product) return;

      const selected = qtyValue(input) > 0;
      product.classList.toggle('massuar-product-selected', selected);

      const nameEl = product.querySelector('.form-product-name') || product.querySelector('label') || product;
      let badge = product.querySelector('.massuar-selected-badge');

      if(selected && !badge && nameEl){
        badge = document.createElement('span');
        badge.className = 'massuar-selected-badge';
        badge.textContent = 'Seleccionado';
        nameEl.appendChild(badge);
      }

      if(!selected && badge){
        badge.remove();
      }
    });
  }

  function applySearch(){
    const input = document.getElementById('productSearch');
    const status = document.getElementById('searchStatus');
    if(!input) return;

    const term = input.value.trim().toLowerCase();
    let total = 0;
    let visible = 0;

    const products = Array.from(document.querySelectorAll('.form-product-item'));
    products.forEach(product => {
      total++;
      const text = getProductText(product).toLowerCase();
      const match = !term || text.includes(term);
      product.classList.toggle('massuar-product-hidden', !match);
      if(match) visible++;
    });

    if(status){
      if(!term) status.textContent = '';
      else status.textContent = visible ? `${visible} producto(s) encontrado(s).` : 'No se encontraron productos.';
    }
  }

  function preventEmptySubmit(event){
    const form = event.target && event.target.closest ? event.target.closest('form.jotform-form') : null;
    if(!form) return;

    if(selectedQtyInputs().length === 0){
      event.preventDefault();
      event.stopPropagation();
      showWarning('Agregá al menos un producto antes de enviar el pedido.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
  }

  function bindV33(){
    document.addEventListener('input', function(e){
      if(e.target && e.target.classList && e.target.classList.contains('form-product-custom_quantity')){
        highlightSelectedProducts();
      }
      if(e.target && e.target.id === 'productSearch'){
        applySearch();
      }
    }, true);

    document.addEventListener('change', function(e){
      if(e.target && e.target.classList && e.target.classList.contains('form-product-custom_quantity')){
        highlightSelectedProducts();
      }
    }, true);

    document.addEventListener('submit', preventEmptySubmit, true);

    document.addEventListener('click', function(e){
      if(e.target && e.target.id === 'clearSearch'){
        const search = document.getElementById('productSearch');
        if(search){
          search.value = '';
          applySearch();
          search.focus();
        }
      }
    }, true);

    const obs = new MutationObserver(function(){
      highlightSelectedProducts();
      applySearch();
    });
    obs.observe(document.body, {childList:true, subtree:true});

    setInterval(highlightSelectedProducts, 1500);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindV33);
  }else{
    bindV33();
  }
})();

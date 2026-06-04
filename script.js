const frame = document.getElementById('formFrame');
const cartItems = document.getElementById('cartItems');
const selectedProducts = document.getElementById('selectedProducts');
const totalUnits = document.getElementById('totalUnits');
const clearCart = document.getElementById('clearCart');
const finishOrder = document.getElementById('finishOrder');
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

function hideThankYouBranding(doc) {
  if (!doc || !doc.head) return;

  if (!doc.getElementById('massuar-thankyou-style')) {
    const style = doc.createElement('style');
    style.id = 'massuar-thankyou-style';
    style.textContent = `
      .jf-branding,
      .formFooter,
      .formFooter-wrapper,
      .formFooter-content,
      .formFooter-heightMask,
      .formFooter-leftSide,
      .formFooter-rightSide,
      .thankyou-footer,
      .jfThankYou-footer,
      .jotform-ad,
      .jotform-ad-wrapper,
      [class*="branding"],
      [class*="Branding"],
      [class*="footer"] a[href*="jotform"],
      a[href*="jotform.com"],
      a[href*="jotfor.ms"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
      }

      .massuar-thankyou-actions {
        display: flex !important;
        justify-content: center !important;
        margin: 28px auto 0 !important;
        width: 100% !important;
        position: relative !important;
        z-index: 9999 !important;
      }

      .massuar-exit-button {
        border: 0 !important;
        border-radius: 14px !important;
        padding: 16px 56px !important;
        min-width: 280px !important;
        max-width: 420px !important;
        background: #46552a !important;
        color: #fff !important;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        font-size: 18px !important;
        font-weight: 900 !important;
        cursor: pointer !important;
        box-shadow: 0 10px 22px rgba(70,85,42,.18) !important;
      }

      .massuar-exit-button:hover {
        filter: brightness(.96) !important;
      }
    `;
    doc.head.appendChild(style);
  }

  Array.from(doc.querySelectorAll('a[href*="jotform.com"], a[href*="jotfor.ms"]')).forEach(link => {
    let node = link;
    for (let i = 0; i < 4 && node && node.parentElement && node.parentElement !== doc.body; i += 1) {
      const text = (node.parentElement.innerText || '').toLowerCase();
      if (text.includes('create your own jotform') || text.includes('jotform') || text.includes('it’s free') || text.includes("it's free")) {
        node = node.parentElement;
      }
    }
    if (node && node !== doc.body) {
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('height', '0', 'important');
      node.style.setProperty('overflow', 'hidden', 'important');
    }
  });
}

function addExitButtonToThankYou(doc) {
  if (!doc || doc.getElementById('massuarExitButton')) return;

  const wrap = doc.createElement('div');
  wrap.className = 'massuar-thankyou-actions';

  const button = doc.createElement('button');
  button.id = 'massuarExitButton';
  button.className = 'massuar-exit-button';
  button.type = 'button';
  button.textContent = 'Salir';

  button.addEventListener('click', () => {
    sessionStorage.removeItem('massuar_access_ok');
    window.location.reload();
  });

  wrap.appendChild(button);

  const thankYouBox = doc.querySelector('.thankyou, .form-thankyou, [class*="thank"], #stage');
  if (thankYouBox && thankYouBox !== doc.body) {
    thankYouBox.appendChild(wrap);
  } else {
    doc.body.appendChild(wrap);
  }
}

function handleThankYouIfNeeded() {
  const doc = getDoc();
  if (!doc || !isThankYouPage(doc)) return;

  hideThankYouBranding(doc);
  addExitButtonToThankYou(doc);

  if (thankYouHandled) return;
  thankYouHandled = true;
  setEmptyCart('Pedido enviado correctamente. Gracias.');

  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resizeFrame();
  }, 700);
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


function findSubmitButton(doc) {
  if (!doc) return null;

  return doc.querySelector(
    '#input_2, button[type="submit"], input[type="submit"], .form-submit-button, .jf-form-buttons button, .submit-button'
  );
}

function finishOrderFromCart() {
  const doc = getDoc();
  const submitButton = findSubmitButton(doc);

  if (!submitButton) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    return;
  }

  submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    submitButton.click();
    resizeFrame();
  }, 350);
}

if (finishOrder) {
  finishOrder.addEventListener('click', finishOrderFromCart);
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



/* MASSUAR - acceso con contraseña simple
   Cambiar la clave editando MASSUAR_PASSWORD.
   Nota: esto es una barrera simple para clientes, no seguridad bancaria.
*/
(function(){
  const MASSUAR_PASSWORD = "MASSUAR";

  const gate = document.getElementById("accessGate");
  const content = document.getElementById("protectedContent");
  const form = document.getElementById("accessForm");
  const input = document.getElementById("accessPassword");
  const error = document.getElementById("accessError");

  if(!gate || !content || !form || !input) return;

  function unlock(){
    gate.style.display = "none";
    content.hidden = false;
    sessionStorage.setItem("massuar_access_ok", "1");
    setTimeout(function(){
      window.dispatchEvent(new Event("resize"));
    }, 300);
  }

  if(sessionStorage.getItem("massuar_access_ok") === "1"){
    unlock();
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    if(input.value.trim() === MASSUAR_PASSWORD){
      unlock();
    }else{
      error.textContent = "Contraseña incorrecta.";
      input.focus();
      input.select();
    }
  });
})();

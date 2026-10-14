// Kate's Cookies cart. Stores { cookieId: dozens } in localStorage.
(function () {
  "use strict";

  var STORAGE_KEY = "katescookies-cart";
  var MAX_QTY = 99;

  var menu = {};
  try {
    menu = JSON.parse(document.getElementById("menu-data").textContent);
  } catch (e) { /* no menu data: cart stays empty */ }

  // ---- Storage (falls back to memory if localStorage is unavailable) ----
  var memoryCart = {};

  function readCart() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { raw = memoryCart; }
    var cart = {};
    // Drop anything no longer on the menu and clamp quantities.
    Object.keys(raw || {}).forEach(function (id) {
      var qty = clampQty(raw[id]);
      if (menu[id] && qty) cart[id] = qty;
    });
    return cart;
  }

  function writeCart(cart) {
    memoryCart = cart;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* memory only */ }
    render();
  }

  function clampQty(n) {
    n = parseInt(n, 10);
    if (!n || n < 1) return 0;
    return Math.min(n, MAX_QTY);
  }

  function addItem(id, qty) {
    var cart = readCart();
    var current = cart[id] || 0;
    cart[id] = clampQty(current + qty);
    writeCart(cart);
    return { added: cart[id] - current, total: cart[id] };
  }

  function setItem(id, qty) {
    var cart = readCart();
    qty = clampQty(qty);
    if (qty) cart[id] = qty; else delete cart[id];
    writeCart(cart);
  }

  function clearCart() { writeCart({}); }

  // ---- Helpers ----
  function money(n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function dozen(n) { return n + " dozen"; }

  function lineItems(cart) {
    return Object.keys(cart).map(function (id) {
      var item = menu[id];
      return { id: id, name: item.name, qty: cart[id], price: item.price, subtotal: item.price * cart[id] };
    });
  }

  function cartTotals(cart) {
    return lineItems(cart).reduce(function (t, line) {
      t.qty += line.qty;
      t.price += line.subtotal;
      return t;
    }, { qty: 0, price: 0 });
  }

  function qtySelect(selected, id, label) {
    var select = document.createElement("select");
    if (id) select.id = id;
    select.setAttribute("aria-label", label);
    for (var n = 1; n <= MAX_QTY; n++) {
      var opt = document.createElement("option");
      opt.value = n;
      opt.textContent = dozen(n);
      if (n === selected) opt.selected = true;
      select.appendChild(opt);
    }
    return select;
  }

  // ---- Toast ----
  var toastTimer;
  function toast(message) {
    var el = document.querySelector("[data-toast]");
    if (!el) return;
    el.innerHTML = "";
    el.appendChild(document.createTextNode(message + " "));
    var link = document.createElement("a");
    link.href = el.getAttribute("data-cart-url");
    link.textContent = "View cart";
    el.appendChild(link);
    el.hidden = false;
    // Force reflow so the transition replays on rapid adds.
    el.classList.remove("is-visible");
    void el.offsetWidth;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 3500);
  }

  // ---- Rendering ----
  function render() {
    var cart = readCart();
    var totals = cartTotals(cart);

    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = totals.qty;
      el.hidden = totals.qty === 0;
    });

    var list = document.querySelector("[data-cart-items]");
    if (!list) return;

    var lines = lineItems(cart);
    list.innerHTML = "";
    lines.forEach(function (line) {
      var li = document.createElement("li");
      li.className = "cart-item";

      var info = document.createElement("div");
      info.className = "cart-item__info";
      var name = document.createElement("span");
      name.className = "cart-item__name";
      name.textContent = line.name;
      var each = document.createElement("span");
      each.className = "cart-item__each muted small";
      each.textContent = money(line.price) + " / dozen";
      info.appendChild(name);
      info.appendChild(each);

      var select = qtySelect(line.qty, "cart-qty-" + line.id, "Dozens of " + line.name);
      select.addEventListener("change", function () { setItem(line.id, select.value); });

      var subtotal = document.createElement("span");
      subtotal.className = "cart-item__subtotal";
      subtotal.textContent = money(line.subtotal);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "cart-item__remove";
      remove.setAttribute("aria-label", "Remove " + line.name);
      remove.innerHTML = "&times;";
      remove.addEventListener("click", function () { setItem(line.id, 0); });

      li.appendChild(info);
      li.appendChild(select);
      li.appendChild(subtotal);
      li.appendChild(remove);
      list.appendChild(li);
    });

    var empty = lines.length === 0;
    document.querySelector("[data-cart-empty]").hidden = !empty;
    document.querySelectorAll("[data-cart-total-row]").forEach(function (el) { el.hidden = empty; });
    document.querySelector("[data-cart-total]").textContent = money(totals.price);
  }

  // ---- Add-to-cart forms on menu cards ----
  document.querySelectorAll("form.add-to-cart").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var id = form.getAttribute("data-cookie-id");
      var qty = clampQty(form.qty.value);
      if (!menu[id] || !qty) return;
      var result = addItem(id, qty);
      if (result.added === 0) {
        toast("You already have the maximum (" + MAX_QTY + " dozen) of " + menu[id].name + ".");
      } else {
        toast("Added " + dozen(result.added) + " " + menu[id].name + ".");
      }
      form.qty.value = "1";
    });
  });

  // ---- Order form on the cart page ----
  var orderForm = document.querySelector("[data-order-form]");
  if (orderForm) setUpOrderForm(orderForm);

  function setUpOrderForm(form) {
    var errorEl = form.querySelector("[data-form-error]");
    var submitBtn = form.querySelector("button[type=submit]");

    // Earliest date = today + lead time.
    var dateInput = form.querySelector("[data-min-days]");
    if (dateInput) {
      var d = new Date();
      d.setDate(d.getDate() + parseInt(dateInput.getAttribute("data-min-days"), 10));
      dateInput.min = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    // Show the address field only for delivery.
    var fulfillment = form.querySelector("[data-fulfillment]");
    var address = form.querySelector("[data-address]");
    function syncAddress() {
      var delivery = fulfillment.value === "Delivery";
      address.hidden = !delivery;
      address.querySelector("input").required = delivery;
    }
    fulfillment.addEventListener("change", syncAddress);
    syncAddress();

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = !msg;
    }

    function orderSummary(cart) {
      var lines = lineItems(cart).map(function (l) {
        return dozen(l.qty) + " " + l.name + " (" + money(l.subtotal) + ")";
      });
      return lines.length ? lines.join("\n") : "(no cookies in cart; see notes)";
    }

    function showSuccess(message) {
      var success = document.querySelector("[data-order-success]");
      if (message) success.querySelector("[data-order-success-text]").textContent = message;
      form.hidden = true;
      success.hidden = false;
      success.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showError("");

      var cart = readCart();
      var notes = form.notes.value.trim();
      if (Object.keys(cart).length === 0 && !notes) {
        showError("Your cart is empty. Add some cookies from the menu, or describe a custom order in the notes.");
        return;
      }

      form.querySelector("[data-order-summary]").value = orderSummary(cart);
      form.querySelector("[data-order-total]").value = money(cartTotals(cart).price);

      var endpoint = form.getAttribute("action");
      if (endpoint) {
        submitToService(form, endpoint);
      } else {
        submitByEmail(form);
      }
    });

    // Formspree (or any service that accepts a form POST and returns JSON).
    function submitToService(form, endpoint) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        clearCart();
        showSuccess();
      }).catch(function () {
        showError("Sorry, something went wrong sending your order. Please try again, or email us at " + form.getAttribute("data-email") + ".");
      }).then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send order request";
      });
    }

    // No form service configured yet: open the customer's email app with the order filled in.
    function submitByEmail(form) {
      var f = form.elements;
      var body = [
        "Order:",
        f.order.value,
        "",
        "Estimated total: " + f.estimated_total.value,
        "",
        "Name: " + f.name.value,
        "Email: " + f.email.value,
        "Phone: " + f.phone.value,
        "Date needed: " + f.date_needed.value,
        "Pickup or delivery: " + f.fulfillment.value
      ];
      if (f.fulfillment.value === "Delivery") body.push("Address: " + f.address.value);
      if (f.notes.value.trim()) body.push("", "Notes:", f.notes.value.trim());

      window.location.href = "mailto:" + form.getAttribute("data-email") +
        "?subject=" + encodeURIComponent("Cookie order request") +
        "&body=" + encodeURIComponent(body.join("\n"));

      showSuccess("Your email app should open with your order filled in. Just press send! (Your cart is saved in case you need it again.)");
    }
  }

  // Keep the badge in sync across tabs.
  window.addEventListener("storage", function (e) { if (e.key === STORAGE_KEY) render(); });

  render();
})();

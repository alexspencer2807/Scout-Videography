document.addEventListener("DOMContentLoaded", async () => {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const cartSummary = document.getElementById("cartItemsSummary");

  // --- Cart summary ---
  if (cart.length) {
    let subtotal = 0;
    let totalItems = 0;

    const rows = cart.map(i => {
      const line = i.price * i.quantity;
      subtotal += line;
      totalItems += i.quantity;
      return `
        <li style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${i.image}" alt="${i.name}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;">
            <span>${i.name} x${i.quantity}</span>
          </div>
          <span>$${(i.price * i.quantity).toFixed(2)}</span>
        </li>`;
    }).join('');

    let discountedTotal = subtotal;
    let discountLabel = "";
    if (totalItems >= 10)      { discountedTotal = subtotal * 0.80; discountLabel = "10+ Item Bundle (20% Off)"; }
    else if (totalItems >= 7)  { discountedTotal = subtotal * 0.85; discountLabel = "7-9 Item Bundle (15% Off)"; }
    else if (totalItems >= 5)  { discountedTotal = subtotal * 0.90; discountLabel = "5-6 Item Bundle (10% Off)"; }
    else if (totalItems >= 3)  { discountedTotal = subtotal * 0.95; discountLabel = "3-4 Item Bundle (5% Off)"; }
    discountedTotal = Math.max(discountedTotal, 0);

    cartSummary.innerHTML = `
      <ul style="list-style:none;padding:0;margin:0;">${rows}</ul>
      <p style="text-align:right;margin-top:8px;"><strong>Subtotal: $${subtotal.toFixed(2)} JMD</strong></p>
      ${discountLabel ? `
        <p style="text-align:right;color:var(--green-dark);font-weight:600;">${discountLabel}</p>
        <p style="text-align:right;font-weight:bold;font-size:1.1em;color:var(--green-dark);">Total: $${discountedTotal.toFixed(2)} JMD</p>
      ` : `<p style="text-align:right;font-weight:bold;font-size:1.1em;">Total: $${subtotal.toFixed(2)} JMD</p>`}
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0;">
    `;
  } else {
    cartSummary.innerHTML = "<p style='text-align:center;color:#888;padding:16px 0;'>Your cart is empty.</p>";
  }

  // --- Stripe setup ---
  if (typeof Stripe === "undefined") {
    if (window.notify) notify("Error", "Payment system failed to load. Please refresh the page.");
    document.getElementById("payment-message").textContent = "Payment system unavailable. Please refresh or contact us on WhatsApp.";
    return;
  }

  if (!stripePublicKey) {
    document.getElementById("payment-message").textContent = "Checkout is not configured. Please contact us on WhatsApp: 876-809-2519";
    document.querySelector("button[type=submit]").disabled = true;
    return;
  }

  const stripe = Stripe(stripePublicKey);
  const elements = stripe.elements();
  const cardElement = elements.create("card", {
    style: {
      base: { fontFamily: "'Inter', sans-serif", fontSize: "16px", color: "#1E293B", "::placeholder": { color: "#94A3B8" } },
      invalid: { color: "#F43F5E" }
    }
  });
  cardElement.mount("#card-element");

  // --- Payment ---
  const form = document.getElementById("payment-form");
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const name    = document.getElementById("name").value.trim();
    const email   = document.getElementById("email").value.trim();
    const phone   = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const city    = document.getElementById("city").value.trim();

    const shipping = {
      name,
      phone,
      email,
      address: { line1: address, city, country: "JM" }
    };

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…';
    document.getElementById("payment-message").textContent = "";

    // Create PaymentIntent
    let clientSecret;
    try {
      const res = await fetch("/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, shipping, email })
      });
      const data = await res.json();
      if (data.error) {
        if (window.notify) window.showToast("Payment Error", data.error, 5000);
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
        return;
      }
      clientSecret = data.client_secret;
    } catch (err) {
      if (window.showToast) window.showToast("Error", "Could not reach payment server. Please try again.", 5000);
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
      return;
    }

    // Confirm card payment
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement, billing_details: { name, email } }
    });

    if (error) {
      if (window.showToast) window.showToast("Payment Failed", error.message, 6000);
      else document.getElementById("payment-message").textContent = error.message;
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
      return;
    }

    if (paymentIntent.status === "succeeded") {
      btn.innerHTML = '<i class="fas fa-check"></i> Payment Confirmed!';

      // Send receipt email
      try {
        const res = await fetch("/notify-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, cart, shipping })
        });
        const data = await res.json();
        if (data.ok) {
          if (window.showToast) window.showToast("Order Confirmed ✓", "A receipt has been sent to " + email, 5000, "success");
        } else {
          if (window.showToast) window.showToast("Order Confirmed ✓", "Payment received. Receipt delivery failed — contact us on WhatsApp.", 6000, "success");
        }
      } catch (_) {
        if (window.showToast) window.showToast("Order Confirmed ✓", "Payment received. Please screenshot this page as your receipt.", 6000, "success");
      }

      localStorage.removeItem("cart");
      setTimeout(() => { window.location.href = "/"; }, 4000);
    }
  });
});

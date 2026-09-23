(function () {
  "use strict";

  var config = window.SITE_CONFIG || {};
  var BUSINESS = "Ujjwal Properties";

  /* Header: border on scroll + mobile menu */

  var header = document.querySelector(".site-header");
  var nav = document.getElementById("site-nav");
  var menuBtn = document.querySelector(".menu-btn");

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenu(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* Contact buttons: only shown once the client's details are configured */

  var digits = function (s) {
    return String(s || "").replace(/\D/g, "");
  };

  var contactHrefs = {
    call: config.phone ? "tel:+" + digits(config.phone).replace(/^0+/, "") : "",
    whatsapp: config.whatsapp ? "https://wa.me/" + digits(config.whatsapp) : "",
    email: config.email ? "mailto:" + config.email : "",
  };

  document.querySelectorAll("[data-contact]").forEach(function (el) {
    var href = contactHrefs[el.getAttribute("data-contact")];
    if (href) {
      el.setAttribute("href", href);
      el.hidden = false;
    }
  });

  /* Enquiry form */

  var form = document.querySelector("form[data-enquiry]");

  function field(name) {
    return form.elements.namedItem(name);
  }

  function setIntent(value) {
    var radio = form.querySelector('input[name="intent"][value="' + value + '"]');
    if (radio) radio.checked = true;
  }

  function setArea(value) {
    var select = field("area");
    if (!select) return;
    var match = Array.prototype.some.call(select.options, function (o) {
      return o.value === value;
    });
    if (match) select.value = value;
  }

  // Links elsewhere on the page can prefill the form: data-intent / data-area / data-note
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[href='#enquire']");
    if (!link || !form) return;
    if (link.dataset.intent) setIntent(link.dataset.intent);
    if (link.dataset.area) setArea(link.dataset.area);
    if (link.dataset.note) field("message").value = link.dataset.note;
  });

  function normalisePhone(value) {
    var d = digits(value);
    if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : "";
  }

  function showError(input, message) {
    var box = document.getElementById(input.getAttribute("aria-describedby"));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (box) box.textContent = message || "";
  }

  function validate() {
    var ok = true;
    var name = field("name");
    var phone = field("phone");
    var email = field("email");

    if (!name.value.trim()) {
      showError(name, "Please enter your name.");
      ok = false;
    } else showError(name, "");

    if (!normalisePhone(phone.value)) {
      showError(phone, "Please enter a 10-digit mobile number.");
      ok = false;
    } else showError(phone, "");

    if (email.value.trim() && !email.checkValidity()) {
      showError(email, "Please check this email address.");
      ok = false;
    } else showError(email, "");

    if (!ok) {
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
    }
    return ok;
  }

  function collect() {
    var intent = form.querySelector('input[name="intent"]:checked');
    return {
      intent: intent ? intent.value : "",
      name: field("name").value.trim(),
      phone: "+91 " + normalisePhone(field("phone").value),
      email: field("email").value.trim(),
      area: field("area").value,
      message: field("message").value.trim(),
      page: document.title,
    };
  }

  var intentWords = { buy: "buy", sell: "sell", rent: "rent", invest: "invest" };

  function composeText(d) {
    var lines = ["Hi " + BUSINESS + ", I'd like to " + (intentWords[d.intent] || "enquire") + " in Gurugram."];
    lines.push("", "Name: " + d.name, "Phone: " + d.phone);
    if (d.email) lines.push("Email: " + d.email);
    if (d.area) lines.push("Area: " + d.area);
    if (d.message) lines.push("", d.message);
    return lines.join("\n");
  }

  function setStatus(state, text) {
    var status = form.querySelector(".form-status");
    status.dataset.state = state;
    status.textContent = text;
  }

  function sendToEndpoint(d, button) {
    var body = new FormData();
    Object.keys(d).forEach(function (k) {
      body.append(k, d[k]);
    });
    body.append("_subject", "Website enquiry: " + (d.intent || "general") + " — " + d.name);

    button.setAttribute("aria-busy", "true");
    setStatus("", "Sending…");

    return fetch(config.formEndpoint, {
      method: "POST",
      body: body,
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        applyDefaults();
        setStatus("ok", "Thank you. We'll be in touch soon.");
      })
      .catch(function () {
        setStatus("error", "Couldn't send. Please try again.");
      })
      .then(function () {
        button.removeAttribute("aria-busy");
      });
  }

  function applyDefaults() {
    if (!form) return;
    var params = new URLSearchParams(window.location.search);
    setIntent(params.get("intent") || form.dataset.intent || "buy");
    if (params.get("area")) setArea(params.get("area"));
  }

  if (form) {
    applyDefaults();

    ["name", "phone", "email"].forEach(function (n) {
      field(n).addEventListener("input", function () {
        if (this.getAttribute("aria-invalid") === "true") showError(this, "");
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (field("_gotcha") && field("_gotcha").value) return;
      if (!validate()) {
        setStatus("error", "");
        return;
      }

      var d = collect();
      var button = form.querySelector('button[type="submit"]');

      if (config.formEndpoint) {
        sendToEndpoint(d, button);
      } else if (config.whatsapp) {
        setStatus("ok", "Opening WhatsApp…");
        window.open("https://wa.me/" + digits(config.whatsapp) + "?text=" + encodeURIComponent(composeText(d)), "_blank", "noopener");
      } else if (config.email) {
        setStatus("ok", "Opening your email app…");
        window.location.href =
          "mailto:" + config.email +
          "?subject=" + encodeURIComponent("Website enquiry: " + (d.intent || "general")) +
          "&body=" + encodeURIComponent(composeText(d));
      } else {
        // No delivery channel yet: see assets/js/config.js
        console.warn("[enquiry] No formEndpoint, whatsapp or email set in assets/js/config.js");
        setStatus("error", "Enquiries aren't connected yet.");
      }
    });
  }

  /* Listings (data/listings.js) */

  var slot = document.querySelector("[data-listings]");
  var listings = (window.LISTINGS || []).filter(function (l) {
    return slot && l.type === slot.getAttribute("data-listings");
  });

  if (slot && listings.length) {
    var grid = slot.querySelector(".listings");
    listings.forEach(function (l) {
      var card = document.createElement("article");
      card.className = "listing";

      if (l.image) {
        var img = document.createElement("img");
        img.src = l.image;
        img.alt = l.title || "";
        img.loading = "lazy";
        img.width = 800;
        img.height = 600;
        card.appendChild(img);
      }

      var body = document.createElement("div");
      body.className = "listing-body";
      [
        ["listing-price", l.price],
        ["listing-title", l.title],
        ["listing-meta", l.location],
        ["listing-meta", l.details],
      ].forEach(function (pair) {
        if (!pair[1]) return;
        var p = document.createElement("p");
        p.className = pair[0];
        p.textContent = pair[1];
        body.appendChild(p);
      });

      var cta = document.createElement("a");
      cta.className = "btn btn-ghost";
      cta.href = "#enquire";
      cta.textContent = "Enquire";
      cta.dataset.note = "Interested in: " + [l.title, l.location].filter(Boolean).join(", ");
      body.appendChild(cta);

      card.appendChild(body);
      grid.appendChild(card);
    });
    slot.hidden = false;
  }

  /* Footer year */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

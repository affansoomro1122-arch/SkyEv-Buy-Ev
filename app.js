/* SKY EV – shared logic (vanilla JS; products are stored on Netlify via /api/products) */
(function () {
  "use strict";

  /* The functions answer at /api/<name>; if that address is not available, fall back to Netlify's default address. */
  function fx(name, opts) {
    return fetch("/api/" + name, opts).then(function (r) {
      return r.status === 404 ? fetch("/.netlify/functions/" + name, opts) : r;
    });
  }
  var NO_FN = "Server functions not found (404). Deploy the site with its netlify/functions folder using GitHub or Netlify CLI (not drag-and-drop).";
  var WHATSAPP = "61428796970"; // <- WhatsApp number, digits only with country code
  var CDN = "https://dao000pg6obv7.cloudfront.net/wp-content/uploads";
  // SITE LOGO: put your logo file in the /images folder and set its exact file name here.
  // This one value is used for the header and footer on every page.
var LOGO = "/images/logo.png";
var LOGO_VIDEO = "/images/newLogo.webm";

  /* DEFAULT product – shown until the first time you save from the admin page */
  var SEED = [
   {
    "id": "ldv-edeliver-9",
    "name": "LDV eDeliver 9",
    "price": 89000,
    "priceNote": "Plus on-road costs",
    "booking": 5000,
    "createdAt": 1700000000000,
    "description": "LIFT YOUR GAME!\n\nELECTRIC TRUCK AT DIESEL TRUCK PRICE.\n\nMORE PAYLOAD. LOWER RUNNING COSTS.\n\nIntroducing the LDV eDeliver 9, Australia's lightest 4.5-tonne electric Pantech truck, combining exceptional payload capacity, outstanding value for money and the benefits of zero-emission transport.\n\nCheaper than Japanese Euro 6 diesel trucks, with more payload and significantly lower running costs.\n\nBuilt for Australian businesses, the eDeliver 9 combines modern electric vehicle technology with DROPTRUCK's lightweight body engineering, delivering a practical, work-ready solution that helps businesses carry more and spend less.\n\nForget expensive diesel, rising fuel costs and costly engine maintenance. Make the switch to electric and put those savings straight back into your business.\n\nCUT YOUR FUEL COSTS. BUILD YOUR PROFITS.\n\nWhy pay more for a diesel truck when you can drive electric for less?\n\nAvailable through SKYEV, complete with an Australian-manufactured DROPTRUCK body and ready to work.",
    "images": [
     "https://dao000pg6obv7.cloudfront.net/wp-content/uploads/2026/09/04141105/08_20260904.webp"
    ],
    "specs": [
     [
      "GVM",
      "4,500 kg"
     ],
     [
      "Weight",
      "3,015 kg (including 650 kg Pantech body)"
     ],
     [
      "Payload",
      "1,485 kg"
     ],
     [
      "Battery",
      "88.8 kWh LFP"
     ],
     [
      "Drive System",
      "Rear Wheel Drive / Electric"
     ],
     [
      "Motor",
      "PMS 170 kW / 330 Nm"
     ],
     [
      "Top speed",
      "105 km/h"
     ],
     [
      "Wheelbase",
      "4,048 mm"
     ],
     [
      "DC Fast Charging",
      "90 kW"
     ],
     [
      "AC Charging",
      "11 kW three-phase / 7 kW single-phase"
     ],
     [
      "Odometer",
      "50 km"
     ],
     [
      "Box",
      "4.2 m"
     ],
     [
      "Doors",
      "Barn doors"
     ],
     [
      "Taillift",
      "N/A"
     ],
     [
      "Availability",
      "6 weeks"
     ],
     [
      "Range",
      "Up to 235 km WLTP (small box configuration)"
     ],
     [
      "Year",
      "2027"
     ]
    ]
   }
  ];

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  /* Everyone (every browser) loads the same list from the server. */
  function load() {
    return fx("products", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (d) {
        return Array.isArray(d.list) ? d.list : clone(SEED);
      })
      .catch(function () {
        return clone(SEED);
      });
  }

  /* ---- admin helpers (the passcode is checked on the server) ---- */
  function pin() {
    try {
      return sessionStorage.getItem("skyPin") || "";
    } catch (e) {
      return "";
    }
  }
  function call(method, body) {
    return fx("products", {
      method: method,
      headers: { "content-type": "application/json", "x-admin-pin": pin() },
      body: body ? JSON.stringify(body) : undefined,
    })
      .then(function (r) {
        return r.json().then(
          function (d) {
            return { ok: r.ok, d: d };
          },
          function () {
            return { ok: false, d: { error: r.status === 404 ? NO_FN : "Server error (" + r.status + ")." } };
          },
        );
      })
      .catch(function () {
        return { ok: false, d: { error: "Cannot reach the server. Is the site deployed on Netlify?" } };
      });
  }
  function login(p) {
    p = String(p || "").trim();
    try {
      sessionStorage.setItem("skyPin", p);
    } catch (e) {}
    return call("POST").then(function (r) {
      if (!r.ok) {
        try {
          sessionStorage.removeItem("skyPin");
        } catch (e) {}
      }
      return r;
    });
  }
  function save(list) {
    return call("PUT", list);
  }
  function uploadImage(blob) {
    return fx("image", {
      method: "POST",
      headers: { "content-type": blob.type, "x-admin-pin": pin() },
      body: blob,
    }).then(function (r) {
      return r.json().then(
        function (d) {
          if (!r.ok) throw new Error(d.error || "Upload failed.");
          return d.url;
        },
        function () {
          throw new Error(r.status === 404 ? NO_FN : "Upload failed (" + r.status + ").");
        },
      );
    });
  }

  var MAX_VIDEO = 4 * 1024 * 1024; // Netlify functions accept ~6 MB per request
  function uploadVideo(file) {
    if (!file) return Promise.reject(new Error("No video selected."));
    if (file.type !== "video/mp4" && file.type !== "video/webm") {
      return Promise.reject(new Error("Only MP4 or WebM videos."));
    }
    if (file.size > MAX_VIDEO) {
      return Promise.reject(new Error("Video is too large (max 4 MB). Paste a YouTube/Vimeo link for bigger videos."));
    }
    return fx("video", {
      method: "POST",
      headers: { "content-type": file.type, "x-admin-pin": pin() },
      body: file,
    }).then(function (r) {
      return r.json().then(
        function (d) {
          if (!r.ok) throw new Error(d.error || "Video upload failed.");
          return d.url;
        },
        function () {
          throw new Error(r.status === 404 ? NO_FN : "Video upload failed (" + r.status + ").");
        },
      );
    });
  }

  /* Turn a video link into something playable: { kind: "iframe"|"file", src } */
  function videoInfo(u) {
    u = String(u || "").trim();
    if (!u) return null;
    var m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return { kind: "iframe", src: "https://www.youtube.com/embed/" + m[1] + "?rel=0" };
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (m) return { kind: "iframe", src: "https://player.vimeo.com/video/" + m[1] };
    return { kind: "file", src: u };
  }
  function videoHTML(u, poster) {
    var v = videoInfo(u);
    if (!v) return "";
    if (v.kind === "iframe") {
      return '<iframe src="' + esc(v.src) + '" title="Product video" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>';
    }
    return '<video src="' + esc(v.src) + '" controls playsinline preload="metadata"' + (poster ? ' poster="' + esc(poster) + '"' : "") + "></video>";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }
  function money(n) {
    return (
      "$" +
      Number(n || 0).toLocaleString("en-AU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  function money0(n) {
    return "$" + Number(n || 0).toLocaleString("en-AU", { maximumFractionDigits: 2 });
  }
  function newest(list) {
    return list.slice().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
  }
  function slugify(t) {
    return (
      String(t)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "product"
    );
  }
  function url(p) {
    return "product.html?id=" + encodeURIComponent(p.id);
  }

  function cardHTML(p) {
    var img = (p.images && p.images[0]) || "";
    var specs = (p.specs || [])
      .slice(0, 3)
      .map(function (s) {
        return "<li><i class='fa-regular fa-circle-check'></i> <b>" + esc(s[0]) + ":</b> " + esc(s[1]) + "</li>";
      })
      .join("");
    return (
      '<article class="card"><a class="img" href="' +
      url(p) +
      '"><img loading="lazy" src="' +
      esc(img) +
      '" alt="' +
      esc(p.name) +
      '"></a>' +
      '<div class="body"><h3><a href="' +
      url(p) +
      '">' +
      esc(p.name) +
      "</a></h3>" +
      '<div class="' +
      (specs ? "row" : "") +
      '"><div class="left"><span class="price">' +
      money(p.price) +
      "</span>" +
      '<a class="btn sm" href="' +
      url(p) +
      '">Details</a></div>' +
      (specs ? '<ul class="spec">' + specs + "</ul>" : "") +
      "</div></div></article>"
    );
  }
  function renderCards(sel, limit, list) {
    var el = document.querySelector(sel);
    if (!el) return;
    (list ? Promise.resolve(list) : load()).then(function (all) {
      var items = newest(all);
      if (limit) items = items.slice(0, limit);
      el.innerHTML = items.length
        ? items.map(cardHTML).join("")
        : '<p class="empty">No products yet.</p>';
    });
  }

  /* ---------- header / footer for inner pages ---------- */
  var cartSvg =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>';
  function chrome() {
    var page = location.pathname.split("/").pop();
    var inProducts = page.indexOf("product") === 0;
    var h = document.getElementById("site-header");
    if (h) {
      h.outerHTML =
  '<header class="solid"><div class="hwrap">' +
  '<a href="/" class="logoGrid"><video loop autoplay muted playsinline><source src="' + LOGO_VIDEO + '"></video></a>' +
  '<a class="logo" href="/"><img src="' + LOGO + '" alt="SKY"></a>' +
  '<button class="burger" id="bg" aria-label="Menu">☰</button><nav id="nv"><ul>' +
  '<li><a href="index.html">Home</a></li><li><a href="index.html#about">About Us</a></li>' +
  "<li><a " + (inProducts ? 'class="on" ' : "") + 'href="products.html">Products</a></li>' +
  '<li><a href="index.html#gallery">Gallery</a></li><li><a href="index.html#contact">Contact Us</a></li>' +
  '<li><a class="cart" href="#" aria-label="Cart">' + cartSvg + "<b>0</b></a></li></ul></nav></div></header>";
      var nv = document.getElementById("nv");
      document.getElementById("bg").onclick = function () {
        nv.classList.toggle("open");
      };
    }
    var f = document.getElementById("site-footer");
    if (f) {
      f.outerHTML =
        '<footer><div class="wrap"><div class="fgrid">' +
        '<div><a class="logo" href="/"><img src="' +
        LOGO +
        '" alt="SKY"></a>' +
        '<p class="about-t">Specialising in commercial electric vehicles. The SKY brand stands for quality, reliability, and the confidence your business depends on.</p></div>' +
        '<div><h5>Useful Links</h5><ul><li><a href="index.html">Home</a></li><li><a href="index.html#about">About Us</a></li><li><a href="products.html">Product</a></li><li><a href="index.html#gallery">Gallery</a></li><li><a href="index.html#contact">Contact Us</a></li></ul></div>' +
        '<div><h5>Contact Us</h5><ul><li><a href="tel:+61428796970">+61 428796970</a></li><li><a href="mailto:info@skyev.com.au">info@skyev.com.au</a></li><li>4 Chiltern Rd Ingleside, NSW 2101</li></ul></div>' +
        '<div><h5>Legal Links</h5><ul><li><a href="#">Privacy Policy</a></li><li><a href="#">Refund Policy</a></li><li><a href="#">Cookie Policy</a></li></ul></div>' +
        '</div><div class="copy">SKY® is a registered trademark of SKYEV PTY LTD.<br>© 2026 SKYEV PTY LTD. All rights reserved.</div></div></footer>';
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    chrome();
    // any <img data-logo> (e.g. on index.html) gets the same logo
    [].forEach.call(document.querySelectorAll("img[data-logo]"), function (im) {
      im.src = LOGO;
    });
  });

  window.SKY = {
    load: load,
    save: save,
    loadAdmin: load,
    login: login,
    uploadImage: uploadImage,
    uploadVideo: uploadVideo,
    videoHTML: videoHTML,
    videoInfo: videoInfo,
    defaults: function () {
      return clone(SEED);
    },
    money0: money0,
    esc: esc,
    money: money,
    newest: newest,
    slugify: slugify,
    cardHTML: cardHTML,
    renderCards: renderCards,
    WA: WHATSAPP,
  };
})();

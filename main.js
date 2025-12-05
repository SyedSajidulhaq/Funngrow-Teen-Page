/* main.js
   Full interactive JavaScript for the Funngro Teen Section
   Features:
   - rotating testimonials
   - scroll reveal
   - smooth scroll & active nav highlight
   - mobile nav toggle (creates one if missing)
   - animated hero gradient
   - CTA modal + join form with validation + localStorage
   - accessible button interactions
   - respects prefers-reduced-motion
*/

(function () {
  "use strict";

  /* =========================
     Helper Utilities
  ========================= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const now = () => new Date().getTime();
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================
     ROTATING TESTIMONIALS
  ========================= */
  const testimonials = [
    { text: "I earned my first ₹2000 within a week. Best platform for teens!", author: "— Aarav, 16" },
    { text: "Work is simple & flexible. Perfect for students.", author: "— Sana, 17" },
    { text: "Funngro helped me improve my writing & earn consistently.", author: "— Rohan, 15" },
  ];

  function setupTestimonials({
    reviewSelector = "#review",
    authorSelector = "#review-author",
    interval = 3000,
  } = {}) {
    const reviewEl = document.querySelector(reviewSelector);
    const authorEl = document.querySelector(authorSelector);
    if (!reviewEl) return;

    let idx = 0;
    let timer = null;
    const set = (i) => {
      const r = testimonials[i % testimonials.length];
      reviewEl.textContent = r.text;
      if (authorEl) authorEl.textContent = r.author;
      idx = (i + 1) % testimonials.length;
    };

    set(0);
    if (!prefersReducedMotion) {
      timer = setInterval(() => set(idx), interval);
      // pause on hover/focus
      on(reviewEl, "mouseenter", () => timer && clearInterval(timer));
      on(reviewEl, "mouseleave", () => (timer = setInterval(() => set(idx), interval)));
      on(reviewEl, "focus", () => timer && clearInterval(timer));
      on(reviewEl, "blur", () => (timer = setInterval(() => set(idx), interval)));
    }
  }

  /* =========================
     SCROLL REVEAL (intersection-friendly)
  ========================= */
  function setupScrollReveal() {
    const revealNodes = $$(".reveal, .fade-up, .fx-card");
    if (!revealNodes.length || prefersReducedMotion) {
      // if user prefers reduced motion, reveal immediately
      revealNodes.forEach((n) => n.classList.add("active"));
      return;
    }

    // use IntersectionObserver for performance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            // if an element has fx-card class, introduce delays if classes present
            // stop observing after reveal
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealNodes.forEach((el) => observer.observe(el));
  }

  /* =========================
     SMOOTH SCROLL & ACTIVE NAV
  ========================= */
  function setupSmoothScrollAndNav() {
    // Smooth scroll for anchor links - progressive enhancement
    const anchorLinks = $$('a[href^="#"], a[href*="teens.html"], a[href*="teen-opportunities.html"]');
    anchorLinks.forEach((a) => {
      const href = a.getAttribute("href");
      // skip external
      if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;

      on(a, "click", (e) => {
        // only smooth-scroll for on-page anchors (same path) or special hero links
        if (href.startsWith("#")) {
          const target = $(href);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
            // focus for accessibility
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }
        } else {
          // allow normal navigation (multi-page)
        }
      });
    });

    // Active nav link highlighting on scroll
    const navLinks = $$("header.nav a");
    const sections = navLinks
      .map((a) => {
        try {
          const href = a.getAttribute("href");
          if (!href || href.startsWith("http") || href.startsWith("mailto:")) return null;
          // if the link points to a page, we try to map by id fallback
          if (href.startsWith("#")) return $(href);
          // try to map link to section by name
          const name = href.split("#")[1];
          if (name) return $("#" + name);
          return null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (navLinks.length && sections.length && !prefersReducedMotion) {
      window.addEventListener(
        "scroll",
        throttle(() => {
          const top = window.scrollY + window.innerHeight * 0.28;
          let activeIndex = -1;
          sections.forEach((sec, i) => {
            const rect = sec.getBoundingClientRect();
            const absTop = window.scrollY + rect.top;
            if (absTop <= top) activeIndex = i;
          });

          navLinks.forEach((a, i) => {
            if (i === activeIndex) a.classList.add("active");
            else a.classList.remove("active");
          });
        }, 120)
      );
    }
  }

  /* =========================
     THROTTLE / DEBOUNCE UTIL
  ========================= */
  function throttle(fn, wait = 100) {
    let last = 0;
    let timer = null;
    return function (...args) {
      const t = now();
      const remaining = wait - (t - last);
      if (remaining <= 0) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        last = t;
        fn.apply(this, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          last = now();
          timer = null;
          fn.apply(this, args);
        }, remaining);
      }
    };
  }

  /* =========================
     MOBILE NAV TOGGLE (creates if missing)
  ========================= */
  function setupMobileMenu() {
    const header = $("header.nav");
    if (!header) return;

    // check for existing toggle
    if (!$("#mobile-nav-toggle")) {
      const btn = document.createElement("button");
      btn.id = "mobile-nav-toggle";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", "main-nav-list");
      btn.className = "mobile-toggle";
      btn.innerHTML = `<span class="sr-only">Open menu</span><i class="ri-menu-line" aria-hidden="true"></i>`;
      header.insertAdjacentElement("afterbegin", btn);

      // wrap nav links into a <nav> or ul if necessary for aria
      const nav = header.querySelector("nav");
      if (nav) {
        nav.id = "main-nav-list";
      }

      btn.addEventListener("click", () => {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        header.classList.toggle("nav-open", !expanded);
      });

      // close on outside click or Escape
      document.addEventListener("click", (e) => {
        if (!header.contains(e.target) && header.classList.contains("nav-open")) {
          header.classList.remove("nav-open");
          btn.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && header.classList.contains("nav-open")) {
          header.classList.remove("nav-open");
          btn.setAttribute("aria-expanded", "false");
          btn.focus();
        }
      });
    }
  }

  /* =========================
     HERO GRADIENT ANIMATION (subtle)
  ========================= */
  function setupHeroGradient() {
    const hero = $(".hero");
    if (!hero || prefersReducedMotion) return;

    // create animated gradient using CSS variables for performance
    let t = 0;
    const speed = 0.0025; // lower = slower
    function frame() {
      t += speed;
      const x = Math.sin(t) * 40;
      const y = Math.cos(t * 0.8) * 40;
      // translate into a radial position
      hero.style.background = `linear-gradient(120deg, rgba(0,87,255,0.95) ${40 + x}%, rgba(79,157,255,0.9) ${60 + y}%, rgba(28,187,255,0.85) 100%)`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* =========================
     CTA MODAL FORM (dynamically injected)
     - shows only if not joined (localStorage)
     - performs simple validation
     - simulates send & stores joined
  ========================= */
  function setupCTAModal({ storageKey = "funngro_teen_joined" } = {}) {
    // if already joined, do nothing
    if (localStorage.getItem(storageKey)) return;

    // create modal markup if not present
    if (!$("#cta-modal")) {
      const modal = document.createElement("div");
      modal.id = "cta-modal";
      modal.className = "cta-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.innerHTML = `
        <div class="cta-modal-backdrop"></div>
        <div class="cta-modal-panel" role="document" aria-labelledby="cta-modal-title">
          <button class="cta-modal-close" aria-label="Close modal"><i class="ri-close-line"></i></button>
          <h3 id="cta-modal-title">Join Funngro — Start Earning</h3>
          <p class="muted">Sign up to get teen-friendly gigs and tips. No spam — ever.</p>
          <form id="cta-join-form" novalidate>
            <label>
              Name
              <input type="text" name="name" required minlength="2" placeholder="Your name">
            </label>
            <label>
              Age
              <input type="number" name="age" required min="13" max="19" placeholder="Your age">
            </label>
            <label>
              Email (optional)
              <input type="email" name="email" placeholder="you@example.com">
            </label>
            <div class="form-row">
              <button type="submit" class="btn primary">Join Now</button>
              <button type="button" class="btn ghost cta-later">Maybe later</button>
            </div>
            <div class="form-feedback" aria-live="polite"></div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      const backdrop = modal.querySelector(".cta-modal-backdrop");
      const panel = modal.querySelector(".cta-modal-panel");
      const closeBtn = modal.querySelector(".cta-modal-close");
      const laterBtn = modal.querySelector(".cta-later");

      function openModal() {
        modal.classList.add("open");
        document.body.style.overflow = "hidden";
        // trap focus
        panel.querySelector("input, button").focus();
      }
      function closeModal() {
        modal.classList.remove("open");
        document.body.style.overflow = "";
      }

      on(closeBtn, "click", closeModal);
      on(backdrop, "click", closeModal);
      on(laterBtn, "click", closeModal);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
      });

      // show modal after slight delay if user scrolled or after timeout
      let shown = false;
      const showAfter = () => {
        if (shown || localStorage.getItem(storageKey)) return;
        shown = true;
        openModal();
      };

      // show after 6 seconds OR when user scrolls half page
      const timed = setTimeout(showAfter, 6000);
      window.addEventListener(
        "scroll",
        throttle(() => {
          if (window.scrollY > window.innerHeight * 0.45) {
            clearTimeout(timed);
            showAfter();
          }
        }, 250)
      );

      // form handling
      const form = $("#cta-join-form");
      const feedback = form.querySelector(".form-feedback");

      function validateForm(data) {
        const errors = [];
        if (!data.name || data.name.trim().length < 2) errors.push("Please enter a valid name.");
        const age = parseInt(data.age, 10);
        if (!age || age < 13 || age > 19) errors.push("Age must be between 13 and 19.");
        if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) errors.push("If provided, email must be valid.");
        return errors;
      }

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
          name: fd.get("name")?.trim(),
          age: fd.get("age"),
          email: fd.get("email")?.trim(),
        };
        const errors = validateForm(payload);
        if (errors.length) {
          feedback.textContent = errors.join(" ");
          feedback.classList.add("error");
          return;
        }

        // simulate send
        feedback.textContent = "Submitting...";
        feedback.classList.remove("error");
        setTimeout(() => {
          localStorage.setItem(storageKey, JSON.stringify({ name: payload.name, joinedAt: new Date().toISOString() }));
          feedback.textContent = "Welcome aboard! Check your dashboard for gigs.";
          // close modal after short delay
          setTimeout(() => {
            modal.classList.remove("open");
            document.body.style.overflow = "";
          }, 1400);
        }, 900);
      });
    }
  }

  /* =========================
     BUTTON MICRO-INTERACTIONS
  ========================= */
  function setupButtonInteractions() {
    $$(".btn").forEach((btn) => {
      // visual press for mouse/touch
      on(btn, "mousedown", () => (btn.style.transform = "scale(0.98)"));
      on(btn, "mouseup", () => (btn.style.transform = ""));
      on(btn, "mouseleave", () => (btn.style.transform = ""));
      // keyboard press
      on(btn, "keydown", (e) => {
        if (e.key === " " || e.key === "Enter") {
          btn.style.transform = "scale(0.98)";
        }
      });
      on(btn, "keyup", () => (btn.style.transform = ""));
    });
  }

  /* =========================
     UTILITY: PRELOAD ICON FONTS (if remix used) - optional
  ========================= */
  function preloadRemixIcons() {
    // this is optional — browsers cache fonts. Keep for completeness.
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = "https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.woff2";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  /* =========================
     INIT
  ========================= */
  function init() {
    preloadRemixIcons();
    setupTestimonials();
    setupScrollReveal();
    setupSmoothScrollAndNav();
    setupMobileMenu();
    setupHeroGradient();
    setupCTAModal();
    setupButtonInteractions();

    // in case page loads scrolled down, trigger reveal check once
    setTimeout(() => window.dispatchEvent(new Event("scroll")), 200);
  }

  // start when DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
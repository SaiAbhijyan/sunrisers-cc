// No frameworks, no third-party code, no HTML injection: all dynamic text goes through textContent.
(() => {
  "use strict";

  // ---- mobile menu ----
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener("click", (e) => {
      if (e.target instanceof Element && e.target.closest("a")) setOpen(false);
    });
    window.matchMedia("(min-width: 1240px)").addEventListener("change", (m) => m.matches && setOpen(false));
    // keep closed menu out of the tab order on small screens
    const sync = () => {
      const small = window.matchMedia("(max-width: 1239px)").matches;
      const open = toggle.getAttribute("aria-expanded") === "true";
      nav.toggleAttribute("inert", small && !open);
    };
    sync();
    new MutationObserver(sync).observe(toggle, { attributes: true, attributeFilter: ["aria-expanded"] });
    window.matchMedia("(max-width: 1239px)").addEventListener("change", sync);
  }

  // ---- contact form: client-side validation, honeypot, minimum dwell time ----
  const form = document.getElementById("contact-form");
  if (form) {
    const status = document.getElementById("form-status");
    const openedAt = Date.now();
    const rules = {
      first: (v) => (v.trim().length >= 1 ? "" : "Enter your first name."),
      last: (v) => (v.trim().length >= 1 ? "" : "Enter your last name."),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter an email address like name@example.com."),
      phone: (v) => (v.trim() === "" || /^[+()\d\s.-]{6,30}$/.test(v.trim()) ? "" : "Use digits, spaces and + ( ) - only, or leave it empty."),
      topic: (v) => (v ? "" : "Choose what your message is about."),
      message: (v) => (v.trim().length >= 10 ? "" : "Write at least 10 characters."),
    };
    const errId = { first: "f-first-err", last: "f-last-err", email: "f-email-err", phone: "f-phone-err", topic: "f-topic-err", message: "f-msg-err" };

    const check = (name) => {
      const el = form.elements.namedItem(name);
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return true;
      const msg = rules[name](el.value);
      const out = document.getElementById(errId[name]);
      if (out) out.textContent = msg;
      el.closest(".field")?.setAttribute("data-invalid", msg ? "true" : "false");
      if (msg) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
      if (msg && out) el.setAttribute("aria-describedby", errId[name]);
      return !msg;
    };

    Object.keys(rules).forEach((name) => {
      const el = form.elements.namedItem(name);
      if (el) {
        el.addEventListener("blur", () => check(name));
        el.addEventListener("input", () => el.getAttribute("aria-invalid") && check(name));
      }
    });

    const say = (state, text) => {
      status.hidden = false;
      status.dataset.state = state;
      status.textContent = text;
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      status.hidden = true;
      const results = Object.keys(rules).map((n) => [n, check(n)]);
      const firstBad = results.find(([, ok]) => !ok);
      if (firstBad) {
        const el = form.elements.namedItem(firstBad[0]);
        if (el instanceof HTMLElement) el.focus();
        say("error", "Some answers need another look. They are marked above.");
        return;
      }
      // spam traps: filled honeypot, or submitted faster than a person can type
      const trapped = form.elements.namedItem("website")?.value || Date.now() - openedAt < 2500;
      if (trapped) {
        say("ok", "Thanks. Your message has been received.");
        form.reset();
        return;
      }
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        say("ok", "Your answers look good. This preview is not connected to an inbox yet, so nothing was sent.");
        return;
      }
      // Wire-up slot: when an endpoint is configured, POST JSON (CSP connect-src must allow it).
      const payload = Object.fromEntries(new FormData(form));
      delete payload.website;
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then((r) => {
          if (!r.ok) throw new Error("bad status");
          say("ok", "Thanks. Your message has been sent.");
          form.reset();
        })
        .catch(() => say("error", "That did not send. Please try again in a moment."));
    });
  }

  // ---- league selector, shared by the results page and the squads page ----
  // Progressive: without JS the selector is hidden and every league is shown, grouped by league.
  const select = document.getElementById("league-select");
  if (select instanceof HTMLSelectElement) {
    const groups = document.querySelectorAll("[data-league]");
    const status = document.getElementById("filter-status");
    const known = new Set([...select.options].map((o) => o.value));
    const results = document.getElementById("league-results");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const say = (key, shown) => {
      if (!status) return;
      const name = select.selectedOptions[0].textContent.replace(/\s*\(\d+ [a-z]+\)$/, "");
      const tpl = key === "all" ? select.dataset.textAll : select.dataset.textOne;
      if (tpl) status.textContent = tpl.replace("{n}", String(shown)).replace("{name}", name);
    };
    let swap = 0;
    const apply = (key, updateUrl, animate) => {
      if (!known.has(key)) key = "all";
      let shown = 0;
      const toggle = () => {
        groups.forEach((g) => { g.hidden = !(key === "all" || g.dataset.league === key); });
        if (results) {
          results.classList.remove("is-out");
          results.dispatchEvent(new CustomEvent("sr:refresh", { bubbles: true }));
        }
      };
      groups.forEach((g) => {
        if (key === "all" || g.dataset.league === key) shown += Number(g.dataset.total || 0);
      });
      clearTimeout(swap);
      if (animate && results && !calm) {
        results.classList.add("is-out"); // fade the old set out, swap, then the new cards stagger in
        swap = setTimeout(toggle, 150);
      } else toggle();
      select.value = key;
      say(key, shown);
      if (updateUrl) {
        const url = new URL(location.href);
        if (key === "all") url.searchParams.delete("league");
        else url.searchParams.set("league", key);
        history.replaceState(null, "", url);
      }
    };
    select.addEventListener("change", () => {
      apply(select.value, true, true);
      // keep the reader at the top of the list they just chose
      if (results && results.getBoundingClientRect().top < 0) results.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
    });
    window.addEventListener("popstate", () => apply(new URLSearchParams(location.search).get("league") || "all", false, true));
    // ?league=... wins; an old #team-... link to one squad opens that squad
    let first = new URLSearchParams(location.search).get("league");
    if (!first && location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      const owner = target && target.closest("[data-league]");
      if (owner) first = owner.dataset.league;
    }
    apply(first || "all", Boolean(first && !new URLSearchParams(location.search).get("league")), false);
    if (first && location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }

  // ---- squad pages: sort the player cards (progressive: without JS the roster order stays) ----
  document.querySelectorAll("select[data-sort-for]").forEach((sel) => {
    const list = document.getElementById(sel.dataset.sortFor);
    if (!list) return;
    const cards = [...list.children];
    cards.forEach((c, i) => { c.dataset.idx = String(i); });
    const keys = {
      roster: (a, b) => Number(a.dataset.idx) - Number(b.dataset.idx),
      name: (a, b) => a.dataset.name.localeCompare(b.dataset.name) || Number(a.dataset.idx) - Number(b.dataset.idx),
    };
    const by = (field) => (a, b) => Number(b.dataset[field]) - Number(a.dataset[field]) || a.dataset.name.localeCompare(b.dataset.name);
    keys.runs = by("runs"); keys.wkts = by("wkts"); keys.catches = by("catches");
    const status = document.createElement("p");
    status.className = "visually-hidden";
    status.setAttribute("role", "status");
    list.after(status);
    sel.addEventListener("change", () => {
      const next = [...cards].sort(keys[sel.value] || keys.roster);
      next.forEach((c) => list.appendChild(c));
      status.textContent = `Players sorted: ${sel.selectedOptions[0].textContent}.`;
    });
  });

  // ---- photograph lightbox (progressive: without JS the link opens the photograph) ----
  const photos = [...document.querySelectorAll("a.photo[data-lightbox]")];
  if (photos.length) {
    const dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.setAttribute("aria-label", "Photograph viewer");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox__close";
    closeBtn.textContent = "Close";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "lightbox__prev";
    prevBtn.setAttribute("aria-label", "Previous photograph");

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "lightbox__next";
    nextBtn.setAttribute("aria-label", "Next photograph");

    const figure = document.createElement("figure");
    figure.className = "lightbox__stage";
    const img = document.createElement("img");
    img.className = "lightbox__img";
    img.alt = "";
    const cap = document.createElement("figcaption");
    cap.className = "visually-hidden";
    cap.setAttribute("aria-live", "polite");
    figure.append(cap);
    dialog.append(closeBtn, prevBtn, figure, nextBtn);
    document.body.append(dialog);

    let index = 0;
    let returnFocus = null;
    const show = (i) => {
      index = (i + photos.length) % photos.length;
      const link = photos[index];
      const preview = link.querySelector("img");
      img.alt = preview ? preview.alt : "";
      const w = preview && preview.getAttribute("width");
      const h = preview && preview.getAttribute("height");
      if (w) img.width = Number(w);
      if (h) img.height = Number(h);
      img.src = link.getAttribute("href") || "";
      if (!img.isConnected) figure.prepend(img);
      cap.textContent = `${index + 1} of ${photos.length}. ${img.alt}`;
    };
    const open = (i, trigger) => {
      returnFocus = trigger;
      show(i);
      dialog.showModal();
      closeBtn.focus();
    };

    photos.forEach((link, i) => {
      link.addEventListener("click", (e) => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
        e.preventDefault();
        open(i, link);
      });
    });
    closeBtn.addEventListener("click", () => dialog.close());
    prevBtn.addEventListener("click", () => show(index - 1));
    nextBtn.addEventListener("click", () => show(index + 1));
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        const nodes = [closeBtn, prevBtn, nextBtn];
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
          e.preventDefault();
          first.focus();
        }
      }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    });
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => { if (returnFocus) returnFocus.focus(); });
  }

  // ---- gallery videos: never autoplay; keep them still under reduced motion ----
  document.querySelectorAll("video").forEach((video) => {
    video.autoplay = false;
    video.removeAttribute("autoplay");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.removeAttribute("autoplay");
    }
  });

})();

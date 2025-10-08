/* =========================
   Einhell Bava Toolbox (compact, badges, instant RU/EN)
   ========================= */
(() => {
  "use strict";

  const RU = "ru";
  const EN = "en";
  const STORAGE = { LANG: "toolbox_lang", AUTH: "toolbox_authed" };

  const i18n = {
    [RU]: {
      open: "Открыть",
      copy: "Копировать ссылку",
      copied: "Скопировано!",
      searchPH: "Поиск…",
      lockTitle: "Доступ",
      lockInfo: "Введите пароль, чтобы открыть приложение.",
      unlock: "Открыть",
      wrongPass: "Неверный пароль.",
      openLink: "Открыть",
      logoutTitle: "Сессия сброшена."
    },
    [EN]: {
      open: "Open",
      copy: "Copy link",
      copied: "Copied!",
      searchPH: "Search…",
      lockTitle: "Access",
      lockInfo: "Enter password to unlock.",
      unlock: "Unlock",
      wrongPass: "Wrong password.",
      openLink: "Open",
      logoutTitle: "Session cleared."
    }
  };

  // Elements
  const appRoot = document.getElementById("app");
  const lockScreen = document.getElementById("lock-screen");
  const lockForm = document.getElementById("lock-form");
  const lockError = document.getElementById("lock-error");
  const pwdInput = document.getElementById("password-input");

  const langBtn = () => document.getElementById("lang-btn");
  const langFlag = () => document.getElementById("lang-flag");
  const lockBtn = () => document.getElementById("lock-btn");
  const searchInput = () => document.getElementById("search");
  const content = () => document.getElementById("content");
  const tnodes = () => document.querySelectorAll("[data-i]");

  // State
  let lang = localStorage.getItem(STORAGE.LANG) || RU;
  let apps = [];
  let grouped = {};
  let passwordPlain = null;
  let categoryOrder = [];
  let categoryOrderIndex = Object.create(null);

  // Helpers
  const setBodyScroll = (locked) => { document.body.style.overflow = locked ? "hidden" : ""; };

  const setLang = (l, rerender = true) => {
    lang = l;
    localStorage.setItem(STORAGE.LANG, l);
    const flag = langFlag(); if (flag) flag.textContent = l === RU ? "🇷🇺" : "🇬🇧";
    tnodes().forEach(el => {
      const key = el.getAttribute("data-i");
      el.textContent = i18n[l][key];
    });
    const s = searchInput(); if (s) s.placeholder = i18n[l].searchPH;
    // legend
    const pub = document.querySelector('[data-lang="public"] span:last-child');
    const intr = document.querySelector('[data-lang="internal"] span:last-child');
    if (pub && intr) {
      pub.textContent = l === RU ? "Можно отправлять клиентам" : "OK to share with clients";
      intr.textContent = l === RU ? "Для внутреннего использования" : "Internal use only";
    }
    // buttons text
    document.querySelectorAll(".open-link").forEach(a => a.textContent = i18n[l].openLink);
    document.querySelectorAll(".copy-link").forEach(b => b.textContent = i18n[l].copy);
    if (rerender && !appRoot.hidden) render(); // rerender after unlock only
  };

  const fetchText = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${url}`);
    return res.text();
  };
  const fetchJSON = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch JSON failed: ${url}`);
    return res.json();
  };
  const tryFetchJSON = async (url) => {
    try { return await fetchJSON(url); } catch { return null; }
  };

  const isAuthed = () => localStorage.getItem(STORAGE.AUTH) === "1";
  const setAuthed = (v) => localStorage.setItem(STORAGE.AUTH, v ? "1" : "0");

  const showToast = (msg) => {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 200);
    }, 1400);
  };

  const copyToClipboard = async (txt) => {
    try { await navigator.clipboard.writeText(txt); showToast(i18n[lang].copied); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove(); showToast(i18n[lang].copied);
    }
  };

  const normalize = (s) => (s || "").toLowerCase();

  // Category order support
  const buildCategoryOrderIndex = () => {
    categoryOrderIndex = Object.create(null);
    categoryOrder.forEach((name, idx) => { categoryOrderIndex[name] = idx; });
  };
  const hasIndex = (k) => Object.prototype.hasOwnProperty.call(categoryOrderIndex, k);
  const compareCategories = (a, b) => {
    const ia = hasIndex(a) ? categoryOrderIndex[a] : Infinity;
    const ib = hasIndex(b) ? categoryOrderIndex[b] : Infinity;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  };

  // UI
  const render = () => {
    const cont = content();
    cont.innerHTML = "";
    const tmplSection = document.getElementById("card-template");
    const tmplCard = document.getElementById("app-card-template");

    const categories = Object.keys(grouped).sort(compareCategories);
    categories.forEach(cat => {
      const sec = tmplSection.content.cloneNode(true);
      sec.querySelector(".category-title").textContent = cat;
      const grid = sec.querySelector(".grid");

      grouped[cat].forEach(item => {
        const node = tmplCard.content.cloneNode(true);
        const card = node.querySelector(".card");
        const icon = node.querySelector(".app-icon");
        const name = node.querySelector(".app-name");
        const cmt = node.querySelector(".app-comment");
        const openA = node.querySelector(".open-link");
        const copyB = node.querySelector(".copy-link");

        icon.src = item.icon;
        icon.alt = `${item.name} icon`;
        name.textContent = item.name;
        if (item.comment && item.comment.trim().length) {
          cmt.hidden = false;
          cmt.textContent = item.comment;
        }

        // access badge (emoji, top-right)
        const badge = document.createElement("div");
        badge.classList.add("access-badge");
        if (item.access === "public") {
          badge.classList.add("access-public");
          badge.innerHTML = "✅";
          badge.title = lang === RU ? "Можно отправлять клиентам" : "OK to share with clients";
        } else {
          badge.classList.add("access-internal");
          badge.innerHTML = "🚫";
          badge.title = lang === RU ? "Для внутреннего использования" : "Internal use only";
        }
        card.appendChild(badge);

        openA.href = item.link;
        openA.textContent = i18n[lang].open;
        copyB.textContent = i18n[lang].copy;
        copyB.addEventListener("click", () => copyToClipboard(item.link));

        grid.appendChild(node);
      });

      cont.appendChild(sec);
    });
  };

  const regroup = (list) => {
    const map = {};
    list.forEach(it => {
      const cat = it.category || "Misc";
      if (!map[cat]) map[cat] = [];
      map[cat].push(it);
    });
    grouped = map;
  };

  const applySearch = (q) => {
    if (!q) { regroup(apps); render(); return; }
    const n = normalize(q);
    const filtered = apps.filter(a =>
      normalize(a.name).includes(n) ||
      normalize(a.category).includes(n) ||
      normalize(a.comment).includes(n)
    );
    regroup(filtered); render();
  };

  // Init
  (async function init(){
    // always start with lock visible and app hidden
    appRoot.hidden = true;
    lockScreen.style.display = "grid";
    setBodyScroll(true);

    // Translations on lock screen
    setLang(lang, false);

    // Load password for faster first try (optional)
    try { passwordPlain = (await fetchText("password.txt")).trim(); } catch {}

    // If user already authed previously, skip lock immediately
    if (isAuthed() && passwordPlain) {
      // show app
      lockScreen.style.display = "none";
      lockScreen.setAttribute("aria-hidden","true");
      appRoot.hidden = false;
      setBodyScroll(false);
    } else {
      pwdInput.focus();
    }

    // Attach events that exist only inside app after unlock
    const attachAppEvents = () => {
      const lb = langBtn(); if (lb) lb.addEventListener("click", () => setLang(lang === RU ? EN : RU, true));
      const lkb = lockBtn(); if (lkb) lkb.addEventListener("click", () => {
        setAuthed(false);
        showToast(i18n[lang].logoutTitle);
        appRoot.hidden = true;
        lockScreen.style.display = "grid";
        lockScreen.removeAttribute("aria-hidden");
        setBodyScroll(true);
        pwdInput.focus();
      });
      const si = searchInput(); if (si) si.addEventListener("input", (e) => applySearch(e.target.value));
    };

    // Lock form
    lockForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      lockError.hidden = true;
      const entered = pwdInput.value.trim();

      // ensure we have the current password
      if (!passwordPlain) {
        try { passwordPlain = (await fetchText("password.txt")).trim(); }
        catch { lockError.textContent = "Password file missing."; lockError.hidden = false; return; }
      }

      if (entered === passwordPlain) {
        setAuthed(true);
        pwdInput.value = "";
        lockScreen.setAttribute("aria-hidden", "true");
        lockScreen.style.display = "none";
        appRoot.hidden = false;        // ⬅️ show app only after correct pass
        setBodyScroll(false);

        // Load datasets then render
        const order = await tryFetchJSON("category-order.json");
        if (Array.isArray(order)) { categoryOrder = order; buildCategoryOrderIndex(); }
        try {
          const res = await fetch("apps.json", { cache: "no-store" });
          if (!res.ok) throw new Error("apps.json not found");
          apps = await res.json();
        } catch { apps = []; }
        regroup(apps);
        render();

        // bind app controls once visible
        attachAppEvents();
      } else {
        lockError.textContent = i18n[lang].wrongPass;
        lockError.hidden = false;
      }
    });

    // If authed (from storage) and we already showed app, finish wiring & data
    if (!appRoot.hidden) {
      const order = await tryFetchJSON("category-order.json");
      if (Array.isArray(order)) { categoryOrder = order; buildCategoryOrderIndex(); }
      try {
        const res = await fetch("apps.json", { cache: "no-store" });
        if (!res.ok) throw new Error("apps.json not found");
        apps = await res.json();
      } catch { apps = []; }
      regroup(apps);
      render();
      attachAppEvents();
    }
  })();
})();

/* =========================
   Einhell Bava Toolbox
   ========================= */
(() => {
  "use strict";

  // ---- Config ----
  const RU = "ru";
  const EN = "en";
  const STORAGE = {
    LANG: "toolbox_lang",
    AUTH: "toolbox_authed"
  };

  const i18n = {
    [RU]: {
      open: "Открыть",
      copy: "Копировать ссылку",
      copied: "Скопировано!",
      searchPH: "Поиск…",
      hint: "Нажми ⌘/Ctrl+K для поиска • Shift+A — добавить приложение (подсказка)",
      modalTitle: "Как добавить новое приложение",
      modalText1: "Открой файл ",
      modalText2: "Пример объекта (скопируй и отредактируй):",
      modalText3: "После коммита Cloudflare Pages автоматически обновит сайт.",
      copyJson: "Скопировать пример",
      lockTitle: "Доступ",
      lockInfo: "Введите пароль, чтобы открыть приложение.",
      unlock: "Открыть",
      wrongPass: "Неверный пароль.",
      openLink: "Открыть",
      logoutTitle: "Сессия сброшена.",
    },
    [EN]: {
      open: "Open",
      copy: "Copy link",
      copied: "Copied!",
      searchPH: "Search…",
      hint: "Press ⌘/Ctrl+K to search • Shift+A to add app (helper)",
      modalTitle: "How to add a new app",
      modalText1: "Open ",
      modalText2: "Example object (copy & edit):",
      modalText3: "After commit, Cloudflare Pages will auto-update the site.",
      copyJson: "Copy example",
      lockTitle: "Access",
      lockInfo: "Enter password to unlock.",
      unlock: "Unlock",
      wrongPass: "Wrong password.",
      openLink: "Open",
      logoutTitle: "Session cleared.",
    }
  };

  // ---- Elements ----
  const lockScreen = document.getElementById("lock-screen");
  const lockForm = document.getElementById("lock-form");
  const lockError = document.getElementById("lock-error");
  const pwdInput = document.getElementById("password-input");

  const langBtn = document.getElementById("lang-btn");
  const langFlag = document.getElementById("lang-flag");
  const lockBtn = document.getElementById("lock-btn");
  const searchInput = document.getElementById("search");
  const content = document.getElementById("content");
  const gearBtn = document.getElementById("gear-btn");
  const modal = document.getElementById("modal");
  const modalClose = document.getElementById("modal-close");
  const jsonExample = document.getElementById("json-example");
  const copyJsonBtn = document.getElementById("copy-json");

  const tnodes = document.querySelectorAll("[data-i]");

  // ---- State ----
  let lang = (localStorage.getItem(STORAGE.LANG) || RU);
  let apps = [];
  let grouped = {};
  let passwordPlain = null; // loaded from password.txt

  // ---- Helpers ----
  const setLang = (l) => {
    lang = l;
    localStorage.setItem(STORAGE.LANG, l);
    langFlag.textContent = l === RU ? "🇷🇺" : "🇬🇧";
    // update text nodes
    tnodes.forEach(el => {
      const key = el.getAttribute("data-i");
      el.textContent = i18n[l][key];
    });
    // placeholders
    searchInput.placeholder = i18n[l].searchPH;
    // buttons on cards
    document.querySelectorAll(".open-link").forEach(a => a.textContent = i18n[l].openLink);
    document.querySelectorAll(".copy-link").forEach(b => b.textContent = i18n[l].copy);
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
    try {
      await navigator.clipboard.writeText(txt);
      showToast(i18n[lang].copied);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      showToast(i18n[lang].copied);
    }
  };

  const normalize = (s) => (s || "").toLowerCase();

  // ---- UI builders ----
  const render = () => {
    content.innerHTML = "";
    const tmplSection = document.getElementById("card-template");
    const tmplCard = document.getElementById("app-card-template");

    const categories = Object.keys(grouped).sort((a,b)=>a.localeCompare(b));
    categories.forEach(cat => {
      const sec = tmplSection.content.cloneNode(true);
      sec.querySelector(".category-title").textContent = cat;

      const grid = sec.querySelector(".grid");
      grouped[cat].forEach(item => {
        const node = tmplCard.content.cloneNode(true);
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

        openA.href = item.link;
        openA.textContent = i18n[lang].open;
        copyB.textContent = i18n[lang].copy;
        copyB.addEventListener("click", () => copyToClipboard(item.link));

        grid.appendChild(node);
      });

      content.appendChild(sec);
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

  const buildJsonExample = () => {
    const example = {
      category: "Stock Tools",
      icon: "https://einhell-bava-toolbox.pages.dev/icons/stock.png",
      name: "Stock Viewer",
      link: "https://einhell-stock.pages.dev/",
      comment: "strictly confidential"
    };
    jsonExample.textContent = JSON.stringify(example, null, 2);
  };

  const setLangTexts = () => setLang(lang); // re-apply based on current lang

  // ---- Events ----
  langBtn.addEventListener("click", () => setLang(lang === RU ? EN : RU));
  document.addEventListener("keydown", (e) => {
    // Ctrl/⌘+K -> focus search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
    }
    // Shift+A -> open modal
    if (e.shiftKey && (e.key === "A" || e.key === "a")) {
      e.preventDefault();
      modal.showModal();
    }
  });

  gearBtn.addEventListener("click", () => modal.showModal());
  modalClose.addEventListener("click", () => modal.close());
  copyJsonBtn.addEventListener("click", () => copyToClipboard(jsonExample.textContent));

  lockBtn.addEventListener("click", () => {
    setAuthed(false);
    showToast(i18n[lang].logoutTitle);
    // show lock
    lockScreen.removeAttribute("aria-hidden");
    lockScreen.style.display = "grid";
    pwdInput.focus();
  });

  searchInput.addEventListener("input", (e) => applySearch(e.target.value));

  lockForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    lockError.hidden = true;
    const entered = pwdInput.value.trim();
    if (!passwordPlain) {
      try {
        passwordPlain = (await fetchText("password.txt")).trim();
      } catch {
        lockError.textContent = "Password file missing.";
        lockError.hidden = false;
        return;
      }
    }
    if (entered === passwordPlain) {
      setAuthed(true);
      pwdInput.value = "";
      lockScreen.setAttribute("aria-hidden", "true");
      lockScreen.style.display = "none";
      return;
    } else {
      lockError.textContent = i18n[lang].wrongPass;
      lockError.hidden = false;
    }
  });

  // ---- Init ----
  (async function init(){
    // Language texts
    setLangTexts();
    buildJsonExample();

    // If already authed, skip lock
    if (isAuthed()) {
      lockScreen.setAttribute("aria-hidden","true");
      lockScreen.style.display = "none";
    } else {
      // prefetch password file to reduce latency
      try { passwordPlain = (await fetchText("password.txt")).trim(); }
      catch {/* ignore */}
      lockScreen.style.display = "grid";
      pwdInput.focus();
    }

    // Load apps
    try {
      apps = await fetchJSON("apps.json");
    } catch (e) {
      console.error(e);
      apps = [];
    }
    regroup(apps);
    render();
  })();
})();

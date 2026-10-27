
(() => {
  "use strict";

  const DOC_KEY = "writersRoom.documents.v1";
  const SETTINGS_KEY = "writersRoom.settings.v1";
  const $ = (id) => document.getElementById(id);

  const defaults = {
    title: "The Writer's Room",
    subtitle: "Um lugar para suas histórias criarem raízes.",
    banner: "",
    bg: "#f2ebdd",
    panel: "#fffdf8",
    text: "#433a35",
    muted: "#85776d",
    accent: "#a56d78",
    accentSoft: "#f1e2e4",
    border: "#e4dbce",
    sidebar: "#f8f4ec",
    uiFont: "system",
    writingFont: "serif",
    writingSize: 18,
    writingWidth: 760,
    panelRadius: 14,
    showBanner: true
  };

  let settings = { ...defaults };
  let docs = [];
  let activeId = null;
  let saveTimer = null;
  let toastTimer = null;
  let readingSize = 20;
  let lastSelectionRange = null;

  const uid = () =>
    "doc_" + Date.now().toString(36) + "_" +
    Math.random().toString(36).slice(2, 8);

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));

  const plainText = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.innerText || div.textContent || "")
      .replace(/\s+/g, " ").trim();
  };

  const wordCount = (text) =>
    (text.trim().match(/\S+/g) || []).length;

  const nowLabel = (time) =>
    time
      ? new Date(time).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short"
        })
      : "Agora";

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => toast.classList.remove("show"),
      2300
    );
  }

  function loadState() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(DOC_KEY) || "[]"
      );

      if (Array.isArray(stored)) {
        docs = stored
          .filter(d => d && typeof d.id === "string")
          .map(d => ({
            id: d.id,
            title: String(d.title || "Sem título"),
            content: String(d.content || ""),
            createdAt: Number(d.createdAt) || Date.now(),
            updatedAt: Number(d.updatedAt) || Date.now()
          }));
      }
    } catch (e) {
      docs = [];
      showToast("Não foi possível ler a biblioteca salva.");
    }

    try {
      const storedSettings = JSON.parse(
        localStorage.getItem(SETTINGS_KEY) || "null"
      );

      if (storedSettings && typeof storedSettings === "object") {
        settings = { ...defaults, ...storedSettings };
      }
    } catch (e) {}

    if (docs.length) {
      docs.sort((a, b) => b.updatedAt - a.updatedAt);
      activeId = docs[0].id;
    }
  }

  function saveDocs() {
    try {
      localStorage.setItem(DOC_KEY, JSON.stringify(docs));
      $("saveState").textContent = "Tudo salvo";
    } catch (e) {
      $("saveState").textContent = "Falha ao salvar";
      showToast(
        "Armazenamento cheio. Exporte um backup e reduza imagens."
      );
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch (e) {
      showToast(
        "Não foi possível salvar a aparência. A imagem pode ser grande demais."
      );
    }
  }

  function scheduleSave() {
    $("saveState").textContent = "Salvando…";
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
      saveActiveFromUI();
      saveDocs();
      renderLibrary();
    }, 350);
  }

  function getActive() {
    return docs.find(d => d.id === activeId) || null;
  }

  function saveActiveFromUI() {
    const doc = getActive();

    if (!doc || $("documentEditor").hidden) return;

    doc.title = $("docTitle").value.trim() || "Sem título";
    doc.content = $("richEditor").innerHTML;
    doc.updatedAt = Date.now();

    updateMeta();
  }

  function createDoc() {
    const d = {
      id: uid(),
      title: "Sem título",
      content: "<p><br></p>",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    docs.unshift(d);
    activeId = d.id;

    saveDocs();
    renderLibrary();
    openDoc(d.id);

    $("docTitle").focus();
    $("docTitle").select();
  }

  function openDoc(id) {
    saveActiveFromUI();
    activeId = id;

    const d = getActive();

    if (!d) {
      $("documentEditor").hidden = true;
      $("emptyState").hidden = false;
      renderLibrary();
      return;
    }

    $("emptyState").hidden = true;
    $("documentEditor").hidden = false;

    $("docTitle").value =
      d.title === "Sem título" ? "" : d.title;

    $("richEditor").innerHTML =
      d.content || "<p><br></p>";

    $("lastEdited").textContent =
      d.createdAt === d.updatedAt
        ? "Criado agora"
        : "Editado " + nowLabel(d.updatedAt);

    updateMeta();
    renderLibrary();

    $("sidebar").classList.remove("mobile-open");
  }

  function updateMeta() {
    const d = getActive();
    if (!d) return;

    const txt = plainText($("richEditor").innerHTML);
    const count = wordCount(txt);

    $("wordCount").textContent =
      count + (count === 1 ? " palavra" : " palavras");

    $("lastEdited").textContent =
      "Editado " + nowLabel(d.updatedAt);
  }

  function renderLibrary() {
    const query = $("searchDocs").value
      .trim()
      .toLocaleLowerCase("pt-BR");

    const visible = docs.filter(d =>
      (d.title + " " + plainText(d.content))
        .toLocaleLowerCase("pt-BR")
        .includes(query)
    );

    $("docCount").textContent = docs.length;

    $("docList").innerHTML = visible.length
      ? visible.map(d => `
        <button class="doc-item ${d.id === activeId ? "active" : ""}"
                data-id="${esc(d.id)}">
          <span class="doc-item-title">${esc(d.title || "Sem título")}</span>
          <span class="doc-item-preview">${esc(plainText(d.content) || "Ainda sem conteúdo")}</span>
          <span class="doc-item-date">${esc(nowLabel(d.updatedAt))}</span>
        </button>
      `).join("")
      : `<div class="no-docs">${
          docs.length
            ? "Nenhum texto encontrado."
            : "Sua biblioteca está vazia. Crie um texto para começar."
        }</div>`;

    $("docList").querySelectorAll("[data-id]").forEach(btn => {
      btn.addEventListener("click", () => openDoc(btn.dataset.id));
    });
  }

  function applySettings() {
    const root = document.documentElement;

    const vars = {
      bg: settings.bg,
      panel: settings.panel,
      text: settings.text,
      muted: settings.muted,
      accent: settings.accent,
      accentSoft: settings.accentSoft,
      border: settings.border,
      sidebar: settings.sidebar
    };

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty("--" + key.replace(
        /[A-Z]/g,
        m => "-" + m.toLowerCase()
      ), value);
    });

    const uiMap = {
      system: "system-ui",
      serif: "Georgia",
      sans: "Arial",
      mono: "Courier New"
    };

    const writingMap = {
      serif: "Georgia",
      sans: "Arial",
      mono: "Courier New",
      georgia: "Georgia"
    };

    root.style.setProperty(
      "--ui-font",
      uiMap[settings.uiFont] || "system-ui"
    );

    root.style.setProperty(
      "--writing-font",
      writingMap[settings.writingFont] || "Georgia"
    );

    root.style.setProperty(
      "--writing-size",
      settings.writingSize + "px"
    );

    root.style.setProperty(
      "--writing-width",
      settings.writingWidth + "px"
    );

    root.style.setProperty(
      "--panel-radius",
      settings.panelRadius + "px"
    );

    $("siteTitle").textContent =
      settings.title || defaults.title;

    $("siteSubtitle").textContent = settings.subtitle || "";
    $("siteBanner").hidden = !settings.showBanner;

    $("siteBanner").style.backgroundImage = settings.banner
      ? `url("${settings.banner}")`
      : "linear-gradient(135deg,var(--accent-soft),var(--bg))";

    $("bannerPreview").style.backgroundImage = settings.banner
      ? `url("${settings.banner}")`
      : "linear-gradient(135deg,var(--accent-soft),var(--bg))";

    $("bannerPreview").querySelector("span").hidden =
      !!settings.banner;

    $("miniPreviewBanner").style.backgroundImage =
      settings.banner
        ? `url("${settings.banner}")`
        : "linear-gradient(135deg,var(--accent-soft),var(--bg))";

    $("miniPreviewBanner").style.height =
      settings.showBanner ? "65px" : "15px";

    document.title = settings.title || defaults.title;
  }

  function populateSettings() {
    $("settingTitle").value = settings.title;
    $("settingSubtitle").value = settings.subtitle;

    const mapping = {
      cBg: "bg",
      cPanel: "panel",
      cText: "text",
      cMuted: "muted",
      cAccent: "accent",
      cAccentSoft: "accentSoft",
      cBorder: "border",
      cSidebar: "sidebar"
    };

    Object.entries(mapping).forEach(([id, key]) => {
      $(id).value = settings[key];
    });

    $("uiFont").value = settings.uiFont;
    $("writingFont").value = settings.writingFont;
    $("writingSize").value = settings.writingSize;
    $("writingWidth").value = settings.writingWidth;
    $("panelRadius").value = settings.panelRadius;
    $("showBanner").checked = !!settings.showBanner;

    $("fontSizeOutput").value = settings.writingSize + " px";
    $("widthOutput").value = settings.writingWidth + " px";
    $("radiusOutput").value = settings.panelRadius + " px";
  }

  function updateSettingsFromControls() {
    settings.title = $("settingTitle").value || defaults.title;
    settings.subtitle = $("settingSubtitle").value;

    const mapping = {
      cBg: "bg",
      cPanel: "panel",
      cText: "text",
      cMuted: "muted",
      cAccent: "accent",
      cAccentSoft: "accentSoft",
      cBorder: "border",
      cSidebar: "sidebar"
    };

    Object.entries(mapping).forEach(([id, key]) => {
      settings[key] = $(id).value;
    });

    settings.uiFont = $("uiFont").value;
    settings.writingFont = $("writingFont").value;
    settings.writingSize = Number($("writingSize").value);
    settings.writingWidth = Number($("writingWidth").value);
    settings.panelRadius = Number($("panelRadius").value);
    settings.showBanner = $("showBanner").checked;

    $("fontSizeOutput").value = settings.writingSize + " px";
    $("widthOutput").value = settings.writingWidth + " px";
    $("radiusOutput").value = settings.panelRadius + " px";

    applySettings();
  }

  function openAppearance() {
    populateSettings();
    $("appearanceModal").hidden = false;
  }

  function closeAppearance() {
    $("appearanceModal").hidden = true;
  }

  function rememberSelection() {
    const sel = window.getSelection();

    if (
      sel &&
      sel.rangeCount &&
      $("richEditor").contains(sel.anchorNode)
    ) {
      lastSelectionRange = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!lastSelectionRange) return;

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastSelectionRange);
  }

  function runCommand(cmd, value = null) {
    $("richEditor").focus();
    restoreSelection();

    document.execCommand(cmd, false, value);

    rememberSelection();
    scheduleSave();
  }

  function applyBlockFormat(value) {
    $("richEditor").focus();
    restoreSelection();

    document.execCommand("formatBlock", false, value);

    rememberSelection();
    scheduleSave();
  }

  function applyTextColor(color) {
    runCommand("foreColor", color);
  }

  function toggleDropCap() {
    $("richEditor").focus();
    restoreSelection();

    const sel = window.getSelection();
    let node = sel && sel.anchorNode;

    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    const paragraph =
      node && node.closest ? node.closest("p") : null;

    if (!paragraph || !$("richEditor").contains(paragraph)) {
      showToast("Clique em um parágrafo antes de aplicar a capitular.");
      return;
    }

    paragraph.classList.toggle("dropcap-paragraph");
    scheduleSave();
  }

  function deleteActive() {
    const d = getActive();
    if (!d) return;

    if (!confirm(
      `Excluir “${d.title || "Sem título"}”? Esta ação não pode ser desfeita. Exporte um backup antes se quiser guardar o texto.`
    )) return;

    docs = docs.filter(x => x.id !== activeId);
    activeId = docs[0]?.id || null;

    saveDocs();
    renderLibrary();

    if (activeId) {
      openDoc(activeId);
    } else {
      $("documentEditor").hidden = true;
      $("emptyState").hidden = false;
    }

    showToast("Texto excluído.");
  }

  function startReading() {
    saveActiveFromUI();

    const d = getActive();

    if (!d) {
      showToast("Crie ou escolha um texto primeiro.");
      return;
    }

    $("readingTitle").textContent = d.title || "Sem título";
    $("readingContent").innerHTML = $("richEditor").innerHTML;
    $("readingView").hidden = false;

    readingSize = 20;
    $("readingPage").style.setProperty(
      "--reading-size",
      readingSize + "px"
    );
  }

  function exportBackup() {
    saveActiveFromUI();
    saveDocs();

    const data = {
      format: "writers-room-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      documents: docs
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download =
      "writers-room-backup-" +
      new Date().toISOString().slice(0, 10) +
      ".json";

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast("Backup exportado.");
  }

  function importBackupFile(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (
          !data ||
          !Array.isArray(data.documents) ||
          !data.settings ||
          typeof data.settings !== "object"
        ) {
          throw new Error("Formato inválido");
        }

        if (!confirm(
          "Importar este backup substituirá a biblioteca e a aparência atuais. Exporte um backup do estado atual antes de continuar. Deseja prosseguir?"
        )) return;

        docs = data.documents
          .filter(d => d && typeof d.id === "string")
          .map(d => ({
            id: d.id,
            title: String(d.title || "Sem título"),
            content: String(d.content || ""),
            createdAt: Number(d.createdAt) || Date.now(),
            updatedAt: Number(d.updatedAt) || Date.now()
          }));

        settings = { ...defaults, ...data.settings };
        activeId = docs[0]?.id || null;

        saveDocs();
        saveSettings();
        applySettings();
        renderLibrary();

        if (activeId) {
          openDoc(activeId);
        } else {
          $("documentEditor").hidden = true;
          $("emptyState").hidden = false;
        }

        showToast("Backup importado.");
      } catch (e) {
        showToast("Arquivo de backup inválido ou danificado.");
      }

      $("importFile").value = "";
    };

    reader.readAsText(file);
  }

  function handleBannerUpload(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Escolha um arquivo de imagem.");
      return;
    }

    if (file.size > 1_500_000) {
      showToast(
        "A imagem deve ter até 1,5 MB para caber no armazenamento local."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      settings.banner = String(reader.result);
      applySettings();
      showToast("Banner carregado. Clique em Salvar aparência.");
    };

    reader.readAsDataURL(file);
  }

  // Biblioteca e editor
  $("newDoc").addEventListener("click", createDoc);
  $("emptyNewDoc").addEventListener("click", createDoc);
  $("searchDocs").addEventListener("input", renderLibrary);

  $("docTitle").addEventListener("input", () => {
    scheduleSave();
    renderLibrary();
  });

  $("richEditor").addEventListener("input", () => {
    rememberSelection();
    scheduleSave();
  });

  $("richEditor").addEventListener("keyup", rememberSelection);
  $("richEditor").addEventListener("mouseup", rememberSelection);

  $("richEditor").addEventListener("focus", () => {
    document.body.classList.remove("focus-mode");
  });

  $("formatToolbar")
    .querySelectorAll("[data-cmd]")
    .forEach(btn => {
      btn.addEventListener("mousedown", e => e.preventDefault());
      btn.addEventListener("click", () => runCommand(btn.dataset.cmd));
    });

  $("blockFormat").addEventListener("change", e => {
    applyBlockFormat(e.target.value);
  });

  $("textColor").addEventListener("input", e => {
    applyTextColor(e.target.value);
  });

  $("dropCap").addEventListener("mousedown", e => e.preventDefault());
  $("dropCap").addEventListener("click", toggleDropCap);

  $("clearFormat").addEventListener("mousedown", e => e.preventDefault());
  $("clearFormat").addEventListener("click", () => runCommand("removeFormat"));

  $("deleteDoc").addEventListener("click", deleteActive);

  // Modo de leitura
  $("readingMode").addEventListener("click", startReading);
  $("exitReading").addEventListener("click", () => {
    $("readingView").hidden = true;
  });

  $("readingSmaller").addEventListener("click", () => {
    readingSize = Math.max(14, readingSize - 2);
    $("readingPage").style.setProperty(
      "--reading-size",
      readingSize + "px"
    );
  });

  $("readingLarger").addEventListener("click", () => {
    readingSize = Math.min(34, readingSize + 2);
    $("readingPage").style.setProperty(
      "--reading-size",
      readingSize + "px"
    );
  });

  // Modo Typewriter
  $("typewriterMode").addEventListener("click", () => {
    document.body.classList.toggle("typewriter-mode");

    const on = document.body.classList.contains("typewriter-mode");

    $("typewriterMode").textContent =
      on ? "⌨ Typewriter ✓" : "⌨ Typewriter";

    showToast(
      on
        ? "Modo Typewriter ativado."
        : "Modo Typewriter desativado."
    );
  });

  // Mais opções
  $("moreMenu").addEventListener("click", () => {
    const choice = prompt(
      "Mais opções:\n" +
      "1 — Modo foco (ocultar biblioteca)\n" +
      "2 — Sair do modo foco\n" +
      "3 — Duplicar texto atual"
    );

    if (choice === "1") {
      document.body.classList.add("focus-mode");
    } else if (choice === "2") {
      document.body.classList.remove("focus-mode");
    } else if (choice === "3") {
      const d = getActive();

      if (d) {
        saveActiveFromUI();

        const copy = {
          ...d,
          id: uid(),
          title: (d.title || "Sem título") + " — cópia",
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        docs.unshift(copy);
        activeId = copy.id;

        saveDocs();
        renderLibrary();
        openDoc(copy.id);

        showToast("Cópia criada.");
      }
    }
  });

  // Personalização visual
  $("openAppearance").addEventListener("click", openAppearance);
  $("openAppearanceSide").addEventListener("click", openAppearance);
  $("closeAppearance").addEventListener("click", closeAppearance);

  $("appearanceModal").addEventListener("click", e => {
    if (e.target === $("appearanceModal")) closeAppearance();
  });

  [
    "settingTitle",
    "settingSubtitle",
    "cBg",
    "cPanel",
    "cText",
    "cMuted",
    "cAccent",
    "cAccentSoft",
    "cBorder",
    "cSidebar",
    "uiFont",
    "writingFont",
    "writingSize",
    "writingWidth",
    "panelRadius",
    "showBanner"
  ].forEach(id => {
    $(id).addEventListener("input", updateSettingsFromControls);
  });

  $("bannerUpload").addEventListener("change", e => {
    handleBannerUpload(e.target.files[0]);
  });

  $("removeBanner").addEventListener("click", () => {
    settings.banner = "";
    applySettings();
    $("bannerUpload").value = "";
  });

  $("resetAppearance").addEventListener("click", () => {
    if (!confirm("Restaurar toda a aparência para o padrão?")) return;

    settings = { ...defaults };
    populateSettings();
    applySettings();

    showToast("Prévia restaurada. Clique em Salvar aparência para confirmar.");
  });

  $("saveAppearance").addEventListener("click", () => {
    updateSettingsFromControls();
    saveSettings();
    applySettings();
    closeAppearance();

    showToast("Aparência salva neste navegador.");
  });

  // Backup
  $("exportBackup").addEventListener("click", exportBackup);

  $("importBackup").addEventListener("click", () => {
    $("importFile").click();
  });

  $("importFile").addEventListener("change", e => {
    importBackupFile(e.target.files[0]);
  });

  // Biblioteca no celular
  $("toggleSidebar").addEventListener("click", () => {
    $("sidebar").classList.toggle("mobile-open");
  });

  // Atalhos de teclado e salvamento ao sair
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveActiveFromUI();
      saveDocs();
      saveSettings();
      showToast("Salvo.");
    }

    if (e.key === "Escape") {
      closeAppearance();
      $("readingView").hidden = true;
      $("sidebar").classList.remove("mobile-open");
    }
  });

  window.addEventListener("beforeunload", () => {
    saveActiveFromUI();
    saveDocs();
  });

  // Inicialização
  loadState();
  applySettings();
  renderLibrary();

  if (activeId) {
    openDoc(activeId);
  }
})();

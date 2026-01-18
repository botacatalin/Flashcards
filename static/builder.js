(() => {
  const STORAGE_KEY = "flashcard-builder-state";
  const DEFAULT_LAYOUT = "full";
  const DRAFT_INDEX = -1;

  const meta = {
    version: 1,
    cards: [],
    currentIndex: DRAFT_INDEX,
    draftContent: { front: {}, back: {} },
  };

  window.flashcardMeta = meta;

  const dom = {
    cardNameInput: document.getElementById("card-name"),
    cardNameTarget: document.querySelector("[data-card-name]"),
    savedCardsGrid: document.getElementById("saved-cards-grid"),
    saveCardButton: document.getElementById("save-card"),
    saveJsonButton: document.getElementById("save-json"),
    buildButton: document.getElementById("build-flashcard"),
    buildInput: document.getElementById("build-json"),
    newProjectButton: document.getElementById("new-project"),
    frontPreview: document.querySelector('[data-preview="front"]'),
    backPreview: document.querySelector('[data-preview="back"]'),
    contentModal: document.getElementById("content-modal"),
    contentTitle: document.getElementById("content-modal-title"),
    textEditor: document.getElementById("text-editor"),
    textLabel: document.getElementById("text-content-label"),
    imageContent: document.getElementById("image-content"),
    imageLabel: document.getElementById("image-content-label"),
    contentSave: document.getElementById("content-save"),
    contentCancel: document.getElementById("content-cancel"),
    builderHelpButton: document.getElementById("builder-help"),
    builderHelpModal: document.getElementById("builder-help-modal"),
    builderHelpClose: document.getElementById("builder-help-close"),
    builderHelpContent: document.getElementById("builder-help-content"),
  };

  const getActiveCard = () =>
    meta.currentIndex >= 0 && meta.currentIndex < meta.cards.length
      ? meta.cards[meta.currentIndex]
      : null;

  const getActiveContent = () => {
    const activeCard = getActiveCard();
    if (activeCard) {
      return activeCard.content || { front: {}, back: {} };
    }
    return meta.draftContent;
  };

  const setCardName = (value) => {
    if (dom.cardNameTarget) {
      dom.cardNameTarget.textContent = value || "Card Name";
    }
  };

  const setPreviewLayouts = (front, back) => {
    if (dom.frontPreview) {
      dom.frontPreview.dataset.layout = front || DEFAULT_LAYOUT;
    }
    if (dom.backPreview) {
      dom.backPreview.dataset.layout = back || DEFAULT_LAYOUT;
    }
  };

  const getSelectedLayout = (name) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : DEFAULT_LAYOUT;
  };

  const normalizeCard = (card) => {
    const layouts = card && card.layouts ? card.layouts : {};
    const content = card && card.content ? card.content : {};
    const name = card && card.name ? card.name : "Untitled card";
    return {
      name: name.trim() || "Untitled card",
      layouts: {
        front: layouts.front || DEFAULT_LAYOUT,
        back: layouts.back || DEFAULT_LAYOUT,
      },
      content: {
        front: content.front || {},
        back: content.back || {},
      },
    };
  };

  const buildCardMeta = () => {
    const name = dom.cardNameInput ? dom.cardNameInput.value.trim() : "";
    const content = JSON.parse(JSON.stringify(getActiveContent()));
    return normalizeCard({
      name,
      layouts: {
        front: getSelectedLayout("front-layout"),
        back: getSelectedLayout("back-layout"),
      },
      content,
    });
  };

  const normalizeImageUrl = (value) => {
    if (!value) {
      return value;
    }
    try {
      const url = new URL(value);
      const fileMatch = url.pathname.match(/\/File:(.+)$/i);
      const mediaMatch = url.pathname.match(/\/media\/File:(.+)$/i);
      const filename = fileMatch ? fileMatch[1] : mediaMatch ? mediaMatch[1] : null;
      if (filename && (url.hostname.includes("wikipedia.org") || url.hostname.includes("wikimedia.org"))) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
          filename
        )}`;
      }
    } catch (error) {
      return value;
    }
    return value;
  };

  const renderAreaContent = (areaElement, content) => {
    if (!areaElement) {
      return;
    }
    const container = areaElement.querySelector(".area-content");
    if (!container) {
      return;
    }
    container.innerHTML = "";
    if (!content) {
      return;
    }
    if (content.type === "text") {
      const text = document.createElement("div");
      text.className = "rich-text";
      text.innerHTML = content.value;
      container.appendChild(text);
      return;
    }
    if (content.type === "image") {
      const image = document.createElement("img");
      image.src = content.value;
      image.alt = "Flashcard";
      container.appendChild(image);
    }
  };

  const renderContent = () => {
    const content = getActiveContent();
    document.querySelectorAll(".layout-area").forEach((area) => {
      const side = area.dataset.side;
      const key = area.dataset.area;
      const value = content[side] ? content[side][key] : null;
      renderAreaContent(area, value);
    });
  };

  const updatePreview = () => {
    const activeCard = getActiveCard();
    if (activeCard) {
      setCardName(activeCard.name);
      setPreviewLayouts(activeCard.layouts.front, activeCard.layouts.back);
      renderContent();
      return;
    }

    setCardName(dom.cardNameInput ? dom.cardNameInput.value.trim() : "");
    setPreviewLayouts(
      getSelectedLayout("front-layout"),
      getSelectedLayout("back-layout")
    );
    renderContent();
  };

  const isEmptyRichText = (value) => {
    if (!value) {
      return true;
    }
    const cleaned = value
      .replace(/<br\s*\/?>/gi, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/<div><\/div>/gi, "")
      .replace(/<p><\/p>/gi, "")
      .replace(/<h\d><\/h\d>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    return cleaned.length === 0;
  };

  const hasContent = (content) => {
    if (!content) {
      return false;
    }
    const sides = ["front", "back"];
    return sides.some((side) => {
      const areas = content[side] || {};
      return Object.values(areas).some((entry) => {
        if (!entry || !entry.value) {
          return false;
        }
        if (entry.type === "text") {
          return !isEmptyRichText(entry.value);
        }
        return Boolean(entry.value);
      });
    });
  };

  const renderSavedCards = () => {
    if (!dom.savedCardsGrid) {
      return;
    }
    dom.savedCardsGrid.innerHTML = "";
    if (meta.cards.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No saved cards yet.";
      dom.savedCardsGrid.appendChild(empty);
      return;
    }
    meta.cards.forEach((card, index) => {
      const item = document.createElement("article");
      const removeButton = document.createElement("button");
      const name = document.createElement("small");
      name.textContent = card.name;
      item.dataset.index = String(index);
      if (index === meta.currentIndex) {
        item.setAttribute("aria-current", "true");
      }
      removeButton.type = "button";
      removeButton.className = "saved-card-remove";
      removeButton.setAttribute("aria-label", "Remove card");
      removeButton.setAttribute("title", "Remove card");
      removeButton.dataset.action = "remove-card";
      removeButton.innerHTML = "<span aria-hidden=\"true\">×</span>";
      item.appendChild(removeButton);
      item.appendChild(name);
      dom.savedCardsGrid.appendChild(item);
    });
  };

  const persistBuilderState = () => {
    try {
      const payload = {
        version: meta.version,
        cards: meta.cards,
        currentIndex: meta.currentIndex,
        draftContent: meta.draftContent,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Unable to save flashcard state.", error);
    }
  };

  const loadBuilderState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
      meta.cards = cards.map(normalizeCard);
      meta.currentIndex = Number(parsed.currentIndex);
      if (!Number.isInteger(meta.currentIndex) || meta.cards.length === 0) {
        meta.currentIndex = DRAFT_INDEX;
      }
      if (parsed.draftContent) {
        meta.draftContent = parsed.draftContent;
      }
    } catch (error) {
      console.warn("Unable to load flashcard state.", error);
    }
  };

  const resetDraft = () => {
    meta.currentIndex = DRAFT_INDEX;
    meta.draftContent = { front: {}, back: {} };
    if (dom.cardNameInput) {
      dom.cardNameInput.value = "";
    }
    const frontRadio = document.querySelector(
      `input[name="front-layout"][value="${DEFAULT_LAYOUT}"]`
    );
    if (frontRadio) {
      frontRadio.checked = true;
    }
    const backRadio = document.querySelector(
      `input[name="back-layout"][value="${DEFAULT_LAYOUT}"]`
    );
    if (backRadio) {
      backRadio.checked = true;
    }
    renderSavedCards();
    updatePreview();
    persistBuilderState();
  };

  const bindLayoutPreview = (name, previewSelector) => {
    const preview = document.querySelector(previewSelector);
    if (!preview) {
      return;
    }
    const update = () => {
      const selected = document.querySelector(`input[name="${name}"]:checked`);
      if (selected) {
        preview.dataset.layout = selected.value;
      }
      const activeCard = getActiveCard();
      if (activeCard && selected) {
        if (name === "front-layout") {
          activeCard.layouts.front = selected.value;
        } else {
          activeCard.layouts.back = selected.value;
        }
      }
      updatePreview();
      persistBuilderState();
    };
    document
      .querySelectorAll(`input[name="${name}"]`)
      .forEach((radio) => radio.addEventListener("change", update));
    update();
  };

  const readJsonFile = async (fileInput) => {
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) {
      return null;
    }
    const text = await file.text();
    return JSON.parse(text);
  };

  const extractCardsFromData = (data) => {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.cards)) {
      return data.cards;
    }
    if (data && (data.name || data.layouts || data.content)) {
      return [data];
    }
    return [];
  };

  const loadReadme = async () => {
    if (!dom.builderHelpContent) {
      return;
    }
    try {
      const response = await fetch("/api/readme", { cache: "no-store" });
      if (response.ok) {
        dom.builderHelpContent.textContent = await response.text();
      }
    } catch (error) {
      dom.builderHelpContent.textContent = "Unable to load README content.";
    }
  };

  let pellEditor = null;

  const initTextEditor = () => {
    if (!dom.textEditor || !window.pell || pellEditor) {
      return;
    }
    const colorIcon = (hex) =>
      `<span class="pell-color" style="background:${hex}"></span>`;
    pellEditor = window.pell.init({
      element: dom.textEditor,
      actions: [
        {
          name: "size-small",
          icon: "S",
          title: "Small",
          result: () =>
            document.execCommand("formatBlock", false, "<h5>"),
        },
        {
          name: "size-normal",
          icon: "M",
          title: "Normal",
          result: () =>
            document.execCommand("formatBlock", false, "<h3>"),
        },
        {
          name: "size-large",
          icon: "L",
          title: "Large",
          result: () =>
            document.execCommand("formatBlock", false, "<h1>"),
        },
        {
          name: "color-ink",
          icon: colorIcon("#0f172a"),
          title: "Ink",
          result: () => document.execCommand("foreColor", false, "#0f172a"),
        },
        {
          name: "color-blue",
          icon: colorIcon("#2563eb"),
          title: "Blue",
          result: () => document.execCommand("foreColor", false, "#2563eb"),
        },
        {
          name: "color-green",
          icon: colorIcon("#16a34a"),
          title: "Green",
          result: () => document.execCommand("foreColor", false, "#16a34a"),
        },
        {
          name: "color-red",
          icon: colorIcon("#b91c1c"),
          title: "Red",
          result: () => document.execCommand("foreColor", false, "#b91c1c"),
        },
        {
          name: "color-amber",
          icon: colorIcon("#b45309"),
          title: "Amber",
          result: () => document.execCommand("foreColor", false, "#b45309"),
        },
      ],
    });
    pellEditor.content.setAttribute("aria-label", "Text editor");
    pellEditor.content.setAttribute("role", "textbox");
    pellEditor.content.setAttribute("aria-multiline", "true");
  };

  const openContentModal = (mode, area) => {
    if (!dom.contentModal) {
      return;
    }
    dom.contentModal.dataset.mode = mode;
    dom.contentModal.dataset.side = area.dataset.side || "front";
    dom.contentModal.dataset.area = area.dataset.area || "area-1";
    if (dom.contentTitle) {
      dom.contentTitle.textContent = mode === "image" ? "Add image" : "Add text";
    }
    if (dom.textLabel) {
      dom.textLabel.hidden = mode !== "text";
    }
    if (dom.imageLabel) {
      dom.imageLabel.hidden = mode !== "image";
    }
    if (mode === "text" && pellEditor) {
      pellEditor.content.innerHTML = "<h3><br></h3>";
    }
    if (dom.imageContent) {
      dom.imageContent.value = "";
    }
    dom.contentModal.showModal();
  };

  const closeContentModal = () => {
    if (dom.contentModal && dom.contentModal.open) {
      dom.contentModal.close();
    }
  };

  const saveContentFromModal = () => {
    if (!dom.contentModal) {
      return;
    }
    const mode = dom.contentModal.dataset.mode;
    const side = dom.contentModal.dataset.side;
    const area = dom.contentModal.dataset.area;
    const rawValue =
      mode === "image"
        ? dom.imageContent && dom.imageContent.value.trim()
        : pellEditor && pellEditor.content.innerHTML.trim();
    const value = mode === "image" ? normalizeImageUrl(rawValue) : rawValue;
    if (!value || (mode === "text" && isEmptyRichText(value))) {
      closeContentModal();
      return;
    }
    const activeCard = getActiveCard();
    if (activeCard) {
      activeCard.content = activeCard.content || { front: {}, back: {} };
      activeCard.content[side] = activeCard.content[side] || {};
      activeCard.content[side][area] = { type: mode, value };
    } else {
      meta.draftContent[side] = meta.draftContent[side] || {};
      meta.draftContent[side][area] = { type: mode, value };
    }
    updatePreview();
    persistBuilderState();
    closeContentModal();
  };

  const setupBuilder = () => {
    loadBuilderState();
    initTextEditor();

    if (dom.saveCardButton) {
      dom.saveCardButton.addEventListener("click", (event) => {
        event.preventDefault();
        meta.cards.push(buildCardMeta());
        renderSavedCards();
        persistBuilderState();
        resetDraft();
      });
    }

    if (dom.saveJsonButton) {
      dom.saveJsonButton.addEventListener("click", () => {
        const exportCards = [...meta.cards];
        if (meta.currentIndex === DRAFT_INDEX) {
          const draftCard = buildCardMeta();
          if (hasContent(draftCard.content)) {
            exportCards.push(draftCard);
          }
        }
        const payload = {
          version: meta.version,
          cards: exportCards,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "flashcards.json";
        link.click();
        URL.revokeObjectURL(url);
      });
    }

    if (dom.buildButton && dom.buildInput) {
      dom.buildButton.addEventListener("click", () => {
        dom.buildInput.click();
      });
      dom.buildInput.addEventListener("change", async () => {
        try {
          const data = await readJsonFile(dom.buildInput);
          if (!data) {
            return;
          }
          const cards = extractCardsFromData(data);
          localStorage.setItem("flashcard-presenter-data", JSON.stringify({
            version: meta.version,
            cards: cards.map(normalizeCard),
            currentIndex: 0,
          }));
          window.location.href = "/presenter";
        } catch (error) {
          console.warn("Unable to import flashcards.", error);
        } finally {
          dom.buildInput.value = "";
        }
      });
    }

    if (dom.newProjectButton) {
      dom.newProjectButton.addEventListener("click", () => {
        const confirmed = window.confirm(
          "This will remove any saved cards. Are you sure?"
        );
        if (!confirmed) {
          return;
        }
        meta.cards = [];
        meta.currentIndex = DRAFT_INDEX;
        meta.draftContent = { front: {}, back: {} };
        localStorage.removeItem(STORAGE_KEY);
        renderSavedCards();
        resetDraft();
      });
    }

    if (dom.cardNameInput) {
      dom.cardNameInput.addEventListener("input", (event) => {
        const value = event.target.value.trim();
        const activeCard = getActiveCard();
        if (activeCard) {
          activeCard.name = value || "Untitled card";
          renderSavedCards();
        }
        setCardName(value);
        updatePreview();
        persistBuilderState();
      });
    }

    if (dom.contentSave) {
      dom.contentSave.addEventListener("click", saveContentFromModal);
    }

    if (dom.contentCancel) {
      dom.contentCancel.addEventListener("click", closeContentModal);
    }

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }
      const area = button.closest(".layout-area");
      if (!area) {
        return;
      }
      openContentModal(button.dataset.action, area);
    });

    if (dom.savedCardsGrid) {
      dom.savedCardsGrid.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-action=\"remove-card\"]");
        if (removeButton) {
          const item = removeButton.closest("[data-index]");
          if (!item) {
            return;
          }
          const index = Number(item.dataset.index);
          if (Number.isNaN(index)) {
            return;
          }
          const confirmed = window.confirm(
            "Remove this saved card?"
          );
          if (!confirmed) {
            return;
          }
          meta.cards.splice(index, 1);
          if (meta.currentIndex === index) {
            meta.currentIndex = DRAFT_INDEX;
          } else if (meta.currentIndex > index) {
            meta.currentIndex -= 1;
          }
          renderSavedCards();
          updatePreview();
          persistBuilderState();
          return;
        }
        const item = event.target.closest("[data-index]");
        if (!item) {
          return;
        }
        const index = Number(item.dataset.index);
        if (Number.isNaN(index)) {
          return;
        }
        loadCardToForm(index);
      });
    }

    if (dom.builderHelpButton && dom.builderHelpModal) {
      dom.builderHelpButton.addEventListener("click", async () => {
        await loadReadme();
        dom.builderHelpModal.showModal();
      });
    }

    if (dom.builderHelpClose && dom.builderHelpModal) {
      dom.builderHelpClose.addEventListener("click", () => {
        dom.builderHelpModal.close();
      });
    }

    bindLayoutPreview("front-layout", '[data-preview="front"]');
    bindLayoutPreview("back-layout", '[data-preview="back"]');

    updatePreview();
    renderSavedCards();
  };

  const loadCardToForm = (index) => {
    const card = meta.cards[index];
    if (!card) {
      return;
    }
    meta.currentIndex = index;
    if (dom.cardNameInput) {
      dom.cardNameInput.value = card.name;
    }
    const frontRadio = document.querySelector(
      `input[name="front-layout"][value="${card.layouts.front}"]`
    );
    if (frontRadio) {
      frontRadio.checked = true;
    }
    const backRadio = document.querySelector(
      `input[name="back-layout"][value="${card.layouts.back}"]`
    );
    if (backRadio) {
      backRadio.checked = true;
    }
    renderSavedCards();
    updatePreview();
  };

  setupBuilder();

  if (window.feather) {
    window.feather.replace();
  }
})();

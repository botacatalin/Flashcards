document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "flashcard-builder-state";
  const PRESENTER_KEY = "flashcard-presenter-data";
  const DEFAULT_LAYOUT = "full";
  const DRAFT_INDEX = -1;

  const meta = {
    version: 1,
    cards: [],
    currentIndex: DRAFT_INDEX,
    draftContent: {
      front: {},
      back: {},
    },
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
    previewPrev: document.getElementById("preview-prev"),
    previewNext: document.getElementById("preview-next"),
    presenterLoadButton: document.getElementById("presenter-load"),
    presenterLoadInput: document.getElementById("presenter-json"),
    presenterCard: document.getElementById("presenter-card"),
    presenterFullscreenButton: document.getElementById("presenter-fullscreen"),
    frontPreview: document.querySelector('[data-preview="front"]'),
    backPreview: document.querySelector('[data-preview="back"]'),
    contentModal: document.getElementById("content-modal"),
    contentTitle: document.getElementById("content-modal-title"),
    textContent: document.getElementById("text-content"),
    textLabel: document.getElementById("text-content-label"),
    imageContent: document.getElementById("image-content"),
    imageLabel: document.getElementById("image-content-label"),
    contentSave: document.getElementById("content-save"),
    contentCancel: document.getElementById("content-cancel"),
  };

  const presenterMode = document.body && document.body.dataset.presenter === "true";
  let builderReady = false;

  const setCardName = (value) => {
    if (!dom.cardNameTarget) {
      return;
    }
    dom.cardNameTarget.textContent = value || "Card Name";
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

  const getActiveCard = () => {
    if (meta.currentIndex < 0 || meta.currentIndex >= meta.cards.length) {
      return null;
    }
    return meta.cards[meta.currentIndex];
  };

  const getActiveContent = () => {
    const activeCard = getActiveCard();
    if (activeCard) {
      return activeCard.content || { front: {}, back: {} };
    }
    return meta.draftContent;
  };

  const buildCardMeta = () =>
    normalizeCard({
      name: dom.cardNameInput && dom.cardNameInput.value.trim(),
      layouts: {
        front: getSelectedLayout("front-layout"),
        back: getSelectedLayout("back-layout"),
      },
      content: meta.draftContent,
    });

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
      const name = document.createElement("small");
      name.textContent = card.name;
      item.dataset.index = String(index);
      if (index === meta.currentIndex) {
        item.setAttribute("aria-current", "true");
      }
      item.appendChild(name);
      dom.savedCardsGrid.appendChild(item);
    });
  };

  const setAreaContent = (side, area, content) => {
    if (presenterMode) {
      return;
    }
    const activeCard = getActiveCard();
    if (activeCard) {
      activeCard.content = activeCard.content || { front: {}, back: {} };
      activeCard.content[side] = activeCard.content[side] || {};
      activeCard.content[side][area] = content;
      return;
    }
    meta.draftContent[side] = meta.draftContent[side] || {};
    meta.draftContent[side][area] = content;
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
      const text = document.createElement("p");
      text.textContent = content.value;
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

  const resetPresenterFlip = () => {
    if (dom.presenterCard) {
      dom.presenterCard.classList.remove("is-flipped");
    }
  };

  const updatePreview = () => {
    if (presenterMode) {
      if (meta.cards.length === 0) {
        setCardName("No cards loaded");
        setPreviewLayouts(DEFAULT_LAYOUT, DEFAULT_LAYOUT);
        renderContent();
        return;
      }
      const card = getActiveCard() || meta.cards[0];
      setCardName(card.name);
      setPreviewLayouts(card.layouts.front, card.layouts.back);
      renderContent();
      return;
    }

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
      if (!Number.isInteger(meta.currentIndex)) {
        meta.currentIndex = DRAFT_INDEX;
      }
      if (meta.cards.length === 0) {
        meta.currentIndex = DRAFT_INDEX;
      }
      if (parsed.draftContent) {
        meta.draftContent = parsed.draftContent;
      }
    } catch (error) {
      console.warn("Unable to load flashcard state.", error);
    }
  };

  const storePresenterData = (cards) => {
    localStorage.removeItem(PRESENTER_KEY);
    meta.cards = cards.map(normalizeCard);
    meta.currentIndex = 0;
    const payload = {
      version: meta.version,
      cards: meta.cards,
      currentIndex: meta.currentIndex,
    };
    localStorage.setItem(PRESENTER_KEY, JSON.stringify(payload));
    updatePreview();
    resetPresenterFlip();
  };

  const loadPresenterData = () => {
    try {
      const raw = localStorage.getItem(PRESENTER_KEY);
      if (!raw) {
        return;
      }
      const data = JSON.parse(raw);
      const cards = Array.isArray(data.cards) ? data.cards : [];
      meta.cards = cards.map(normalizeCard);
      meta.currentIndex = Math.min(
        Math.max(Number(data.currentIndex) || 0, 0),
        Math.max(meta.cards.length - 1, 0)
      );
    } catch (error) {
      console.warn("Unable to load presenter data.", error);
    }
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

  const hasDraftContent = () => {
    const name = dom.cardNameInput ? dom.cardNameInput.value.trim() : "";
    const hasName = Boolean(name);
    const hasLayouts =
      getSelectedLayout("front-layout") !== DEFAULT_LAYOUT ||
      getSelectedLayout("back-layout") !== DEFAULT_LAYOUT;
    const hasAreas = Object.values(meta.draftContent).some((side) =>
      Object.values(side || {}).some((value) => value && value.value)
    );
    return hasName || hasLayouts || hasAreas;
  };

  const bindLayoutPreview = (name, previewSelector) => {
    if (presenterMode) {
      return;
    }
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
      if (builderReady) {
        persistBuilderState();
      }
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

  const normalizeImageUrl = (value) => {
    if (!value) {
      return value;
    }
    try {
      const url = new URL(value);
      const fileMatch = url.pathname.match(/\/File:(.+)$/i);
      const mediaMatch = url.pathname.match(/\/media\/File:(.+)$/i);
      const filename = fileMatch ? fileMatch[1] : mediaMatch ? mediaMatch[1] : null;
      if (filename && url.hostname.includes("wikipedia.org")) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
          filename
        )}`;
      }
      if (filename && url.hostname.includes("wikimedia.org")) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
          filename
        )}`;
      }
    } catch (error) {
      return value;
    }
    return value;
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
    if (dom.textContent) {
      dom.textContent.value = "";
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
        : dom.textContent && dom.textContent.value.trim();
    const value = mode === "image" ? normalizeImageUrl(rawValue) : rawValue;
    if (!value) {
      closeContentModal();
      return;
    }
    setAreaContent(side, area, { type: mode, value });
    updatePreview();
    persistBuilderState();
    closeContentModal();
  };

  const setupBuilder = () => {
    loadBuilderState();

    if (dom.saveCardButton) {
      dom.saveCardButton.addEventListener("click", () => {
        meta.cards.push(buildCardMeta());
        renderSavedCards();
        persistBuilderState();
        resetDraft();
      });
    }

    if (dom.saveJsonButton) {
      dom.saveJsonButton.addEventListener("click", () => {
        const cards = [...meta.cards];
        if (meta.currentIndex === DRAFT_INDEX && hasDraftContent()) {
          cards.push(buildCardMeta());
        }
        const payload = {
          version: meta.version,
          cards,
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
          storePresenterData(cards);
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

    bindLayoutPreview("front-layout", '[data-preview="front"]');
    bindLayoutPreview("back-layout", '[data-preview="back"]');

    builderReady = true;
    updatePreview();
    renderSavedCards();
  };

  const setupPresenter = () => {
    const toggleFlip = () => {
      if (dom.presenterCard) {
        dom.presenterCard.classList.toggle("is-flipped");
      }
    };

    if (dom.presenterCard) {
      dom.presenterCard.addEventListener("click", (event) => {
        if (event.target.closest("button, a, input, textarea, select")) {
          return;
        }
        toggleFlip();
      });
    }

    if (dom.presenterLoadButton && dom.presenterLoadInput) {
      dom.presenterLoadButton.addEventListener("click", () => {
        dom.presenterLoadInput.click();
      });
      dom.presenterLoadInput.addEventListener("change", async () => {
        try {
          const data = await readJsonFile(dom.presenterLoadInput);
          if (!data) {
            return;
          }
          const cards = extractCardsFromData(data);
          storePresenterData(cards);
        } catch (error) {
          console.warn("Unable to load presenter JSON.", error);
        } finally {
          dom.presenterLoadInput.value = "";
        }
      });
    }

    if (dom.previewPrev) {
      dom.previewPrev.addEventListener("click", () => {
        if (meta.cards.length === 0) {
          return;
        }
        meta.currentIndex =
          (meta.currentIndex - 1 + meta.cards.length) % meta.cards.length;
        updatePreview();
        resetPresenterFlip();
      });
    }

    if (dom.previewNext) {
      dom.previewNext.addEventListener("click", () => {
        if (meta.cards.length === 0) {
          return;
        }
        meta.currentIndex = (meta.currentIndex + 1) % meta.cards.length;
        updatePreview();
        resetPresenterFlip();
      });
    }

    if (dom.presenterFullscreenButton) {
      dom.presenterFullscreenButton.addEventListener("click", async () => {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      });
    }

    loadPresenterData();
    updatePreview();
  };

  if (presenterMode) {
    setupPresenter();
  } else {
    setupBuilder();
  }

  if (window.feather) {
    window.feather.replace();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "flashcard-builder-state";
  const PRESENTER_KEY = "flashcard-presenter-data";
  const DEFAULT_LAYOUT = "full";

  const state = {
    cards: [],
    currentIndex: 0,
    draftContent: {
      front: {},
      back: {},
    },
  };

  const dom = {
    cardNameInput: document.getElementById("card-name"),
    cardNameTarget: document.querySelector("[data-card-name]"),
    savedCardsGrid: document.getElementById("saved-cards-grid"),
    saveCardButton: document.getElementById("save-card"),
    saveJsonButton: document.getElementById("save-json"),
    buildButton: document.getElementById("build-flashcard"),
    buildInput: document.getElementById("build-json"),
    previewPrev: document.getElementById("preview-prev"),
    previewNext: document.getElementById("preview-next"),
    presenterLoadButton: document.getElementById("presenter-load"),
    presenterLoadInput: document.getElementById("presenter-json"),
    presenterCard: document.getElementById("presenter-card"),
    presenterFlipButton: document.getElementById("presenter-flip"),
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

  const buildCardMeta = () =>
    normalizeCard({
      name: dom.cardNameInput && dom.cardNameInput.value.trim(),
      layouts: {
        front: getSelectedLayout("front-layout"),
        back: getSelectedLayout("back-layout"),
      },
      content: state.draftContent,
    });

  const renderSavedCards = () => {
    if (!dom.savedCardsGrid) {
      return;
    }
    dom.savedCardsGrid.innerHTML = "";
    if (state.cards.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No saved cards yet.";
      dom.savedCardsGrid.appendChild(empty);
      return;
    }
    state.cards.forEach((card, index) => {
      const item = document.createElement("article");
      const name = document.createElement("small");
      name.textContent = card.name;
      if (index === state.currentIndex) {
        item.setAttribute("aria-current", "true");
      }
      item.appendChild(name);
      dom.savedCardsGrid.appendChild(item);
    });
  };

  const getActiveContent = () => {
    if (presenterMode) {
      if (state.cards.length === 0) {
        return { front: {}, back: {} };
      }
      return state.cards[state.currentIndex].content || { front: {}, back: {} };
    }
    return state.draftContent;
  };

  const setAreaContent = (side, area, content) => {
    if (presenterMode) {
      return;
    }
    state.draftContent[side] = state.draftContent[side] || {};
    state.draftContent[side][area] = content;
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
      if (state.cards.length === 0) {
        setCardName("No cards loaded");
        setPreviewLayouts(DEFAULT_LAYOUT, DEFAULT_LAYOUT);
        renderContent();
        return;
      }
      const card = state.cards[state.currentIndex];
      setCardName(card.name);
      setPreviewLayouts(card.layouts.front, card.layouts.back);
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
        version: 1,
        cards: state.cards,
        currentIndex: state.currentIndex,
        draftContent: state.draftContent,
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
      state.cards = cards.map(normalizeCard);
      state.currentIndex = Math.min(
        Math.max(Number(parsed.currentIndex) || 0, 0),
        Math.max(state.cards.length - 1, 0)
      );
      if (parsed.draftContent) {
        state.draftContent = parsed.draftContent;
      }
    } catch (error) {
      console.warn("Unable to load flashcard state.", error);
    }
  };

  const storePresenterData = (cards) => {
    state.cards = cards.map(normalizeCard);
    state.currentIndex = 0;
    const payload = {
      version: 1,
      cards: state.cards,
      currentIndex: state.currentIndex,
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
      state.cards = cards.map(normalizeCard);
      state.currentIndex = Math.min(
        Math.max(Number(data.currentIndex) || 0, 0),
        Math.max(state.cards.length - 1, 0)
      );
    } catch (error) {
      console.warn("Unable to load presenter data.", error);
    }
  };

  const bindLayoutPreview = (name, previewSelector) => {
    if (presenterMode) {
      return;
    }
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    const preview = document.querySelector(previewSelector);
    if (!preview || radios.length === 0) {
      return;
    }
    const update = () => {
      const selected = document.querySelector(`input[name="${name}"]:checked`);
      if (selected) {
        preview.dataset.layout = selected.value;
      }
      updatePreview();
    };
    radios.forEach((radio) => radio.addEventListener("change", update));
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

  const setupBuilder = () => {
    if (dom.saveCardButton) {
      dom.saveCardButton.addEventListener("click", () => {
        state.cards.push(buildCardMeta());
        state.currentIndex = state.cards.length - 1;
        renderSavedCards();
        updatePreview();
        persistBuilderState();
      });
    }

    if (dom.saveJsonButton) {
      dom.saveJsonButton.addEventListener("click", () => {
        const payload = {
          version: 1,
          cards: state.cards,
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

    if (dom.cardNameInput) {
      dom.cardNameInput.addEventListener("input", (event) => {
        setCardName(event.target.value.trim());
        updatePreview();
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

    bindLayoutPreview("front-layout", '[data-preview="front"]');
    bindLayoutPreview("back-layout", '[data-preview="back"]');

    loadBuilderState();
    updatePreview();
    renderSavedCards();
  };

  const setupPresenter = () => {
    if (dom.presenterFlipButton) {
      dom.presenterFlipButton.addEventListener("click", () => {
        if (dom.presenterCard) {
          dom.presenterCard.classList.toggle("is-flipped");
        }
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
        if (state.cards.length === 0) {
          return;
        }
        state.currentIndex =
          (state.currentIndex - 1 + state.cards.length) % state.cards.length;
        updatePreview();
        resetPresenterFlip();
      });
    }

    if (dom.previewNext) {
      dom.previewNext.addEventListener("click", () => {
        if (state.cards.length === 0) {
          return;
        }
        state.currentIndex = (state.currentIndex + 1) % state.cards.length;
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

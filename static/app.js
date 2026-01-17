document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "flashcard-builder-state";
  const PRESENTER_KEY = "flashcard-presenter-data";
  const DEFAULT_LAYOUT = "full";
  const state = {
    cards: [],
    currentIndex: 0,
  };

  const bindLayoutPreview = (name, previewSelector) => {
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    const preview = document.querySelector(previewSelector);
    if (!preview || radios.length === 0) {
      return;
    }
    const update = () => {
      if (state.cards.length > 0) {
        return;
      }
      const selected = document.querySelector(`input[name="${name}"]:checked`);
      if (selected) {
        preview.dataset.layout = selected.value;
      }
    };
    radios.forEach((radio) => radio.addEventListener("change", update));
    update();
  };

  const cardNameInput = document.getElementById("card-name");
  const cardNameTarget = document.querySelector("[data-card-name]");
  const updateCardName = (value) => {
    if (!cardNameTarget) {
      return;
    }
    cardNameTarget.textContent = value || "Card Name";
  };

  const getSelectedLayout = (name) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : DEFAULT_LAYOUT;
  };

  const savedCardsGrid = document.getElementById("saved-cards-grid");
  const saveCardButton = document.getElementById("save-card");
  const saveJsonButton = document.getElementById("save-json");
  const buildButton = document.getElementById("build-flashcard");
  const buildInput = document.getElementById("build-json");
  const previewPrev = document.getElementById("preview-prev");
  const previewNext = document.getElementById("preview-next");
  const presenterLoadButton = document.getElementById("presenter-load");
  const presenterLoadInput = document.getElementById("presenter-json");
  const presenterCard = document.getElementById("presenter-card");
  const presenterFlipButton = document.getElementById("presenter-flip");
  const presenterMode = document.body && document.body.dataset.presenter === "true";

  const renderSavedCards = () => {
    if (!savedCardsGrid) {
      return;
    }
    savedCardsGrid.innerHTML = "";
    if (state.cards.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No saved cards yet.";
      savedCardsGrid.appendChild(empty);
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
      savedCardsGrid.appendChild(item);
    });
  };

  const normalizeCard = (card) => {
    const layouts = card && card.layouts ? card.layouts : {};
    return {
      name: (card && card.name ? card.name : "Untitled card").trim() || "Untitled card",
      layouts: {
        front: layouts.front || DEFAULT_LAYOUT,
        back: layouts.back || DEFAULT_LAYOUT,
      },
    };
  };

  const buildCardMeta = () =>
    normalizeCard({
      name: cardNameInput && cardNameInput.value.trim(),
      layouts: {
        front: getSelectedLayout("front-layout"),
        back: getSelectedLayout("back-layout"),
      },
    });

  const updatePreviewFromState = () => {
    if (presenterMode && state.cards.length === 0) {
      updateCardName("No cards loaded");
      const frontPreview = document.querySelector('[data-preview="front"]');
      const backPreview = document.querySelector('[data-preview="back"]');
      if (frontPreview) {
        frontPreview.dataset.layout = DEFAULT_LAYOUT;
      }
      if (backPreview) {
        backPreview.dataset.layout = DEFAULT_LAYOUT;
      }
      return;
    }
    if (state.cards.length > 0) {
      const card = state.cards[state.currentIndex];
      updateCardName(card.name);
      const frontPreview = document.querySelector('[data-preview="front"]');
      const backPreview = document.querySelector('[data-preview="back"]');
      if (frontPreview) {
        frontPreview.dataset.layout = card.layouts.front;
      }
      if (backPreview) {
        backPreview.dataset.layout = card.layouts.back;
      }
      return;
    }
    updateCardName(cardNameInput ? cardNameInput.value.trim() : "");
    const frontPreview = document.querySelector('[data-preview="front"]');
    const backPreview = document.querySelector('[data-preview="back"]');
    if (frontPreview) {
      frontPreview.dataset.layout = getSelectedLayout("front-layout");
    }
    if (backPreview) {
      backPreview.dataset.layout = getSelectedLayout("back-layout");
    }
  };

  const resetPresenterFlip = () => {
    if (presenterCard) {
      presenterCard.classList.remove("is-flipped");
    }
  };

  const persistState = () => {
    try {
      const payload = {
        version: 1,
        cards: state.cards,
        currentIndex: state.currentIndex,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Unable to save flashcard state.", error);
    }
  };

  const loadState = () => {
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
    } catch (error) {
      console.warn("Unable to load flashcard state.", error);
    }
  };

  const applyPresenterData = (cards) => {
    state.cards = cards.map(normalizeCard);
    state.currentIndex = 0;
    const payload = {
      version: 1,
      cards: state.cards,
      currentIndex: state.currentIndex,
    };
    localStorage.setItem(PRESENTER_KEY, JSON.stringify(payload));
    updatePreviewFromState();
    resetPresenterFlip();
  };

  if (saveCardButton) {
    saveCardButton.addEventListener("click", () => {
      state.cards.push(buildCardMeta());
      state.currentIndex = state.cards.length - 1;
      renderSavedCards();
      updatePreviewFromState();
      persistState();
    });
  }

  if (saveJsonButton) {
    saveJsonButton.addEventListener("click", () => {
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

  if (buildButton && buildInput) {
    buildButton.addEventListener("click", () => {
      buildInput.click();
    });
    buildInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const cards = Array.isArray(data.cards) ? data.cards : [];
        applyPresenterData(cards);
        window.location.href = "/presenter";
      } catch (error) {
        console.warn("Unable to import flashcards.", error);
      } finally {
        buildInput.value = "";
      }
    });
  }

  if (previewPrev) {
    previewPrev.addEventListener("click", () => {
      if (state.cards.length === 0) {
        return;
      }
      state.currentIndex =
        (state.currentIndex - 1 + state.cards.length) % state.cards.length;
      renderSavedCards();
      updatePreviewFromState();
      resetPresenterFlip();
      persistState();
    });
  }

  if (previewNext) {
    previewNext.addEventListener("click", () => {
      if (state.cards.length === 0) {
        return;
      }
      state.currentIndex = (state.currentIndex + 1) % state.cards.length;
      renderSavedCards();
      updatePreviewFromState();
      resetPresenterFlip();
      persistState();
    });
  }

  if (!presenterMode) {
    bindLayoutPreview("front-layout", '[data-preview="front"]');
    bindLayoutPreview("back-layout", '[data-preview="back"]');
  }

  if (cardNameInput) {
    cardNameInput.addEventListener("input", (event) => {
      updateCardName(event.target.value.trim());
      if (!presenterMode) {
        updatePreviewFromState();
      }
    });
  }
  if (presenterMode) {
    if (presenterFlipButton) {
      presenterFlipButton.addEventListener("click", () => {
        if (presenterCard) {
          presenterCard.classList.toggle("is-flipped");
        }
      });
    }
    if (presenterLoadButton && presenterLoadInput) {
      presenterLoadButton.addEventListener("click", () => {
        presenterLoadInput.click();
      });
      presenterLoadInput.addEventListener("change", async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
          return;
        }
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const cards = Array.isArray(data.cards) ? data.cards : [];
          applyPresenterData(cards);
        } catch (error) {
          console.warn("Unable to load presenter JSON.", error);
        } finally {
          presenterLoadInput.value = "";
        }
      });
    }
    try {
      const raw = localStorage.getItem(PRESENTER_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const cards = Array.isArray(data.cards) ? data.cards : [];
        state.cards = cards.map(normalizeCard);
        state.currentIndex = Math.min(
          Math.max(Number(data.currentIndex) || 0, 0),
          Math.max(state.cards.length - 1, 0)
        );
      }
    } catch (error) {
      console.warn("Unable to load presenter data.", error);
    }
    updatePreviewFromState();
  } else {
    loadState();
    updatePreviewFromState();
    renderSavedCards();
  }

  if (window.feather) {
    window.feather.replace();
  }
});

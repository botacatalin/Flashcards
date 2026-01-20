(() => {
  const PRESENTER_KEY = "flashcard-presenter-data";
  const PRESENTER_STYLE_KEY = "flashcard-presenter-style";
  const DEFAULT_TOPICS = [
    {
      label: "Clocks: Learning Time",
      url: "./static/flashcards/flashcards-clock-learning-time.json",
    },
    {
      label: "Opposites",
      url: "./static/flashcards/flashcards-opposites.json",
    },
  ];

  const meta = {
    version: 1,
    cards: [],
    currentIndex: 0,
  };

  window.flashcardMeta = meta;

  const dom = {
    presenterLoadButton: document.getElementById("presenter-load"),
    presenterLoadInput: document.getElementById("presenter-json"),
    presenterDefaultSelect: document.getElementById("presenter-default"),
    presenterStyleSelect: document.getElementById("presenter-style"),
    presenterStyleLink: document.getElementById("presenter-style-link"),
    presenterCard: document.getElementById("presenter-card"),
    presenterCounter: document.getElementById("presenter-counter"),
    presenterFullscreenButton: document.getElementById("presenter-fullscreen"),
    presenterShell: document.getElementById("presenter-shell"),
    presenterEmpty: document.getElementById("presenter-empty"),
    previewPrev: document.getElementById("preview-prev"),
    previewNext: document.getElementById("preview-next"),
    cardNameTarget: document.querySelector("[data-card-name]"),
    frontPreview: document.querySelector('[data-preview="front"]'),
    backPreview: document.querySelector('[data-preview="back"]'),
  };

  const getActiveCard = () =>
    meta.currentIndex >= 0 && meta.currentIndex < meta.cards.length
      ? meta.cards[meta.currentIndex]
      : null;

  const setCardName = (value) => {
    if (dom.cardNameTarget) {
      dom.cardNameTarget.textContent = value || "Card Name";
    }
  };

  const setPreviewLayouts = (front, back) => {
    if (dom.frontPreview) {
      dom.frontPreview.dataset.layout = front;
    }
    if (dom.backPreview) {
      dom.backPreview.dataset.layout = back;
    }
  };

  const normalizeCard = (card) => {
    const layouts = card && card.layouts ? card.layouts : {};
    const content = card && card.content ? card.content : {};
    const name = card && card.name ? card.name : "Untitled card";
    return {
      name: name.trim() || "Untitled card",
      layouts: {
        front: layouts.front || "full",
        back: layouts.back || "full",
      },
      content: {
        front: content.front || {},
        back: content.back || {},
      },
    };
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

  const renderContent = (card) => {
    const content = card.content || { front: {}, back: {} };
    document.querySelectorAll(".layout-area").forEach((area) => {
      const side = area.dataset.side;
      const key = area.dataset.area;
      const value = content[side] ? content[side][key] : null;
      renderAreaContent(area, value);
    });
  };

  const updatePresenterView = () => {
    if (meta.cards.length === 0) {
      if (dom.presenterShell) {
        dom.presenterShell.hidden = true;
      }
      if (dom.presenterEmpty) {
        dom.presenterEmpty.hidden = false;
      }
      if (dom.presenterCounter) {
        dom.presenterCounter.hidden = true;
      }
      return;
    }
    if (dom.presenterShell) {
      dom.presenterShell.hidden = false;
    }
    if (dom.presenterEmpty) {
      dom.presenterEmpty.hidden = true;
    }
    const card = getActiveCard() || meta.cards[0];
    if (dom.presenterCounter) {
      dom.presenterCounter.hidden = false;
      dom.presenterCounter.textContent = `${meta.currentIndex + 1}/${meta.cards.length}`;
    }
    setCardName(card.name);
    setPreviewLayouts(card.layouts.front, card.layouts.back);
    renderContent(card);
  };

  const storePresenterData = (cards) => {
    localStorage.removeItem(PRESENTER_KEY);
    meta.cards = cards.map(normalizeCard);
    meta.currentIndex = 0;
    localStorage.setItem(
      PRESENTER_KEY,
      JSON.stringify({
        version: meta.version,
        cards: meta.cards,
        currentIndex: meta.currentIndex,
      })
    );
    updatePresenterView();
    if (dom.presenterCard) {
      dom.presenterCard.classList.remove("is-flipped");
    }
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

  const loadDefaultCards = async (url) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load default flashcards.");
      }
      const data = await response.json();
      const cards = extractCardsFromData(data);
      storePresenterData(cards);
    } catch (error) {
      console.warn("Unable to load default flashcards.", error);
    }
  };

  const loadFlashcardTopics = () => {
    if (!dom.presenterDefaultSelect) {
      return;
    }
    dom.presenterDefaultSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select topic";
    dom.presenterDefaultSelect.appendChild(placeholder);
    DEFAULT_TOPICS.forEach((topic) => {
      const option = document.createElement("option");
      option.value = topic.url;
      option.textContent = topic.label;
      dom.presenterDefaultSelect.appendChild(option);
    });
  };

  const applyPresenterStyle = (style) => {
    const value = style || "minimal";
    if (dom.presenterStyleSelect) {
      dom.presenterStyleSelect.value = value;
    }
    if (dom.presenterStyleLink) {
      dom.presenterStyleLink.href = `./static/presenter-style-${value}.css`;
    }
    localStorage.setItem(PRESENTER_STYLE_KEY, value);
  };

  const setupPresenter = () => {
    if (dom.presenterCard) {
      dom.presenterCard.addEventListener("click", (event) => {
        if (event.target.closest("button, a, input, textarea, select")) {
          return;
        }
        dom.presenterCard.classList.toggle("is-flipped");
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
          if (dom.presenterDefaultSelect) {
            dom.presenterDefaultSelect.value = "";
          }
        } catch (error) {
          console.warn("Unable to load presenter JSON.", error);
        } finally {
          dom.presenterLoadInput.value = "";
        }
      });
    }

    if (dom.presenterDefaultSelect) {
      dom.presenterDefaultSelect.addEventListener("change", (event) => {
        const url = event.target.value;
        if (!url) {
          return;
        }
        loadDefaultCards(url);
      });
    }

    if (dom.previewPrev) {
      dom.previewPrev.addEventListener("click", () => {
        if (meta.cards.length === 0) {
          return;
        }
        meta.currentIndex =
          (meta.currentIndex - 1 + meta.cards.length) % meta.cards.length;
        updatePresenterView();
        if (dom.presenterCard) {
          dom.presenterCard.classList.remove("is-flipped");
        }
      });
    }

    if (dom.previewNext) {
      dom.previewNext.addEventListener("click", () => {
        if (meta.cards.length === 0) {
          return;
        }
        meta.currentIndex = (meta.currentIndex + 1) % meta.cards.length;
        updatePresenterView();
        if (dom.presenterCard) {
          dom.presenterCard.classList.remove("is-flipped");
        }
      });
    }

    if (dom.presenterFullscreenButton) {
      const updateFullscreenIcon = () => {
        const iconName = document.fullscreenElement ? "minimize-2" : "maximize-2";
        dom.presenterFullscreenButton.innerHTML = "";
        const placeholder = document.createElement("i");
        placeholder.setAttribute("data-feather", iconName);
        dom.presenterFullscreenButton.appendChild(placeholder);
        if (window.feather) {
          window.feather.replace({ element: dom.presenterFullscreenButton });
        }
      };

      dom.presenterFullscreenButton.addEventListener("click", async () => {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      });

      document.addEventListener("fullscreenchange", updateFullscreenIcon);
      updateFullscreenIcon();
    }

    loadPresenterData();
    loadFlashcardTopics();
    applyPresenterStyle(localStorage.getItem(PRESENTER_STYLE_KEY));

    if (dom.presenterStyleSelect) {
      dom.presenterStyleSelect.addEventListener("change", (event) => {
        applyPresenterStyle(event.target.value);
      });
    }

    updatePresenterView();
  };

  setupPresenter();

  if (window.feather) {
    window.feather.replace();
  }
})();

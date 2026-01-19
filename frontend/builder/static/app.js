document.addEventListener("DOMContentLoaded", () => {
  const presenterMode = document.body && document.body.dataset.presenter === "true";
  const script = document.createElement("script");
  script.src = presenterMode ? "/static/presenter.js" : "/static/builder.js";
  document.body.appendChild(script);
});

# Overview
Flashcard Builder is a two-part tool: the builder lets you design two-sided flashcards with layouts, text, and images, then exports JSON data, while the presenter loads that JSON to display the flashcards in a flip-card viewer.

# Project structure
- `backend/` contains the Flask app used as a simple static file server.
- `frontend/builder/` is the static builder site (`index.html` + `static/` assets).
- `frontend/presenter/` is the static presenter site (`index.html` + `static/` assets).

# Running locally
- Builder: `python backend/app.py`, then visit `http://localhost:5000/builder/index.html`.
- Presenter: open `frontend/presenter/index.html` directly or visit `http://localhost:5000/presenter/index.html`.

# Builder areas
- Configuration area: define flashcard layout and card name.
- Preview area: customize and visualize the front and back.
- Export data as JSON for the presenter.

# Functionality
- Load Flashcard button: upload a JSON file containing flashcards data.
- Export Flashcard button: save flashcards as JSON.
- New Projects button: remove everything and start over.

© 2026 nodes.ro
Contact: nodes.ro@proton.eu

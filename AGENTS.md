# Repository Guidelines

## Project Structure & Module Organization
- `backend/app.py` contains the Flask application factory and routes that serve the builder and presenter static sites.
- `frontend/builder/` is the static builder site (`index.html` plus assets in `frontend/builder/static/`).
- `frontend/presenter/` is the static presenter site (`index.html` plus assets in `frontend/presenter/static/`, including themes, `presenter.js`, and default JSON stacks).

## Architecture Overview
- The app builds two-face flashcards: a front side (question/content) and a back side (explanation/answer).
- The builder UI produces flashcard metadata as JSON; the presenter consumes that JSON and renders a presentation UI.
- The builder and presenter are separate static surfaces so the presenter can be used standalone by loading a JSON file.
- The presenter theme is decoupled from the page layout and loaded via a style-specific CSS file.

## Build, Test, and Development Commands
- `python backend/app.py` starts the Flask dev server (static serving only).
- There are no build or packaging steps defined for this project.

## Coding Style & Naming Conventions
- Python: follow PEP 8, 4-space indentation, snake_case for functions/variables.
- HTML: 2-space indentation.
- No formatter or linter is configured; keep diffs minimal and readable.

## Testing Guidelines
- No testing framework or tests are present. If you add tests, prefer `pytest` and place them in a `tests/` directory with `test_*.py` naming.
- Document any new test command in this file when adding a test suite.

## Commit & Pull Request Guidelines
- Git history only contains `Initial commit`, so no established commit message convention exists yet. Use short, imperative summaries (e.g., "Add flashcard form validation").
- PRs should include a brief description, a list of changes, and screenshots for UI updates.

## Configuration & Security Notes
- Keep debug usage only for local development.

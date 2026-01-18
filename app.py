from flask import Flask, render_template, redirect, url_for, jsonify
import config
import os


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["DEBUG"] = config.DEBUG

    @app.route("/")
    def index():
        return redirect(url_for("builder"))

    @app.route("/builder")
    def builder():
        # Temporary in-memory flashcards
        flashcards = [
            {"front": "Card Front", "back": "Card Back"},
            {"front": "Card Front", "back": "Card Back"},
        ]
        return render_template("index.html", flashcards=flashcards)

    @app.route("/presenter")
    def presenter():
        return render_template("presenter.html")

    @app.route("/api/flashcards")
    def flashcard_index():
        base_dir = os.path.join(app.static_folder, "flashcards")
        entries = []
        if os.path.isdir(base_dir):
            for filename in sorted(os.listdir(base_dir)):
                if not filename.endswith(".json"):
                    continue
                name = os.path.splitext(filename)[0].replace("-", " ").title()
                entries.append(
                    {
                        "label": name,
                        "url": url_for("static", filename=f"flashcards/{filename}"),
                    }
                )
        return jsonify(entries)

    return app


app = create_app()

if __name__ == "__main__":
    app.run()

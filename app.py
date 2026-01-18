from flask import Flask, render_template, redirect, url_for, jsonify, Response
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
        return render_template("index.html")

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

    @app.route("/api/readme")
    def readme():
        readme_path = os.path.join(app.root_path, "README.md")
        if not os.path.isfile(readme_path):
            return Response("", mimetype="text/plain")
        with open(readme_path, "r", encoding="utf-8") as handle:
            return Response(handle.read(), mimetype="text/plain")

    return app


app = create_app()

if __name__ == "__main__":
    app.run()

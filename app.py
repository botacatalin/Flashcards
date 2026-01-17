from flask import Flask, render_template
import config


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["DEBUG"] = config.DEBUG

    @app.route("/")
    def index():
        # Temporary in-memory flashcards
        flashcards = [
            {"front": "Card Front", "back": "Card Back"},
            {"front": "Card Front", "back": "Card Back"},
        ]
        return render_template("index.html", flashcards=flashcards)

    return app


app = create_app()

if __name__ == "__main__":
    app.run()

from flask import Flask, redirect, send_from_directory
import os

app = Flask(__name__)

BUILDER_ROOT = os.path.join(os.path.dirname(__file__), "..", "frontend", "builder")
PRESENTER_ROOT = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "presenter"
)


@app.route("/builder/<path:filename>")
def builder_static(filename):
    return send_from_directory(BUILDER_ROOT, filename)

@app.route("/builder")
def builder_index():
    return redirect("/builder/index.html")


@app.route("/presenter/<path:filename>")
def presenter_static(filename):
    return send_from_directory(PRESENTER_ROOT, filename)

@app.route("/presenter")
def presenter_index():
    return redirect("/presenter/index.html")


if __name__ == "__main__":
    app.run()

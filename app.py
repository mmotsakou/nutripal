"""
NutriPal - Personalized Nutrition Plan Web Application
"""

from flask import Flask, render_template, request, redirect, url_for
from nutrition import build_full_plan

app = Flask(__name__)


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    form = request.form.to_dict()
    try:
        plan = build_full_plan(form)
    except (ValueError, KeyError) as exc:
        return render_template("index.html", error=str(exc)), 400
    return render_template("plan.html", plan=plan)


@app.route("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

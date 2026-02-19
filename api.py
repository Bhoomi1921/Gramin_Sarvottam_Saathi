"""
api.py  –  Safe Return  |  Face Recognition API
Production-ready Flask application (served via Gunicorn / WSGI).

Directory layout expected next to this file:
    data/          ← folder of inmate photos  (e.g. 001.jpg, 002.jpg …)
    sheet.xlsx     ← Excel with columns  "Inmate Id"  and  "Name"
    static/        ← built frontend assets  (index.html, script.js, style.css …)
"""

import os
import io
import base64
import logging
import traceback
import tempfile

import pandas as pd
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# ─────────────────────────────────────────────
#  Logging  (writes to stdout → captured by Gunicorn)
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("safe_return")


# ─────────────────────────────────────────────
#  Config  (override via environment variables)
# ─────────────────────────────────────────────
BASE_DIR             = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH           = os.environ.get("EXCEL_PATH",  os.path.join(BASE_DIR, "sheet.xlsx"))
DB_PATH              = os.environ.get("DB_PATH",     os.path.join(BASE_DIR, "data"))
STATIC_DIR           = os.environ.get("STATIC_DIR",  os.path.join(BASE_DIR, "static"))
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.6"))

# Lazy-import DeepFace so the app starts quickly even when running health checks
def _deepface():
    from deepface import DeepFace  # noqa
    return DeepFace


# ─────────────────────────────────────────────
#  Flask app
# ─────────────────────────────────────────────
app = Flask(__name__, static_folder=None)
CORS(app, origins=os.environ.get("ALLOWED_ORIGINS", "*"))


# ── Serve the frontend ──────────────────────
@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    """Serve JS / CSS / assets from the static directory."""
    return send_from_directory(STATIC_DIR, filename)


# ── Health check ────────────────────────────
@app.route("/test")
def test():
    return jsonify({
        "status":      "ok",
        "excel_found": os.path.exists(EXCEL_PATH),
        "excel_path":  EXCEL_PATH,
        "db_found":    os.path.exists(DB_PATH),
        "db_path":     DB_PATH,
    })


# ── Face Recognition ────────────────────────
@app.route("/recognize", methods=["POST", "OPTIONS"])
def recognize():
    # CORS pre-flight
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200

    logger.info("POST /recognize – request received")

    # 1. Parse JSON body
    data = request.get_json(silent=True)
    if not data:
        logger.warning("No JSON body in request")
        return jsonify({"error": "No JSON body received"}), 400

    image_b64 = data.get("image")
    if not image_b64:
        logger.warning("'image' field missing from JSON")
        return jsonify({"error": "'image' field missing"}), 400

    # 2. Decode base64 image → temp file
    #    Use a proper temp file so concurrent workers don't collide
    tmp_path = None
    try:
        if "," in image_b64:                       # strip data-URL prefix
            image_b64 = image_b64.split(",", 1)[1]

        img_bytes = base64.b64decode(image_b64)
        image     = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name
        image.save(tmp_path, format="JPEG", quality=95)
        logger.info("Image decoded, size=%s, saved to %s", image.size, tmp_path)
    except Exception as exc:
        logger.error("Image decode error: %s", exc)
        _cleanup(tmp_path)
        return jsonify({"error": f"Could not decode image: {exc}"}), 400

    # 3. Run DeepFace recognition
    try:
        logger.info("Running DeepFace.find  db_path='%s'", DB_PATH)
        DeepFace = _deepface()
        results  = DeepFace.find(
            img_path          = tmp_path,
            db_path           = DB_PATH,
            model_name        = "ArcFace",
            detector_backend  = "retinaface",
            distance_metric   = "cosine",
            enforce_detection = True,
            silent            = True,
        )
        logger.info("DeepFace returned %d result dataframe(s)", len(results))
    except Exception as exc:
        traceback.print_exc()
        _cleanup(tmp_path)
        msg = str(exc)
        if "Face could not be detected" in msg or "No face" in msg:
            return jsonify({
                "match": False, "confidence": 0,
                "person_id": None, "person_name": None,
                "message": "No face detected in image",
            })
        return jsonify({"error": f"DeepFace error: {msg}"}), 500
    finally:
        _cleanup(tmp_path)

    # 4. Parse results
    if not results or results[0].empty:
        logger.info("No match found in database")
        return jsonify({
            "match": False, "confidence": 0,
            "person_id": None, "person_name": None,
            "message": "No match found in database",
        })

    best       = results[0].iloc[0]
    distance   = float(best["distance"])
    confidence = round((1 - distance) * 100, 1)
    matched    = (1 - distance) >= CONFIDENCE_THRESHOLD
    person_id  = os.path.splitext(os.path.basename(best["identity"]))[0]

    logger.info("Best match: person_id=%s  distance=%.4f  confidence=%.1f%%  matched=%s",
                person_id, distance, confidence, matched)

    # 5. Look up name in Excel
    person_name = None
    try:
        df  = pd.read_excel(EXCEL_PATH)
        row = df[df["Inmate Id"].astype(str) == str(person_id)]
        if not row.empty:
            person_name = str(row.iloc[0]["Name"])
            logger.info("Name resolved: %s", person_name)
        else:
            logger.warning("person_id '%s' not found in Excel", person_id)
    except Exception as exc:
        logger.warning("Could not read Excel: %s", exc)

    return jsonify({
        "match":       matched,
        "confidence":  confidence,
        "person_id":   person_id,
        "person_name": person_name or f"ID: {person_id} (name not found)",
        "distance":    distance,
    })


def _cleanup(path):
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


# ─────────────────────────────────────────────
#  Dev-mode entry point  (NOT used by Gunicorn)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("Starting in DEV mode – use Gunicorn for production")
    logger.info("Excel : %s  %s", EXCEL_PATH,  "✓" if os.path.exists(EXCEL_PATH) else "✗ NOT FOUND")
    logger.info("DB    : %s  %s", DB_PATH,     "✓" if os.path.exists(DB_PATH)     else "✗ NOT FOUND")
    logger.info("Static: %s  %s", STATIC_DIR,  "✓" if os.path.exists(STATIC_DIR)  else "✗ NOT FOUND")
    app.run(host="0.0.0.0", port=5000, debug=True)

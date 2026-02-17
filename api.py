# from flask import Flask, request, jsonify
# from flask_cors import CORS
# from deepface import DeepFace
# import pandas as pd
# import os
# from PIL import Image
# import base64
# import io

# app = Flask(__name__)
# CORS(app)  # Allow your HTML page to call this API

# EXCEL_PATH = "sheet.xlsx"
# DB_PATH = "data"
# CONFIDENCE_THRESHOLD = 0.6

# def load_person_data():
#     return pd.read_excel(EXCEL_PATH)

# @app.route("/recognize", methods=["POST"])
# def recognize():
#     try:
#         data = request.get_json()
        
#         # Decode base64 image sent from the browser
#         img_data = data["image"].split(",")[1]  # strip "data:image/...;base64,"
#         img_bytes = base64.b64decode(img_data)
#         image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
#         # Save temporarily
#         temp_path = "temp_query.jpg"
#         image.save(temp_path)
        
#         # Run DeepFace recognition
#         results = DeepFace.find(
#             img_path=temp_path,
#             db_path=DB_PATH,
#             model_name="ArcFace",
#             detector_backend="retinaface",
#             distance_metric="cosine",
#             enforce_detection=True,
#             silent=True
#         )
#         os.remove(temp_path)
        
#         if not results or results[0].empty:
#             return jsonify({"match": False, "message": "No match found"})
        
#         best = results[0].iloc[0]
#         distance = best["distance"]
#         confidence = round((1 - distance) * 100, 1)
        
#         person_id = os.path.basename(best["identity"]).split(".")[0]
        
#         df = load_person_data()
#         row = df[df["Inmate Id"].astype(str) == str(person_id)]
        
#         if row.empty:
#             return jsonify({"match": False, "message": f"Person ID {person_id} not in database"})
        
#         person_name = row.iloc[0]["Name"]
        
#         return jsonify({
#             "match": confidence / 100 >= CONFIDENCE_THRESHOLD,
#             "confidence": confidence,
#             "person_id": person_id,
#             "person_name": person_name
#         })

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# if __name__ == "__main__":
#     app.run(port=5000, debug=True)

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from deepface import DeepFace
import pandas as pd
import os
from PIL import Image
import base64
import io
import traceback

app = Flask(__name__)
CORS(app, origins="*")  # Allow ALL origins

# ── CONFIG ── Edit these paths if needed
EXCEL_PATH  = "sheet.xlsx"
DB_PATH     = "data"
CONFIDENCE_THRESHOLD = 0.6
TEMP_IMAGE  = "temp_query.jpg"

# ─────────────────────────────────────────
# Serve the HTML frontend at http://localhost:5000
# ─────────────────────────────────────────
@app.route("/")
def index():
    # Looks for safe_return.html in the same folder as api.py
    html_path = os.path.join(os.path.dirname(__file__), "safe_return.html")
    if not os.path.exists(html_path):
        return "safe_return.html not found next to api.py", 404
    return send_file(html_path)


# ─────────────────────────────────────────
# Health-check — open http://localhost:5000/test to confirm API is alive
# ─────────────────────────────────────────
@app.route("/test")
def test():
    excel_ok = os.path.exists(EXCEL_PATH)
    db_ok    = os.path.exists(DB_PATH)
    return jsonify({
        "status":       "ok",
        "excel_found":  excel_ok,
        "excel_path":   os.path.abspath(EXCEL_PATH),
        "db_found":     db_ok,
        "db_path":      os.path.abspath(DB_PATH),
    })


# ─────────────────────────────────────────
# Main recognition endpoint
# ─────────────────────────────────────────
@app.route("/recognize", methods=["POST", "OPTIONS"])
def recognize():
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200

    print("\n========== /recognize called ==========")

    # ── 1. Parse incoming JSON ──
    data = request.get_json(silent=True)
    if not data:
        print("ERROR: No JSON body received")
        return jsonify({"error": "No JSON body received"}), 400

    image_b64 = data.get("image")
    if not image_b64:
        print("ERROR: 'image' field missing from JSON")
        return jsonify({"error": "'image' field missing"}), 400

    print(f"Image data received, length: {len(image_b64)} chars")

    # ── 2. Decode base64 image ──
    try:
        # Strip the data URL prefix if present (data:image/jpeg;base64,...)
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        img_bytes = base64.b64decode(image_b64)
        image     = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        image.save(TEMP_IMAGE)
        print(f"Image decoded and saved as {TEMP_IMAGE} ({image.size})")
    except Exception as e:
        print(f"ERROR decoding image: {e}")
        return jsonify({"error": f"Could not decode image: {str(e)}"}), 400

    # ── 3. Run DeepFace recognition ──
    try:
        print(f"Running DeepFace.find on db_path='{DB_PATH}' ...")
        results = DeepFace.find(
            img_path        = TEMP_IMAGE,
            db_path         = DB_PATH,
            model_name      = "ArcFace",
            detector_backend= "retinaface",
            distance_metric = "cosine",
            enforce_detection=True,
            silent          = True
        )
        print(f"DeepFace returned {len(results)} result dataframes")
    except Exception as e:
        traceback.print_exc()
        _cleanup()
        # Common case: no face detected
        if "Face could not be detected" in str(e) or "No face" in str(e):
            return jsonify({"match": False, "confidence": 0,
                            "person_id": None, "person_name": None,
                            "message": "No face detected in image"})
        return jsonify({"error": f"DeepFace error: {str(e)}"}), 500

    _cleanup()

    # ── 4. Parse results ──
    if not results or results[0].empty:
        print("No match found in database")
        return jsonify({"match": False, "confidence": 0,
                        "person_id": None, "person_name": None,
                        "message": "No match found in database"})

    best       = results[0].iloc[0]
    distance   = float(best["distance"])
    confidence = round((1 - distance) * 100, 1)
    matched    = (1 - distance) >= CONFIDENCE_THRESHOLD

    # Extract person_id from filename (e.g. "data/001.jpg" → "001")
    person_id = os.path.splitext(os.path.basename(best["identity"]))[0]
    print(f"Best match: person_id={person_id}, distance={distance:.4f}, confidence={confidence}%")

    # ── 5. Look up name in Excel ──
    person_name = None
    try:
        df  = pd.read_excel(EXCEL_PATH)
        row = df[df["Inmate Id"].astype(str) == str(person_id)]
        if not row.empty:
            person_name = str(row.iloc[0]["Name"])
            print(f"Name found: {person_name}")
        else:
            print(f"WARNING: person_id '{person_id}' not found in Excel")
    except Exception as e:
        print(f"WARNING: Could not read Excel: {e}")

    return jsonify({
        "match":       matched,
        "confidence":  confidence,
        "person_id":   person_id,
        "person_name": person_name or f"ID: {person_id} (name not found)",
        "distance":    distance
    })


def _cleanup():
    if os.path.exists(TEMP_IMAGE):
        os.remove(TEMP_IMAGE)


if __name__ == "__main__":
    print("\n" + "="*50)
    print("Safe Return — Face Recognition API")
    print("="*50)
    print(f"Excel path : {os.path.abspath(EXCEL_PATH)}  {'✓' if os.path.exists(EXCEL_PATH) else '✗ NOT FOUND'}")
    print(f"DB path    : {os.path.abspath(DB_PATH)}     {'✓' if os.path.exists(DB_PATH) else '✗ NOT FOUND'}")
    print("\nOpen in browser → http://localhost:5000")
    print("Health check   → http://localhost:5000/test")
    print("="*50 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
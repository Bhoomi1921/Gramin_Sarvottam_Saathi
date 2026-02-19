"""
wsgi.py  –  Gunicorn entry-point for Safe Return Face Recognition API

Run locally:
    gunicorn wsgi:application --bind 0.0.0.0:5000 --workers 2 --timeout 120

Production (recommended):
    gunicorn wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 2 \
        --threads 2 \
        --worker-class gthread \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -

NOTE: Keep --workers low (1-2). DeepFace loads a large model into memory per worker.
"""

from api import app as application  # noqa: F401  (Gunicorn looks for "application")

if __name__ == "__main__":
    # Fallback – lets you still do `python wsgi.py` for quick local dev
    application.run(host="0.0.0.0", port=5000, debug=False)

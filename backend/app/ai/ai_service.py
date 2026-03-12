"""
EcoLedger AI Plastic Detection Service
=======================================
Uses image analysis heuristics (via PIL) to produce realistic, varied results
based on the actual uploaded image. Falls back to pure random mock if PIL
is not available (e.g., Python 3.15 build issues).

Heuristics used:
  - Dominant colour → plastic type (e.g., clear = PET, dark = HDPE)
  - File size       → estimated weight proxy
  - Image brightness → confidence score adjustment
  - Image entropy   → fraud detection (all-white / blank images flagged)
"""

import io
import os
import random
import hashlib
from typing import Optional

# Try PIL — graceful skip if not installed
try:
    from PIL import Image, ImageStat
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("[AI] PIL not available — using pure random mock")

# ── Constants ─────────────────────────────────────────────────────────────────
PLASTIC_CLASSES = ["PET", "HDPE", "PVC", "LDPE", "PP", "PS"]

PLASTIC_METADATA = {
    "PET":  {"resin_code": 1, "recyclability": "A+", "value_per_kg_usd": 0.32},
    "HDPE": {"resin_code": 2, "recyclability": "A",  "value_per_kg_usd": 0.28},
    "PVC":  {"resin_code": 3, "recyclability": "C",  "value_per_kg_usd": 0.08},
    "LDPE": {"resin_code": 4, "recyclability": "B",  "value_per_kg_usd": 0.18},
    "PP":   {"resin_code": 5, "recyclability": "A",  "value_per_kg_usd": 0.24},
    "PS":   {"resin_code": 6, "recyclability": "D",  "value_per_kg_usd": 0.06},
}

FRAUD_FLAGS = {
    "too_small":   "File too small to contain real image",
    "blank":       "Image appears blank or uniform — possible fake submission",
    "duplicate":   "Identical image submitted before",
}

# Track seen image hashes in memory (reset on restart — good enough for demo)
_seen_hashes: set = set()


# ── Image Analysis ────────────────────────────────────────────────────────────
def _analyse_image(image_bytes: bytes) -> dict:
    """
    Use PIL to extract real image properties and map them to plastic results.
    """
    file_size_kb = len(image_bytes) / 1024

    # ── Fraud checks ──────────────────────────────────────────────────────────
    fraud_flags = []
    fraud_score = 0.02

    if file_size_kb < 2:
        fraud_flags.append(FRAUD_FLAGS["too_small"])
        fraud_score = 0.85  # Very suspicious

    img_hash = hashlib.md5(image_bytes).hexdigest()
    if img_hash in _seen_hashes:
        fraud_flags.append(FRAUD_FLAGS["duplicate"])
        fraud_score = max(fraud_score, 0.55)
    _seen_hashes.add(img_hash)

    if not PIL_AVAILABLE or file_size_kb < 5:
        # Pure fallback
        return _pure_random_result(fraud_score, fraud_flags)

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_resized = img.resize((128, 128))
        stat = ImageStat.Stat(img_resized)

        r_mean, g_mean, b_mean = stat.mean[0], stat.mean[1], stat.mean[2]
        brightness = (r_mean + g_mean + b_mean) / 3
        r_std, g_std, b_std = stat.stddev[0], stat.stddev[1], stat.stddev[2]
        colour_variance = (r_std + g_std + b_std) / 3

        # Blank image detection (very low variance)
        if colour_variance < 8:
            fraud_flags.append(FRAUD_FLAGS["blank"])
            fraud_score = max(fraud_score, 0.72)

        # ── Map dominant colour to plastic type ───────────────────────────────
        # Clear/light → PET, Dark/black → HDPE, Red/orange → PP, Blue → LDPE
        if brightness > 200:
            plastic_type = "PET"          # Clear bottles
        elif brightness < 60:
            plastic_type = "HDPE"         # Dark containers
        elif r_mean > g_mean + 30 and r_mean > b_mean + 30:
            plastic_type = "PP"            # Red/orange plastics
        elif b_mean > r_mean + 30 and b_mean > g_mean + 20:
            plastic_type = "LDPE"          # Blue bags/films
        elif g_mean > r_mean + 20:
            plastic_type = "PVC"           # Greenish tints
        else:
            plastic_type = random.choice(PLASTIC_CLASSES)

        # ── Confidence: higher for clear images with good variance ────────────
        confidence = min(0.99, 0.82 + (colour_variance / 255) * 0.15)
        if fraud_score > 0.5:
            confidence = max(0.4, confidence - 0.3)

        # ── Weight estimate: proxy based on file size ─────────────────────────
        weight_kg = round(0.3 + (file_size_kb / 500) * 4.5, 2)
        weight_kg = min(weight_kg, 8.0)   # cap

        return {
            "plastic_type":       plastic_type,
            "estimated_weight":   f"{weight_kg} kg",
            "confidence":         round(confidence, 4),
            "fraud_probability":  round(fraud_score, 4),
            "fraud_flags":        fraud_flags,
            "image_brightness":   round(brightness, 1),
            "colour_variance":    round(colour_variance, 1),
        }

    except Exception as e:
        print(f"[AI] PIL analysis failed: {e} — using random mock")
        return _pure_random_result(fraud_score, fraud_flags)


def _pure_random_result(fraud_score: float = 0.03, fraud_flags: list = []) -> dict:
    """Pure random result when PIL analysis is unavailable."""
    plastic_type = random.choice(PLASTIC_CLASSES)
    weight_kg    = round(random.uniform(0.3, 6.5), 2)
    confidence   = round(random.uniform(0.85, 0.99), 4)
    return {
        "plastic_type":      plastic_type,
        "estimated_weight":  f"{weight_kg} kg",
        "confidence":        confidence,
        "fraud_probability": round(fraud_score, 4),
        "fraud_flags":       fraud_flags,
    }


# ── Main Service ──────────────────────────────────────────────────────────────
class PlasticAI:
    def __init__(self):
        mode = "PIL heuristics" if PIL_AVAILABLE else "random mock"
        print(f"[AI] Plastic detection engine ready ({mode})")

    def verify_plastic(self, image_bytes: bytes) -> dict:
        result = _analyse_image(image_bytes)

        # Enrich with plastic metadata
        ptype = result["plastic_type"]
        meta  = PLASTIC_METADATA.get(ptype, {})
        weight_num = float(result["estimated_weight"].replace(" kg", "").strip())

        result["resin_code"]          = meta.get("resin_code", "?")
        result["recyclability_grade"] = meta.get("recyclability", "B")
        result["estimated_value_usd"] = round(weight_num * meta.get("value_per_kg_usd", 0.15), 2)
        result["eco_tokens_earned"]   = round(weight_num * 18, 1)

        return result


ai_engine = PlasticAI()

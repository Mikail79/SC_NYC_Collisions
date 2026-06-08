# =============================================================================
# SC_NYC_Collisions — FastAPI Backend (v2)
# =============================================================================
import os
import numpy as np
import pandas as pd
import joblib
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from keras.models import load_model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

model = None
preprocessor = None
categories_info = None
vehicle_stats_df = None

CLASS_LABELS = {0: "Safe (No Injury)", 1: "Injury / Fatal"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, preprocessor, categories_info, vehicle_stats_df

    keras_path = os.path.join(MODELS_DIR, "severity_model.keras")
    h5_path = os.path.join(MODELS_DIR, "severity_model.h5")
    preprocessor_path = os.path.join(MODELS_DIR, "preprocessor.pkl")
    categories_path = os.path.join(MODELS_DIR, "categories_info.pkl")
    vehicle_stats_path = os.path.join(MODELS_DIR, "vehicle_stats.pkl")

    if os.path.exists(keras_path):
        model = load_model(keras_path)
    elif os.path.exists(h5_path):
        model = load_model(h5_path)
    else:
        raise FileNotFoundError("Model not found. Run training first.")

    preprocessor = joblib.load(preprocessor_path)
    if os.path.exists(categories_path):
        categories_info = joblib.load(categories_path)
    if os.path.exists(vehicle_stats_path):
        vehicle_stats_df = joblib.load(vehicle_stats_path)

    print(f"[INFO] Model loaded. Input shape: {model.input_shape}")
    yield
    print("[INFO] Shutting down...")

app = FastAPI(title="NYC Collision Severity Predictor", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


class PredictionRequest(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    month: int = Field(..., ge=1, le=12)
    borough: str = Field(...)
    vehicle_type: str = Field(...)
    contributing_factor: str = Field("")
    contributing_factor_2: str = Field("", description="Secondary contributing factor (optional)")

class PredictionResponse(BaseModel):
    predicted_class: int
    class_label: str
    probabilities: dict
    input_received: dict
    risk_analysis: list = []
    vehicle_insight: dict = {}


@app.get("/")
async def root():
    return {"status": "online", "service": "NYC Collision Severity Predictor", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None, "preprocessor_loaded": preprocessor is not None}

@app.get("/categories")
async def get_categories():
    if categories_info is None:
        raise HTTPException(status_code=503, detail="Categories not loaded.")
    return {
        "boroughs": sorted(categories_info.get("BOROUGH", [])),
        "vehicle_types": sorted(categories_info.get("VEHICLE_TYPE_CODE_1", [])),
        "contributing_factors": sorted(categories_info.get("CONTRIBUTING_FACTOR_VEHICLE_1", [])),
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    if model is None or preprocessor is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        factor1 = request.contributing_factor.strip().upper() or "UNKNOWN"
        factor2 = request.contributing_factor_2.strip().upper() or "UNKNOWN"

        # === Feature Engineering (v2) ===
        is_weekend = 1 if request.day_of_week >= 5 else 0
        is_night = 1 if (request.hour >= 21 or request.hour <= 5) else 0
        is_rush_hour = 1 if ((7 <= request.hour <= 9) or (16 <= request.hour <= 19)) else 0
        hour_sin = float(np.sin(2 * np.pi * request.hour / 24))
        hour_cos = float(np.cos(2 * np.pi * request.hour / 24))
        month_sin = float(np.sin(2 * np.pi * (request.month - 1) / 12))
        month_cos = float(np.cos(2 * np.pi * (request.month - 1) / 12))

        input_df = pd.DataFrame([{
            "CRASH_HOUR": request.hour,
            "DAY_OF_WEEK": request.day_of_week,
            "MONTH": request.month,
            "IS_WEEKEND": is_weekend,
            "IS_NIGHT": is_night,
            "IS_RUSH_HOUR": is_rush_hour,
            "HOUR_SIN": hour_sin,
            "HOUR_COS": hour_cos,
            "MONTH_SIN": month_sin,
            "MONTH_COS": month_cos,
            "BOROUGH": request.borough.strip().upper(),
            "VEHICLE_TYPE_CODE_1": request.vehicle_type.strip().upper(),
            "CONTRIBUTING_FACTOR_VEHICLE_1": factor1,
            "CONTRIBUTING_FACTOR_VEHICLE_2": factor2,
        }])

        feature_vector = preprocessor.transform(input_df)
        prediction = model.predict(feature_vector, verbose=0)
        predicted_class = int(np.argmax(prediction[0]))
        probs = prediction[0].tolist()

        # Risk Analysis (if factor is empty)
        risk_analysis = []
        if not request.contributing_factor.strip():
            all_factors = categories_info.get("CONTRIBUTING_FACTOR_VEHICLE_1", [])
            valid = [f for f in all_factors if f.upper() not in ("UNKNOWN", "UNSPECIFIED", ".", "")]
            if valid:
                batch = []
                names = []
                for f in valid:
                    batch.append({
                        "CRASH_HOUR": request.hour, "DAY_OF_WEEK": request.day_of_week,
                        "MONTH": request.month,
                        "IS_WEEKEND": is_weekend, "IS_NIGHT": is_night, "IS_RUSH_HOUR": is_rush_hour,
                        "HOUR_SIN": hour_sin, "HOUR_COS": hour_cos,
                        "MONTH_SIN": month_sin, "MONTH_COS": month_cos,
                        "BOROUGH": request.borough.strip().upper(),
                        "VEHICLE_TYPE_CODE_1": request.vehicle_type.strip().upper(),
                        "CONTRIBUTING_FACTOR_VEHICLE_1": f,
                        "CONTRIBUTING_FACTOR_VEHICLE_2": factor2,
                    })
                    names.append(f)
                batch_preds = model.predict(preprocessor.transform(pd.DataFrame(batch)), verbose=0)
                risks = [{"factor": names[i], "danger_score": round(float(p[1]*100), 2)} for i, p in enumerate(batch_preds)]
                risks.sort(key=lambda x: x["danger_score"], reverse=True)
                risk_analysis = risks[:5]

        # Vehicle Insight from historical data
        vehicle_insight = {}
        if vehicle_stats_df is not None:
            borough_upper = request.borough.strip().upper()
            filtered = vehicle_stats_df[vehicle_stats_df["BOROUGH"] == borough_upper]
            if len(filtered) > 0:
                injury_data = filtered[filtered["SEVERITY_CLASS"] == 1]
                safe_data = filtered[filtered["SEVERITY_CLASS"] == 0]
                vehicle_insight = {
                    "avg_vehicles_in_injury": round(float(injury_data["NUM_VEHICLES"].mean()), 1) if len(injury_data) > 0 else 0,
                    "avg_vehicles_in_safe": round(float(safe_data["NUM_VEHICLES"].mean()), 1) if len(safe_data) > 0 else 0,
                    "max_vehicles_in_injury": int(injury_data["NUM_VEHICLES"].max()) if len(injury_data) > 0 else 0,
                    "total_injury_cases": int(len(injury_data)),
                    "total_safe_cases": int(len(safe_data)),
                }

        day_names = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

        return PredictionResponse(
            predicted_class=predicted_class,
            class_label=CLASS_LABELS.get(predicted_class, "Unknown"),
            probabilities={
                CLASS_LABELS[0]: round(probs[0] * 100, 2),
                CLASS_LABELS[1]: round(probs[1] * 100, 2),
            },
            input_received={
                "hour": request.hour,
                "day_of_week": day_names[request.day_of_week],
                "month": request.month,
                "borough": request.borough,
                "vehicle_type": request.vehicle_type,
                "contributing_factor": factor1,
                "contributing_factor_2": factor2,
            },
            risk_analysis=risk_analysis,
            vehicle_insight=vehicle_insight,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# backend/main.py
# -*- coding: utf-8 -*-
import os
import sys
import json
import joblib
import warnings
import numpy as np
import pandas as pd
import tensorflow as tf
from typing import Dict, Any

# Enable UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Cleaner logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
warnings.filterwarnings("ignore", category=UserWarning, module="google.protobuf")

# ---------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------
def _to_num(x, default=0):
    try:
        if x is None or (isinstance(x, float) and np.isnan(x)):
            return default
        return float(x)
    except Exception:
        return default

def _extract_feature_groups(preprocessor):
    """Try to extract numeric/categorical/passthrough column lists from a ColumnTransformer-like preprocessor.
    Returns sets (num_set, cat_set, pass_set). If not available, returns empty sets."""
    num, cat, pas = [], [], []
    try:
        # sklearn ColumnTransformer stores transformers_ as tuples (name, transformer, columns)
        for name, trans, cols in preprocessor.transformers_:
            name = str(name).lower()
            if name == "num":
                num = list(cols)
            elif name == "cat":
                cat = list(cols)
            elif name in {"pass", "passthrough"}:
                pas = list(cols)
    except Exception:
        # best-effort: some preprocessors may not expose .transformers_
        pass
    return set(num), set(cat), set(pas)

def _ensure_expected_columns(df: pd.DataFrame, assets: Dict[str, Any], disease_name: str = "") -> pd.DataFrame:
    """Align df to assets['columns'] with proper dtypes and default values for missing features."""
    # Handle both dictionary format (heart_failure) and list format (other models)
    columns_data = assets["columns"]
    
    # Build expected columns list and categorize them
    expected = []
    cat_list = []
    pas_list = []
    num_list = []
    
    if isinstance(columns_data, dict):
        # Extract all columns from dictionary format - use this directly!
        if "numerical" in columns_data:
            num_list = list(columns_data["numerical"])
            expected.extend(num_list)
        if "categorical" in columns_data:
            cat_list = list(columns_data["categorical"])
            expected.extend(cat_list)
        if "passthrough" in columns_data:
            pas_list = list(columns_data["passthrough"])
            expected.extend(pas_list)
    else:
        # List format - try to extract from preprocessor as fallback
        expected = list(columns_data)
        pre = assets["preprocessor"]
        num_set, cat_set, pas_set = _extract_feature_groups(pre)
        cat_list = [c for c in expected if c in cat_set]
        pas_list = [c for c in expected if c in pas_set]
        num_list = [c for c in expected if c not in cat_set and c not in pas_set]
    
    # Convert to sets for faster lookup
    cat_set = set(cat_list)
    pas_set = set(pas_list)
    num_set = set(num_list)
    
    expected_set = set(expected)
    df_cols = set(df.columns)

    missing = expected_set - df_cols
    extra = df_cols - expected_set

    if missing or extra:
        print(f"🔧 [{disease_name}] Column alignment:")
        if missing:
            print(f"   + Adding {len(missing)} missing columns: {list(missing)}")
        if extra:
            print(f"   - Dropping {len(extra)} extra columns: {list(extra)[:20]}")

    # Fill missing columns with defaults based on their category
    for col in missing:
        if col in cat_set:
            df[col] = "Unknown"
        elif col in pas_set:
            # Passthrough columns default to 0 (numeric)
            df[col] = 0
        else:
            # Numeric columns default to 0
            df[col] = 0

    # Enforce ordering and types - ensure all expected columns exist
    for col in expected:
        if col not in df.columns:
            # Shouldn't happen after adding missing, but just in case
            if col in cat_set:
                df[col] = "Unknown"
            else:
                df[col] = 0
        
        if col in cat_set:
            df[col] = df[col].astype(str).fillna("Unknown")
        elif col in pas_set:
            # Passthrough: convert to numeric, using mapping functions for common columns
            if col == "Sex" or col == "sex":
                # Use sex mapping function if value is still string
                if df[col].dtype == 'object':
                    df[col] = df[col].apply(_map_sex)
                else:
                    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
            elif col in ["exercise_angina", "fasting_bs", "Hypertension", "diabetes", "heart_disease"]:
                # Use yes/no mapping if value is still string
                if df[col].dtype == 'object':
                    df[col] = df[col].apply(_map_yes_no)
                else:
                    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
            else:
                # Other passthrough columns: convert to numeric
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        else:
            # Numeric columns
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Return DataFrame with columns in expected order
    return df[expected]

# ---------------------------------------------------------------------
# Master Input Template (full set you provided)
# ---------------------------------------------------------------------
master_input_template = {
    "Age":0,"Sex":"Female","sex":"Female","Gender":"Female","BMI":22.0,
    "systolic_bp":120,"diastolic_bp":80,"resting_bp":120,
    "cholesterol":200,"LDL":100,"HDL":50,"triglycerides":150,
    "glucose_level":90,"blood_sugar":90,"FBS":90,"fasting_bs":0,  # Add fasting_bs explicitly
    "Hypertension":0,"diabetes":0,"heart_disease":0,
    "FH":0,"Family_History":"No",
    "smokes":0,"formerly_smoked":0,"smoking_status":"never smoked",
    "Obesity":"N","CRF":"N","CVA":"N","Airway disease":"N","Thyroid Disease":"N",
    "CHF":"N","DLP":"N","Edema":"N","Weak Peripheral Pulse":"N","Lung rales":"N",
    "Systolic Murmur":"N","Diastolic Murmur":"N","Dyspnea":"N","Function Class":0,
    "typical_angina":"N","atypical_angina":"N","non_anginal_pain":"N",
    "Exertional CP":"N","LowTH Ang":"N","Q Wave":"N","St Elevation":"N",
    "St Depression":"N","Tinversion":"N","LVH":"N","Poor R Progression":"N","BBB":"None",
    "CR":1.0,"BUN":15,"ESR":10,"HB":14.0,"K":4.0,"Na":140,"WBC":7000,
    "Lymph":30,"Neut":60,"PLT":250000,"EF-TTE":60,"Region RWMA":0,"VHD":"N",
    "ldl_hdl_ratio":3.0,
    "chest_pain_type":"NAP","resting_ecg":"Normal","max_hr":150,
    "exercise_angina":"N","oldpeak":0.0,"st_slope":"Up",
    "heart_rate":80,"CK-MB":2.5,"Troponin":0.01,
    "Married":"No","work_type":"Private","residence_type":"Urban"
}

# ---------------------------------------------------------------------
# Mapping helpers (normalize some common fields)
# ---------------------------------------------------------------------
def _map_yes_no(v):
    v = str(v).lower().strip()
    if v in {"y", "yes", "1", "true"}:
        return 1
    if v in {"n", "no", "0", "false"}:
        return 0
    try:
        return int(v)
    except Exception:
        return 0

def _map_sex(v):
    v = str(v).lower().strip()
    if v in {"m", "male"}:
        return 1
    if v in {"f", "female"}:
        return 0
    return 0

# ---------------------------------------------------------------------
# Model loading & caching (loads once)
# Directory expected: backend/models/{disease}/{disease}_model.keras, etc.
# ---------------------------------------------------------------------
MODELS = None

def load_all_models(base_path: str = None):
    global MODELS
    if MODELS is not None:
        return MODELS

    if base_path is None:
        # relative to this file directory
        base_path = os.path.join(os.path.dirname(__file__), "models")

    model_names = ["stroke", "heart_failure", "hypertension", "heart_attack", "cad"]
    models = {}

    print("🚀 Loading models from:", base_path)
    for name in model_names:
        try:
            model_dir = os.path.join(base_path, name)
            model_path = os.path.join(model_dir, f"{name}_model.keras")
            preproc_path = os.path.join(model_dir, f"{name}_preprocessor.joblib")
            cols_path = os.path.join(model_dir, f"{name}_columns.json")

            # Basic existence checks
            if not os.path.exists(model_dir):
                raise FileNotFoundError(f"Model directory not found: {model_dir}")
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            if not os.path.exists(preproc_path):
                raise FileNotFoundError(f"Preprocessor file not found: {preproc_path}")
            if not os.path.exists(cols_path):
                raise FileNotFoundError(f"Columns file not found: {cols_path}")

            # Load (with compatibility for older keras models)
            try:
                # Use legacy tf_keras to load models. This guarantees compatibility 
                # for older Keras 2 formats in TensorFlow 2.16+.
                import tf_keras
                model = tf_keras.models.load_model(model_path, compile=False)
            except Exception as e:
                print(f"   ⚠️ tf_keras compile=False load failed for {name}, trying standard load: {e}")
                try:
                    model = tf.keras.models.load_model(model_path, compile=False)
                except Exception:
                    raise e
            preprocessor = joblib.load(preproc_path)
            with open(cols_path, "r") as f:
                columns = json.load(f)

            models[name] = {"model": model, "preprocessor": preprocessor, "columns": columns}
            print(f"✅ Loaded {name} (features: {len(columns)})")
        except Exception as e:
            print(f"❌ Error loading {name}: {e}")
            # Fail fast: set MODELS to None and return None
            MODELS = None
            return None

    MODELS = models
    print("-" * 40)
    return MODELS

# Attempt to load at import time (so Flask startup is immediate)
load_all_models()

# ---------------------------------------------------------------------
# Generic prediction helper (applies necessary renames and mappings)
# ---------------------------------------------------------------------
def _prepare_dataframe_for_model(patient: Dict[str, Any], assets: Dict[str, Any], disease_name: str) -> pd.DataFrame:
    """Return a dataframe aligned with model columns, after light normalization."""
    df = pd.DataFrame([patient]).copy()

    # Some pipelines expect lowercased column names or slightly different names.
    # Rename FIRST so we can then map the renamed columns
    rename_map = {
        # heart_attack used "CK-MB" sometimes
        "CK_MB": "CK-MB",
        "Troponin_level": "Troponin",
        "Heart rate": "heart_rate",
        "Systolic blood pressure": "systolic_bp",
        "Diastolic blood pressure": "diastolic_bp",
        "ChestPainType": "chest_pain_type",
        "RestingBP": "resting_bp",
        "FastingBS": "fasting_bs",
        "FBS": "fasting_bs",  # Add FBS -> fasting_bs mapping
        "RestingECG": "resting_ecg",
        "MaxHR": "max_hr",
        "ExerciseAngina": "exercise_angina",
        "Oldpeak": "oldpeak",
        "ST_Slope": "st_slope",
        "Heart_disease": "heart_disease",
        "Glucose_level": "glucose_level",
        "Smoking_status": "smoking_status"
    }
    for a, b in rename_map.items():
        if a in df.columns and b not in df.columns:
            df.rename(columns={a: b}, inplace=True)

    # Common normalizations
    # Map Sex / Gender -> numeric 'sex' or 'Sex' depending on what models expect
    if "Sex" in df:
        try:
            df["Sex"] = df["Sex"].apply(_map_sex)
        except Exception:
            pass
    if "Gender" in df and "Sex" not in df:
        try:
            df["Gender"] = df["Gender"].apply(_map_sex)
        except Exception:
            pass

    # Map common boolean-like fields (after renaming, so fasting_bs exists)
    for col in ["Hypertension", "diabetes", "heart_disease", "exercise_angina"]:
        if col in df:
            df[col] = df[col].apply(_map_yes_no)
    
    # Handle fasting_bs: if it's a numeric value (glucose level), convert to binary (0 if < 120, 1 if >= 120)
    # If it's already 0/1 or Y/N, _map_yes_no will handle it
    if "fasting_bs" in df:
        try:
            # Try to convert to numeric first
            numeric_val = pd.to_numeric(df["fasting_bs"], errors="coerce")
            if not numeric_val.isna().all():
                # If it's a numeric glucose value, convert to binary (threshold 120)
                df["fasting_bs"] = (numeric_val >= 120).astype(int)
            else:
                # If not numeric, treat as Y/N boolean
                df["fasting_bs"] = df["fasting_bs"].apply(_map_yes_no)
        except Exception:
            # Fallback to boolean mapping
            df["fasting_bs"] = df["fasting_bs"].apply(_map_yes_no)

    # Align and typecast according to model assets
    df_aligned = _ensure_expected_columns(df, assets, disease_name)
    return df_aligned

def predict_disease(patient: Dict[str, Any], assets: Dict[str, Any], disease_name: str) -> float:
    """Prepare input, log it, run preprocessor + model, return probability [0,1]."""
    df_pre = _prepare_dataframe_for_model(patient, assets, disease_name)

    # Verify all required columns are present before transform
    columns_data = assets["columns"]
    if isinstance(columns_data, dict):
        expected_cols = []
        if "numerical" in columns_data:
            expected_cols.extend(columns_data["numerical"])
        if "categorical" in columns_data:
            expected_cols.extend(columns_data["categorical"])
        if "passthrough" in columns_data:
            expected_cols.extend(columns_data["passthrough"])
    else:
        expected_cols = list(columns_data)
    
    missing_cols = set(expected_cols) - set(df_pre.columns)
    if missing_cols:
        raise ValueError(f"columns are missing: {missing_cols}")

    # Log the input that will be fed into the model
    try:
        print(f"\n🧪 [{disease_name.upper()}] Input sent to model:")
        print(df_pre.head(1).to_dict(orient="records")[0])
    except Exception:
        print(f"🧪 [{disease_name.upper()}] (could not print input)")

    # Transform and predict
    X = assets["preprocessor"].transform(df_pre)
    pred = float(assets["model"].predict(X, verbose=0)[0][0])
    print(f"🔢 [{disease_name.upper()}] Model raw output: {pred}")
    return pred

# ---------------------------------------------------------------------
# Public API: predict_all_diseases()
# ---------------------------------------------------------------------
def predict_all_diseases(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """Main entrypoint for Flask app. 
    Merges frontend data with master_input_template (defaults)."""
    models = MODELS if MODELS is not None else load_all_models()
    if models is None:
        return {"error": "Models not loaded. Ensure backend/models/* exists and is correct."}

    # ✅ Deep copy of master template
    final_input = dict(master_input_template)

    # ✅ Override defaults with frontend values (only if key exists in master_input_template)
    if isinstance(patient_data, dict):
        for key, value in patient_data.items():
            if key in final_input:
                final_input[key] = value
            else:
                # Ignore unknown keys safely
                pass
    else:
        return {"error": "Invalid input format (expected JSON object)"}

    print("\n🧾 [MERGED FINAL INPUT] Sent to models:")
    for k, v in list(final_input.items())[:15]:
        print(f"   {k}: {v}")
    if len(final_input) > 15:
        print(f"   ... ({len(final_input)} total keys)")

    # ✅ Predict with each model
    predictions = {}
    for disease_name, assets in models.items():
        try:
            prob = predict_disease(final_input, assets, disease_name)
            pct = round(float(prob) * 100, 2)
            level = "High" if pct > 70 else ("Moderate" if pct > 50 else "Low")
            predictions[disease_name] = {"score": float(pct), "risk": level}
        except Exception as e:
            print(f"❌ Error predicting {disease_name}: {e}")
            predictions[disease_name] = {"error": str(e)}

    return {"predictions": predictions}

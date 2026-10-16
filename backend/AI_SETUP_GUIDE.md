# CardioPredict AI Food Recommendation Service Setup Guide

CardioPredict uses a real, verified AI integration to generate personalized, evidence-based cardiovascular dietary guidance from patient lab report findings and deep learning risk assessment scores.

Per clinical governance protocols:
- **No hardcoded food lists**: The system never substitutes generic or fabricated disease-to-food lists.
- **Strict Privacy**: Patient identifying information (names, emails, phones, report file paths) is **never** sent to the AI provider. Only minimal, de-identified clinical biomarkers and risk categories are transmitted.
- **Backend Only**: API keys are read strictly from backend environment variables and are **never** exposed in frontend JavaScript, Git commits, or browser responses.

---

## Supported AI Providers

### Option 1: Google Gemini (Recommended)
Google Gemini provides a free tier suitable for development and testing.

1. **Obtain an API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Sign in with your Google account.
   - Click **Create API Key**.
   - Copy your key (starts with `AIzaSy...`).

2. **Configure in Backend**:
   - Open `backend/.env` (or create it from `backend/.env.example`).
   - Add the following line:
     ```env
     GEMINI_API_KEY=AIzaSyYourActualKeyHere
     ```
   - CardioPredict automatically uses the official `google-genai` SDK with model `gemini-2.5-flash` (with automatic fallback to `gemini-1.5-flash`).

---

### Option 2: OpenAI

1. **Obtain an API Key**:
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys).
   - Sign in and click **Create new secret key**.
   - Copy your key (starts with `sk-...`).

2. **Configure in Backend**:
   - Open `backend/.env`.
   - Add the following line:
     ```env
     OPENAI_API_KEY=sk-YourActualKeyHere
     ```
   - CardioPredict automatically uses the official `openai` SDK with model `gpt-4o-mini`.

---

## Verifying the AI Service Connection

1. Restart the Flask backend:
   ```bash
   cd backend
   python app.py
   ```
   At startup, the server logs the provider status:
   ```
   🤖 AI Nutrition Service: Google Gemini - Successfully connected to Google Gemini AI service.
   ```

2. From the Patient Portal:
   - Navigate to **AI Nutrition Guidance** (`/patient/diet`).
   - If a report and prediction exist, click **Retry AI Service Connection** to perform a live connectivity check.
   - Click **Generate AI Plan** to generate personalized cardiovascular nutrition guidance.

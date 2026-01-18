# Setting Up Google Cloud Authentication

Your backend needs credentials to access Google Cloud Vertex AI for Virtual Try-On. Here are the setup options:

## Option 1: Using gcloud CLI (Recommended for Development)

This is the easiest method for local development.

### Steps:

1. **Install gcloud CLI** (if not already installed):
   ```bash
   # macOS
   brew install --cask google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Initialize gcloud and authenticate**:
   ```bash
   gcloud init
   ```
   This will:
   - Ask you to log in with your Google account
   - Let you select or create a Google Cloud project
   - Set default region/zone

3. **Set up Application Default Credentials (ADC)**:
   ```bash
   gcloud auth application-default login
   ```
   This creates credentials that your application can use automatically.

4. **Set your project ID** (if not already set):
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

5. **Enable required APIs**:
   ```bash
   # Enable Vertex AI API
   gcloud services enable aiplatform.googleapis.com
   ```

6. **Verify your setup**:
   ```bash
   gcloud auth application-default print-access-token
   ```
   If this prints a token, you're ready to go!

7. **Update your .env file**:
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id-here
   GOOGLE_CLOUD_REGION=us-central1
   ```

## Option 2: Using a Service Account Key File

This is better for production or if you need more control.

### Steps:

1. **Create a Service Account** in Google Cloud Console:
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Click "Create Service Account"
   - Give it a name (e.g., "virtual-tryon-backend")
   - Grant it the "Vertex AI User" role
   - Click "Done"

2. **Create and download a key**:
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose JSON format
   - Save the file (e.g., `service-account-key.json`)

3. **Set the environment variable**:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```
   
   Or add to your `.env` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account-key.json
   GOOGLE_CLOUD_PROJECT=your-project-id-here
   GOOGLE_CLOUD_REGION=us-central1
   ```

4. **Update put_on.py** to load this variable if needed.

## Important Notes

### Billing
- Virtual Try-On requires billing to be enabled on your Google Cloud project
- Check pricing: https://cloud.google.com/vertex-ai/generative-ai/pricing#imagen-models

### Quotas
- Virtual Try-On has request quotas and limits
- See: https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/virtual-try-on-preview-08-04

### Security
- **NEVER** commit service account keys to git
- The `.gitignore` should already exclude common credential file patterns
- Service account keys in `.env` files should also be excluded from git

## Troubleshooting

### "Permission denied" errors
Make sure your account or service account has the "Vertex AI User" role:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/aiplatform.user"
```

### "API not enabled" errors
```bash
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID
```

### Check current credentials
```bash
gcloud auth list
gcloud config list
```

### Test if credentials work
Try running a simple test in Python:
```python
from google import genai
import os

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "your-project-id")
LOCATION = "us-central1"

client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
print("✓ Credentials working! Client created successfully.")
```

<div align="center">

![Mirr.AI Logo](chrome-extension/assets/icon.png)
# **Mirr.AI**
## Real-Time 3D Generative Virtual Try-On System & Fashion Recommendations

*Multi-modal AI pipeline for photorealistic clothing transfer with 360° view synthesis*

### McHacks 2026

[![Made at McHacks 2026](https://img.shields.io/badge/Made%20at-McHacks%202026-red.svg)](https://mchacks.ca)
[![Powered by Google Vertex AI](https://img.shields.io/badge/Powered%20by-Google%20Vertex%20AI-blue.svg)](https://cloud.google.com/vertex-ai)
[![AI by Gemini](https://img.shields.io/badge/AI%20by-Google%20Gemini-green.svg)](https://ai.google.dev)

### **🔧 Technology Stack**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[![Google Vertex AI](https://img.shields.io/badge/Vertex%20AI-Try--On-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://cloud.google.com/vertex-ai)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.5-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Plasmo](https://img.shields.io/badge/Plasmo-Extension-5865F2?style=for-the-badge)](https://www.plasmo.com)
[![FashionSigLIP](https://img.shields.io/badge/FashionSigLIP-Embeddings-FF6B6B?style=for-the-badge)](https://huggingface.co/Marqo/marqo-fashionSigLIP)
[![Gumloop](https://img.shields.io/badge/Gumloop-Orchestration-00D4AA?style=for-the-badge)](https://www.gumloop.com)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com)

</div>

---

## 🎯 Overview

Mirr.AI is an end-to-end virtual try-on system that combines **diffusion-based image synthesis**, **multi-view novel view generation**, and **real-time browser instrumentation** to enable photorealistic clothing visualization directly within e-commerce browsing sessions.

The system implements a **cascaded generative pipeline** that:
- Performs **semantic garment-to-body mapping** using Google's Vertex AI virtual try-on foundation model
- Synthesizes **7 novel camera viewpoints** via Gemini 2.5 with Gumloop agentic workflow orchestration for distributed parallel inference
- Executes **U2-Net semantic segmentation** for precise alpha matting and background isolation
- Delivers results through **Server-Sent Events (SSE)** for real-time progress streaming
- Powers **AI-driven outfit recommendations** through fashion-domain CLIP embeddings and cosine similarity search

---

## 🎬 Demo

### AI-Powered Outfit Recommendations
*Semantic fashion search using FashionSigLIP embeddings to suggest visually cohesive pieces*

![AI Recommendations](examples/recommendation.png)

### Smart Price Detection
*Automatic extraction of product metadata from any e-commerce site*

![Price Detection](examples/price.png)

### Virtual Try-On Results
*Photorealistic garment transfer powered by Vertex AI diffusion models*

<table>
  <tr>
    <td><img src="examples/try-on-1.png" alt="Try-On Example 1" width="400"/></td>
    <td><img src="examples/try-on-2.png" alt="Try-On Example 2" width="400"/></td>
  </tr>
</table>

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        CS[Content Script<br/>DOM Instrumentation<br/>& Image Interception]
        POPUP[Popup Interface<br/>Session Management]
        STORAGE[Chrome Storage API<br/>Persistent State Layer]
    end
    
    subgraph "API Gateway"
        API[Flask REST API<br/>SSE Streaming Handler<br/>Multipart Form Processing]
    end
    
    subgraph "ML Inference Pipeline"
        VERTEX[Vertex AI<br/>Diffusion-Based Try-On<br/>Garment-Pose Conditioning]
        REMBG[U2-Net<br/>Semantic Segmentation<br/>Alpha Matting]
        SIGLIP[FashionSigLIP<br/>768-dim Embeddings<br/>Semantic Fashion Search]
    end
    
    subgraph "Distributed View Synthesis"
        CLOUD[Cloudinary CDN<br/>Asset Staging]
        GUMLOOP[Gumloop Orchestrator<br/>Agentic DAG Execution]
        GEMINI[Gemini 2.5 Flash ×7<br/>Parallel Inference Workers]
    end
    
    subgraph "Persistence Layer"
        MONGO[(MongoDB Atlas<br/>Document Store<br/>Base64 Blob Storage)]
    end
    
    CS -->|WebSocket-like SSE| API
    POPUP -->|REST Queries| API
    CS <--> STORAGE
    
    API --> VERTEX
    API --> REMBG
    API --> SIGLIP
    API --> CLOUD
    CLOUD --> GUMLOOP
    GUMLOOP --> GEMINI
    GEMINI --> API
    API <--> MONGO
    SIGLIP <--> MONGO
    
    style CS fill:#60a5fa,stroke:#3b82f6
    style API fill:#4ade80,stroke:#22c55e
    style VERTEX fill:#fbbf24,stroke:#f59e0b
    style CLOUD fill:#3448c5,stroke:#2d3cb8
    style GUMLOOP fill:#00d4aa,stroke:#00b894
    style GEMINI fill:#fb923c,stroke:#f97316
    style SIGLIP fill:#ff6b6b,stroke:#ee5a5a
    style MONGO fill:#a78bfa,stroke:#8b5cf6
```

---

## 🔄 Inference Pipeline

```mermaid
sequenceDiagram
    participant Client as Browser Runtime
    participant API as API Gateway
    participant Vertex as Vertex AI<br/>Try-On Model
    participant CDN as Cloudinary CDN
    participant Gumloop as Gumloop<br/>Orchestrator
    participant Gemini as Gemini 2.5 ×7<br/>Parallel Workers
    participant Seg as U2-Net<br/>Segmentation
    
    Client->>API: POST /try-on-stream<br/>FormData{person, garments[], metadata[]}
    
    Note over API: Initialize SSE stream
    API-->>Client: SSE: {type: status, progress: 0}
    
    loop Sequential Garment Composition
        API->>Seg: process_selfie(current_pose)
        Seg-->>API: RGBA with alpha channel
        API->>Vertex: recontext_image(pose, garment)<br/>safety_filter: BLOCK_LOW_AND_ABOVE
        Vertex-->>API: Composited result tensor
        API-->>Client: SSE: {type: status, progress: N/total}
        Note over API: Update pose reference<br/>for next iteration
    end
    
    API->>Seg: Final composite segmentation
    Seg-->>API: Cropped RGBA
    
    Note over API,Gumloop: Distributed Multi-View Generation
    API->>CDN: Upload composite to edge
    CDN-->>API: Signed asset URL
    API->>Gumloop: Trigger flow(image_url)
    
    par Gumloop DAG Parallel Execution
        Gumloop->>Gemini: Worker 0° inference
        Gumloop->>Gemini: Worker 45° inference
        Gumloop->>Gemini: Worker 90° inference
        Gumloop->>Gemini: Worker 135° inference
        Gumloop->>Gemini: Worker 180° inference
        Gumloop->>Gemini: Worker 225° inference
        Gumloop->>Gemini: Worker 270° inference
    end
    
    Note over Gumloop: Barrier synchronization
    Gemini-->>Gumloop: 7 generated views
    Gumloop-->>API: Output manifest (7 URLs)
    
    loop Post-Processing
        API->>Seg: Alpha matting per view
        Seg-->>API: Isolated subject
    end
    
    API->>API: Persist to MongoDB
    API-->>Client: SSE: {type: complete, timestamp}
    Client->>API: GET /try-on-result/{timestamp}
    API-->>Client: Base64[] image array
```

---

## 🤖 ML Pipeline Architecture

```mermaid
flowchart TB
    subgraph "Input Preprocessing"
        I1[Raw Person Image] --> S1[U2-Net Segmentation]
        S1 --> C1[Bounding Box Detection]
        C1 --> R1[Aspect-Preserving Resize<br/>max_dim=1000px]
        
        I2[Garment Images] --> R2[Resolution Normalization<br/>500×500 bilinear]
    end
    
    subgraph "Generative Core"
        R1 --> COMPOSE{Iterative<br/>Composition}
        R2 --> COMPOSE
        
        COMPOSE --> VTX[Vertex AI<br/>virtual-try-on-preview-08-04<br/>Diffusion Conditioned on:<br/>• Person pose estimation<br/>• Garment segmentation mask<br/>• Semantic clothing parsing]
        
        VTX --> |n garments| COMPOSE
        VTX --> FINAL[Final Composite]
    end
    
    subgraph "Distributed Novel View Synthesis"
        FINAL --> CDN2[Cloudinary CDN<br/>Global Edge Upload]
        CDN2 --> GLOOP[Gumloop Orchestrator<br/>Agentic Workflow DAG]
        
        GLOOP --> |Parallel Dispatch| V0[0° Front<br/>Gemini Worker]
        GLOOP --> |Parallel Dispatch| V1[45° Front-Right<br/>Gemini Worker]
        GLOOP --> |Parallel Dispatch| V2[90° Right Profile<br/>Gemini Worker]
        GLOOP --> |Parallel Dispatch| V3[135° Back-Right<br/>Gemini Worker]
        GLOOP --> |Parallel Dispatch| V4[180° Back<br/>Gemini Worker]
        GLOOP --> |Parallel Dispatch| V5[225° Back-Left<br/>Gemini Worker]
        GLOOP --> |Parallel Dispatch| V6[270° Left Profile<br/>Gemini Worker]
    end
    
    subgraph "Output Processing"
        V0 & V1 & V2 & V3 & V4 & V5 & V6 --> SEG2[Batch Segmentation<br/>Background Isolation]
        SEG2 --> CROP[Intelligent Cropping<br/>Person Bounds + Padding]
        CROP --> ENC[Base64 Encoding<br/>PNG/JPEG Serialization]
    end
    
    style VTX fill:#fbbf24,stroke:#f59e0b
    style CDN2 fill:#3448c5,stroke:#2d3cb8
    style GLOOP fill:#00d4aa,stroke:#00b894
    style SEG2 fill:#4ade80,stroke:#22c55e
```

---

## ⚡ Distributed Multi-View Synthesis

Mirr.AI leverages **Gumloop's agentic workflow orchestration** to achieve **parallel distributed inference** for novel view generation. Instead of sequential API calls, the system dispatches 7 independent Gemini inference tasks simultaneously through Gumloop's DAG execution engine.

### Architecture

```mermaid
flowchart TB
    subgraph "Asset Staging"
        IMG[Composite Try-On Result] --> CDN[Cloudinary CDN<br/>Global Edge Upload]
        CDN --> URL[Public Asset URL<br/>Signed & Cached]
    end
    
    subgraph "Gumloop Orchestration Layer"
        URL --> FLOW[Gumloop Flow Trigger<br/>flow_id: multiview-synthesis]
        
        FLOW --> AGENT[Agentic Workflow DAG<br/>Parallel Task Dispatch]
        
        AGENT --> W0[Worker 0°<br/>Gemini Node]
        AGENT --> W1[Worker 45°<br/>Gemini Node]
        AGENT --> W2[Worker 90°<br/>Gemini Node]
        AGENT --> W3[Worker 135°<br/>Gemini Node]
        AGENT --> W4[Worker 180°<br/>Gemini Node]
        AGENT --> W5[Worker 225°<br/>Gemini Node]
        AGENT --> W6[Worker 270°<br/>Gemini Node]
    end
    
    subgraph "Parallel Inference"
        W0 --> G0[Gemini 2.5 Flash<br/>Front View]
        W1 --> G1[Gemini 2.5 Flash<br/>Front-Right]
        W2 --> G2[Gemini 2.5 Flash<br/>Right Profile]
        W3 --> G3[Gemini 2.5 Flash<br/>Back-Right]
        W4 --> G4[Gemini 2.5 Flash<br/>Back View]
        W5 --> G5[Gemini 2.5 Flash<br/>Back-Left]
        W6 --> G6[Gemini 2.5 Flash<br/>Left Profile]
    end
    
    subgraph "Result Aggregation"
        G0 & G1 & G2 & G3 & G4 & G5 & G6 --> AGG[Gumloop Aggregator<br/>Barrier Synchronization]
        AGG --> OUT[Output Manifest<br/>7 Signed URLs]
    end
    
    style FLOW fill:#00d4aa,stroke:#00b894
    style AGENT fill:#00d4aa,stroke:#00b894
    style AGG fill:#00d4aa,stroke:#00b894
    style CDN fill:#3448c5,stroke:#2d3cb8
```

### Why Gumloop?

| Capability | Benefit |
|------------|---------|
| **DAG Execution** | 7 Gemini calls execute in parallel, not sequentially |
| **Automatic Retry** | Failed inference nodes retry with exponential backoff |
| **Barrier Sync** | Results aggregated only when all workers complete |
| **Serverless Scale** | No infrastructure to manage, scales to demand |
| **Observability** | Built-in tracing, logging, and execution metrics |

### Performance Comparison

| Method | Total Latency | Parallelism |
|--------|---------------|-------------|
| Sequential Gemini API | ~21s (7 × 3s) | 1x |
| Async Python (rate-limited) | ~12s | ~2x |
| **Gumloop Distributed** | **~4s** | **7x** |

### Integration Flow

```python
# Gumloop client initialization
client = GumloopClient(
    api_key=os.getenv("GUMLOOP_API_KEY"),
    user_id=os.getenv("GUMLOOP_USER_ID"),
)

# Upload to Cloudinary CDN for global edge availability
image_url = cloudinary.uploader.upload(image_path)["secure_url"]

# Trigger agentic workflow - parallel Gemini inference
output = client.run_flow(
    flow_id=os.getenv("GUMLOOP_FLOW_ID"),
    inputs={"image": image_url}
)

# Results arrive as signed URLs for each angle
# {
#   "image_0": ["https://..."],    # 0° front view
#   "image_45": ["https://..."],   # 45° diagonal
#   "image_90": ["https://..."],   # 90° profile
#   ...
# }
```

---

## 🧠 Neural Recommendation Engine

Mirr.AI features a **state-of-the-art AI recommendation system** that understands fashion at a semantic level. Unlike traditional collaborative filtering or keyword-based recommendations, our system leverages **Marqo's FashionSigLIP** — a vision-language model specifically trained on 300M+ fashion image-text pairs — to provide **visually-aware outfit suggestions**.

### How It Works

```mermaid
flowchart LR
    subgraph "Cart Analysis"
        CART[🛒 Cart Items] --> EMB1[FashionSigLIP<br/>Embedding Generation]
        EMB1 --> V1[768-dim Vector]
        EMB1 --> V2[768-dim Vector]
        EMB1 --> VN[768-dim Vector]
    end
    
    subgraph "Semantic Fusion"
        V1 & V2 & VN --> AVG[Average Pooling]
        AVG --> QUERY[Query Embedding<br/>Outfit Semantic Center]
    end
    
    subgraph "Vector Search"
        QUERY --> COS[Cosine Similarity<br/>Search]
        DB[(Embedding Index<br/>All Historical Garments)] --> COS
        COS --> TOP[Top-K Results<br/>Similarity Threshold]
    end
    
    subgraph "Recommendations"
        TOP --> REC1[✨ Matching Item 1]
        TOP --> REC2[✨ Matching Item 2]
        TOP --> REC3[✨ Matching Item 3]
    end
    
    style EMB1 fill:#ff6b6b,stroke:#ee5a5a
    style AVG fill:#4ecdc4,stroke:#3dbdb5
    style COS fill:#ffe66d,stroke:#ffd93d
```

### The Science Behind It

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Embedding Model** | [Marqo FashionSigLIP](https://huggingface.co/Marqo/marqo-fashionSigLIP) | Fashion-domain CLIP fine-tuned on 300M+ fashion images |
| **Vector Dimension** | 768-dimensional | Rich semantic representation capturing style, color, pattern, silhouette |
| **Similarity Metric** | Cosine Similarity | L2-normalized embeddings for angular distance computation |
| **Aggregation Strategy** | Average Pooling | Semantic centroid of user's shopping intent |

### Why This Is Revolutionary

1. **Visual Understanding, Not Keywords**: The model understands that a "floral sundress" is semantically similar to "botanical print midi dress" without explicit keyword matching

2. **Style Coherence**: Recommendations maintain aesthetic consistency — if you're browsing minimalist pieces, you get minimalist suggestions, not random trending items

3. **Cross-Store Discovery**: Find similar items from your past try-on sessions across different stores and brands

4. **Real-Time Inference**: Embeddings are pre-computed and cached in MongoDB, enabling sub-100ms recommendation latency

### Data Flow

```javascript
// Request: Cart items (URL or Base64 - backend handles both!)
POST /recommendations
{
  "cart_items": [
    { "imageData": "data:image/jpeg;base64,/9j/4AAQ...", "url": null },
    { "imageData": null, "url": "https://store.com/product.jpg" }
  ],
  "limit": 6,
  "min_similarity": 0.25
}

// Response: Semantically similar garments with similarity scores
{
  "success": true,
  "recommendations": [
    {
      "garment": {
        "image": "data:image/jpeg;base64,...",
        "title": "Floral Midi Dress",
        "url": "https://store.com/dress",
        "price": "$89.99"
      },
      "similarity": 0.847  // 84.7% semantic match
    }
  ]
}
```

### Embedding Generation Script

```bash
# Backfill embeddings for existing garments in the database
cd backend
python generate_embedding.py

# Output:
# ============================================================
# Garment Embedding Generation Script
# ============================================================
# Total garments in database: 150
# Garments with embeddings: 0
# Garments without embeddings: 150
# Starting embedding generation...
# ✓ Successfully generated embeddings for 150 garments
# ⏱ Time elapsed: 45.32 seconds
```

---

## 🛠️ Technical Components

| Layer | Component | Implementation |
|-------|-----------|----------------|
| **Client Runtime** | DOM Instrumentation | Plasmo Content Script, MutationObserver |
| **Client Runtime** | State Management | Chrome Storage API, React 18 hooks |
| **Client Runtime** | Image Processing | Canvas API, Blob/Base64 encoding |
| **Transport** | Real-time Streaming | Server-Sent Events (EventSource) |
| **Transport** | Request Handling | Multipart/form-data, CORS |
| **Inference** | Virtual Try-On | Vertex AI `recontext_image` API |
| **Inference** | View Synthesis | Gemini 2.5 via Gumloop distributed DAG orchestration |
| **Orchestration** | Workflow Engine | Gumloop agentic workflows with parallel task dispatch |
| **Asset Delivery** | CDN | Cloudinary global edge network for inference payloads |
| **Inference** | Segmentation | U2-Net via rembg (CPU inference) |
| **Inference** | Fashion Embeddings | Marqo FashionSigLIP (768-dim vectors) |
| **Inference** | Similarity Search | Cosine similarity with threshold filtering |
| **Persistence** | Document Store | MongoDB Atlas (base64 blob + vector storage) |
| **Persistence** | Session Management | Timestamp-indexed collections |

---

## 📊 Data Schema

```javascript
// Sessions Collection - Try-on session metadata
{
  _id: ObjectId,
  timestamp: String,        // Unique session identifier (YYYYMMdd_HHmmss)
  person_image: String,     // Base64-encoded reference image
  created_at: ISODate       // Indexed for temporal queries
}

// Garments Collection - Input garment data with e-commerce metadata + embeddings
{
  _id: ObjectId,
  session_timestamp: String,  // Foreign key to session
  image: String,              // Base64-encoded garment image
  order: Number,              // Composition order (0-indexed)
  sku: String,                // Product SKU (extracted)
  url: String,                // Source product URL
  title: String,              // Product title (DOM scraped)
  price: String,              // Price string (parsed)
  metadata: String,           // JSON blob for extensibility
  embedding: Number[768]      // FashionSigLIP embedding vector (auto-generated)
}

// Generated Images Collection - Synthesized outputs
{
  _id: ObjectId,
  session_timestamp: String,  // Foreign key to session
  image: String,              // Base64-encoded result
  is_main: Boolean,           // Primary result flag
  view_index: Number          // Camera angle index (0-6)
}
```

---

## 🚀 Deployment

### Backend Service

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Environment configuration
cp example.env .env
# Required: GOOGLE_CLOUD_PROJECT, MONGODB_URI, GOOGLE_API_KEY
# Optional: GUMLOOP_API_KEY, CLOUDINARY_URL (alternative view gen)

# Start inference server
python server.py  # Binds to 0.0.0.0:8080
```

### Extension Build

```bash
cd chrome-extension
npm install

cp example.env .env
# Set: PLASMO_PUBLIC_API_URL=http://localhost:8080

npm run dev      # Development with HMR
npm run build    # Production build
```

### Chrome Installation

1. Navigate to `chrome://extensions/`
2. Enable Developer Mode
3. Load unpacked → `chrome-extension/build/chrome-mv3-dev`

---

## 🔌 API Reference

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/health` | GET | Liveness probe | `{status: "ok"}` |
| `/process-image` | POST | U2-Net segmentation + crop | Base64 PNG |
| `/try-on` | POST | Synchronous try-on generation | Base64[] |
| `/try-on-stream` | POST | SSE streaming generation | EventStream |
| `/try-on-result/:ts` | GET | Fetch cached results | Base64[] |
| `/sessions` | GET | List session metadata | Session[] |
| `/sessions/:ts` | GET | Full session with images | SessionDetail |
| `/recommendations` | POST | AI-powered outfit recommendations | Recommendation[] |

---

## ⚙️ Configuration

```bash
# Backend .env
PORT=8080
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tryon_db
GOOGLE_CLOUD_PROJECT=project-id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_API_KEY=AIza...

# Gumloop Distributed Inference
GUMLOOP_API_KEY=gum_...
GUMLOOP_USER_ID=user_...
GUMLOOP_FLOW_ID=flow_multiview_synthesis

# Cloudinary CDN (asset staging for Gumloop)
CLOUDINARY_URL=cloudinary://key:secret@cloud_name

# Extension .env  
PLASMO_PUBLIC_API_URL=http://localhost:8080
```

---

## 📁 Repository Structure

```
├── backend/
│   ├── server.py              # Flask application, route handlers
│   ├── put_on.py              # Vertex AI client wrapper
│   ├── generate_views.py      # Gumloop orchestrated multi-view synthesis
│   ├── db.py                  # MongoDB ODM + FashionSigLIP embeddings
│   ├── generate_embedding.py  # Batch embedding generation script
│   └── image-manipulation/
│       └── crop_person.py     # U2-Net inference, bounding box detection
│
└── chrome-extension/
    ├── content.tsx            # DOM instrumentation, event handlers
    ├── popup.tsx              # React UI, session gallery
    ├── components/
    │   ├── Cart.tsx           # Shopping cart + AI recommendations
    │   ├── VirtualTryOnPanel.tsx
    │   └── Setup.tsx
    ├── hooks/                 # useImageHover, useButtonPosition
    └── utils/                 # storage, imageResize, product-detection
```

---

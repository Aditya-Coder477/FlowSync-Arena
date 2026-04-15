# FlowSync Arena
### Real-Time Crowd Dynamics & Situational Awareness Platform

FlowSync Arena is a high-fidelity, production-quality crowd management platform designed for large-scale venues, stadiums, and public spaces. By leveraging digital twin technology and predictive simulation, FlowSync Arena transforms reactive venue management into proactive operational excellence.

---

## ◈ Overview
Venues today face complex challenges: overcrowding at choke points, inefficient staff deployment, and the high-stakes pressure of emergency evacuation. FlowSync Arena provides a centralized "Situational Awareness" engine that monitors crowd density, predicts queue wait times, and simulates critical scenarios to ensure attendee safety and operational efficiency.

## ⚠ The Problem
Traditional venue management relies on static plans and reactive responses (e.g., calling for backup *after* a gate is already blocked). This delay increases the risk of crushing, medical incidents, and operational bottlenecks. FlowSync Arena solves this by providing a **Real-Time Digital Twin** that visualizes current states and predicts future risks before they escalate.

## ✨ Key Features
Operationally focused and designed for high-stress environments:

*   **⚡ Crowd Thermostat**: An automated redirection logic that dynamically calculates the best routes for attendees based on real-time zone capacity, preventing congestion before it starts.
*   **☁ Calm Mode**: A context-aware UI system that automatically simplifies visual information and provides focused instructions when average venue density exceeds 70%, reducing cognitive load for operators.
*   **◬ Predictive Emergency Simulation**: A high-fidelity module that allows safety coordinators to stress-test evacuation protocols using digital twin modeling, complete with hazard propagation (e.g., fire spread) and staff responsiveness metrics.
*   **🎯 Route Confidence Indicator**: A transparent 5-dot reliability system that shows attendees and staff the current integrity of suggested paths based on live data density and variance.
*   **🤝 Invisible Concierge**: A proactive, contextual suggestion engine that anticipates attendee needs (e.g., suggesting a nearby food stall with lower queues) rather than waiting for a request.

---

## 🏗 System Architecture
Built for sub-second latency and global scalability:

*   **Frontend**: Next.js 14 with React 18, utilizing the App Router for robust state management and role-based routing. Styled with custom design tokens for a premium, high-contrast dark mode aesthetic.
*   **Backend**: FastAPI (Python 3.12) providing a high-performance asynchronous REST API.
*   **Database**: **Google Cloud Firestore (Native Mode)** for real-time document synchronization and persistence.
*   **Caching**: **Redis** (Google Cloud Memorystore) for high-frequency state caching of zone densities and active session metadata.
*   **Deployment**: Fully containerized with Docker and deployed on **Google Cloud Run** for serverless, autoscaling performance.

## 🛠 Tech Stack
- **Core**: Next.js 14, TypeScript, FastAPI
- **Visualization**: Recharts, SVG-based Digital Twin mapping
- **Logic**: Pydantic v2 (Validation), SWR (Data Fetching), Lucide React (Iconography)
- **Infrastructure**: Docker, GitHub Actions, Google Cloud Platform

---

## 📁 Folder Structure
```bash
FlowSync-Arena/
├── frontend/           # Next.js Application
│   ├── src/app/        # Role-based dashboards (attendee, staff, admin, control)
│   ├── src/components/ # Shared UI components & Digital Twin views
│   └── src/lib/        # API client, types, and operational constants
├── backend/            # FastAPI Application
│   ├── app/routers/    # Modular API endpoints (zones, simulation, etc.)
│   ├── app/services/   # Core logic (crowd calculation, emergency playback)
│   └── app/models/     # Pydantic schemas and database models
├── Documentation/      # High-level design and technical reports
├── docker-compose.yml  # Local orchestration
└── run_app.bat         # Single-click local development script
```

---

## 🔄 How It Works (Stakeholder Perspectives)

### 1. Attendee Experience
Attendees receive proactive navigation help. The system monitors their current zone and provides an "Invisible Concierge" view that highlights nearest exits, food stalls with the shortest wait times, and "low-stress" routes to their destination.

### 2. Staff Field View
Ground staff see live deployments and assigned tasks. When a "Crowd Thermostat" alert is triggered, staff in adjacent zones receive instant notifications to manually redirect flow or open secondary gates.

### 3. Admin Dashboard
Event managers monitor holistic KPIs: average venue density, gate throughput per hour, and alert resolution times. This view is designed for strategic oversight and long-term event planning.

### 4. Control Room (Tactical)
The "Heart" of the system. Tactical operators monitor the **Risk Matrix**—a 2D visualization of all zones graded by safety level. From here, operators can trigger emergency protocols or run "What-If" simulations to prepare for incoming surges.

---

## 🚀 Installation and Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker (for local Redis)
- Google Cloud Project with Firestore enabled

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Configure your PROJECT_ID and CREDENTIALS_PATH in .env
uvicorn app.main:app --reload --port 8080
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Local Hardware-Free Setup
Since FlowSync Arena uses a software-defined digital twin rather than physical IoT sensors, you can populate the system with mock operational data immediately:
```bash
# Seed initial Firestore collections
curl -X POST http://localhost:8080/admin/seed
```

---

## ⚙ Environment Variables

### Backend (`backend/.env`)
```env
GOOGLE_CLOUD_PROJECT=flowsync-arena-id
GOOGLE_APPLICATION_CREDENTIALS=./secrets/sa-key.json
REDIS_HOST=localhost
REDIS_PORT=6379
ENVIRONMENT=development
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## ☁ Deployment on Google Cloud Run

FlowSync Arena is designed to be deployed as two stateless services:

1.  **Build Images**:
    ```bash
    gcloud builds submit --tag gcr.io/[PROJECT_ID]/backend ./backend
    gcloud builds submit --tag gcr.io/[PROJECT_ID]/frontend ./frontend
    ```

2.  **Deploy Backend**:
    ```bash
    gcloud run deploy flowsync-api --image gcr.io/[PROJECT_ID]/backend \
      --set-env-vars GOOGLE_CLOUD_PROJECT=[PROJECT_ID] \
      --allow-unauthenticated
    ```

3.  **Deploy Frontend**:
    ```bash
    gcloud run deploy flowsync-web --image gcr.io/[PROJECT_ID]/frontend \
      --set-env-vars NEXT_PUBLIC_API_URL=[BACKEND_URL] \
      --allow-unauthenticated
    ```

---

## 🖼 UI & Design Notes
FlowSync Arena utilizes a **High-Utility Design System** characterized by:
- **Neon-on-Dark Aesthetics**: For maximum readability in dim control room environments.
- **Micro-Animations**: Pulse effects on critical risk zones to catch operator attention.
- **Skeleton States**: To maintain visual stability during real-time data streaming.



---

## 🔭 Future Scope
- **Real-Time Staff Radio Integration**: Deep-linking staff tasks with VOIP communication.
- **AI-Driven Chatbot**: NLP-powered assistant for attendees to query venue status.
- **IoT Hardware Bridge**: Support for physical crowd-counting cameras and BLE beacons.
- **Multilingual Support**: Real-time translation for international events.

---

**FlowSync Arena** — *Synchronizing movement, ensuring safety.*

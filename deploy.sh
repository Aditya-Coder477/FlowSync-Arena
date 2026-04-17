#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# FlowSync Arena — Google Cloud Run Deployment Script
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites:
#   - gcloud CLI installed and authenticated: gcloud auth login
#   - Docker installed and running
#   - Artifact Registry repo created (script will create if missing)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
PROJECT_ID="flowsync-arena"
REGION="asia-south1"                        # Mumbai — closest to India
REPO="flowsync-repo"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

BACKEND_IMAGE="${REGISTRY}/backend:latest"
FRONTEND_IMAGE="${REGISTRY}/frontend:latest"

BACKEND_SERVICE="flowsync-api"
FRONTEND_SERVICE="flowsync-web"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# ── Step 0: Auth & project ────────────────────────────────────────────────────
info "Setting active project to ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}"

info "Configuring Docker auth for Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── Step 1: Ensure Artifact Registry repo exists ──────────────────────────────
info "Ensuring Artifact Registry repo '${REPO}' exists..."
gcloud artifacts repositories describe "${REPO}" \
  --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null || \
gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --description="FlowSync Arena container images"
ok "Artifact Registry repo ready."

# ── Step 2: Build & push backend ──────────────────────────────────────────────
info "Building backend image..."
docker build \
  --platform linux/amd64 \
  -t "${BACKEND_IMAGE}" \
  ./backend

info "Pushing backend image..."
docker push "${BACKEND_IMAGE}"
ok "Backend image pushed: ${BACKEND_IMAGE}"

# ── Step 3: Deploy backend to Cloud Run ───────────────────────────────────────
info "Deploying backend service '${BACKEND_SERVICE}'..."
gcloud run deploy "${BACKEND_SERVICE}" \
  --image="${BACKEND_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60 \
  --set-env-vars="\
GOOGLE_CLOUD_PROJECT=${PROJECT_ID},\
ENVIRONMENT=production,\
DEBUG=false,\
REDIS_HOST=,\
ALLOWED_ORIGINS=https://placeholder-update-after-frontend-deploy"

# Get the backend URL
BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" \
  --region="${REGION}" \
  --format="value(status.url)")
ok "Backend deployed at: ${BACKEND_URL}"

# ── Step 4: Build & push frontend (with backend URL baked in) ─────────────────
info "Building frontend image with NEXT_PUBLIC_API_URL=${BACKEND_URL}..."
docker build \
  --platform linux/amd64 \
  --build-arg "NEXT_PUBLIC_API_URL=${BACKEND_URL}" \
  -t "${FRONTEND_IMAGE}" \
  ./frontend

info "Pushing frontend image..."
docker push "${FRONTEND_IMAGE}"
ok "Frontend image pushed: ${FRONTEND_IMAGE}"

# ── Step 5: Deploy frontend to Cloud Run ──────────────────────────────────────
info "Deploying frontend service '${FRONTEND_SERVICE}'..."
gcloud run deploy "${FRONTEND_SERVICE}" \
  --image="${FRONTEND_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=3 \
  --memory=256Mi \
  --cpu=1 \
  --timeout=30

# Get the frontend URL
FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" \
  --format="value(status.url)")
ok "Frontend deployed at: ${FRONTEND_URL}"

# ── Step 6: Update backend CORS with actual frontend URL ──────────────────────
info "Updating backend CORS to allow: ${FRONTEND_URL}"
gcloud run services update "${BACKEND_SERVICE}" \
  --region="${REGION}" \
  --update-env-vars="ALLOWED_ORIGINS=${FRONTEND_URL}"
ok "Backend CORS updated."

# ── Step 7: Seed Firestore initial data ───────────────────────────────────────
info "Seeding Firestore with initial demo data..."
SEED_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BACKEND_URL}/admin/seed")
if [ "${SEED_RESULT}" = "200" ]; then
  ok "Firestore seeded successfully."
else
  warn "Seed returned HTTP ${SEED_RESULT} — may already be seeded. Check ${BACKEND_URL}/docs"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  FlowSync Arena deployed successfully!         ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Frontend:  ${FRONTEND_URL}"
echo -e "  ⚙  Backend:   ${BACKEND_URL}"
echo -e "  📖 API Docs:  ${BACKEND_URL}/docs"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Verify health:  curl ${BACKEND_URL}/health"
echo "  2. Open frontend:  ${FRONTEND_URL}"
echo "  3. Check logs:     gcloud run services logs read ${BACKEND_SERVICE} --region=${REGION}"
echo ""

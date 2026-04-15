@echo off
echo ===================================================
echo Starting FlowSync Arena Local Development Servers...
echo ===================================================
echo.

echo [1/3] Setting up Backend API...
cd backend
python -m pip install -r requirements.txt
echo Starting FastAPI on port 8080...
start "FlowSync Backend API" cmd /k "uvicorn app.main:app --reload --port 8080"
cd ..

echo.
echo [2/3] Setting up Next.js Frontend...
cd frontend
call npm install
echo Starting Next.js on port 3000...
start "FlowSync Frontend UI" cmd /k "npm run dev"
cd ..

echo.
echo ===================================================
echo Servers are starting in separate terminal windows!
echo - Backend API: http://localhost:8080/docs
echo - Frontend UI: http://localhost:3000
echo ===================================================
echo.
pause

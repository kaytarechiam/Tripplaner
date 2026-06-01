@echo off
echo ====================================
echo TripPlanner - Starting Backend + Tunnel
echo ====================================
echo.

REM Jalankan cloudflared tunnel di background
echo [1/2] Starting Cloudflare Tunnel...
start "TripPlanner-Tunnel" cloudflared.exe tunnel run --token %TUNNEL_TOKEN% --no-autoupdate

REM Tunggu cloudflared ready
echo Waiting for tunnel to connect...
timeout /t 5 /nobreak >nul

REM Jalankan backend
echo [2/2] Starting Backend Server...
cd /d %~dp0
start "TripPlanner-Backend" cmd /k "npm run dev:server"

echo.
echo ====================================
echo TripPlanner starting...
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo Online:    https://tripplaner.stei.cloud
echo ====================================
echo.
echo Notes:
echo  - JANGAN TUTUP window TripPlanner-Tunnel dan TripPlanner-Backend
echo  - Untuk stop: tutup kedua window tersebut
pause
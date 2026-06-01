@echo off
echo ========================================
echo TripPlanner - Set Cloudflare Tunnel Token
echo ========================================
echo.
echo Paste your Cloudflare Tunnel token here:
echo (format: eyJhIjoiZjExYzU5ZjAxM2VlMWViZmEwZTNkNDZjODg0NDViYTMiLCJ0Ijoi...)
echo.
set /p TOKEN="Token: "

REM Simpan ke file .tunnel_token untuk dibaca oleh start-with-tunnel.bat
echo %TOKEN% > "%~dp0.tunnel_token"

REM Set sebagai environment variable untuk session ini
set TUNNEL_TOKEN=%TOKEN%

echo.
echo Token saved to .tunnel_token
echo.
echo Now run: start-with-tunnel.bat
pause
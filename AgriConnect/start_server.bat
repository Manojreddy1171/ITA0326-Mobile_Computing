@echo off
title AgriConnect Backend Server
color 0A
echo ============================================
echo   AgriConnect - Farmer Marketplace
echo   Backend Server Startup
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] Checking Node.js...
node --version || (echo ERROR: Node.js not found. Please install from https://nodejs.org && pause && exit /b 1)

echo [2/2] Starting AgriConnect server on port 5000...
echo.
echo   Browser (PC):        http://localhost:5000
echo   Android Emulator:    http://10.0.2.2:5000
echo   Physical Phone:      http://10.66.232.95:5000
echo.
echo Press Ctrl+C to stop the server.
echo ============================================
echo.

node backend/server.js

pause

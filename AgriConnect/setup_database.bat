@echo off
title AgriConnect - Setup Database
color 0B
echo ============================================
echo   AgriConnect - Database Initializer
echo ============================================
echo.

cd /d "%~dp0"

echo Setting up database and seeding demo data...
echo This will create the 'agriconnect' database and all tables.
echo.

node scripts/init_and_seed.js
node scripts/migrate_modules.js
node scripts/seed_advanced_modules_demo.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo   SUCCESS! Database is ready.
    echo.
    echo   Demo Accounts (password: password123)
    echo   -----------------------------------------
    echo   FARMER:   farmer@agriconnect.com
    echo   BUYER:    buyer@agriconnect.com
    echo   PROVIDER: equipment@agriconnect.com
    echo   EXPERT:   expert@agriconnect.com
    echo.
    echo   Admin login at /admin-login.html
    echo   Email: admin@agriconnect.com
    echo   (Admin password set in .env)
    echo ============================================
) else (
    echo.
    echo ERROR: Database setup failed. Check .env file and MySQL connection.
)

pause

#!/bin/bash
echo ""
echo "======================================"
echo "  BloodConnect Backend Setup (Linux/Mac)"
echo "======================================"
echo ""

[ ! -f .env ] && cp .env.example .env && echo "[1/5] Created .env"

echo "[2/5] Installing dependencies..."
composer install --no-interaction

echo "[3/5] Generating app key..."
php artisan key:generate --force

echo "[4/5] Generating JWT secret..."
php artisan jwt:secret --force

echo "[5/5] Setting up database..."
php artisan migrate --force
php artisan db:seed --force

echo ""
echo "========================================"
echo "  Setup complete!"
echo ""
echo "  Admin: admin@bloodconnect.af"
echo "  Pass:  BloodConnect@Admin2026!"
echo ""
echo "  Run: php artisan serve"
echo "========================================"

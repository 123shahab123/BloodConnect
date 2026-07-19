@echo off
echo.
echo ======================================
echo   BloodConnect Backend Setup (Windows)
echo ======================================
echo.

:: Copy env file
if not exist .env (
    copy .env.example .env
    echo [1/5] Created .env file
) else (
    echo [1/5] .env already exists - skipping
)

:: Install composer dependencies
echo [2/5] Installing PHP dependencies...
composer install --no-interaction

:: Generate app key
echo [3/5] Generating app key...
php artisan key:generate --force

:: Generate JWT secret
echo [4/5] Generating JWT secret...
php artisan jwt:secret --force

:: Run migrations and seed
echo [5/5] Setting up database...
php artisan migrate --force
php artisan db:seed --force

echo.
echo ========================================
echo   Setup complete!
echo.
echo   Admin login:
echo   Email:    admin@bloodconnect.af
echo   Password: BloodConnect@Admin2026!
echo.
echo   Start the server:
echo   php artisan serve
echo ========================================
echo.

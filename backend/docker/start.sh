#!/bin/sh
set -e

# Render assigns a dynamic port via $PORT — default to 80 if not set (e.g. local testing)
PORT="${PORT:-80}"
sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/sites-available/default

# Cache config for performance (safe to fail on first boot before APP_KEY exists)
php artisan config:cache || true
php artisan route:cache || true

# Run migrations on every deploy so schema stays in sync
php artisan migrate --force

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

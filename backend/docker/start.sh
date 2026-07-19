#!/bin/sh
set -e

# Render assigns a dynamic port via $PORT — default to 80 if not set (e.g. local testing)
PORT="${PORT:-80}"
sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/sites-available/default

# Cache config for performance (safe to fail on first boot before APP_KEY exists)
php artisan config:cache || true
php artisan route:cache || true

# Start nginx + php-fpm FIRST so Render detects an open port immediately.
# Running migrations before this was starving Render's port-scan timeout
# whenever the database took a moment to respond (e.g. a cold-starting
# free-tier Postgres instance) — the app would have come up fine a few
# seconds later, but Render had already marked the deploy as failed.
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf &
SUPERVISOR_PID=$!

# Now run migrations — the port is already open, so this can take as long
# as it needs without risking the deploy being killed for "no open ports."
php artisan migrate --force || echo "WARNING: migration failed — check DB_* environment variables"

wait $SUPERVISOR_PID

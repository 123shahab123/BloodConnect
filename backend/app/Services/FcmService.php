<?php

namespace App\Services;

use Illuminate\Support\Facades\{Http, Cache, Log};

/**
 * FcmService — sends push notifications via Firebase Cloud Messaging HTTP v1 API.
 *
 * 100% free (no paid tier required). Uses a Firebase service account JSON
 * (downloaded from Firebase Console → Project Settings → Service Accounts →
 * Generate New Private Key) to mint short-lived OAuth2 access tokens via
 * pure PHP/OpenSSL — no external SDK or Composer package required.
 *
 * Setup:
 *   1. Create a Firebase project (free) at https://console.firebase.google.com
 *   2. Project Settings → Service Accounts → Generate New Private Key
 *   3. Save the downloaded JSON to storage/app/firebase-credentials.json
 *      (or set FCM_CREDENTIALS_FILE in .env to its path)
 *   4. Done — sendToToken()/sendToTokens() now work.
 *
 * If no credentials file is configured, this service silently no-ops
 * (logs a debug line) so local development works without FCM.
 */
class FcmService
{
    private ?array $credentials = null;
    private string $cacheKey = 'fcm_access_token';

    public function __construct()
    {
        $path = config('services.fcm.credentials_file');

        if (! $path) {
            Log::debug('FCM: no credentials_file configured (FCM_CREDENTIALS_FILE) — push disabled.');
            return;
        }

        // Resolve relative paths against the app base path. A bare relative
        // path (e.g. "storage/app/firebase-credentials.json") only resolves
        // correctly via file_exists() when the PHP process's cwd happens to
        // be the project root (true for `php artisan serve`, NOT guaranteed
        // under Apache/Nginx/php-fpm with document root = public/, queue
        // workers, or scheduled commands run from a different cwd). Always
        // anchor relative paths to base_path() so it works everywhere.
        if (! $this->isAbsolutePath($path)) {
            $path = base_path($path);
        }

        if (! file_exists($path)) {
            Log::warning("FCM: credentials file not found at resolved path: {$path}");
            return;
        }

        $json = json_decode(file_get_contents($path), true);

        if (! is_array($json)) {
            Log::error("FCM: credentials file at {$path} is not valid JSON.");
            return;
        }

        if (! isset($json['private_key'], $json['client_email'], $json['project_id'])) {
            Log::error("FCM: credentials file at {$path} is missing required keys (private_key, client_email, project_id). Make sure you downloaded a *service account* JSON from Firebase Console → Project Settings → Service Accounts, not the web app config.");
            return;
        }

        $this->credentials = $json;
    }

    /**
     * Cross-platform absolute-path check (handles both /unix/paths and
     * C:\windows\paths, since this app is sometimes run locally on Windows).
     */
    private function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, '/') || (bool) preg_match('#^[A-Za-z]:[\\\\/]#', $path);
    }

    public function isConfigured(): bool
    {
        return $this->credentials !== null;
    }

    /**
     * Send a notification to a single FCM device token.
     */
    public function sendToToken(string $token, string $title, string $body, array $data = []): bool
    {
        return $this->send([$token], $title, $body, $data);
    }

    /**
     * Send a notification to multiple FCM device tokens (sent individually —
     * FCM v1 API does not support true multicast in one call).
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): int
    {
        $sent = 0;
        foreach (array_filter($tokens) as $token) {
            if ($this->send([$token], $title, $body, $data)) $sent++;
        }
        return $sent;
    }

    private function send(array $tokens, string $title, string $body, array $data): bool
    {
        if (! $this->isConfigured()) {
            Log::debug("FCM not configured — skipping push: \"{$title}\"");
            return false;
        }

        $accessToken = $this->getAccessToken();
        if (! $accessToken) return false;

        $projectId = $this->credentials['project_id'];
        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        $ok = true;
        foreach ($tokens as $token) {
            // Data-only payload (no top-level "notification" key) is sent
            // deliberately. For web push, if a "notification" key is
            // present, Chrome auto-displays it on top of whatever our
            // service worker's onBackgroundMessage handler shows, causing
            // duplicate notifications. Sending data-only and always
            // displaying manually (in firebase-messaging-sw.js for
            // background, and via a toast for foreground) gives full,
            // consistent control across platforms.
            $messageData = array_merge(
                ['title' => $title, 'body' => $body],
                array_map('strval', $data)
            );

            $payload = [
                'message' => [
                    'token' => $token,
                    'data' => $messageData,
                    'android' => ['priority' => 'high'],
                    'apns' => ['payload' => ['aps' => ['sound' => 'default', 'content-available' => 1]]],
                    'webpush' => [
                        'headers' => ['Urgency' => 'high'],
                        'fcm_options' => ['link' => config('app.frontend_url', env('FRONTEND_URL', '/'))],
                    ],
                ],
            ];

            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->post($url, $payload);

            if (! $response->successful()) {
                Log::warning('FCM send failed', ['status' => $response->status(), 'body' => $response->body()]);
                $ok = false;
            }
        }

        return $ok;
    }

    /**
     * Get (and cache) an OAuth2 access token for the FCM v1 API.
     * Tokens are valid for 1 hour; cached for 55 minutes.
     */
    private function getAccessToken(): ?string
    {
        return Cache::remember($this->cacheKey, 55 * 60, function () {
            $now = time();
            $header  = ['alg' => 'RS256', 'typ' => 'JWT'];
            $payload = [
                'iss'   => $this->credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud'   => 'https://oauth2.googleapis.com/token',
                'iat'   => $now,
                'exp'   => $now + 3600,
            ];

            $segments = [
                $this->base64UrlEncode(json_encode($header)),
                $this->base64UrlEncode(json_encode($payload)),
            ];

            $signingInput = implode('.', $segments);

            $privateKey = openssl_pkey_get_private($this->credentials['private_key']);
            if (! $privateKey) {
                Log::error('FCM: invalid private key in credentials file');
                return null;
            }

            $signature = '';
            openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
            $segments[] = $this->base64UrlEncode($signature);

            $jwt = implode('.', $segments);

            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]);

            if (! $response->successful()) {
                Log::error('FCM: failed to obtain access token', ['body' => $response->body()]);
                return null;
            }

            return $response->json('access_token');
        });
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}

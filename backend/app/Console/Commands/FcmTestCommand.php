<?php

namespace App\Console\Commands;

use App\Services\FcmService;
use Illuminate\Console\Command;

/**
 * Quick CLI diagnostic for the FCM pipeline — checks credentials loading,
 * mints an OAuth2 token, and (optionally) sends a real test push, all
 * without needing the frontend wired up.
 *
 * Usage:
 *   php artisan fcm:test                  → just checks configuration
 *   php artisan fcm:test "DEVICE_TOKEN"   → sends a real test push to that token
 */
class FcmTestCommand extends Command
{
    protected $signature = 'fcm:test {token? : An FCM device token to send a real test push to}';

    protected $description = 'Diagnose the FCM setup and optionally send a test push notification';

    public function handle(FcmService $fcm): int
    {
        $this->info('── FCM Diagnostic ──');

        $configuredPath = config('services.fcm.credentials_file');
        $this->line("Configured credentials path: {$configuredPath}");

        if (! $fcm->isConfigured()) {
            $this->error('FCM is NOT configured. Check the storage.logs (storage/logs/laravel.log) for the exact reason — common causes:');
            $this->line('  • storage/app/firebase-credentials.json does not exist');
            $this->line('  • the JSON file is not a *service account* key (Project Settings → Service Accounts → Generate New Private Key)');
            $this->line('  • file permissions prevent reading it');
            return self::FAILURE;
        }

        $this->info('✓ Credentials file loaded successfully.');

        $token = $this->argument('token');

        if (! $token) {
            $this->comment('No device token provided — skipping the live send test.');
            $this->comment('Run again with a real FCM token to send a test push:');
            $this->comment('  php artisan fcm:test "your-device-token-here"');
            return self::SUCCESS;
        }

        $this->info('Attempting to mint an OAuth2 access token and send a real push...');

        $ok = $fcm->sendToToken(
            $token,
            'BloodConnect — Test Notification 🩸',
            'If you can see this, FCM is fully working end to end!',
            ['type' => 'test']
        );

        if ($ok) {
            $this->info('✓ Push sent successfully. Check the device.');
            return self::SUCCESS;
        }

        $this->error('✗ Push send failed. Check storage/logs/laravel.log for the FCM error response (often an invalid/expired token, or a misconfigured service account).');
        return self::FAILURE;
    }
}

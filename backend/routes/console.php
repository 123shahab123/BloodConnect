<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ── Cron Jobs (BloodConnect) ────────────────────────────────────────────────

Schedule::call(function () {
    \App\Models\BloodRequest::whereIn('status', ['pending', 'notified'])
        ->where('expires_at', '<', now())
        ->update(['status' => 'expired']);
})->everyFiveMinutes()->name('expire-requests');

Schedule::call(function () {
    \App\Models\DonorNotification::where('response', 'pending')
        ->where('response_window_ends_at', '<', now())
        ->update(['response' => 'no_response']);
})->hourly()->name('expire-notifications');

Schedule::call(function () {
    app(\App\Services\MatchingEngine::class)->processScheduledWaves();
})->everyMinute()->name('process-waves');

Schedule::call(function () {
    $eligible = \App\Models\User::where('is_donor', true)
        ->where('status', 'active')
        ->whereNotNull('next_eligible_at')
        ->whereDate('next_eligible_at', today())
        ->get();

    foreach ($eligible as $donor) {
        \App\Models\InAppNotification::create([
            'user_id'  => $donor->id,
            'type'     => 'eligibility_reminder',
            'title_en' => '🩸 You can donate again!',
            'title_fa' => '🩸 شما دوباره می‌توانید خون بدهید!',
            'body_en'  => 'Your 56-day cooldown is over. Enable availability to help patients.',
            'body_fa'  => 'دوره استراحت ۵۶ روزه شما تمام شده است.',
        ]);
    }
})->dailyAt('09:00')->name('eligibility-reminders');

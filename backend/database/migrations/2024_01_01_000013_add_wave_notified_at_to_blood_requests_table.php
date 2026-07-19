<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds wave_notified_at to blood_requests.
 *
 * WHY: MatchingEngine previously used updated_at to measure how long the
 * current wave has been running (to decide when to escalate to the next wave).
 * That was wrong: every call to $bloodRequest->update() — including the one
 * inside runWave() itself — resets updated_at, so the elapsed-time check
 * could never reliably exceed WAVE_DELAY. As a result requests got stuck on
 * wave 1 and never escalated to waves 2–5, meaning far fewer donors were
 * ever notified than the algorithm intended.
 *
 * wave_notified_at is set once per wave transition inside runWave() and is
 * never touched by any other update, so it accurately records when a given
 * wave started.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('blood_requests', function (Blueprint $table) {
            $table->timestamp('wave_notified_at')
                  ->nullable()
                  ->after('current_wave')
                  ->comment('When the current wave was dispatched — used for wave-escalation timing');
        });
    }

    public function down(): void
    {
        Schema::table('blood_requests', function (Blueprint $table) {
            $table->dropColumn('wave_notified_at');
        });
    }
};

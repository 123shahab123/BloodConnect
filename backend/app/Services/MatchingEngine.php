<?php

namespace App\Services;

use App\Models\BloodRequest;
use App\Models\DonorNotification;
use App\Models\InAppNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MatchingEngine
{
    private const COMPATIBLE = [
        'O-'  => ['O-'],
        'O+'  => ['O-', 'O+'],
        'A-'  => ['O-', 'A-'],
        'A+'  => ['O-', 'O+', 'A-', 'A+'],
        'B-'  => ['O-', 'B-'],
        'B+'  => ['O-', 'O+', 'B-', 'B+'],
        'AB-' => ['O-', 'A-', 'B-', 'AB-'],
        'AB+' => ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    ];

    private const WAVES = [
        1 => ['radius_km' => 9999, 'max_donors' => 10,  'same_province' => true],
        2 => ['radius_km' => 9999, 'max_donors' => 20,  'same_province' => true],
        3 => ['radius_km' => 9999, 'max_donors' => 30,  'same_province' => false],
        4 => ['radius_km' => 9999, 'max_donors' => 50,  'same_province' => false],
        5 => ['radius_km' => 9999, 'max_donors' => 100, 'same_province' => false],
    ];

    private const RESPONSE_WINDOW = ['critical' => 120, 'urgent' => 360, 'planned' => 720];

    private const WAVE_DELAY = [
        'critical' => ['1' => 1,  '2' => 2,  '3' => 3,  '4' => 4],
        'urgent'   => ['1' => 1, '2' => 2, '3' => 3, '4' => 4],
        'planned'  => ['1' => 1, '2' => 2, '3' => 3, '4' => 4],
    ];

    public function __construct(private FcmService $fcm) {}

    public function runWave(int $requestId, int $wave): array
    {
        $br = BloodRequest::with('district')->find($requestId);

        if (!$br) {
            Log::warning("MatchingEngine: request #$requestId not found");
            return ['success' => false, 'reason' => 'not_found'];
        }
        if (!$br->isActive()) {
            Log::info("MatchingEngine: #$requestId is {$br->status}");
            return ['success' => false, 'reason' => 'not_active'];
        }
        if ($br->donors_accepted >= $br->units_needed) {
            return ['success' => true, 'reason' => 'fulfilled'];
        }

        $cfg = self::WAVES[$wave] ?? null;
        if (!$cfg) return ['success' => false, 'reason' => 'invalid_wave'];

        $compatible = self::COMPATIBLE[$br->blood_type_needed] ?? [];
        if (empty($compatible)) return ['success' => false, 'reason' => 'no_compatible_types'];

        // Patient location — fall back to district centroid if no GPS
        $patLat = (float)($br->lat ?? $br->district?->lat_centroid ?? 34.52);
        $patLng = (float)($br->lng ?? $br->district?->lng_centroid ?? 69.17);

        Log::info("MatchingEngine wave $wave | #$requestId | patient ({$patLat},{$patLng}) | {$br->blood_type_needed}");

        // Already-notified donor IDs
        $notifiedIds = DonorNotification::where('request_id', $requestId)
            ->pluck('donor_id')->toArray();

        // Build SQL parts
        $btList  = implode(',', array_map(fn($t) => "'" . addslashes($t) . "'", $compatible));
        $exclude = empty($notifiedIds)
            ? ''
            : 'AND u.id NOT IN (' . implode(',', array_map('intval', $notifiedIds)) . ')';
        $provFilter = $cfg['same_province']
            ? 'AND u.province_id = ' . (int)$br->province_id
            : '';

        /*
         * Use a subquery so the computed distance_km alias is
         * available for filtering — avoids MySQL strict mode issues.
         * COALESCE falls back: user GPS -> district centroid -> Kabul centre.
         * LEAST/GREATEST prevents acos() domain errors from float rounding.
         */
        $sql = "
            SELECT * FROM (
                SELECT
                    u.id,
                    u.blood_type,
                    u.reliability_score,
                    u.donation_count,
                    u.last_active_at,
                    u.fcm_token,
                    u.language_pref,
                    u.province_id,
                    u.district_id,
                    (6371 * acos(LEAST(1.0, GREATEST(-1.0,
                        cos(radians($patLat))
                        * cos(radians(COALESCE(u.lat, d.lat_centroid, 34.52)))
                        * cos(radians(COALESCE(u.lng, d.lng_centroid, 69.17)) - radians($patLng))
                        + sin(radians($patLat))
                        * sin(radians(COALESCE(u.lat, d.lat_centroid, 34.52)))
                    )))) AS distance_km
                FROM users u
                JOIN districts d ON d.id = u.district_id
                WHERE u.is_donor    = true
                  AND u.is_available = true
                  AND u.status       = 'active'
                  AND u.blood_type  IN ($btList)
                  $exclude
                  $provFilter
            ) AS sub
            ORDER BY distance_km ASC
            LIMIT " . ($cfg['max_donors'] * 3);

        try {
            $donors = DB::select($sql);
        } catch (\Throwable $e) {
            Log::error("MatchingEngine SQL error: " . $e->getMessage());
            return ['success' => false, 'reason' => 'sql_error'];
        }

        Log::info("MatchingEngine wave $wave | request #{$requestId} status={$br->status} urgency={$br->urgency} province={$br->province_id} compatible=" . implode(',', $compatible) . " same_province=" . ($cfg['same_province'] ? 'yes' : 'no') . " max_donors={$cfg['max_donors']} | found " . count($donors) . " candidate(s)");

        if (empty($donors)) {
            // No available donors this wave — scheduler will escalate next wave.
            // Still set wave_notified_at so the delay is measured from now.
            Log::info("MatchingEngine wave $wave | request #{$requestId} no candidates found. notified_count=" . count($notifiedIds));
            $br->update([
                'current_wave'    => $wave,
                'wave_notified_at' => now(),
                'status'          => $br->status === 'pending' ? 'notified' : $br->status,
            ]);
            return [
                'success' => true,
                'wave' => $wave,
                'donors_notified' => 0,
                'donors_evaluated' => count($donors),
                'reason' => 'no_candidates',
            ];
        }

        $windowEnd = now()->addMinutes(self::RESPONSE_WINDOW[$br->urgency] ?? 360);
        $notified  = 0;

        // Score and pick top N
        $scored = collect($donors)
            ->map(function ($d) use ($br, $cfg) {
                $dist       = max(0.0, (float)($d->distance_km ?? 0));
                $lastActive = $d->last_active_at
                    ? (int)now()->diffInDays(\Carbon\Carbon::parse($d->last_active_at))
                    : 365;
                $proximity   = max(0, 1 - $dist / max($cfg['radius_km'], 1));
                $reliability = min(1.0, max(0.0, (float)($d->reliability_score ?? 0.8)));
                $activity    = $lastActive <= 30  ? 1.0
                    : ($lastActive >= 180 ? 0.0
                        : 1.0 - (($lastActive - 30) / 150.0));
                $exactness   = $d->blood_type === $br->blood_type_needed ? 1.0 : 0.7;
                $d->_score   = round(0.4 * $proximity + 0.3 * $reliability + 0.2 * $activity + 0.1 * $exactness, 4);
                return $d;
            })
            ->sortByDesc('_score')
            ->take($cfg['max_donors'])
            ->values();

        foreach ($scored as $donor) {
            // Race-condition guard
            if (DonorNotification::where('request_id', $requestId)
                ->where('donor_id', $donor->id)->exists()
            ) {
                continue;
            }

            try {
                $dn = DonorNotification::create([
                    'request_id'              => $requestId,
                    'donor_id'                => $donor->id,
                    'wave'                    => $wave,
                    'score'                   => $donor->_score,
                    'response'                => 'pending',
                    'response_window_ends_at' => $windowEnd,
                ]);

                $lang = $donor->language_pref ?? 'fa';
                [$title, $body] = $this->buildMessage($br, $lang);

                InAppNotification::create([
                    'user_id'    => $donor->id,
                    'request_id' => $requestId,
                    'type'       => 'new_blood_request',
                    'title_en'   => "🩸 {$br->blood_type_needed} Blood Needed",
                    'title_fa'   => "🩸 خون {$br->blood_type_needed} مورد نیاز است",
                    'title_ps'   => "🩸 {$br->blood_type_needed} وینه ضروري ده",
                    'body_en'    => "A patient needs {$br->blood_type_needed} blood urgently.",
                    'body_fa'    => "یک بیمار فوری به خون {$br->blood_type_needed} نیاز دارد.",
                    'body_ps'    => "یو ناروغ ته {$br->blood_type_needed} وینې ته اړتیا ده.",
                ]);

                if (!empty($donor->fcm_token) && $this->fcm->isConfigured()) {
                    // Pass notification_id (DonorNotification PK) — the frontend
                    // route is /donate/:notifId which needs this, not request_id.
                    $this->fcm->sendToToken($donor->fcm_token, $title, $body, [
                        'type'            => 'new_blood_request',
                        'request_id'      => (string)$requestId,
                        'notification_id' => (string)$dn->id,
                    ]);
                }

                $notified++;
                Log::info("  → notified donor #{$donor->id} ({$donor->blood_type}) dist={$donor->distance_km}km notif_id={$dn->id}");
            } catch (\Throwable $e) {
                Log::error("MatchingEngine: donor #{$donor->id} failed: " . $e->getMessage());
            }
        }

        $br->update([
            'current_wave'    => $wave,
            'wave_notified_at' => now(),
            'status'          => $br->status === 'pending' ? 'notified' : $br->status,
        ]);

        Log::info("MatchingEngine wave $wave done | #$requestId | notified $notified");

        return ['success' => true, 'wave' => $wave, 'donors_notified' => $notified, 'donors_evaluated' => count($donors)];
    }

    public function processScheduledWaves(): void
    {
        BloodRequest::whereIn('status', ['pending', 'notified'])
            ->where('expires_at', '>', now())
            ->get()
            ->each(function ($br) {
                if ($br->donors_accepted >= $br->units_needed) return;

                $wave = (int)$br->current_wave;

                if ($wave === 0) {
                    $this->runWave($br->id, 1);
                    return;
                }
                if ($wave >= 5) return;

                $delay   = (int)(self::WAVE_DELAY[$br->urgency][(string)$wave] ?? 60);
                // wave_notified_at records when the current wave was dispatched.
                // Using updated_at was wrong: it resets to NOW() on every save
                // (including the save inside runWave), so the elapsed check
                // could never exceed the delay — requests got stuck on wave 1.
                $elapsed = $br->wave_notified_at
                    ? (int)now()->diffInMinutes($br->wave_notified_at)
                    : $delay; // no timestamp yet → treat as overdue → run immediately

                if ($elapsed >= $delay) {
                    $this->runWave($br->id, $wave + 1);
                }
            });
    }

    private function buildMessage(BloodRequest $br, string $lang): array
    {
        $bt = $br->blood_type_needed;
        $ul = [
            'critical' => ['en' => 'CRITICAL', 'fa' => 'بحرانی', 'ps' => 'بحراني'],
            'urgent'  => ['en' => 'Urgent',  'fa' => 'فوری',  'ps' => 'عاجل'],
            'planned' => ['en' => 'Planned', 'fa' => 'برنامه‌ریزی', 'ps' => 'مخکې له وخته']
        ];
        $u  = $ul[$br->urgency][$lang] ?? $br->urgency;
        $t  = ['en' => "🩸 $u: $bt Blood Needed", 'fa' => "🩸 $u: خون $bt مورد نیاز", 'ps' => "🩸 $u: $bt وینه ضروري"];
        $b  = ['en' => "A patient needs $bt blood. Tap to help.", 'fa' => "بیمار به خون $bt نیاز دارد.", 'ps' => "ناروغ ته $bt وینه ضروري ده."];
        return [$t[$lang] ?? $t['en'], $b[$lang] ?? $b['en']];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Acceptance;
use App\Models\BloodRequest;
use App\Models\District;
use App\Models\DonationHistory;
use App\Services\MatchingEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class BloodRequestController extends Controller
{
    public function __construct(private MatchingEngine $engine) {}

    // ── POST /api/requests ───────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'blood_type_needed' => 'required|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'urgency'           => 'required|in:critical,urgent,planned',
            'province_id'       => 'required|integer|exists:provinces,id',
            'district_id'       => 'required|integer|exists:districts,id',
            'units_needed'      => 'sometimes|integer|min:1|max:10',
            'contact_phone'     => 'required|string|min:7|max:20',
            'notes'             => 'nullable|string|max:200',
            'lat'               => 'nullable|numeric|between:-90,90',
            'lng'               => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $userId          = (int) Auth::id();
        $bloodTypeNeeded = $request->input('blood_type_needed');
        $urgency         = $request->input('urgency');
        $districtId      = (int) $request->input('district_id');
        $provinceId      = (int) $request->input('province_id');

        // Duplicate guard — same blood type + district within 2 hours
        $duplicate = BloodRequest::where('requester_id', $userId)
            ->where('blood_type_needed', $bloodTypeNeeded)
            ->where('district_id', $districtId)
            ->whereIn('status', ['pending', 'notified', 'donor_found'])
            ->where('created_at', '>=', now()->subHours(2))
            ->first();

        if ($duplicate) {
            return response()->json([
                'success'             => false,
                'message'             => 'A similar active request already exists.',
                'code'                => 'DUPLICATE_REQUEST',
                'existing_request_id' => $duplicate->id,
            ], 409);
        }

        // Resolve coordinates: use GPS if provided, fall back to district centroid
        // Never store 0,0 — always use real coordinates
        $district = District::find($districtId);
        $lat = $request->filled('lat')
            ? round((float) $request->input('lat'), 3)
            : ($district?->lat_centroid ? (float) $district->lat_centroid : null);
        $lng = $request->filled('lng')
            ? round((float) $request->input('lng'), 3)
            : ($district?->lng_centroid ? (float) $district->lng_centroid : null);

        $expiryMap = ['critical' => 6, 'urgent' => 24, 'planned' => 72];

        $bloodRequest = BloodRequest::create([
            'requester_id'      => $userId,
            'blood_type_needed' => $bloodTypeNeeded,
            'urgency'           => $urgency,
            'province_id'       => $provinceId,
            'district_id'       => $districtId,
            'lat'               => $lat,
            'lng'               => $lng,
            'units_needed'      => (int) $request->input('units_needed', 1),
            'contact_phone'     => $request->input('contact_phone'),
            'notes'             => $request->input('notes'),
            'status'            => 'pending',
            'current_wave'      => 0,
            'donors_accepted'   => 0,
            'expires_at'        => now()->addHours($expiryMap[$urgency]),
        ]);

        Log::info("BloodRequest #{$bloodRequest->id} created: {$bloodTypeNeeded} in district #{$districtId} (lat={$lat}, lng={$lng})");

        // Fire Wave 1 immediately
        $waveResult = null;
        try {
            $waveResult = $this->engine->runWave($bloodRequest->id, 1);
            Log::info("Wave 1 result for #{$bloodRequest->id}: " . json_encode($waveResult));
        } catch (\Throwable $ex) {
            Log::error("Wave 1 failed for #{$bloodRequest->id}: " . $ex->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Blood request submitted! Searching for donors near you...',
            'data'    => [
                'request'     => $bloodRequest->fresh()->load('province', 'district')->toListArray(),
                'wave_result' => $waveResult,
            ],
        ], 201);
    }

    // ── GET /api/requests/my ─────────────────────────────────────────────────
    public function myRequests(Request $request): JsonResponse
    {
        $query = BloodRequest::where('requester_id', Auth::id())
            ->with(['province', 'district']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $paginated = $query->orderByDesc('created_at')
            ->paginate((int) $request->input('per_page', 20));

        $paginated->getCollection()->transform(fn($r) => $r->toListArray());

        return response()->json(['success' => true, 'data' => $paginated]);
    }

    // ── GET /api/requests/{id} ───────────────────────────────────────────────
    public function show(string $id): JsonResponse
    {
        $bloodRequest = BloodRequest::with(['province', 'district'])->find((int) $id);

        if (!$bloodRequest) {
            return response()->json(['success' => false, 'message' => 'Request not found.'], 404);
        }
        if ((int) $bloodRequest->requester_id !== (int) Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Access denied.'], 403);
        }

        $data                  = $bloodRequest->toListArray();
        $data['contact_phone'] = $bloodRequest->contact_phone;

        return response()->json(['success' => true, 'data' => ['request' => $data]]);
    }

    // ── GET /api/requests/{id}/acceptances ───────────────────────────────────
    public function acceptances(string $id): JsonResponse
    {
        $bloodRequest = BloodRequest::find((int) $id);

        if (!$bloodRequest) {
            return response()->json(['success' => false, 'message' => 'Request not found.'], 404);
        }
        if ((int) $bloodRequest->requester_id !== (int) Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Access denied.'], 403);
        }

        $acceptances = Acceptance::where('request_id', (int) $id)
            ->with(['donor.province', 'donor.district'])
            ->get()
            ->map(function ($acc) {
                $donor = $acc->donor;
                return [
                    'id'                => $acc->id,
                    'donor_id'          => $acc->donor_id,
                    'blood_type'        => $donor->blood_type,
                    'full_name'         => $donor->full_name,
                    'phone'             => $donor->phone,
                    'is_verified'       => (bool) $donor->is_verified,
                    'donation_count'    => $donor->donation_count,
                    'reliability_score' => $donor->reliability_score,
                    'province_name'     => $donor->province?->name_en,
                    'district_name'     => $donor->district?->name_en,
                    'accepted_at'       => $acc->created_at->toIso8601String(),
                    'is_fulfilled'      => (bool) $acc->is_fulfilled,
                ];
            });

        return response()->json(['success' => true, 'data' => ['acceptances' => $acceptances]]);
    }

    // ── PATCH /api/requests/{id}/fulfill ─────────────────────────────────────
    public function fulfill(string $id): JsonResponse
    {
        $bloodRequest = BloodRequest::find((int) $id);

        if (!$bloodRequest) {
            return response()->json(['success' => false, 'message' => 'Request not found.'], 404);
        }
        if ((int) $bloodRequest->requester_id !== (int) Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Access denied.'], 403);
        }
        if (!$bloodRequest->isActive()) {
            return response()->json(['success' => false, 'message' => "Cannot fulfill a '{$bloodRequest->status}' request."], 400);
        }

        DB::transaction(function () use ($bloodRequest) {
            $bloodRequest->update(['status' => 'fulfilled', 'fulfilled_at' => now()]);

            Acceptance::where('request_id', $bloodRequest->id)
                ->with('donor')
                ->get()
                ->each(function ($acc) use ($bloodRequest) {
                    $donor = $acc->donor;
                    if (!$donor) return;

                    DonationHistory::create([
                        'donor_id'               => $donor->id,
                        'request_id'             => $bloodRequest->id,
                        'province_id'            => $bloodRequest->province_id,
                        'district_id'            => $bloodRequest->district_id,
                        'blood_type'             => $bloodRequest->blood_type_needed,
                        'confirmed_by_requester' => true,
                        'donated_at'             => now(),
                    ]);

                    $donor->increment('donation_count');
                    $donor->update([
                        'last_donation_at'  => now(),
                        'next_eligible_at'  => now()->addDays(56),
                        'is_available'      => false,
                        'reliability_score' => min(1.0, $donor->reliability_score + 0.05),
                    ]);

                    $acc->update(['is_fulfilled' => true, 'fulfilled_at' => now()]);
                });
        });

        return response()->json(['success' => true, 'message' => 'Request fulfilled. Thank you! 🩸']);
    }

    // ── PATCH /api/requests/{id}/cancel ──────────────────────────────────────
    public function cancel(string $id): JsonResponse
    {
        $bloodRequest = BloodRequest::find((int) $id);

        if (!$bloodRequest) {
            return response()->json(['success' => false, 'message' => 'Request not found.'], 404);
        }
        if ((int) $bloodRequest->requester_id !== (int) Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Access denied.'], 403);
        }
        if (!$bloodRequest->isActive()) {
            return response()->json(['success' => false, 'message' => 'This request cannot be cancelled.'], 400);
        }

        $bloodRequest->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Request cancelled.']);
    }
}

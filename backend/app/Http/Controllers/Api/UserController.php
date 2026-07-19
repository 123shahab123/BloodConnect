<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DonationHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    // ── GET /api/user ────────────────────────────────────────────────────────
    public function me(): JsonResponse
    {
        $user = Auth::user();
        $user->load('province', 'district');
        return response()->json(['success' => true, 'data' => ['user' => $user->toProfileArray()]]);
    }

    // ── PUT /api/user ────────────────────────────────────────────────────────
    public function update(Request $request): JsonResponse
    {
        $user      = Auth::user();
        $validator = Validator::make($request->all(), [
            'full_name'     => 'sometimes|string|min:2|max:60',
            'email'         => 'sometimes|nullable|email|max:255|unique:users,email,' . $user->id,
            'province_id'   => 'sometimes|integer|exists:provinces,id',
            'district_id'   => 'sometimes|integer|exists:districts,id',
            'language_pref' => 'sometimes|in:fa,ps,en',
            'lat'           => 'sometimes|nullable|numeric|between:-90,90',
            'lng'           => 'sometimes|nullable|numeric|between:-180,180',
            'gender'        => 'sometimes|nullable|in:male,female,prefer_not_to_say',
            'fcm_token'     => 'sometimes|nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if (isset($data['lat']) && $data['lat'] !== null)   $data['lat'] = round($data['lat'], 3);
        if (isset($data['lng']) && $data['lng'] !== null)   $data['lng'] = round($data['lng'], 3);
        if (isset($data['email']) && $data['email'] !== null) $data['email'] = strtolower($data['email']);

        $user->update($data);
        $user->fresh()->load('province', 'district');

        return response()->json(['success' => true, 'message' => 'Profile updated.', 'data' => ['user' => $user->fresh()->load('province', 'district')->toProfileArray()]]);
    }

    // ── PATCH /api/user/password ─────────────────────────────────────────────
    public function changePassword(Request $request): JsonResponse
    {
        $user      = Auth::user();
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password'         => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return response()->json(['success' => false, 'message' => 'Current password is incorrect.'], 401);
        }

        $user->update(['password' => $request->input('password')]);
        return response()->json(['success' => true, 'message' => 'Password changed successfully.']);
    }

    // ── PATCH /api/user/availability ─────────────────────────────────────────
    public function updateAvailability(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->is_donor) {
            return response()->json(['success' => false, 'message' => 'Only registered donors can update availability.'], 403);
        }

        $validator = Validator::make($request->all(), ['is_available' => 'required|boolean']);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'is_available (true/false) is required.'], 422);
        }

        $isAvailable = $request->boolean('is_available');

        if ($isAvailable && !$user->isEligibleToDonate()) {
            return response()->json([
                'success'             => false,
                'message'             => "Not yet eligible. {$user->daysUntilEligible()} day(s) remaining.",
                'code'                => 'DONATION_COOLDOWN',
                'next_eligible_at'    => $user->next_eligible_at?->toIso8601String(),
                'days_until_eligible' => $user->daysUntilEligible(),
            ], 400);
        }

        $user->update(['is_available' => $isAvailable]);

        return response()->json([
            'success' => true,
            'message' => $isAvailable ? 'You are now available for donation! 🩸' : 'You are now unavailable.',
            'data'    => ['is_available' => $isAvailable],
        ]);
    }

    // ── PATCH /api/user/fcm-token ─────────────────────────────────────────────
    public function updateFcmToken(Request $request): JsonResponse
    {
        // 'token' must be present, but nullable — sending { token: null }
        // is how the frontend clears a stale/revoked registration.
        $validator = Validator::make($request->all(), ['token' => 'present|nullable|string']);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'FCM token is required.'], 422);
        }
        Auth::user()->update(['fcm_token' => $request->input('token')]);
        return response()->json(['success' => true, 'message' => 'Push notification token registered.']);
    }

    // ── GET /api/user/donation-history ───────────────────────────────────────
    public function donationHistory(Request $request): JsonResponse
    {
        $history = DonationHistory::where('donor_id', Auth::id())
            ->with(['province', 'district'])
            ->orderByDesc('donated_at')
            ->paginate((int) $request->input('per_page', 20));

        $history->getCollection()->transform(fn($d) => [
            'id'                     => $d->id,
            'request_id'             => $d->request_id,
            'blood_type'             => $d->blood_type,
            'province_name'          => $d->province?->name_en,
            'district_name'          => $d->district?->name_en,
            'confirmed_by_requester' => $d->confirmed_by_requester,
            'donated_at'             => $d->donated_at->toIso8601String(),
        ]);

        return response()->json(['success' => true, 'data' => $history]);
    }
}

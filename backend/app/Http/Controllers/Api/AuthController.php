<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class AuthController extends Controller
{
    /** Normalize Afghan phone numbers to +93XXXXXXXXX */
    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[\s\-\(\)]/', '', $phone);
        if (str_starts_with($phone, '00'))  $phone = '+' . substr($phone, 2);
        if (str_starts_with($phone, '0'))   $phone = '+93' . substr($phone, 1);
        if (!str_starts_with($phone, '+'))  $phone = '+93' . $phone;
        return $phone;
    }

    // ── POST /api/auth/register ──────────────────────────────────────────────
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone'         => 'required|string|min:7|max:15',
            'password'      => 'required|string|min:6|confirmed',
            'full_name'     => 'required|string|min:2|max:60',
            'blood_type'    => 'required|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'province_id'   => 'required|integer|exists:provinces,id',
            'district_id'   => 'required|integer|exists:districts,id',
            'age'           => 'required|integer|min:16|max:80',
            'email'         => 'nullable|email|max:255',
            'gender'        => 'nullable|in:male,female,prefer_not_to_say',
            'is_donor'      => 'boolean',
            'language_pref' => 'nullable|in:fa,ps,en',
            'lat'           => 'nullable|numeric|between:-90,90',
            'lng'           => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $phone    = $this->normalizePhone($request->input('phone'));
        $isDonor  = $request->boolean('is_donor', false);
        $age      = (int) $request->input('age');

        if (User::where('phone', $phone)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'This phone number is already registered. Please log in.',
                'code'    => 'PHONE_TAKEN',
            ], 422);
        }

        $email = $request->filled('email') ? strtolower(trim($request->input('email'))) : null;
        if ($email && User::where('email', $email)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'This email address is already in use.',
                'code'    => 'EMAIL_TAKEN',
            ], 422);
        }

        if ($isDonor && ($age < 18 || $age > 65)) {
            return response()->json([
                'success' => false,
                'message' => 'Donors must be between 18 and 65 years old.',
            ], 422);
        }

        $user = User::create([
            'phone'             => $phone,
            'email'             => $email,
            'password'          => $request->input('password'),
            'full_name'         => trim($request->input('full_name')),
            'blood_type'        => $request->input('blood_type'),
            'province_id'       => (int) $request->input('province_id'),
            'district_id'       => (int) $request->input('district_id'),
            'age'               => $age,
            'gender'            => $request->input('gender'),
            'is_donor'          => $isDonor,
            'is_available'      => $isDonor,
            'language_pref'     => $request->input('language_pref', 'fa'),
            'lat'               => $request->filled('lat')
                                    ? round((float) $request->input('lat'), 3)
                                    : (float)(\App\Models\District::find((int)$request->input('district_id'))?->lat_centroid ?? 0),
            'lng'               => $request->filled('lng')
                                    ? round((float) $request->input('lng'), 3)
                                    : (float)(\App\Models\District::find((int)$request->input('district_id'))?->lng_centroid ?? 0),
            'status'            => 'active',
            'donation_count'    => 0,
            'reliability_score' => 0.80,
            'last_active_at'    => now(),
        ]);

        $token = JWTAuth::fromUser($user);
        $user->load('province', 'district');

        return response()->json([
            'success' => true,
            'message' => 'Welcome to BloodConnect! 🩸',
            'data'    => [
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'expires_in'   => (int) config('jwt.ttl', 20160) * 60,
                'user'         => $user->toProfileArray(),
            ],
        ], 201);
    }

    // ── POST /api/auth/login ─────────────────────────────────────────────────
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone'    => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Phone number and password are required.',
            ], 422);
        }

        $phone = $this->normalizePhone($request->input('phone'));
        $user  = User::where('phone', $phone)->first();

        if (!$user || !Hash::check($request->input('password'), $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect phone number or password.',
            ], 401);
        }

        if ($user->status === 'banned') {
            return response()->json(['success' => false, 'message' => 'Your account has been permanently banned.', 'code' => 'BANNED'], 403);
        }

        if ($user->status === 'deactivated') {
            return response()->json(['success' => false, 'message' => 'Your account is deactivated.', 'code' => 'DEACTIVATED'], 403);
        }

        if ($user->status === 'suspended') {
            if ($user->suspend_until && now()->lt($user->suspend_until)) {
                return response()->json([
                    'success'       => false,
                    'message'       => 'Account suspended until ' . $user->suspend_until->toDateString() . '. Reason: ' . $user->suspend_reason,
                    'code'          => 'SUSPENDED',
                    'suspend_until' => $user->suspend_until->toIso8601String(),
                ], 403);
            }
            $user->update(['status' => 'active', 'suspend_until' => null, 'suspend_reason' => null]);
        }

        $token = JWTAuth::fromUser($user);
        $user->update(['last_active_at' => now()]);
        $user->load('province', 'district');

        return response()->json([
            'success' => true,
            'message' => 'Welcome back!',
            'data'    => [
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'expires_in'   => (int) config('jwt.ttl', 20160) * 60,
                'user'         => $user->toProfileArray(),
            ],
        ]);
    }

    // ── POST /api/auth/logout ────────────────────────────────────────────────
    public function logout(): JsonResponse
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (JWTException $e) {
            // already invalid — fine
        }
        return response()->json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    // ── POST /api/auth/refresh ───────────────────────────────────────────────
    public function refresh(): JsonResponse
    {
        try {
            $newToken = JWTAuth::refresh(JWTAuth::getToken());
            $user     = JWTAuth::setToken($newToken)->toUser();
            $user->load('province', 'district');

            return response()->json([
                'success' => true,
                'data'    => [
                    'access_token' => $newToken,
                    'token_type'   => 'Bearer',
                    'expires_in'   => (int) config('jwt.ttl', 20160) * 60,
                    'user'         => $user->toProfileArray(),
                ],
            ]);
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Session expired. Please log in again.',
                'code'    => 'TOKEN_INVALID',
            ], 401);
        }
    }
}

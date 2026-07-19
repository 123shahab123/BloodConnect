<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\GeoController;
use App\Http\Controllers\Api\BloodRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AdminController;

// ── Handle ALL CORS preflight OPTIONS requests ───────────────────────────────
Route::options('{any}', fn() => response('', 204))->where('any', '.*');

// ── Health check ─────────────────────────────────────────────────────────────
Route::get('/health', fn() => response()->json([
    'success'   => true,
    'message'   => 'BloodConnect API is running 🩸',
    'version'   => '2.0-laravel',
    'timestamp' => now()->toIso8601String(),
]));

// ── Auth (public) ─────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
    Route::post('/refresh',  [AuthController::class, 'refresh'])->middleware('jwt');
    Route::post('/logout',   [AuthController::class, 'logout'])->middleware('jwt');
});

// ── Geographic data (public) ──────────────────────────────────────────────────
Route::prefix('geo')->group(function () {
    Route::get('/provinces',            [GeoController::class, 'provinces']);
    Route::get('/districts/{province}', [GeoController::class, 'districts']);
});

// ── Authenticated user routes ─────────────────────────────────────────────────
Route::middleware('jwt')->group(function () {

    Route::prefix('user')->group(function () {
        Route::get('/',                  [UserController::class, 'me']);
        Route::put('/',                  [UserController::class, 'update']);
        Route::patch('/password',        [UserController::class, 'changePassword']);
        Route::patch('/availability',    [UserController::class, 'updateAvailability']);
        Route::patch('/fcm-token',       [UserController::class, 'updateFcmToken']);
        Route::get('/donation-history',  [UserController::class, 'donationHistory']);
    });

    Route::prefix('requests')->group(function () {
        Route::post('/',                    [BloodRequestController::class, 'store']);
        Route::get('/my',                   [BloodRequestController::class, 'myRequests']);
        Route::get('/{id}',                 [BloodRequestController::class, 'show']);
        Route::get('/{id}/acceptances',     [BloodRequestController::class, 'acceptances']);
        Route::patch('/{id}/fulfill',       [BloodRequestController::class, 'fulfill']);
        Route::patch('/{id}/cancel',        [BloodRequestController::class, 'cancel']);
    });

    // IMPORTANT: static routes (inbox, incoming) must be before parameterized /{id}
    Route::prefix('notifications')->group(function () {
        Route::get('/incoming',             [NotificationController::class, 'incoming']);
        Route::get('/inbox',                [NotificationController::class, 'inbox']);
        Route::patch('/inbox/read-all',     [NotificationController::class, 'markAllRead']);
        Route::get('/{id}/detail',          [NotificationController::class, 'detail']);
        Route::post('/{id}/respond',        [NotificationController::class, 'respond']);
    });
});

// ── Admin routes ──────────────────────────────────────────────────────────────
Route::prefix('admin')->group(function () {
    Route::post('/login', [AdminController::class, 'login']);

    Route::middleware('admin')->group(function () {
        Route::get('/dashboard',               [AdminController::class, 'dashboard']);
        Route::get('/users',                   [AdminController::class, 'users']);
        Route::get('/users/{id}',              [AdminController::class, 'userDetail']);
        Route::patch('/users/{id}/suspend',    [AdminController::class, 'suspendUser']);
        Route::patch('/users/{id}/unsuspend',  [AdminController::class, 'unsuspendUser']);
        Route::patch('/users/{id}/ban',        [AdminController::class, 'banUser']);
        Route::patch('/users/{id}/verify',     [AdminController::class, 'verifyDonor']);
        Route::get('/requests',                [AdminController::class, 'requests']);
        Route::post('/requests/{id}/escalate', [AdminController::class, 'escalateRequest']);
        Route::patch('/requests/{id}/cancel',  [AdminController::class, 'cancelRequest']);
        Route::get('/analytics',               [AdminController::class, 'analytics']);
        Route::get('/config',                  [AdminController::class, 'getConfig']);
        Route::put('/config',                  [AdminController::class, 'updateConfig']);
        Route::post('/broadcast',              [AdminController::class, 'broadcast']);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Scheduler trigger — for free external cron services (Render's own Cron
// Jobs have no free tier). Protected by a shared secret so it can't be
// abused by anyone who discovers the URL. Point a free service like
// cron-job.org at this URL every 1-5 minutes.
// ─────────────────────────────────────────────────────────────────────────
Route::match(['get', 'post'], '/cron/run-scheduler', function (\Illuminate\Http\Request $request) {
    if ($request->query('token') !== config('app.cron_secret')) {
        abort(403, 'Invalid cron token');
    }

    \Illuminate\Support\Facades\Artisan::call('schedule:run');

    return response()->json([
        'ok'     => true,
        'output' => \Illuminate\Support\Facades\Artisan::output(),
        'ran_at' => now()->toIso8601String(),
    ]);
});

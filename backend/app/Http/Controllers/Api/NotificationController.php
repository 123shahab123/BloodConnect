<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BloodRequest;
use App\Models\DonorNotification;
use App\Models\Acceptance;
use App\Models\InAppNotification;
use App\Services\FcmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function __construct(private FcmService $fcm) {}

    // ─── GET /api/notifications/incoming ────────────────────────────────────
    public function incoming(): JsonResponse
    {
        $userId = Auth::id();

        $notifications = DonorNotification::where('donor_id', $userId)
            ->where('response', 'pending')
            ->where('response_window_ends_at', '>', now())
            ->whereHas('request', function ($q) {
                $q->whereIn('status', ['pending', 'notified', 'donor_found']);
            })
            ->with(['request.province', 'request.district'])
            ->get()
            ->sortBy(function ($n) {
                return match ($n->request->urgency ?? '') {
                    'critical' => 0,
                    'urgent'   => 1,
                    default    => 2,
                };
            })
            ->values()
            ->map(function ($n) {
                $req = $n->request;
                return [
                    'id'                      => $n->id,
                    'request_id'              => $n->request_id,
                    'wave'                    => $n->wave,
                    'score'                   => $n->score,
                    'response'                => $n->response,
                    'response_window_ends_at' => $n->response_window_ends_at->toIso8601String(),
                    'notified_at'             => $n->created_at->toIso8601String(),
                    'blood_type_needed'       => $req->blood_type_needed,
                    'urgency'                 => $req->urgency,
                    'notes'                   => $req->notes,
                    'request_status'          => $req->status,
                    'units_needed'            => $req->units_needed,
                    'province_name'           => $req->province?->name_en,
                    'province_name_fa'        => $req->province?->name_fa,
                    'province_name_ps'        => $req->province?->name_ps,
                    'district_name'           => $req->district?->name_en,
                    'district_name_fa'        => $req->district?->name_fa,
                    'district_name_ps'        => $req->district?->name_ps,
                ];
            });

        return response()->json([
            'success' => true,
            'data'    => ['notifications' => $notifications, 'count' => $notifications->count()],
        ]);
    }

    // ─── GET /api/notifications/{id}/detail ─────────────────────────────────
    public function detail(string $id): JsonResponse
    {
        $notifId = (int) $id;
        $userId  = Auth::id();

        $notification = DonorNotification::where('donor_id', $userId)
            ->with(['request.province', 'request.district'])
            ->find($notifId);

        if (! $notification) {
            return response()->json(['success' => false, 'message' => 'Notification not found.'], 404);
        }

        $req = $notification->request;

        return response()->json([
            'success' => true,
            'data'    => [
                'notification' => [
                    'id'                      => $notification->id,
                    'wave'                    => $notification->wave,
                    'response'                => $notification->response,
                    'response_window_ends_at' => $notification->response_window_ends_at->toIso8601String(),
                    'score'                   => $notification->score,
                ],
                'request' => [
                    'id'                => $req->id,
                    'blood_type_needed' => $req->blood_type_needed,
                    'urgency'           => $req->urgency,
                    'notes'             => $req->notes,
                    'units_needed'      => $req->units_needed,
                    'donors_accepted'   => $req->donors_accepted,
                    'status'            => $req->status,
                    'province_id'       => $req->province_id,
                    'district_id'       => $req->district_id,
                    'province_name'     => [
                        'en' => $req->province?->name_en,
                        'fa' => $req->province?->name_fa,
                        'ps' => $req->province?->name_ps,
                    ],
                    'district_name'     => [
                        'en' => $req->district?->name_en,
                        'fa' => $req->district?->name_fa,
                        'ps' => $req->district?->name_ps,
                    ],
                ],
            ],
        ]);
    }

    // ─── POST /api/notifications/{id}/respond ───────────────────────────────
    public function respond(string $id, Request $request): JsonResponse
    {
        $request->validate(['response' => 'required|in:accepted,declined']);

        $notifId = (int) $id;
        $user    = Auth::user();

        if (! $user->is_donor) {
            return response()->json(['success' => false, 'message' => 'Only donors can respond to requests.'], 403);
        }

        $notification = DonorNotification::where('donor_id', $user->id)->find($notifId);

        if (! $notification) {
            return response()->json(['success' => false, 'message' => 'Notification not found.'], 404);
        }

        if ($notification->response !== 'pending') {
            return response()->json(['success' => false, 'message' => 'You have already responded to this request.'], 400);
        }

        if ($notification->response_window_ends_at->isPast()) {
            return response()->json(['success' => false, 'message' => 'The response window has expired.'], 400);
        }

        $bloodRequest = BloodRequest::find($notification->request_id);

        if (! $bloodRequest || ! $bloodRequest->isActive()) {
            return response()->json(['success' => false, 'message' => 'This request is no longer active.'], 400);
        }

        $isAccepted = $request->input('response') === 'accepted';

        try {
            DB::transaction(function () use ($notification, $bloodRequest, $user, $isAccepted) {
                $notification->update([
                    'response'     => $isAccepted ? 'accepted' : 'declined',
                    'responded_at' => now(),
                ]);

                if ($isAccepted) {
                    if ($bloodRequest->donors_accepted >= $bloodRequest->units_needed) {
                        throw new \RuntimeException('This request has already been fulfilled by other donors.');
                    }

                    Acceptance::firstOrCreate(
                        ['request_id' => $bloodRequest->id, 'donor_id' => $user->id],
                        ['notification_id' => $notification->id]
                    );

                    $newCount = $bloodRequest->donors_accepted + 1;
                    $bloodRequest->update([
                        'donors_accepted' => $newCount,
                        'status'          => $newCount >= $bloodRequest->units_needed
                            ? 'donor_found'
                            : 'notified',
                    ]);

                    // Notify requester via in-app
                    InAppNotification::create([
                        'user_id'    => $bloodRequest->requester_id,
                        'request_id' => $bloodRequest->id,
                        'type'       => 'donor_accepted',
                        'title_en'   => 'Donor Found! 🩸',
                        'title_fa'   => 'اهداکننده یافت شد! 🩸',
                        'body_en'    => "A donor has accepted your {$bloodRequest->blood_type_needed} blood request. Check your request for contact details.",
                        'body_fa'    => "یک اهداکننده درخواست خون {$bloodRequest->blood_type_needed} شما را پذیرفت.",
                    ]);

                    // FCM push to requester
                    $requester = $bloodRequest->requester;
                    if ($requester?->fcm_token) {
                        $lang  = $requester->language_pref ?? 'fa';
                        $title = $lang === 'en' ? 'Donor Found! 🩸' : 'اهداکننده یافت شد! 🩸';
                        $body  = $lang === 'en'
                            ? "A donor accepted your {$bloodRequest->blood_type_needed} request."
                            : "یک اهداکننده درخواست خون {$bloodRequest->blood_type_needed} شما را پذیرفت.";

                        $this->fcm->sendToToken($requester->fcm_token, $title, $body, [
                            'type'       => 'donor_accepted',
                            'request_id' => (string) $bloodRequest->id,
                        ]);
                    }
                } else {
                    // Slight reliability penalty for declining
                    $user->update([
                        'reliability_score' => max(0.0, $user->reliability_score - 0.01),
                    ]);
                }
            });
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }

        return response()->json([
            'success' => true,
            'message' => $isAccepted
                ? 'Thank you! The requester has been notified. 🤝'
                : 'Response recorded. We will notify other donors.',
        ]);
    }

    // ─── GET /api/notifications/inbox ───────────────────────────────────────
    public function inbox(Request $request): JsonResponse
    {
        $userId        = Auth::id();
        $notifications = InAppNotification::where('user_id', $userId)
            ->where('created_at', '>=', now()->subDays(30))
            ->orderByDesc('created_at')
            ->paginate((int) $request->input('per_page', 20));

        $unread = InAppNotification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data'    => ['notifications' => $notifications, 'unread' => $unread],
        ]);
    }

    // ─── PATCH /api/notifications/inbox/read-all ────────────────────────────
    public function markAllRead(): JsonResponse
    {
        InAppNotification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['success' => true, 'message' => 'All notifications marked as read.']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{User, Admin, BloodRequest, DonationHistory, AuditLog, SystemConfig, InAppNotification};
use App\Services\{MatchingEngine, FcmService};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Hash, Validator, DB};

class AdminController extends Controller
{
    public function __construct(private MatchingEngine $engine, private FcmService $fcm) {}

    // ─── Auth ────────────────────────────────────────────────────────────────

    /** POST /api/admin/login */
    public function login(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);
        if ($v->fails()) {
            return response()->json(['success' => false, 'message' => 'Email and password are required.'], 422);
        }

        $admin = Admin::where('email', strtolower($request->email))->where('is_active', true)->first();

        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid credentials.'], 401);
        }

        $token = \Tymon\JWTAuth\Facades\JWTAuth::fromUser($admin);
        $admin->update(['last_login_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => [
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'admin'        => ['id' => $admin->id, 'email' => $admin->email, 'full_name' => $admin->full_name, 'role' => $admin->role],
            ],
        ]);
    }

    // ─── Dashboard ───────────────────────────────────────────────────────────

    /** GET /api/admin/dashboard */
    public function dashboard(): JsonResponse
    {
        $users = [
            'total'       => User::count(),
            'donors'      => User::where('is_donor', true)->count(),
            'active'      => User::where('status', 'active')->count(),
            'new_today'   => User::whereDate('created_at', today())->count(),
            'new_this_week' => User::where('created_at', '>=', now()->subDays(7))->count(),
        ];

        $donorsActiveNow = User::where('is_donor', true)->where('is_available', true)->where('status', 'active')->count();

        $byStatus = BloodRequest::selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status');

        $requestsToday    = BloodRequest::whereDate('created_at', today())->count();
        $requestsThisWeek = BloodRequest::where('created_at', '>=', now()->subDays(7))->count();

        $fulfillmentRate = round(100 * (BloodRequest::where('status', 'fulfilled')->where('created_at', '>=', now()->subDays(30))->count())
            / max(1, BloodRequest::where('created_at', '>=', now()->subDays(30))->count()), 1);

        $avgMinutes = (int) DB::table('acceptances')
            ->join('blood_requests', 'acceptances.request_id', '=', 'blood_requests.id')
            ->where('acceptances.created_at', '>=', now()->subDays(7))
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, blood_requests.created_at, acceptances.created_at)) as avg_min')
            ->value('avg_min') ?? 0;

        $byBloodType = BloodRequest::where('created_at', '>=', now()->subDays(30))
            ->selectRaw('blood_type_needed, count(*) as count')
            ->groupBy('blood_type_needed')->orderByDesc('count')->get();

        $byProvince = BloodRequest::where('blood_requests.created_at', '>=', now()->subDays(30))
            ->join('provinces', 'blood_requests.province_id', '=', 'provinces.id')
            ->selectRaw('provinces.name_en, count(*) as count')
            ->groupBy('provinces.id', 'provinces.name_en')->orderByDesc('count')->limit(10)->get();

        $daily = BloodRequest::where('created_at', '>=', now()->subDays(14)->startOfDay())
            ->selectRaw('DATE(created_at) as date, count(*) as count')
            ->groupBy('date')->orderBy('date')->get();

        return response()->json(['success' => true, 'data' => [
            'users'   => $users,
            'donors'  => ['active_now' => $donorsActiveNow],
            'requests'=> [
                'by_status'                 => $byStatus,
                'today'                     => $requestsToday,
                'this_week'                 => $requestsThisWeek,
                'fulfillment_rate'          => $fulfillmentRate,
                'avg_minutes_to_first_donor'=> $avgMinutes,
            ],
            'analytics' => ['by_blood_type' => $byBloodType, 'by_province' => $byProvince, 'daily_requests' => $daily],
            'fcm_configured' => $this->fcm->isConfigured(),
        ]]);
    }

    // ─── User Management ─────────────────────────────────────────────────────

    /** GET /api/admin/users */
    public function users(Request $request): JsonResponse
    {
        $q = User::with('province', 'district');

        if ($request->filled('search')) {
            $s = $request->search;
            $q->where(fn($w) => $w->where('phone', 'like', "%$s%")->orWhere('full_name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")->orWhere('id', $s));
        }
        if ($request->filled('blood_type'))  $q->where('blood_type', $request->blood_type);
        if ($request->filled('province_id')) $q->where('province_id', $request->province_id);
        if ($request->filled('status'))      $q->where('status', $request->status);
        if ($request->filled('is_donor'))    $q->where('is_donor', $request->boolean('is_donor'));

        $sortBy  = in_array($request->get('sort_by'), ['created_at','donation_count','last_active_at','reliability_score']) ? $request->sort_by : 'created_at';
        $sortDir = $request->get('sort_dir') === 'ASC' ? 'asc' : 'desc';

        $users = $q->orderBy($sortBy, $sortDir)->paginate((int) $request->get('per_page', 25));

        $users->getCollection()->transform(fn($u) => [
            'id'                => $u->id,
            'phone'             => $u->phone,
            'email'             => $u->email,
            'full_name'         => $u->full_name,
            'blood_type'        => $u->blood_type,
            'province_id'       => $u->province_id,
            'province_name'     => $u->province?->name_en,
            'district_name'     => $u->district?->name_en,
            'is_donor'          => $u->is_donor,
            'is_available'      => $u->is_available,
            'donation_count'    => $u->donation_count,
            'reliability_score' => $u->reliability_score,
            'status'            => $u->status,
            'is_verified'       => $u->is_verified,
            'age'               => $u->age,
            'gender'            => $u->gender,
            'language_pref'     => $u->language_pref,
            'created_at'        => $u->created_at->toIso8601String(),
            'last_active_at'    => $u->last_active_at?->toIso8601String(),
        ]);

        return response()->json(['success' => true, 'data' => $users]);
    }

    /** GET /api/admin/users/{id} */
    public function userDetail(int $id): JsonResponse
    {
        $user = User::with('province', 'district')->findOrFail($id);

        $donationHistory = DonationHistory::where('donor_id', $id)->orderByDesc('donated_at')->limit(10)->get();
        $requestHistory  = BloodRequest::where('requester_id', $id)
            ->select('id','blood_type_needed','urgency','status','created_at')->orderByDesc('created_at')->limit(10)->get();
        $auditLogs = AuditLog::where('target_type', 'user')->where('target_id', $id)
            ->with('admin')->orderByDesc('created_at')->limit(20)->get()
            ->map(fn($l) => ['action'=>$l->action,'metadata'=>$l->metadata,'admin_email'=>$l->admin?->email,'created_at'=>$l->created_at->toIso8601String()]);

        return response()->json(['success' => true, 'data' => [
            'user' => $user->toProfileArray() + ['phone'=>$user->phone,'email'=>$user->email,'suspend_until'=>$user->suspend_until?->toIso8601String(),'suspend_reason'=>$user->suspend_reason],
            'donation_history' => $donationHistory,
            'request_history'  => $requestHistory,
            'audit_logs'       => $auditLogs,
        ]]);
    }

    /** PATCH /api/admin/users/{id}/suspend */
    public function suspendUser(int $id, Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), ['days' => 'required|integer|min:1|max:30', 'reason' => 'required|string|max:255']);
        if ($v->fails()) return response()->json(['success'=>false,'message'=>$v->errors()->first()], 422);

        $user = User::findOrFail($id);
        $user->update(['status'=>'suspended','suspend_until'=>now()->addDays($request->days),'suspend_reason'=>$request->reason]);

        $this->logAudit($request, 'suspend_user', 'user', $id, ['days'=>$request->days,'reason'=>$request->reason]);

        return response()->json(['success'=>true,'message'=>"User suspended for {$request->days} day(s)."]);
    }

    /** PATCH /api/admin/users/{id}/unsuspend */
    public function unsuspendUser(int $id, Request $request): JsonResponse
    {
        User::findOrFail($id)->update(['status'=>'active','suspend_until'=>null,'suspend_reason'=>null]);
        $this->logAudit($request, 'unsuspend_user', 'user', $id, []);
        return response()->json(['success'=>true,'message'=>'User unsuspended.']);
    }

    /** PATCH /api/admin/users/{id}/ban */
    public function banUser(int $id, Request $request): JsonResponse
    {
        if (($request->admin->role ?? null) !== 'super_admin') {
            return response()->json(['success'=>false,'message'=>'Super admin access required.'], 403);
        }
        $v = Validator::make($request->all(), ['reason'=>'required|string|max:255']);
        if ($v->fails()) return response()->json(['success'=>false,'message'=>$v->errors()->first()], 422);

        User::findOrFail($id)->update(['status'=>'banned','suspend_reason'=>$request->reason]);
        $this->logAudit($request, 'ban_user', 'user', $id, ['reason'=>$request->reason]);
        return response()->json(['success'=>true,'message'=>'User permanently banned.']);
    }

    /** PATCH /api/admin/users/{id}/verify */
    public function verifyDonor(int $id, Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), ['verified'=>'required|boolean']);
        if ($v->fails()) return response()->json(['success'=>false,'message'=>'verified (boolean) is required.'], 422);

        $verified = $request->boolean('verified');
        User::findOrFail($id)->update(['is_verified'=>$verified]);
        $this->logAudit($request, $verified ? 'verify_donor' : 'unverify_donor', 'user', $id, []);
        return response()->json(['success'=>true,'message'=>'Donor verification updated.']);
    }

    // ─── Request Management ──────────────────────────────────────────────────

    /** GET /api/admin/requests */
    public function requests(Request $request): JsonResponse
    {
        $q = BloodRequest::with('province', 'district');
        if ($request->filled('status'))     $q->where('status', $request->status);
        if ($request->filled('blood_type')) $q->where('blood_type_needed', $request->blood_type);
        if ($request->filled('province_id'))$q->where('province_id', $request->province_id);
        if ($request->filled('urgency'))    $q->where('urgency', $request->urgency);

        $requests = $q->orderByRaw("CASE urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at')
            ->paginate((int) $request->get('per_page', 25));

        $requests->getCollection()->transform(fn($r) => [
            'id'               => $r->id,
            'blood_type_needed'=> $r->blood_type_needed,
            'urgency'          => $r->urgency,
            'status'           => $r->status,
            'units_needed'     => $r->units_needed,
            'donors_accepted'  => $r->donors_accepted,
            'current_wave'     => $r->current_wave,
            'province_name'    => $r->province?->name_en,
            'district_name'    => $r->district?->name_en,
            'requester_id'     => $r->requester_id,
            'created_at'       => $r->created_at->toIso8601String(),
            'expires_at'       => $r->expires_at->toIso8601String(),
        ]);

        return response()->json(['success' => true, 'data' => $requests]);
    }

    /** POST /api/admin/requests/{id}/escalate */
    public function escalateRequest(int $id, Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), ['wave' => 'required|integer|min:1|max:5']);
        if ($v->fails()) return response()->json(['success'=>false,'message'=>'wave (1-5) is required.'], 422);

        $br = BloodRequest::findOrFail($id);
        $br->update(['current_wave' => $request->wave - 1]);
        $result = $this->engine->runWave($id, (int) $request->wave);

        $this->logAudit($request, 'escalate_request', 'request', $id, ['wave'=>$request->wave]);

        return response()->json(['success' => true, 'message' => "Request escalated to Wave {$request->wave}.", 'data' => $result]);
    }

    /** PATCH /api/admin/requests/{id}/cancel */
    public function cancelRequest(int $id, Request $request): JsonResponse
    {
        $br = BloodRequest::findOrFail($id);
        $br->update(['status'=>'cancelled','cancelled_at'=>now()]);
        $this->logAudit($request, 'cancel_request', 'request', $id, ['reason'=>$request->reason ?? null]);
        return response()->json(['success'=>true,'message'=>'Request cancelled.']);
    }

    // ─── Analytics ────────────────────────────────────────────────────────────

    /** GET /api/admin/analytics */
    public function analytics(Request $request): JsonResponse
    {
        $days = match ($request->get('period')) { '7d'=>7, '90d'=>90, default=>30 };

        $userGrowth = User::where('created_at', '>=', now()->subDays($days)->startOfDay())
            ->selectRaw('DATE(created_at) as date, count(*) as count')->groupBy('date')->orderBy('date')->get();

        $requestsByType = BloodRequest::where('created_at', '>=', now()->subDays($days))
            ->selectRaw('blood_type_needed, urgency, count(*) as count, sum(case when status="fulfilled" then 1 else 0 end) as fulfilled')
            ->groupBy('blood_type_needed','urgency')->get();

        $requestsByProvince = BloodRequest::where('blood_requests.created_at', '>=', now()->subDays($days))
            ->join('provinces', 'blood_requests.province_id', '=', 'provinces.id')
            ->selectRaw('provinces.name_en, count(*) as total, sum(case when blood_requests.status="fulfilled" then 1 else 0 end) as fulfilled')
            ->groupBy('provinces.id', 'provinces.name_en')->orderByDesc('total')->get();

        $topDonors = User::where('is_donor', true)
            ->with('province')
            ->orderByDesc('donation_count')
            ->limit(10)
            ->get()
            ->map(fn($u) => [
                'id'=>$u->id,'full_name'=>$u->full_name,'blood_type'=>$u->blood_type,
                'donation_count'=>$u->donation_count,'reliability_score'=>$u->reliability_score,
                'last_donation_at'=>$u->last_donation_at?->toIso8601String(),'province'=>$u->province?->name_en,
            ]);

        return response()->json(['success' => true, 'data' => [
            'user_growth'          => $userGrowth,
            'requests_by_type'     => $requestsByType,
            'requests_by_province' => $requestsByProvince,
            'top_donors'           => $topDonors,
        ]]);
    }

    // ─── System Config ────────────────────────────────────────────────────────

    /** GET /api/admin/config */
    public function getConfig(): JsonResponse
    {
        $config = SystemConfig::all()->pluck('value', 'key');
        return response()->json(['success' => true, 'data' => ['config' => $config]]);
    }

    /** PUT /api/admin/config */
    public function updateConfig(Request $request): JsonResponse
    {
        if (($request->admin->role ?? null) !== 'super_admin') {
            return response()->json(['success'=>false,'message'=>'Super admin access required.'], 403);
        }
        $v = Validator::make($request->all(), ['updates' => 'required|array']);
        if ($v->fails()) return response()->json(['success'=>false,'message'=>'updates object is required.'], 422);

        foreach ($request->updates as $key => $value) {
            SystemConfig::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        }

        $this->logAudit($request, 'update_config', 'system', null, ['keys' => array_keys($request->updates)]);

        return response()->json(['success' => true, 'message' => 'Configuration updated.']);
    }

    // ─── Broadcast (FCM) ──────────────────────────────────────────────────────

    /** POST /api/admin/broadcast — sends in-app + push notification to filtered users */
    public function broadcast(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'title_en' => 'required|string|max:200',
            'title_fa' => 'nullable|string|max:200',
            'title_ps' => 'nullable|string|max:200',
            'body_en'  => 'required|string|max:500',
            'body_fa'  => 'nullable|string|max:500',
            'body_ps'  => 'nullable|string|max:500',
            'filter'   => 'nullable|array',
        ]);
        if ($v->fails()) return response()->json(['success'=>false,'message'=>$v->errors()->first()], 422);

        $q = User::where('status', 'active');
        $filter = $request->filter ?? [];
        if (! empty($filter['blood_type']))  $q->where('blood_type', $filter['blood_type']);
        if (! empty($filter['province_id'])) $q->where('province_id', $filter['province_id']);
        if (! empty($filter['is_donor']))    $q->where('is_donor', true);

        $titleEn = $request->title_en;
        $titleFa = $request->title_fa ?? $titleEn;
        $titlePs = $request->title_ps ?? $titleFa;
        $bodyEn  = $request->body_en;
        $bodyFa  = $request->body_fa ?? $bodyEn;
        $bodyPs  = $request->body_ps ?? $bodyFa;

        $count = 0;
        $tokens = [];

        $q->chunk(200, function ($users) use (&$count, &$tokens, $titleEn, $titleFa, $titlePs, $bodyEn, $bodyFa, $bodyPs) {
            foreach ($users as $user) {
                InAppNotification::create([
                    'user_id'  => $user->id,
                    'type'     => 'system_announcement',
                    'title_en' => $titleEn, 'title_fa' => $titleFa, 'title_ps' => $titlePs,
                    'body_en'  => $bodyEn,  'body_fa'  => $bodyFa,  'body_ps'  => $bodyPs,
                ]);
                if ($user->fcm_token) $tokens[] = $user->fcm_token;
                $count++;
            }
        });

        $pushSent = 0;
        if ($this->fcm->isConfigured() && ! empty($tokens)) {
            $pushSent = $this->fcm->sendToTokens($tokens, $titleEn, $bodyEn, ['type' => 'system_announcement']);
        }

        $this->logAudit($request, 'broadcast_notification', 'system', null, ['count'=>$count,'push_sent'=>$pushSent,'filter'=>$filter]);

        return response()->json([
            'success' => true,
            'message' => "Notification sent to {$count} user(s)" . ($this->fcm->isConfigured() ? " ({$pushSent} push notifications delivered)" : ' (FCM not configured — in-app only)'),
            'data'    => ['count' => $count, 'push_sent' => $pushSent],
        ]);
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private function logAudit(Request $request, string $action, string $targetType, ?int $targetId, array $metadata): void
    {
        try {
            AuditLog::create([
                'admin_id'   => $request->admin->id ?? 0,
                'action'     => $action,
                'target_type'=> $targetType,
                'target_id'  => $targetId !== null ? (string) $targetId : null,
                'metadata'   => $metadata,
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable) {}
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class AdminAuthenticate
{
    public function handle(Request $request, Closure $next)
    {
        try {
            $payload = JWTAuth::parseToken()->getPayload();

            if (($payload->get('guard') ?? '') !== 'admin') {
                return response()->json(['success' => false, 'message' => 'Admin access required.'], 403);
            }

            $admin = \App\Models\Admin::find($payload->get('sub'));

            if (!$admin || !$admin->is_active) {
                return response()->json(['success' => false, 'message' => 'Admin account not found or inactive.'], 401);
            }

            $request->merge(['admin' => $admin]);

        } catch (JWTException $e) {
            return response()->json(['success' => false, 'message' => 'Admin authentication required.'], 401);
        }

        return $next($request);
    }
}

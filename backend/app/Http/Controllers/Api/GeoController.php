<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Province;
use App\Models\District;
use Illuminate\Http\JsonResponse;

class GeoController extends Controller
{
    public function provinces(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => ['provinces' => Province::orderBy('name_en')->get()]]);
    }

    public function districts(int $province): JsonResponse
    {
        $districts = District::where('province_id', $province)->orderBy('name_en')->get();
        return response()->json(['success' => true, 'data' => ['districts' => $districts]]);
    }
}

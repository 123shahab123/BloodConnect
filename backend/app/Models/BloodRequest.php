<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class BloodRequest extends Model {
    protected $fillable = [
        'requester_id','blood_type_needed','urgency','province_id','district_id',
        'lat','lng','units_needed','contact_phone','notes','status',
        'current_wave','wave_notified_at','donors_accepted','expires_at','fulfilled_at','cancelled_at',
    ];
    protected $casts = [
        'lat'=>'float','lng'=>'float','units_needed'=>'integer','donors_accepted'=>'integer',
        'current_wave'=>'integer','expires_at'=>'datetime','fulfilled_at'=>'datetime',
        'cancelled_at'=>'datetime','wave_notified_at'=>'datetime',
    ];

    public function requester()     { return $this->belongsTo(User::class,'requester_id'); }
    public function province()      { return $this->belongsTo(Province::class); }
    public function district()      { return $this->belongsTo(District::class); }
    public function notifications() { return $this->hasMany(DonorNotification::class,'request_id'); }
    public function acceptances()   { return $this->hasMany(Acceptance::class,'request_id'); }

    public function isActive(): bool { return in_array($this->status, ['pending','notified','donor_found']); }

    public function toListArray(): array {
        return [
            'id'                => $this->id,
            'blood_type_needed' => $this->blood_type_needed,
            'urgency'           => $this->urgency,
            'province_id'       => $this->province_id,
            'district_id'       => $this->district_id,
            'province_name'     => $this->province?->name_en,
            'province_name_fa'  => $this->province?->name_fa,
            'province_name_ps'  => $this->province?->name_ps,
            'district_name'     => $this->district?->name_en,
            'district_name_fa'  => $this->district?->name_fa,
            'district_name_ps'  => $this->district?->name_ps,
            'units_needed'      => $this->units_needed,
            'donors_accepted'   => $this->donors_accepted,
            'notes'             => $this->notes,
            'status'            => $this->status,
            'current_wave'      => $this->current_wave,
            'expires_at'        => $this->expires_at?->toIso8601String(),
            'fulfilled_at'      => $this->fulfilled_at?->toIso8601String(),
            'cancelled_at'      => $this->cancelled_at?->toIso8601String(),
            'created_at'        => $this->created_at->toIso8601String(),
        ];
    }
}

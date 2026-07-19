<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'phone','email','password','full_name','blood_type','province_id','district_id',
        'lat','lng','age','gender','is_donor','is_available','donation_count',
        'last_donation_at','next_eligible_at','reliability_score','language_pref',
        'status','is_verified','fcm_token','suspend_until','suspend_reason','last_active_at',
    ];

    protected $hidden = ['password','remember_token'];

    protected $casts = [
        'is_donor'          => 'boolean',
        'is_available'      => 'boolean',
        'is_verified'       => 'boolean',
        'donation_count'    => 'integer',
        'age'               => 'integer',
        'lat'               => 'float',
        'lng'               => 'float',
        'reliability_score' => 'float',
        'last_donation_at'  => 'datetime',
        'next_eligible_at'  => 'datetime',
        'suspend_until'     => 'datetime',
        'last_active_at'    => 'datetime',
        'password'          => 'hashed',
    ];

    public function getJWTIdentifier(): mixed { return $this->getKey(); }
    public function getJWTCustomClaims(): array { return ['guard' => 'user']; }

    public function province() { return $this->belongsTo(Province::class); }
    public function district() { return $this->belongsTo(District::class); }
    public function bloodRequests() { return $this->hasMany(BloodRequest::class, 'requester_id'); }
    public function donorNotifications() { return $this->hasMany(DonorNotification::class, 'donor_id'); }
    public function donationHistory() { return $this->hasMany(DonationHistory::class, 'donor_id'); }

    public function isEligibleToDonate(): bool
    {
        return ! $this->next_eligible_at || $this->next_eligible_at->isPast();
    }

    public function daysUntilEligible(): int
    {
        return $this->isEligibleToDonate() ? 0 : (int) now()->diffInDays($this->next_eligible_at, false);
    }

    public function toProfileArray(): array
    {
        return [
            'id'                  => $this->id,
            'phone'               => $this->phone,
            'email'               => $this->email,
            'full_name'           => $this->full_name,
            'blood_type'          => $this->blood_type,
            'province_id'         => $this->province_id,
            'district_id'         => $this->district_id,
            'province_name'       => $this->province?->name_en,
            'district_name'       => $this->district?->name_en,
            'province_names'      => $this->province ? ['en'=>$this->province->name_en,'fa'=>$this->province->name_fa,'ps'=>$this->province->name_ps] : null,
            'district_names'      => $this->district ? ['en'=>$this->district->name_en,'fa'=>$this->district->name_fa,'ps'=>$this->district->name_ps] : null,
            'lat'                 => $this->lat,
            'lng'                 => $this->lng,
            'age'                 => $this->age,
            'gender'              => $this->gender,
            'is_donor'            => $this->is_donor,
            'is_available'        => $this->is_available,
            'donation_count'      => $this->donation_count,
            'reliability_score'   => $this->reliability_score,
            'language_pref'       => $this->language_pref,
            'status'              => $this->status,
            'is_verified'         => $this->is_verified,
            'last_donation_at'    => $this->last_donation_at?->toIso8601String(),
            'next_eligible_at'    => $this->next_eligible_at?->toIso8601String(),
            'is_eligible'         => $this->isEligibleToDonate(),
            'days_until_eligible' => $this->daysUntilEligible(),
            'has_email'           => ! empty($this->email),
            'created_at'          => $this->created_at->toIso8601String(),
        ];
    }
}

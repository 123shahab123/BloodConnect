<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class DonationHistory extends Model {
    protected $table = 'donation_history';
    protected $fillable = ['donor_id','request_id','province_id','district_id','blood_type','confirmed_by_requester','donated_at'];
    protected $casts = ['confirmed_by_requester'=>'boolean','donated_at'=>'datetime'];
    public function donor()    { return $this->belongsTo(User::class,'donor_id'); }
    public function province() { return $this->belongsTo(Province::class); }
    public function district() { return $this->belongsTo(District::class); }
}

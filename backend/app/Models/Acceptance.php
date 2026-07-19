<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Acceptance extends Model {
    protected $fillable = ['request_id','donor_id','notification_id','is_fulfilled','fulfilled_at'];
    protected $casts = ['is_fulfilled'=>'boolean','fulfilled_at'=>'datetime'];
    public function request()      { return $this->belongsTo(BloodRequest::class,'request_id'); }
    public function donor()        { return $this->belongsTo(User::class,'donor_id'); }
    public function notification() { return $this->belongsTo(DonorNotification::class,'notification_id'); }
}

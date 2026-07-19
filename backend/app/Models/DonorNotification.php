<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class DonorNotification extends Model {
    protected $fillable = ['request_id','donor_id','wave','score','response','responded_at','response_window_ends_at'];
    protected $casts = ['score'=>'float','wave'=>'integer','responded_at'=>'datetime','response_window_ends_at'=>'datetime'];
    public function request() { return $this->belongsTo(BloodRequest::class,'request_id'); }
    public function donor()   { return $this->belongsTo(User::class,'donor_id'); }
}

<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class InAppNotification extends Model {
    protected $fillable = ['user_id','request_id','type','title_en','title_fa','title_ps','body_en','body_fa','body_ps','is_read','read_at'];
    protected $casts = ['is_read'=>'boolean','read_at'=>'datetime'];
    public function user() { return $this->belongsTo(User::class); }
}

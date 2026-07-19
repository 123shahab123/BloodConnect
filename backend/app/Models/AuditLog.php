<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model {
    protected $table = 'audit_logs';
    protected $fillable = ['admin_id','action','target_type','target_id','metadata','ip_address'];
    protected $casts = ['metadata'=>'array'];
    public function admin() { return $this->belongsTo(Admin::class); }
}

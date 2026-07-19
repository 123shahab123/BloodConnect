<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SystemConfig extends Model {
    protected $table = 'system_config';
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['key','value','description'];
}

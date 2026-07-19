<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Province extends Model {
    public $timestamps = false;
    protected $fillable = ['name_en','name_fa','name_ps','lat_centroid','lng_centroid'];
    protected $casts = ['lat_centroid'=>'float','lng_centroid'=>'float'];
    public function districts() { return $this->hasMany(District::class); }
}

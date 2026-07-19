<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class District extends Model {
    public $timestamps = false;
    protected $fillable = ['province_id','name_en','name_fa','name_ps','lat_centroid','lng_centroid'];
    protected $casts = ['lat_centroid'=>'float','lng_centroid'=>'float'];
    public function province() { return $this->belongsTo(Province::class); }
}

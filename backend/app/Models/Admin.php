<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class Admin extends Authenticatable implements JWTSubject
{
    protected $fillable = ['email','password','full_name','role','is_active','last_login_at'];
    protected $hidden = ['password','remember_token'];
    protected $casts = ['is_active'=>'boolean','last_login_at'=>'datetime','password'=>'hashed'];

    public function getJWTIdentifier(): mixed { return $this->getKey(); }
    public function getJWTCustomClaims(): array { return ['guard'=>'admin']; }
}

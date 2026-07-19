<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Admin;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        Admin::updateOrCreate(
            ['email' => 'admin@bloodconnect.af'],
            [
                'password'  => 'shahab123456789000',
                'full_name' => 'Shahab Noori',
                'role'      => 'super_admin',
                'is_active' => true,
            ]
        );
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ProvinceSeeder::class,
            DistrictSeeder::class,
            SystemConfigSeeder::class,
            AdminSeeder::class,
        ]);

        $this->command->info('');
        $this->command->info('✨ BloodConnect database seeded successfully!');
        $this->command->info('');
        $this->command->info('   Admin login:');
        $this->command->info('   Email:    admin@bloodconnect.af');
        $this->command->info('   Password: BloodConnect@Admin2026!');
        $this->command->info('');
    }
}

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
        $this->command->info('   Admin email: admin@bloodconnect.af');
        $this->command->info('   Admin password: set via ADMIN_SEED_PASSWORD env var');
        $this->command->info('   (falls back to the default in AdminSeeder.php if unset —');
        $this->command->info('   set ADMIN_SEED_PASSWORD in Render for a real deployment)');
        $this->command->info('');
    }
}

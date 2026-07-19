<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemConfigSeeder extends Seeder
{
    public function run(): void
    {
        $config = [
            ['wave_1_delay_critical','15','Wave 1→2 delay for critical requests (minutes)'],
            ['wave_2_delay_critical','15','Wave 2→3 delay for critical requests (minutes)'],
            ['wave_3_delay_critical','30','Wave 3→4 delay for critical requests (minutes)'],
            ['wave_4_delay_critical','30','Wave 4→5 delay for critical requests (minutes)'],
            ['wave_1_delay_urgent','60','Wave 1→2 delay for urgent requests (minutes)'],
            ['wave_2_delay_urgent','60','Wave 2→3 delay for urgent requests (minutes)'],
            ['wave_3_delay_urgent','120','Wave 3→4 delay for urgent requests (minutes)'],
            ['wave_4_delay_urgent','180','Wave 4→5 delay for urgent requests (minutes)'],
            ['wave_1_delay_planned','240','Wave 1→2 delay for planned requests (minutes)'],
            ['wave_2_delay_planned','240','Wave 2→3 delay for planned requests (minutes)'],
            ['wave_3_delay_planned','360','Wave 3→4 delay for planned requests (minutes)'],
            ['wave_4_delay_planned','480','Wave 4→5 delay for planned requests (minutes)'],
            ['donation_cooldown_days','56','Minimum days between donations (WHO standard)'],
            ['max_requests_per_day','20','Max blood requests per user per 24h'],
            ['max_donor_notifications','5','Max notifications per donor per day'],
            ['maintenance_mode','false','Enable maintenance mode'],
            ['maintenance_message_en','BloodConnect is under maintenance. Please try again soon.','Maintenance message (English)'],
            ['maintenance_message_fa','بلادکانکت در حال نگهداری است. لطفاً بعداً دوباره امتحان کنید.','Maintenance message (Dari)'],
        ];

        foreach ($config as [$key, $value, $desc]) {
            DB::table('system_config')->updateOrInsert(['key' => $key], ['value' => $value, 'description' => $desc, 'updated_at' => now(), 'created_at' => now()]);
        }
    }
}

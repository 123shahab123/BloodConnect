<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProvinceSeeder extends Seeder
{
    /**
     * All 34 provinces of Afghanistan with approximate centroid coordinates.
     */
    public function run(): void
    {
        $provinces = [
            ['id'=>1, 'name_en'=>'Kabul',      'name_fa'=>'کابل',      'name_ps'=>'کابل',       'lat'=>34.5260,'lng'=>69.1776],
            ['id'=>2, 'name_en'=>'Kandahar',   'name_fa'=>'کندهار',    'name_ps'=>'کندهار',     'lat'=>31.6111,'lng'=>65.7097],
            ['id'=>3, 'name_en'=>'Herat',      'name_fa'=>'هرات',      'name_ps'=>'هرات',       'lat'=>34.3529,'lng'=>62.2041],
            ['id'=>4, 'name_en'=>'Balkh',      'name_fa'=>'بلخ',       'name_ps'=>'بلخ',        'lat'=>36.7570,'lng'=>66.8977],
            ['id'=>5, 'name_en'=>'Nangarhar',  'name_fa'=>'ننگرهار',   'name_ps'=>'ننګرهار',    'lat'=>34.2080,'lng'=>70.3880],
            ['id'=>6, 'name_en'=>'Ghazni',     'name_fa'=>'غزنی',      'name_ps'=>'غزني',       'lat'=>33.5547,'lng'=>68.4240],
            ['id'=>7, 'name_en'=>'Helmand',    'name_fa'=>'هلمند',     'name_ps'=>'هلمند',      'lat'=>31.3578,'lng'=>64.1855],
            ['id'=>8, 'name_en'=>'Kunduz',     'name_fa'=>'کندز',      'name_ps'=>'کندز',       'lat'=>36.7289,'lng'=>68.8676],
            ['id'=>9, 'name_en'=>'Takhar',     'name_fa'=>'تخار',      'name_ps'=>'تخار',       'lat'=>37.1111,'lng'=>69.6694],
            ['id'=>10,'name_en'=>'Badakhshan', 'name_fa'=>'بدخشان',    'name_ps'=>'بدخشان',     'lat'=>37.0000,'lng'=>71.0000],
            ['id'=>11,'name_en'=>'Baghlan',    'name_fa'=>'بغلان',     'name_ps'=>'بغلان',      'lat'=>36.1000,'lng'=>68.7089],
            ['id'=>12,'name_en'=>'Bamyan',     'name_fa'=>'بامیان',    'name_ps'=>'باميان',     'lat'=>34.8219,'lng'=>67.8252],
            ['id'=>13,'name_en'=>'Farah',      'name_fa'=>'فراه',      'name_ps'=>'فراه',       'lat'=>32.3731,'lng'=>62.1139],
            ['id'=>14,'name_en'=>'Faryab',     'name_fa'=>'فاریاب',    'name_ps'=>'فارياب',     'lat'=>35.9169,'lng'=>64.9001],
            ['id'=>15,'name_en'=>'Ghor',       'name_fa'=>'غور',       'name_ps'=>'غور',        'lat'=>34.0924,'lng'=>64.9069],
            ['id'=>16,'name_en'=>'Daykundi',   'name_fa'=>'دایکندی',   'name_ps'=>'دايکندي',    'lat'=>33.6700,'lng'=>66.0000],
            ['id'=>17,'name_en'=>'Jowzjan',    'name_fa'=>'جوزجان',    'name_ps'=>'جوزجان',     'lat'=>36.8945,'lng'=>65.6590],
            ['id'=>18,'name_en'=>'Kapisa',     'name_fa'=>'کاپیسا',    'name_ps'=>'کاپيسا',     'lat'=>34.9825,'lng'=>69.6025],
            ['id'=>19,'name_en'=>'Khost',      'name_fa'=>'خوست',      'name_ps'=>'خوست',       'lat'=>33.3333,'lng'=>69.9167],
            ['id'=>20,'name_en'=>'Kunar',      'name_fa'=>'کنر',       'name_ps'=>'کنر',        'lat'=>34.8466,'lng'=>71.1008],
            ['id'=>21,'name_en'=>'Laghman',    'name_fa'=>'لغمان',     'name_ps'=>'لغمان',      'lat'=>34.6950,'lng'=>70.1450],
            ['id'=>22,'name_en'=>'Logar',      'name_fa'=>'لوگر',      'name_ps'=>'لوګر',       'lat'=>33.9833,'lng'=>69.0000],
            ['id'=>23,'name_en'=>'Nimroz',     'name_fa'=>'نیمروز',    'name_ps'=>'نيمروز',     'lat'=>31.0227,'lng'=>62.4467],
            ['id'=>24,'name_en'=>'Nuristan',   'name_fa'=>'نورستان',   'name_ps'=>'نورستان',    'lat'=>35.3233,'lng'=>70.8411],
            ['id'=>25,'name_en'=>'Paktia',     'name_fa'=>'پکتیا',     'name_ps'=>'پکتيا',      'lat'=>33.7711,'lng'=>69.4683],
            ['id'=>26,'name_en'=>'Paktika',    'name_fa'=>'پکتیکا',    'name_ps'=>'پکتيکا',     'lat'=>32.2644,'lng'=>68.5246],
            ['id'=>27,'name_en'=>'Panjsher',   'name_fa'=>'پنجشیر',    'name_ps'=>'پنجشير',     'lat'=>35.1219,'lng'=>69.5103],
            ['id'=>28,'name_en'=>'Parwan',     'name_fa'=>'پروان',     'name_ps'=>'پروان',      'lat'=>35.0000,'lng'=>69.0000],
            ['id'=>29,'name_en'=>'Samangan',   'name_fa'=>'سمنگان',    'name_ps'=>'سمنګان',     'lat'=>36.3153,'lng'=>67.9611],
            ['id'=>30,'name_en'=>'Sar-e Pol',  'name_fa'=>'سرپل',      'name_ps'=>'سرپل',       'lat'=>36.2158,'lng'=>65.9333],
            ['id'=>31,'name_en'=>'Uruzgan',    'name_fa'=>'ارزگان',    'name_ps'=>'ارزګان',     'lat'=>32.9272,'lng'=>66.0044],
            ['id'=>32,'name_en'=>'Wardak',     'name_fa'=>'وردک',      'name_ps'=>'وردک',       'lat'=>34.3680,'lng'=>68.2200],
            ['id'=>33,'name_en'=>'Zabul',      'name_fa'=>'زابل',      'name_ps'=>'زابل',       'lat'=>32.1919,'lng'=>67.1790],
            ['id'=>34,'name_en'=>'Badghis',    'name_fa'=>'بادغیس',    'name_ps'=>'بادغيس',     'lat'=>35.1671,'lng'=>63.7695],
        ];

        foreach ($provinces as $p) {
            DB::table('provinces')->updateOrInsert(['id' => $p['id']], [
                'name_en' => $p['name_en'], 'name_fa' => $p['name_fa'], 'name_ps' => $p['name_ps'],
                'lat_centroid' => $p['lat'], 'lng_centroid' => $p['lng'],
            ]);
        }
    }
}

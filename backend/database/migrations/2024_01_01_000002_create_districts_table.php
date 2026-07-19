<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('province_id')->constrained()->cascadeOnDelete();
            $table->string('name_en', 100);
            $table->string('name_fa', 100);
            $table->string('name_ps', 100);
            $table->decimal('lat_centroid', 8, 5);
            $table->decimal('lng_centroid', 8, 5);
            $table->index(['province_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('districts'); }
};

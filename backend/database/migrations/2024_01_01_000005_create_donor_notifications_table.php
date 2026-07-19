<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('donor_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('blood_requests')->cascadeOnDelete();
            $table->foreignId('donor_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('wave');
            $table->decimal('score', 5, 4)->default(0);
            $table->enum('response', ['pending','accepted','declined','no_response'])->default('pending');
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('response_window_ends_at');
            $table->timestamps();

            $table->unique(['request_id','donor_id']);
            $table->index(['donor_id']);
            $table->index(['response','response_window_ends_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('donor_notifications'); }
};

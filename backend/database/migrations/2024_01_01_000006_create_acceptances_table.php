<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('acceptances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('blood_requests');
            $table->foreignId('donor_id')->constrained('users');
            $table->foreignId('notification_id')->constrained('donor_notifications');
            $table->boolean('is_fulfilled')->default(false);
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamps();

            $table->unique(['request_id','donor_id']);
            $table->index(['donor_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('acceptances'); }
};

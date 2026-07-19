<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('donation_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('donor_id')->constrained('users');
            $table->foreignId('request_id')->constrained('blood_requests');
            $table->foreignId('province_id')->constrained();
            $table->foreignId('district_id')->constrained();
            $table->enum('blood_type', ['A+','A-','B+','B-','AB+','AB-','O+','O-']);
            $table->boolean('confirmed_by_requester')->default(false);
            $table->timestamp('donated_at');
            $table->timestamps();

            $table->index(['donor_id']);
            $table->index(['donated_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('donation_history'); }
};

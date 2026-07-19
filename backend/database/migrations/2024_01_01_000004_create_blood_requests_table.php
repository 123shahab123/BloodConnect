<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('blood_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requester_id')->constrained('users');
            $table->enum('blood_type_needed', ['A+','A-','B+','B-','AB+','AB-','O+','O-']);
            $table->enum('urgency', ['critical','urgent','planned']);
            $table->foreignId('province_id')->constrained();
            $table->foreignId('district_id')->constrained();
            $table->decimal('lat', 8, 5)->nullable();
            $table->decimal('lng', 8, 5)->nullable();
            $table->unsignedTinyInteger('units_needed')->default(1);
            $table->string('contact_phone', 20);
            $table->string('notes', 200)->nullable();
            $table->enum('status', ['pending','notified','donor_found','fulfilled','cancelled','expired'])->default('pending');
            $table->unsignedTinyInteger('current_wave')->default(0);
            $table->unsignedTinyInteger('donors_accepted')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['status','expires_at']);
            $table->index(['requester_id']);
            $table->index(['province_id','district_id']);
            $table->index(['blood_type_needed','urgency']);
        });
    }
    public function down(): void { Schema::dropIfExists('blood_requests'); }
};

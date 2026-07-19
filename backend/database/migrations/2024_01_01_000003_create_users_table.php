<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->unique();          // required login identifier
            $table->string('email')->nullable()->unique();  // optional
            $table->string('password');                     // hashed
            $table->string('full_name', 60);
            $table->enum('blood_type', ['A+','A-','B+','B-','AB+','AB-','O+','O-']);
            $table->foreignId('province_id')->constrained();
            $table->foreignId('district_id')->constrained();
            $table->decimal('lat', 8, 5)->nullable();
            $table->decimal('lng', 8, 5)->nullable();
            $table->boolean('is_donor')->default(false);
            $table->boolean('is_available')->default(false);
            $table->unsignedInteger('donation_count')->default(0);
            $table->timestamp('last_donation_at')->nullable();
            $table->timestamp('next_eligible_at')->nullable();
            $table->decimal('reliability_score', 3, 2)->default(0.80);
            $table->enum('language_pref', ['fa','ps','en'])->default('fa');
            $table->enum('gender', ['male','female','prefer_not_to_say'])->nullable();
            $table->unsignedTinyInteger('age');
            $table->enum('status', ['active','suspended','banned','deactivated'])->default('active');
            $table->boolean('is_verified')->default(false);
            $table->text('fcm_token')->nullable();
            $table->timestamp('suspend_until')->nullable();
            $table->text('suspend_reason')->nullable();
            $table->timestamp('last_active_at')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->index(['blood_type']);
            $table->index(['province_id','district_id']);
            $table->index(['is_donor','is_available','status']);
            $table->index(['status']);
        });
    }
    public function down(): void { Schema::dropIfExists('users'); }
};

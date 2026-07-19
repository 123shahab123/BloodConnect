<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('admins');
            $table->string('action', 100);
            $table->enum('target_type', ['user','request','system','admin','notification']);
            $table->string('target_id', 50)->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['admin_id']);
            $table->index(['target_type','target_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('audit_logs'); }
};

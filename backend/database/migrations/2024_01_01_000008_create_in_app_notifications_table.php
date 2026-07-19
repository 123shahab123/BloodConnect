<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('in_app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('request_id')->nullable()->constrained('blood_requests')->nullOnDelete();
            $table->string('type', 60);
            $table->text('title_en');
            $table->text('title_fa')->nullable();
            $table->text('title_ps')->nullable();
            $table->text('body_en');
            $table->text('body_fa')->nullable();
            $table->text('body_ps')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id','is_read']);
        });
    }
    public function down(): void { Schema::dropIfExists('in_app_notifications'); }
};

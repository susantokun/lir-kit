<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(config('lir-kit.tables.audit_logs', 'lir_audit_logs'), function (Blueprint $table) {
            $table->id();
            $table->string('actor_id', 64)->nullable()->index();
            $table->string('role', 255)->nullable();
            $table->string('entity', 64)->index();
            $table->string('entity_id', 64)->nullable();
            $table->string('action', 100)->index();
            $table->longText('before')->nullable();
            $table->longText('after')->nullable();
            $table->text('note')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('method', 10)->nullable();
            $table->string('url', 500)->nullable();
            $table->string('prev_hash', 64)->nullable();
            $table->string('hash', 64);
            $table->string('created_at', 19)->index();
        });

        Schema::create(config('lir-kit.tables.audit_checkpoints', 'lir_audit_checkpoints'), function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('log_id');
            $table->string('hash', 64);
            $table->unsignedBigInteger('count');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(config('lir-kit.tables.audit_checkpoints', 'lir_audit_checkpoints'));
        Schema::dropIfExists(config('lir-kit.tables.audit_logs', 'lir_audit_logs'));
    }
};

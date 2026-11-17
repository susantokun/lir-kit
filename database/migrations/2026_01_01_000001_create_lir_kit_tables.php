<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(config('lir-kit.tables.codes'), function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('code_hash');
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamps();
        });

        Schema::create(config('lir-kit.tables.settings'), function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });

        Schema::create(config('lir-kit.tables.menu'), function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id', 40)->default('0');
            $table->string('key', 80);
            $table->string('title', 60)->nullable();
            $table->string('icon', 40)->nullable();
            $table->boolean('is_visible')->default(true);
            $table->unsignedInteger('order_column')->nullable();
            $table->string('parent_key', 80)->nullable();
            $table->string('kind', 10)->nullable();
            $table->string('url', 500)->nullable();
            $table->boolean('new_tab')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(config('lir-kit.tables.menu'));
        Schema::dropIfExists(config('lir-kit.tables.settings'));
        Schema::dropIfExists(config('lir-kit.tables.codes'));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(config('lir-kit.tables.roles', 'lir_roles'), function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id', 40)->default('0');
            $table->string('key', 60);
            $table->string('name', 80);
            $table->string('description', 255)->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'key']);
        });

        Schema::create(config('lir-kit.tables.role_permissions', 'lir_role_permissions'), function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained(config('lir-kit.tables.roles', 'lir_roles'))->cascadeOnDelete();
            $table->string('permission', 100);

            $table->unique(['role_id', 'permission']);
        });

        // user_id is a string so it fits integer and uuid keys alike.
        Schema::create(config('lir-kit.tables.role_user', 'lir_role_user'), function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained(config('lir-kit.tables.roles', 'lir_roles'))->cascadeOnDelete();
            $table->string('user_id', 40);

            $table->unique(['role_id', 'user_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(config('lir-kit.tables.role_user', 'lir_role_user'));
        Schema::dropIfExists(config('lir-kit.tables.role_permissions', 'lir_role_permissions'));
        Schema::dropIfExists(config('lir-kit.tables.roles', 'lir_roles'));
    }
};

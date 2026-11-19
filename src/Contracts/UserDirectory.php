<?php

namespace Lir\Kit\Contracts;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * How the kit lists and edits the application's users on the Pengguna screen. The default implementation works with
 * the Eloquent model in config 'lir-kit.user_model' (columns name, email and, optionally, status). Bind your own when
 * your users live elsewhere or need extra rules.
 */
interface UserDirectory
{
    /**
     * The users to list, before search and paging.
     *
     * @return Builder<Model>
     */
    public function query(): Builder;

    public function find(int|string $id): ?Model;

    /**
     * Creates the account (name, email, password and, when supported, status).
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Model;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Model $user, array $attributes): Model;

    public function delete(Model $user): void;

    /**
     * Whether accounts have an active/inactive status the screen may change.
     */
    public function supportsStatus(): bool;

    /** Name of the table of users, for uniqueness checks. */
    public function table(): string;
}

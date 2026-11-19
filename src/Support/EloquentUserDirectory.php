<?php

namespace Lir\Kit\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Lir\Kit\Contracts\UserDirectory;

class EloquentUserDirectory implements UserDirectory
{
    public function query(): Builder
    {
        return $this->model()::query();
    }

    public function find(int|string $id): ?Model
    {
        return $this->query()->whereKey($id)->first();
    }

    public function create(array $attributes): Model
    {
        $user = $this->model()->newInstance();
        $user->forceFill($attributes)->save();

        return $user;
    }

    public function update(Model $user, array $attributes): Model
    {
        $user->forceFill($attributes)->save();

        return $user;
    }

    public function delete(Model $user): void
    {
        $user->delete();
    }

    public function supportsStatus(): bool
    {
        return Schema::hasColumn($this->table(), 'status');
    }

    public function table(): string
    {
        return $this->model()->getTable();
    }

    private function model(): Model
    {
        $class = config('lir-kit.user_model');

        return new $class;
    }
}

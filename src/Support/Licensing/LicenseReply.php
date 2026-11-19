<?php

namespace Lir\Kit\Support\Licensing;

/**
 * What the license portal answered: the HTTP status and the raw body (a license file on success).
 */
final readonly class LicenseReply
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(public int $status, public string $body, public array $data) {}

    public function ok(): bool
    {
        return $this->status === 200;
    }

    public function revoked(): bool
    {
        return ($this->data['revoked'] ?? false) === true;
    }

    /**
     * The portal's own message, or the first validation error (422), or a plain note with the status.
     */
    public function message(): string
    {
        $errors = $this->data['errors'] ?? null;

        if ($this->status === 422 && is_array($errors)) {
            $first = collect($errors)->flatten()->first();

            if (is_string($first)) {
                return $first;
            }
        }

        $message = $this->data['message'] ?? null;

        return is_string($message) && $message !== '' ? $message : __('Server license membalas dengan status :status.', ['status' => $this->status]);
    }
}

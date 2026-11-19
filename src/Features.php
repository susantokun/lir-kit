<?php

namespace Lir\Kit;

/**
 * Which parts of the kit are switched on in this application (config 'lir-kit.features').
 *
 * A part that is off registers no routes and no artisan commands, and the starter leaves its page out of the menu.
 * Every part is on unless the application says otherwise, so projects that never published the setting keep working
 * exactly as before. A part that needs another one switches it on too (see REQUIRES).
 */
final class Features
{
    public const OTP = 'otp';

    public const MAIL = 'mail';

    public const MENU = 'menu';

    public const ACCESS = 'access';

    public const AUDIT = 'audit';

    public const SITE = 'site';

    public const LICENSE = 'license';

    /**
     * Name => short description (what the installer shows).
     *
     * @var array<string, string>
     */
    public const ALL = [
        self::OTP => 'Login kode email (OTP) dan pengaturan metode masuk',
        self::MAIL => 'Email pengirim dan template email',
        self::MENU => 'Editor menu sidebar',
        self::ACCESS => 'Pengguna, peran, dan hak akses',
        self::AUDIT => 'Log audit tahan-ubah',
        self::SITE => 'Pengaturan situs (nama, logo, favicon)',
        self::LICENSE => 'License aplikasi',
    ];

    /**
     * A part and the parts it cannot work without.
     *
     * @var array<string, list<string>>
     */
    public const REQUIRES = [
        self::OTP => [self::MAIL],
    ];

    /**
     * Whether a part is on. A name the kit does not know is off.
     */
    public static function enabled(string $feature): bool
    {
        return (self::all()[$feature] ?? false);
    }

    /**
     * Every part with its state, after the dependencies are applied.
     *
     * @return array<string, bool>
     */
    public static function all(): array
    {
        $configured = (array) config('lir-kit.features', []);
        $state = [];

        foreach (array_keys(self::ALL) as $feature) {
            $state[$feature] = (bool) ($configured[$feature] ?? true);
        }

        foreach (self::REQUIRES as $feature => $needs) {
            if ($state[$feature]) {
                foreach ($needs as $need) {
                    $state[$need] = true;
                }
            }
        }

        return $state;
    }

    /**
     * Turns a list of chosen names into the full map for the config, and says which ones had to be added.
     *
     * @param  list<string>  $chosen
     * @return array{features: array<string, bool>, added: list<string>}
     */
    public static function resolve(array $chosen): array
    {
        $features = array_fill_keys(array_keys(self::ALL), false);
        foreach ($chosen as $feature) {
            if (array_key_exists($feature, $features)) {
                $features[$feature] = true;
            }
        }

        $added = [];
        foreach (self::REQUIRES as $feature => $needs) {
            if ($features[$feature]) {
                foreach ($needs as $need) {
                    if (! $features[$need]) {
                        $features[$need] = true;
                        $added[] = $need;
                    }
                }
            }
        }

        return ['features' => $features, 'added' => array_values(array_unique($added))];
    }
}

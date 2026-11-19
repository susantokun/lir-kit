<?php

namespace Lir\Kit\Support\Licensing;

use RuntimeException;

/**
 * Something went wrong while activating or checking a license; the message can be shown to the user as is.
 */
class LicenseException extends RuntimeException {}

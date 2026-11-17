<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $subject }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
                <tr>
                    <td style="padding:0 4px 16px;font-size:15px;font-weight:600;color:#18181b;">
                        <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#18181b;color:#ffffff;font-weight:700;margin-right:8px;">{{ mb_strtoupper(mb_substr($app, 0, 1)) }}</span>{{ $app }}
                    </td>
                </tr>
                <tr>
                    <td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr><td style="height:5px;line-height:5px;font-size:0;background:{{ $accent }};">&nbsp;</td></tr>
                            <tr>
                                <td style="padding:28px 32px 4px;">
                                    <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:#18181b;">{{ $title ?? $subject }}</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:12px 32px 0;font-size:15px;line-height:1.65;color:#3f3f46;">
                                    @foreach (preg_split('/\R{2,}/', trim($body)) as $paragraph)
                                        <p style="margin:0 0 14px;">{!! nl2br(e($paragraph)) !!}</p>
                                    @endforeach
                                </td>
                            </tr>
                            @if (filled($code ?? null))
                                <tr>
                                    <td style="padding:6px 32px 0;">
                                        <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:18px 12px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#18181b;">{{ $code }}</div>
                                    </td>
                                </tr>
                            @endif
                            <tr><td style="padding:0 32px 28px;font-size:0;line-height:0;">&nbsp;</td></tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 8px 0;font-size:12px;line-height:1.6;color:#a1a1aa;text-align:center;">
                        {{ __('Email ini dikirim otomatis oleh :app. Jangan membalas email ini.', ['app' => $app]) }}
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>

import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/** A bare frame for the playground pages: a top bar with where to go, and who is signed in. */
export function PlaygroundLayout({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    const { auth } = usePage<{ auth: { user: { name: string; email: string } | null } }>().props;

    return (
        <>
            <Head title={title} />
            <header className="border-b">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 p-4">
                    <span className="font-semibold">lir-kit playground</span>
                    {auth.user && (
                        <nav className="flex gap-3 text-sm text-muted-foreground">
                            <Link href="/settings" className="hover:text-foreground">
                                Pengaturan
                            </Link>
                            <Link href="/menu" className="hover:text-foreground">
                                Editor menu
                            </Link>
                        </nav>
                    )}
                    <div className="ml-auto flex items-center gap-3 text-sm">
                        {auth.user ? (
                            <>
                                <span className="text-muted-foreground">{auth.user.email}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.post('/logout')}
                                >
                                    Keluar
                                </Button>
                            </>
                        ) : (
                            <span className="text-muted-foreground">Belum masuk</span>
                        )}
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
        </>
    );
}

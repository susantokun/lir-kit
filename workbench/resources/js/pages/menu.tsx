import { router, usePage } from '@inertiajs/react';
import {
    FileTextIcon,
    FolderIcon,
    LayoutDashboardIcon,
    SettingsIcon,
    UsersIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { PlaygroundLayout } from '@/components/playground-layout';
import { applyMenu, setLockedKeys, type KitNavGroup, type KitNavLeaf, type MenuOverride } from '@lir-kit/menu';
import { MenuEditor } from '@lir-kit/menu-editor';

setLockedKeys(['/dashboard']);

/** The app's built-in menu. Every group and folder has a stable `key`; a page's key is its href. */
const BUILT_IN: KitNavGroup[] = [
    {
        key: 'group.utama',
        label: 'Utama',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
            { href: '/laporan', label: 'Laporan', icon: FileTextIcon },
        ],
    },
    {
        key: 'group.admin',
        label: 'Administrasi',
        items: [
            {
                key: 'folder.akses',
                href: '/akses/pengguna',
                label: 'Akses',
                icon: UsersIcon,
                children: [
                    { href: '/akses/pengguna', label: 'Pengguna', icon: UsersIcon },
                    { href: '/akses/peran', label: 'Peran', icon: UsersIcon },
                ],
            },
            { href: '/pengaturan', label: 'Pengaturan', icon: SettingsIcon },
        ],
    },
];

function Leaf({ item, depth = 0 }: { item: KitNavLeaf & { children?: KitNavLeaf[] }; depth?: number }) {
    const Icon = item.children ? FolderIcon : item.icon;

    return (
        <li>
            <a
                href={item.href}
                target={item.newTab ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                style={{ marginLeft: depth * 14 }}
                onClick={(e) => e.preventDefault()}
            >
                <Icon className="size-4 text-muted-foreground" />
                {item.label}
                {item.external && <span className="text-xs text-muted-foreground">↗</span>}
            </a>
            {item.children && (
                <ul>
                    {item.children.map((child) => (
                        <Leaf key={child.key ?? child.href} item={child} depth={depth + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
}

/** Editor on the left; on the right, what the app's sidebar would show after the saved changes. */
export default function Menu() {
    const { menuOverrides } = usePage<{ menuOverrides: MenuOverride[] }>().props;
    const shown = useMemo(() => applyMenu(BUILT_IN, menuOverrides), [menuOverrides]);

    return (
        <PlaygroundLayout title="Editor menu">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <MenuEditor base={BUILT_IN} onSaved={() => router.reload({ only: ['menuOverrides'] })} />
                <aside className="sticky top-4 rounded-xl border bg-sidebar p-3">
                    <h2 className="mb-2 px-2 text-xs font-medium uppercase text-muted-foreground">Pratinjau sidebar</h2>
                    {shown.map((group) => (
                        <div key={group.key} className="mb-3">
                            <div className="px-2 py-1 text-xs text-muted-foreground">{group.label}</div>
                            <ul>
                                {group.items.map((item) => (
                                    <Leaf key={item.key ?? item.href} item={item} />
                                ))}
                            </ul>
                        </div>
                    ))}
                </aside>
            </div>
        </PlaygroundLayout>
    );
}

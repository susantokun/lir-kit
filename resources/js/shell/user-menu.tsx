import { router } from '@inertiajs/react';
import { LogOutIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { t } from '../adapters';
import { NoticeDialog } from './notice-dialog';

/** The signed-in person as the shell needs them. */
export type ShellUser = {
  name: string;
  email: string;
  avatar?: string | null;
};

/** A link in the account menu (Profil, Keamanan, ...). */
export type UserMenuLink = { label: string; href: string; icon: LucideIcon };

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Compact rows for the account menu, matching the rest of the app's menus. */
const ITEM = 'gap-2 rounded-md px-2 py-1.5';

/** The account menu asks for sign-out with this event; LogoutConfirm (mounted once in the shell) shows the dialog. */
export const LOGOUT_EVENT = 'lir-kit:confirm-logout';

/** The user's picture, or their initials when there is none. */
export function UserAvatar({
  user,
  className,
}: {
  user: Pick<ShellUser, 'name' | 'avatar'> | null;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
      <AvatarFallback className="bg-primary/10 text-primary">
        {initials(user?.name ?? '?')}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * The body of the account menu, shared by the sidebar footer and the top bar so both always look the same:
 * who you are, your pages (`links`), anything extra (`children`, e.g. a language switch), and sign out.
 */
export function UserMenuItems({
  user,
  links = [],
  children,
}: {
  user: ShellUser | null;
  links?: UserMenuLink[];
  children?: ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-1 py-1.5">
        <UserAvatar user={user} className="size-8 rounded-lg" />
        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium text-foreground">
            {user?.name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user?.email}
          </span>
        </div>
      </div>
      {links.length > 0 && (
        <>
          <DropdownMenuSeparator className="-mx-1" />
          <DropdownMenuGroup>
            {links.map(({ label, href, icon: Icon }) => (
              <DropdownMenuItem
                key={href}
                className={ITEM}
                onClick={() => router.visit(href)}
              >
                <Icon className="text-muted-foreground" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </>
      )}
      {children && (
        <>
          <DropdownMenuSeparator className="-mx-1" />
          {children}
        </>
      )}
      <DropdownMenuSeparator className="-mx-1" />
      <DropdownMenuItem
        className={ITEM}
        variant="destructive"
        onClick={() => window.dispatchEvent(new Event(LOGOUT_EVENT))}
      >
        <LogOutIcon />
        {t('Keluar')}
      </DropdownMenuItem>
    </>
  );
}

/** Asks "sign out?" before ending the session, so a stray click never logs anyone out. */
export function LogoutConfirm({
  appName,
  onLogout = () => router.post('/logout'),
}: {
  appName?: string;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(LOGOUT_EVENT, show);

    return () => window.removeEventListener(LOGOUT_EVENT, show);
  }, []);

  return (
    <NoticeDialog
      open={open}
      tone="danger"
      title={appName ? t('Keluar dari {app}?', { app: appName }) : t('Keluar?')}
      description={t(
        'Sesi Anda di perangkat ini akan diakhiri dan Anda perlu masuk lagi.',
      )}
      confirmLabel={t('Ya, keluar')}
      onConfirm={() => {
        setOpen(false);
        onLogout();
      }}
      onCancel={() => setOpen(false)}
      dismissible
    />
  );
}

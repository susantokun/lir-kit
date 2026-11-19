import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormDialog } from './form-dialog';
import { NoticeDialog } from './shell/notice-dialog';
import {
  arrangeNav,
  overridesFromTree,
  type ArrGroup,
  type ArrNode,
  type KitNavGroup,
  type MenuOverride,
} from './menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { MENU_ICONS } from './menu-icons';
import { cn } from '@/lib/utils';
import { ApiError, api, notify, t } from './adapters';

/** Where an entry sits: the group, then the index at each level below it. */
type Path = number[];

type Draft = {
  /** The folder (or group) the entry goes into, or the entry being edited. */
  parent: Path;
  editing: Path | null;
  kind: 'link' | 'folder';
  title: string;
  url: string;
  newTab: boolean;
  iconName: string | null;
  /** A folder cannot be added on the third level. */
  allowFolder: boolean;
};

const newKey = () =>
  'custom.' +
  Array.from({ length: 8 }, () =>
    'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(
      Math.floor(Math.random() * 36),
    ),
  ).join('');

/** The list of entries (or the group's items) a path points into, as a copy that can be changed. */
function editList(
  tree: ArrGroup[],
  parent: Path,
  change: (list: ArrNode[]) => ArrNode[],
): ArrGroup[] {
  const [g, ...rest] = parent;

  return tree.map((group, gi) => {
    if (gi !== g) return group;

    const apply = (nodes: ArrNode[], path: number[]): ArrNode[] => {
      if (path.length === 0) return change([...nodes]);

      return nodes.map((n, i) =>
        i === path[0]
          ? { ...n, children: apply(n.children ?? [], path.slice(1)) }
          : n,
      );
    };

    return { ...group, items: apply(group.items, rest) };
  });
}

function nodeAt(tree: ArrGroup[], path: Path): ArrNode | undefined {
  let nodes: ArrNode[] | undefined = tree[path[0]]?.items;
  let node: ArrNode | undefined;

  for (const i of path.slice(1)) {
    node = nodes?.[i];
    nodes = node?.children;
  }

  return node;
}

function IconPicker({
  value,
  fallback: Fallback,
  onChange,
}: {
  value: string | null;
  fallback: React.ComponentType<{ className?: string }>;
  onChange: (name: string | null) => void;
}) {
  const Current = value ? MENU_ICONS[value] : Fallback;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('Pilih ikon')}
          />
        }
      >
        <Current />
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="grid grid-cols-8 gap-1">
          {Object.entries(MENU_ICONS).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              onClick={() => onChange(name)}
              className={cn(
                'flex size-8 items-center justify-center rounded-md hover:bg-accent',
                value === name && 'bg-accent',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() => onChange(null)}
        >
          {t('Pakai ikon bawaan')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/** Drag and drop state shared by the rows: what is being dragged and what it hovers (siblings only). */
type Dnd = {
  dragging: Path | null;
  over: Path | null;
  start: (path: Path) => void;
  enter: (path: Path) => void;
  drop: (path: Path) => void;
  end: () => void;
};

const sameList = (a: Path, b: Path) =>
  a.length === b.length && a.slice(0, -1).every((v, i) => v === b[i]);
const samePath = (a: Path | null, b: Path) =>
  a !== null && a.length === b.length && a.every((v, i) => v === b[i]);

/** The grip that starts a drag; the row only becomes draggable while it is pressed, so its inputs keep text selection. */
function Grip({ onPress }: { onPress: (on: boolean) => void }) {
  return (
    <span
      role="img"
      aria-label={t('Seret untuk mengubah urutan')}
      title={t('Seret untuk mengubah urutan')}
      className="flex size-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
      onMouseDown={() => onPress(true)}
      onMouseUp={() => onPress(false)}
    >
      <GripVerticalIcon className="size-4" />
    </span>
  );
}

function Row({
  node,
  path,
  index,
  count,
  dnd,
  onTitle,
  onIcon,
  onToggle,
  onMove,
  onAdd,
  onEdit,
  onRemove,
}: {
  node: ArrNode;
  path: Path;
  index: number;
  count: number;
  dnd: Dnd;
  onTitle: (path: Path, title: string) => void;
  onIcon: (path: Path, icon: string | null) => void;
  onToggle: (path: Path) => void;
  onMove: (path: Path, delta: -1 | 1) => void;
  onAdd: (path: Path) => void;
  onEdit: (path: Path) => void;
  onRemove: (path: Path) => void;
}) {
  const isFolder = node.children !== undefined;
  const depth = path.length;
  const [armed, setArmed] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const canDrop = dnd.dragging !== null && sameList(dnd.dragging, path) && !samePath(dnd.dragging, path);

  return (
    <div className="flex flex-col gap-2">
      <div
        draggable={armed}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', node.key);
          dnd.start(path);
        }}
        onDragEnd={() => {
          setArmed(false);
          dnd.end();
        }}
        onDragOver={(e) => {
          if (canDrop) {
            e.preventDefault();
            e.stopPropagation();
            dnd.enter(path);
          }
        }}
        onDrop={(e) => {
          if (canDrop) {
            e.preventDefault();
            e.stopPropagation();
            dnd.drop(path);
          }
        }}
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2',
          node.hidden && 'opacity-60',
          samePath(dnd.dragging, path) && 'opacity-40',
          canDrop && samePath(dnd.over, path) && 'ring-2 ring-primary',
        )}
        style={{ marginLeft: (depth - 2) * 20 }}
      >
        <Grip onPress={setArmed} />
        <IconPicker
          value={node.iconName}
          fallback={node.icon}
          onChange={(name) => onIcon(path, name)}
        />
        <Input
          aria-label={t('Judul menu')}
          className="h-9 min-w-40 flex-1"
          maxLength={60}
          placeholder={node.defaultLabel}
          value={node.label}
          disabled={node.custom && node.kind === 'link'}
          onChange={(e) => onTitle(path, e.target.value)}
        />
        {node.custom && (
          <Badge variant="secondary">
            {node.kind === 'folder' ? t('Folder') : t('Tautan')}
          </Badge>
        )}
        {!node.custom && isFolder && (
          <Badge variant="outline">{t('Folder')}</Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('Naikkan')}
            disabled={index === 0}
            onClick={() => onMove(path, -1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('Turunkan')}
            disabled={index === count - 1}
            onClick={() => onMove(path, 1)}
          >
            <ArrowDownIcon />
          </Button>
          {isFolder && depth < 4 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('Tambah menu di dalam folder')}
              title={t('Tambah menu di dalam folder')}
              onClick={() => onAdd(path)}
            >
              <PlusIcon />
            </Button>
          )}
          {node.custom && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('Ubah')}
                onClick={() => onEdit(path)}
              >
                <PencilIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('Hapus')}
                onClick={() => setConfirmRemove(true)}
              >
                <Trash2Icon />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={node.locked}
            title={
              node.locked ? t('Menu ini tidak bisa disembunyikan.') : undefined
            }
            aria-label={node.hidden ? t('Tampilkan') : t('Sembunyikan')}
            onClick={() => onToggle(path)}
          >
            {node.hidden ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </div>
      <NoticeDialog
        open={confirmRemove}
        tone="danger"
        icon={Trash2Icon}
        title={t('Hapus "{nama}"?', { nama: node.label })}
        description={
          isFolder && (node.children?.length ?? 0) > 0
            ? t('Folder ini dan semua menu di dalamnya akan dihapus dari susunan. Perubahan baru tersimpan saat Anda menekan Simpan.')
            : t('Menu ini akan dihapus dari susunan. Perubahan baru tersimpan saat Anda menekan Simpan.')
        }
        confirmLabel={t('Ya, hapus')}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove(path);
        }}
        onCancel={() => setConfirmRemove(false)}
      />
      {node.children?.map((child, i) => (
        <Row
          key={child.key}
          node={child}
          path={[...path, i]}
          index={i}
          count={node.children!.length}
          dnd={dnd}
          onTitle={onTitle}
          onIcon={onIcon}
          onToggle={onToggle}
          onMove={onMove}
          onAdd={onAdd}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

/**
 * The sidebar editor. Pass your built-in menu (what your own nav code builds with every entry visible) as `base`,
 * and `onSaved` to refresh the menu the sidebar shows (e.g. router.reload({ only: ['menuOverrides'] })).
 */
export function MenuEditor({
  base,
  onSaved,
}: {
  base: KitNavGroup[];
  onSaved?: () => void;
}) {
  const [overrides, setOverrides] = useState<MenuOverride[] | null>(null);
  const [tree, setTree] = useState<ArrGroup[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [dragging, setDragging] = useState<Path | null>(null);
  const [over, setOver] = useState<Path | null>(null);
  const [draggingGroup, setDraggingGroup] = useState<number | null>(null);
  const [armedGroup, setArmedGroup] = useState<number | null>(null);
  const [overGroup, setOverGroup] = useState<number | null>(null);

  useEffect(() => {
    api<{ items: MenuOverride[] }>('/menu')
      .then((data) => setOverrides(data.items))
      .catch((e: ApiError) => notify(e.message, true));
  }, []);

  useEffect(() => {
    if (overrides) {
      setTree(arrangeNav(base, overrides));
      setDirty(false);
    }
  }, [overrides, base]);

  const change = (next: ArrGroup[]) => {
    setTree(next);
    setDirty(true);
  };

  const onTitle = (path: Path, title: string) =>
    change(
      editList(tree, path.slice(0, -1), (list) =>
        list.map((n, i) =>
          i === path[path.length - 1] ? { ...n, label: title } : n,
        ),
      ),
    );
  const onIcon = (path: Path, name: string | null) =>
    change(
      editList(tree, path.slice(0, -1), (list) =>
        list.map((n, i) =>
          i === path[path.length - 1]
            ? {
                ...n,
                iconName: name,
                icon: name ? MENU_ICONS[name] : n.icon,
              }
            : n,
        ),
      ),
    );
  const onToggle = (path: Path) =>
    change(
      editList(tree, path.slice(0, -1), (list) =>
        list.map((n, i) =>
          i === path[path.length - 1] ? { ...n, hidden: !n.hidden } : n,
        ),
      ),
    );
  const onMove = (path: Path, delta: -1 | 1) =>
    change(
      editList(tree, path.slice(0, -1), (list) => {
        const i = path[path.length - 1];
        [list[i], list[i + delta]] = [list[i + delta], list[i]];

        return list;
      }),
    );
  /** Drops the dragged entry where the target is, among the same siblings. */
  const dropOn = (target: Path) => {
    if (dragging && sameList(dragging, target)) {
      const from = dragging[dragging.length - 1];
      const to = target[target.length - 1];

      change(
        editList(tree, dragging.slice(0, -1), (list) => {
          const [moved] = list.splice(from, 1);
          list.splice(to, 0, moved);

          return list;
        }),
      );
    }

    setDragging(null);
    setOver(null);
  };

  const dnd: Dnd = {
    dragging,
    over,
    start: setDragging,
    enter: setOver,
    drop: dropOn,
    end: () => {
      setDragging(null);
      setOver(null);
    },
  };

  const dropGroup = (target: number) => {
    if (draggingGroup !== null && draggingGroup !== target) {
      const next = [...tree];
      const [moved] = next.splice(draggingGroup, 1);
      next.splice(target, 0, moved);
      change(next);
    }

    setDraggingGroup(null);
    setOverGroup(null);
    setArmedGroup(null);
  };

  const onRemove = (path: Path) =>
    change(
      editList(tree, path.slice(0, -1), (list) =>
        list.filter((_, i) => i !== path[path.length - 1]),
      ),
    );

  const openAdd = (parent: Path) =>
    setDraft({
      parent,
      editing: null,
      kind: 'link',
      title: '',
      url: '',
      newTab: false,
      iconName: null,
      // The group and a first-level folder take folders; a second-level folder holds only pages.
      allowFolder: parent.length <= 2,
    });

  const openEdit = (path: Path) => {
    const node = nodeAt(tree, path);

    if (!node) return;

    setDraft({
      parent: path.slice(0, -1),
      editing: path,
      kind: node.kind ?? 'link',
      title: node.label,
      url: node.url,
      newTab: node.newTab,
      iconName: node.iconName,
      allowFolder: false,
    });
  };

  const submitDraft = () => {
    if (!draft) return;

    const title = draft.title.trim();

    if (!title) {
      notify(t('Menu buatan sendiri harus punya judul.'), true);

      return;
    }

    if (draft.kind === 'link' && !draft.url.trim()) {
      notify(t('Isi alamat tautan.'), true);

      return;
    }

    const icon = draft.iconName ? MENU_ICONS[draft.iconName] : null;

    if (draft.editing) {
      const last = draft.editing[draft.editing.length - 1];

      change(
        editList(tree, draft.parent, (list) =>
          list.map((n, i) =>
            i === last
              ? {
                  ...n,
                  label: title,
                  url: draft.url.trim(),
                  href: draft.url.trim() || n.href,
                  newTab: draft.newTab,
                  iconName: draft.iconName,
                  icon: icon ?? n.icon,
                }
              : n,
          ),
        ),
      );
    } else {
      const parentNode = nodeAt(tree, draft.parent);
      const added: ArrNode = {
        key: newKey(),
        label: title,
        defaultLabel: title,
        icon: icon ?? MENU_ICONS[draft.kind === 'folder' ? 'Folder' : 'Link'],
        iconName: draft.iconName,
        href: draft.url.trim() || '#',
        custom: true,
        kind: draft.kind,
        url: draft.url.trim(),
        newTab: draft.newTab,
        hidden: false,
        locked: false,
        children: draft.kind === 'folder' ? [] : undefined,
      };

      if (draft.parent.length === 1 || parentNode) {
        change(editList(tree, draft.parent, (list) => [...list, added]));
      }
    }

    setDraft(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api<{ items: MenuOverride[] }>('/menu', {
        method: 'PUT',
        body: { items: overridesFromTree(tree) },
      });
      setOverrides(saved.items);
      onSaved?.();
      notify(t('Menu disimpan.'), false);
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const saved = await api<{ items: MenuOverride[] }>('/menu', {
        method: 'DELETE',
      });
      setOverrides(saved.items);
      onSaved?.();
      setConfirmReset(false);
      notify(t('Menu dikembalikan ke susunan bawaan.'), false);
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex max-w-4xl flex-col gap-6">
        {overrides === null ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          tree.map((group, g) => (
            <Card
              key={group.key}
              draggable={armedGroup === g}
              onDragStart={() => setDraggingGroup(g)}
              onDragEnd={() => {
                setDraggingGroup(null);
                setOverGroup(null);
                setArmedGroup(null);
              }}
              onDragOver={(e) => {
                if (draggingGroup !== null && draggingGroup !== g) {
                  e.preventDefault();
                  setOverGroup(g);
                }
              }}
              onDrop={(e) => {
                if (draggingGroup !== null) {
                  e.preventDefault();
                  dropGroup(g);
                }
              }}
              className={cn(
                draggingGroup === g && 'opacity-40',
                draggingGroup !== null && overGroup === g && draggingGroup !== g && 'ring-2 ring-primary',
              )}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Grip onPress={(on) => setArmedGroup(on ? g : null)} />
                  <Input
                    aria-label={t('Judul bagian')}
                    className="h-9 max-w-xs font-medium"
                    maxLength={60}
                    placeholder={group.defaultLabel}
                    value={group.label}
                    onChange={(e) =>
                      change(
                        tree.map((x, i) =>
                          i === g
                            ? {
                                ...x,
                                label: e.target.value,
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('Naikkan')}
                      disabled={g === 0}
                      onClick={() => {
                        const next = [...tree];
                        [next[g], next[g - 1]] = [next[g - 1], next[g]];
                        change(next);
                      }}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('Turunkan')}
                      disabled={g === tree.length - 1}
                      onClick={() => {
                        const next = [...tree];
                        [next[g], next[g + 1]] = [next[g + 1], next[g]];
                        change(next);
                      }}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        group.hidden ? t('Tampilkan') : t('Sembunyikan')
                      }
                      onClick={() =>
                        change(
                          tree.map((x, i) =>
                            i === g
                              ? {
                                  ...x,
                                  hidden: !x.hidden,
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      {group.hidden ? <EyeOffIcon /> : <EyeIcon />}
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {group.hidden ? t('Bagian ini disembunyikan.') : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {group.items.map((item, i) => (
                  <Row
                    key={item.key}
                    node={item}
                    path={[g, i]}
                    index={i}
                    count={group.items.length}
                    dnd={dnd}
                    onTitle={onTitle}
                    onIcon={onIcon}
                    onToggle={onToggle}
                    onMove={onMove}
                    onAdd={openAdd}
                    onEdit={openEdit}
                    onRemove={onRemove}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => openAdd([g])}
                >
                  <PlusIcon data-icon="inline-start" />
                  {t('Tambah menu')}
                </Button>
              </CardContent>
            </Card>
          ))
        )}

        {overrides !== null && (
          <div className="sticky bottom-4 z-10 mx-3 flex flex-wrap items-center gap-2 rounded-xl sm:mx-6 border bg-background/95 p-3 shadow-sm backdrop-blur">
            <Button onClick={save} disabled={saving || !dirty}>
              {saving && <Spinner data-icon="inline-start" />}
              {t('Simpan menu')}
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {t('Kembalikan ke bawaan')}
            </Button>
            {dirty && (
              <span className="text-sm text-muted-foreground">
                {t('Ada perubahan yang belum disimpan.')}
              </span>
            )}
          </div>
        )}
      </div>

      <FormDialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.editing ? t('Ubah menu') : t('Tambah menu')}
        description={t(
          'Menu buatan sendiri tidak terikat hak akses: siapa pun yang melihat menunya bisa membukanya.',
        )}
        submitLabel={draft?.editing ? t('Simpan') : t('Tambah')}
        onSubmit={submitDraft}
      >
        {draft && (
          <>
            {!draft.editing && draft.allowFolder && (
              <Field>
                <FieldLabel>{t('Jenis')}</FieldLabel>
                <div className="flex gap-2">
                  {(['link', 'folder'] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      variant={draft.kind === k ? 'default' : 'outline'}
                      onClick={() => setDraft({ ...draft, kind: k })}
                    >
                      {k === 'link' ? t('Tautan') : t('Folder')}
                    </Button>
                  ))}
                </div>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="menu-title">{t('Judul')}</FieldLabel>
              <div className="flex gap-2">
                <IconPicker
                  value={draft.iconName}
                  fallback={
                    MENU_ICONS[draft.kind === 'folder' ? 'Folder' : 'Link']
                  }
                  onChange={(iconName) => setDraft({ ...draft, iconName })}
                />
                <Input
                  id="menu-title"
                  maxLength={60}
                  autoFocus
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      title: e.target.value,
                    })
                  }
                />
              </div>
            </Field>
            {draft.kind === 'link' && (
              <>
                <Field>
                  <FieldLabel htmlFor="menu-url">{t('Alamat')}</FieldLabel>
                  <Input
                    id="menu-url"
                    placeholder="https://… atau /bundles"
                    value={draft.url}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        url: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field orientation="horizontal">
                  <Switch
                    id="menu-new-tab"
                    checked={draft.newTab}
                    onCheckedChange={(newTab) => setDraft({ ...draft, newTab })}
                  />
                  <FieldLabel htmlFor="menu-new-tab">
                    {t('Buka di tab baru')}
                  </FieldLabel>
                </Field>
              </>
            )}
          </>
        )}
      </FormDialog>

      <FormDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t('Kembalikan menu ke bawaan?')}
        description={t(
          'Semua perubahan judul, ikon, urutan, dan menu buatan sendiri akan dihapus.',
        )}
        submitLabel={t('Kembalikan')}
        busy={saving}

        onSubmit={reset}
      >
        <span />
      </FormDialog>
    </>
  );
}

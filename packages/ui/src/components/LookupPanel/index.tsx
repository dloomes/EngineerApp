import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { WarningBanner } from '../WarningBanner';
import './LookupPanel.css';

export interface LookupPanelProps<T> {
  open: boolean;
  onClose: () => void;

  title: string;
  items: T[];
  loading?: boolean;
  loadError?: string | null;

  getItemKey: (item: T) => string;
  getItemLabel: (item: T) => string;
  selectedKey?: string;
  onSelect: (item: T) => void;

  // Inline create. Receives the trimmed name; should resolve with the new item.
  onCreate?: (name: string) => Promise<T>;
  // Inline edit. Receives the original item + the trimmed new name.
  onEdit?: (item: T, newName: string) => Promise<void>;

  // Shown above the form when creating / editing. Use the WarningBanner pattern
  // from SPEC §7: "This will create/update a record in Dynamics 365 against …".
  writeWarning?: ReactNode;

  // Strings the screen can override.
  addLabelPrefix?: string; // default "Add"
  createTitle?: string; // default `Add ${entity}`
  editTitle?: string; // default `Edit`
  searchPlaceholder?: string; // default "Search…"
}

type Mode<T> =
  | { kind: 'list' }
  | { kind: 'create'; name: string; saving: boolean; error: string | null }
  | { kind: 'edit'; item: T; name: string; saving: boolean; error: string | null };

export function LookupPanel<T>(props: LookupPanelProps<T>): JSX.Element | null {
  const {
    open,
    onClose,
    title,
    items,
    loading,
    loadError,
    getItemKey,
    getItemLabel,
    selectedKey,
    onSelect,
    onCreate,
    onEdit,
    writeWarning,
    addLabelPrefix = 'Add',
    createTitle = 'Add new',
    editTitle = 'Edit',
    searchPlaceholder = 'Search…',
  } = props;

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode<T>>({ kind: 'list' });
  const searchRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLInputElement>(null);

  // Reset state each time the panel is opened.
  useEffect(() => {
    if (open) {
      setQuery('');
      setMode({ kind: 'list' });
      // Focus the search input after the slide-in animation kicks in.
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  // Focus the form input when entering create/edit mode.
  useEffect(() => {
    if (mode.kind === 'create' || mode.kind === 'edit') {
      requestAnimationFrame(() => formRef.current?.focus());
    }
  }, [mode.kind]);

  // ESC closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => getItemLabel(i).toLowerCase().includes(q));
  }, [items, query, getItemLabel]);

  const trimmedQuery = query.trim();
  const exactMatch = useMemo(
    () =>
      trimmedQuery.length > 0 &&
      items.some(
        (i) => getItemLabel(i).toLowerCase() === trimmedQuery.toLowerCase(),
      ),
    [items, trimmedQuery, getItemLabel],
  );
  const canOfferCreate =
    onCreate && trimmedQuery.length > 0 && !exactMatch && !loading;

  if (!open) return null;

  async function submitCreate(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (mode.kind !== 'create' || !onCreate) return;
    const name = mode.name.trim();
    if (!name) return;
    setMode({ ...mode, saving: true, error: null });
    try {
      const created = await onCreate(name);
      onSelect(created);
      onClose();
    } catch (err) {
      setMode({
        ...mode,
        saving: false,
        error: err instanceof Error ? err.message : 'Save failed',
      });
    }
  }

  async function submitEdit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (mode.kind !== 'edit' || !onEdit) return;
    const name = mode.name.trim();
    if (!name) return;
    setMode({ ...mode, saving: true, error: null });
    try {
      await onEdit(mode.item, name);
      setMode({ kind: 'list' });
    } catch (err) {
      setMode({
        ...mode,
        saving: false,
        error: err instanceof Error ? err.message : 'Save failed',
      });
    }
  }

  return (
    <>
      <div
        className="involve-lookup__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="involve-lookup"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="involve-lookup__header">
          <h2 className="involve-lookup__title">
            {mode.kind === 'list'
              ? title
              : mode.kind === 'create'
                ? createTitle
                : editTitle}
          </h2>
          <button
            type="button"
            className="involve-lookup__close"
            onClick={
              mode.kind === 'list' ? onClose : () => setMode({ kind: 'list' })
            }
            aria-label={mode.kind === 'list' ? 'Close' : 'Back'}
          >
            {mode.kind === 'list' ? '✕' : '‹'}
          </button>
        </header>

        {mode.kind === 'list' && (
          <>
            <div className="involve-lookup__search">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="involve-lookup__body">
              {loading && (
                <div className="involve-lookup__empty">Loading…</div>
              )}
              {!loading && loadError && (
                <div className="involve-lookup__empty">{loadError}</div>
              )}
              {!loading && !loadError && filtered.length === 0 && (
                <div className="involve-lookup__empty">
                  {trimmedQuery
                    ? `No matches for "${trimmedQuery}".`
                    : 'No items yet.'}
                </div>
              )}
              {!loading && !loadError && filtered.length > 0 && (
                <ul className="involve-lookup__list">
                  {filtered.map((item) => {
                    const key = getItemKey(item);
                    const isSelected = key === selectedKey;
                    return (
                      <li key={key} className="involve-lookup__row">
                        <button
                          type="button"
                          className={`involve-lookup__item${
                            isSelected ? ' involve-lookup__item--selected' : ''
                          }`}
                          onClick={() => {
                            onSelect(item);
                            onClose();
                          }}
                        >
                          {getItemLabel(item)}
                        </button>
                        {onEdit && (
                          <button
                            type="button"
                            className="involve-lookup__edit"
                            aria-label={`Edit ${getItemLabel(item)}`}
                            onClick={() =>
                              setMode({
                                kind: 'edit',
                                item,
                                name: getItemLabel(item),
                                saving: false,
                                error: null,
                              })
                            }
                          >
                            ✎
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {canOfferCreate && (
              <div className="involve-lookup__footer">
                <button
                  type="button"
                  className="involve-lookup__add"
                  onClick={() =>
                    setMode({
                      kind: 'create',
                      name: trimmedQuery,
                      saving: false,
                      error: null,
                    })
                  }
                >
                  + {addLabelPrefix} "{trimmedQuery}"
                </button>
              </div>
            )}
          </>
        )}

        {mode.kind === 'create' && (
          <form className="involve-lookup__form" onSubmit={submitCreate}>
            {writeWarning && <WarningBanner>{writeWarning}</WarningBanner>}
            <label htmlFor="lookup-create-name">Name</label>
            <input
              ref={formRef}
              id="lookup-create-name"
              value={mode.name}
              onChange={(e) => setMode({ ...mode, name: e.target.value })}
              autoComplete="off"
              spellCheck={false}
              disabled={mode.saving}
            />
            {mode.error && (
              <p className="involve-lookup__form-error" role="alert">
                {mode.error}
              </p>
            )}
            <div className="involve-lookup__form-actions">
              <button
                type="button"
                className="involve-lookup__cancel"
                onClick={() => setMode({ kind: 'list' })}
                disabled={mode.saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="involve-lookup__save"
                disabled={mode.saving || mode.name.trim().length === 0}
              >
                {mode.saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {mode.kind === 'edit' && (
          <form className="involve-lookup__form" onSubmit={submitEdit}>
            {writeWarning && <WarningBanner>{writeWarning}</WarningBanner>}
            <label htmlFor="lookup-edit-name">Name</label>
            <input
              ref={formRef}
              id="lookup-edit-name"
              value={mode.name}
              onChange={(e) => setMode({ ...mode, name: e.target.value })}
              autoComplete="off"
              spellCheck={false}
              disabled={mode.saving}
            />
            {mode.error && (
              <p className="involve-lookup__form-error" role="alert">
                {mode.error}
              </p>
            )}
            <div className="involve-lookup__form-actions">
              <button
                type="button"
                className="involve-lookup__cancel"
                onClick={() => setMode({ kind: 'list' })}
                disabled={mode.saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="involve-lookup__save"
                disabled={mode.saving || mode.name.trim().length === 0}
              >
                {mode.saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

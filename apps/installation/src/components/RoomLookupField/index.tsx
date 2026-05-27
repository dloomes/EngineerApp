import { useEffect, useState } from 'react';
import type { DynamicsFunctionalLocation } from '@involve/shared';
import { LookupPanel } from '@involve/ui';
import { ApiError } from '@/api/client';
import { createRoom, getRooms, updateRoom } from '@/api/rooms';
import '../lookupField.css';

export interface RoomLookupFieldProps {
  // null when no site is selected yet — field is disabled in that state
  // per SPEC §7 ("Disabled until location chosen").
  siteId: string | null;
  // Account that owns the site — bound to the room on create so it shows up
  // under the customer record, not only the location.
  accountId: string;
  value: DynamicsFunctionalLocation | null;
  onChange: (room: DynamicsFunctionalLocation) => void;
}

export function RoomLookupField({
  siteId,
  accountId,
  value,
  onChange,
}: RoomLookupFieldProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<DynamicsFunctionalLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch rooms whenever the site changes. SPEC §17: rooms are ALWAYS
  // filtered by new_AssociatedSite — never show rooms from other sites.
  // The proxy enforces this; we just refetch on siteId change.
  useEffect(() => {
    if (!siteId) {
      setRooms([]);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getRooms(siteId)
      .then((data) => {
        if (!cancelled) setRooms(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? `Couldn't load rooms (${err.status}).`
            : "Couldn't load rooms.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  async function handleCreate(name: string): Promise<DynamicsFunctionalLocation> {
    if (!siteId) throw new Error('No site selected');
    const created = await createRoom(siteId, name, accountId);
    setRooms((prev) =>
      [...prev, created].sort((a, b) =>
        a.msdyn_name.localeCompare(b.msdyn_name),
      ),
    );
    return created;
  }

  async function handleEdit(
    item: DynamicsFunctionalLocation,
    newName: string,
  ): Promise<void> {
    await updateRoom(item.msdyn_functionallocationid, newName);
    setRooms((prev) =>
      prev
        .map((r) =>
          r.msdyn_functionallocationid === item.msdyn_functionallocationid
            ? { ...r, msdyn_name: newName }
            : r,
        )
        .sort((a, b) => a.msdyn_name.localeCompare(b.msdyn_name)),
    );
    if (
      value &&
      value.msdyn_functionallocationid === item.msdyn_functionallocationid
    ) {
      onChange({ ...value, msdyn_name: newName });
    }
  }

  const disabled = !siteId;
  const placeholder = disabled ? 'Select a location first' : 'Select room…';

  return (
    <div className="lookup-field">
      <label className="lookup-field__label" htmlFor="room-field-button">
        Room
      </label>
      <button
        id="room-field-button"
        type="button"
        className={`lookup-field__button${
          value ? ' lookup-field__button--selected' : ''
        }`}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span className="lookup-field__value">
          {value ? (
            value.msdyn_name
          ) : (
            <span className="lookup-field__placeholder">{placeholder}</span>
          )}
        </span>
        <span className="lookup-field__chevron" aria-hidden="true">
          ›
        </span>
      </button>
      {loadError && !open && (
        <p className="lookup-field__error" role="alert">
          {loadError}
        </p>
      )}

      <LookupPanel<DynamicsFunctionalLocation>
        open={open}
        onClose={() => setOpen(false)}
        title="Select room"
        items={rooms}
        loading={loading}
        loadError={loadError}
        getItemKey={(r) => r.msdyn_functionallocationid}
        getItemLabel={(r) => r.msdyn_name}
        selectedKey={value?.msdyn_functionallocationid}
        onSelect={onChange}
        onCreate={handleCreate}
        onEdit={handleEdit}
        addLabelPrefix="Add"
        createTitle="Add room"
        editTitle="Edit room"
        searchPlaceholder="Search rooms…"
        writeWarning="This will create or update a room record in Dynamics 365 against this location."
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { DynamicsAccountSite } from '@involve/shared';
import { LookupPanel } from '@involve/ui';
import { ApiError } from '@/api/client';
import { createSite, getSites, updateSite } from '@/api/sites';
import '../lookupField.css';

export interface SiteLookupFieldProps {
  accountId: string;
  value: DynamicsAccountSite | null;
  onChange: (site: DynamicsAccountSite) => void;
}

export function SiteLookupField({
  accountId,
  value,
  onChange,
}: SiteLookupFieldProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<DynamicsAccountSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getSites(accountId)
      .then((data) => {
        if (!cancelled) setSites(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? `Couldn't load locations (${err.status}).`
            : "Couldn't load locations.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  async function handleCreate(name: string): Promise<DynamicsAccountSite> {
    const created = await createSite(accountId, name);
    setSites((prev) =>
      [...prev, created].sort((a, b) =>
        a.involve_name.localeCompare(b.involve_name),
      ),
    );
    return created;
  }

  async function handleEdit(
    item: DynamicsAccountSite,
    newName: string,
  ): Promise<void> {
    await updateSite(item.involve_accountsiteid, newName);
    setSites((prev) =>
      prev
        .map((s) =>
          s.involve_accountsiteid === item.involve_accountsiteid
            ? { ...s, involve_name: newName }
            : s,
        )
        .sort((a, b) => a.involve_name.localeCompare(b.involve_name)),
    );
    if (value && value.involve_accountsiteid === item.involve_accountsiteid) {
      onChange({ ...value, involve_name: newName });
    }
  }

  return (
    <div className="lookup-field">
      <label className="lookup-field__label" htmlFor="site-field-button">
        Location
      </label>
      <button
        id="site-field-button"
        type="button"
        className={`lookup-field__button${
          value ? ' lookup-field__button--selected' : ''
        }`}
        onClick={() => setOpen(true)}
      >
        <span className="lookup-field__value">
          {value ? (
            value.involve_name
          ) : (
            <span className="lookup-field__placeholder">Select location…</span>
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

      <LookupPanel<DynamicsAccountSite>
        open={open}
        onClose={() => setOpen(false)}
        title="Select location"
        items={sites}
        loading={loading}
        loadError={loadError}
        getItemKey={(s) => s.involve_accountsiteid}
        getItemLabel={(s) => s.involve_name}
        selectedKey={value?.involve_accountsiteid}
        onSelect={onChange}
        onCreate={handleCreate}
        onEdit={handleEdit}
        addLabelPrefix="Add"
        createTitle="Add location"
        editTitle="Edit location"
        searchPlaceholder="Search locations…"
        writeWarning="This will create or update a location record in Dynamics 365 against this customer."
      />
    </div>
  );
}

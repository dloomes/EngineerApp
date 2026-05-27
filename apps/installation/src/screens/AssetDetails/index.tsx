import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type {
  DynamicsAccountSite,
  DynamicsFunctionalLocation,
  DynamicsOpportunity,
  DynamicsOpportunityProduct,
} from '@involve/shared';
import { SegmentedControl } from '@involve/ui';
import { ApiError } from '@/api/client';
import { type CreateAssetInput, createAsset } from '@/api/assets';
import type { AssetResult } from '@/lib/assetResult';
import { customerName } from '@/lib/customer';
import './AssetDetails.css';

const Scanner = lazy(() =>
  import('@involve/ui/scanner').then((m) => ({ default: m.Scanner })),
);

interface AssetState {
  opportunity?: DynamicsOpportunity;
  selectedLines?: DynamicsOpportunityProduct[];
  site?: DynamicsAccountSite;
  room?: DynamicsFunctionalLocation;
  results?: AssetResult[];
}

type SerialMode = 'scan' | 'manual' | 'none';

const SERIAL_OPTIONS = [
  { value: 'scan' as const, label: 'Scan' },
  { value: 'manual' as const, label: 'Manual' },
  { value: 'none' as const, label: 'None' },
];

function today(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function AssetDetails(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ index: string }>();
  const state = (location.state ?? {}) as AssetState;
  const { opportunity, site, room } = state;
  const selectedLines = state.selectedLines ?? [];
  const results = state.results ?? [];
  const index = Number.parseInt(params.index ?? '0', 10);
  const product = selectedLines[index];

  const [serialMode, setSerialMode] = useState<SerialMode>('manual');
  const [serial, setSerial] = useState('');
  const [installDate, setInstallDate] = useState(today());
  const [notes, setNotes] = useState('');
  // Notes are hidden behind a "+ Add note" toggle so the form stays compact
  // on mobile — most assets won't have notes.
  const [notesOpen, setNotesOpen] = useState(false);
  // Network details (IP / MAC / Software version) hidden behind a single
  // "+ Add network details" toggle — only relevant for connected devices.
  const [networkOpen, setNetworkOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [softwareVersion, setSoftwareVersion] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Holds the last failure so the engineer can choose Try again vs Skip.
  const [lastError, setLastError] = useState<{
    message: string;
    input: CreateAssetInput;
  } | null>(null);

  useEffect(() => {
    setSerialMode('manual');
    setSerial('');
    setInstallDate(today());
    setNotes('');
    setNotesOpen(false);
    setNetworkOpen(false);
    setIpAddress('');
    setMacAddress('');
    setSoftwareVersion('');
    setScannerOpen(false);
    setLastError(null);
  }, [index]);

  const serialRequired = serialMode === 'scan' || serialMode === 'manual';
  const isValid =
    (!serialRequired || serial.trim().length > 0) && installDate.length > 0;

  function advance(nextResults: AssetResult[]): void {
    if (!opportunity) return;
    const nextIndex = index + 1;
    if (nextIndex < selectedLines.length) {
      navigate(`/installation/asset/${nextIndex}`, {
        state: {
          opportunity,
          selectedLines,
          site,
          room,
          results: nextResults,
        },
      });
    } else {
      navigate('/installation/confirmation', {
        state: { opportunity, results: nextResults },
      });
    }
  }

  function buildInput(): CreateAssetInput | null {
    if (!opportunity || !product || !site || !room) return null;
    const serialNumber = serialMode === 'none' ? 'N/A' : serial.trim();
    return {
      productName: product.productname,
      ...(product._productid_value
        ? { productId: product._productid_value }
        : {}),
      accountId: opportunity._parentaccountid_value,
      siteId: site.involve_accountsiteid,
      roomId: room.msdyn_functionallocationid,
      serialNumber,
      ...(product.preact_manufacturer
        ? { manufacturer: product.preact_manufacturer }
        : {}),
      ...(product.preact_model ? { model: product.preact_model } : {}),
      installDate,
      assetCheck: false,
      opportunityProductId: product.opportunityproductid,
      // Item cost from the line. typeof check guards against accidentally
      // sending NaN if the field is ever missing/undefined.
      ...(typeof product.priceperunit === 'number'
        ? { cost: product.priceperunit }
        : {}),
      // PO Received date applies to every asset in this batch.
      ...(opportunity.involve_porecieved
        ? { purchaseDate: opportunity.involve_porecieved }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(ipAddress.trim() ? { ipAddress: ipAddress.trim() } : {}),
      ...(macAddress.trim() ? { macAddress: macAddress.trim() } : {}),
      ...(softwareVersion.trim()
        ? { softwareVersion: softwareVersion.trim() }
        : {}),
    };
  }

  // When a line has quantity > 1, selectedLines contains the same opp product
  // N times. Surface the engineer's position within that line so they know
  // they're on, say, the 2nd of 3 Sony Bravias rather than guessing.
  function linePosition(): { position: number; total: number } | null {
    if (!product) return null;
    const sameLine = selectedLines.filter(
      (l) => l.opportunityproductid === product.opportunityproductid,
    );
    if (sameLine.length <= 1) return null;
    const position = selectedLines
      .slice(0, index + 1)
      .filter(
        (l) => l.opportunityproductid === product.opportunityproductid,
      ).length;
    return { position, total: sameLine.length };
  }

  async function attemptSave(input: CreateAssetInput): Promise<void> {
    if (!product || saving) return;
    setSaving(true);
    setLastError(null);
    try {
      const asset = await createAsset(input);
      const result: AssetResult = {
        status: 'created',
        product,
        input,
        asset,
      };
      advance([...results, result]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `API error (${err.status}).`
          : 'Save failed.';
      setLastError({ message, input });
    } finally {
      setSaving(false);
    }
  }

  function handleSave(): void {
    if (!isValid) return;
    const input = buildInput();
    if (!input) return;
    void attemptSave(input);
  }

  function handleTryAgain(): void {
    if (!lastError) return;
    void attemptSave(lastError.input);
  }

  // Records the failure and advances anyway — engineer can retry from Confirmation.
  function handleSkip(): void {
    if (!lastError || !product) return;
    const result: AssetResult = {
      status: 'failed',
      product,
      input: lastError.input,
      error: lastError.message,
    };
    setLastError(null);
    advance([...results, result]);
  }

  function onChangeLocation(): void {
    if (!opportunity) return;
    navigate('/installation/location', {
      state: { opportunity, selectedLines, site, room, results },
    });
  }

  if (!opportunity || !product) {
    return (
      <section className="asset">
        <h2 className="asset__heading">No job loaded</h2>
        <p className="asset__placeholder">
          The job context was lost.{' '}
          <Link to="/installation">Start a new lookup</Link>.
        </p>
      </section>
    );
  }

  if (!site || !room) {
    return (
      <section className="asset">
        <h2 className="asset__heading">Pick a location first</h2>
        <p className="asset__placeholder">
          We need a location and room before saving assets.{' '}
          <Link
            to="/installation/location"
            state={{ opportunity, selectedLines, results }}
          >
            Pick location
          </Link>
          .
        </p>
      </section>
    );
  }

  const isLastProduct = index + 1 === selectedLines.length;
  const saveLabel = isLastProduct ? 'Save & finish →' : 'Save & next →';
  const skipLabel = isLastProduct ? 'Skip & finish →' : 'Skip & next →';
  const lineSlot = linePosition();

  return (
    <section className="asset">
      <p className="asset__progress">
        Asset {index + 1} of {selectedLines.length}
      </p>

      {/* Customer · Site · Room collapsed into one strip — frees ~120px
          above the fold so the product card (what the engineer is actually
          looking at in their hand) becomes the visual hero. */}
      <div className="asset__context">
        <span className="asset__context-text">
          {customerName(opportunity)} · {site.involve_name} ·{' '}
          {room.msdyn_name}
        </span>
        <button
          type="button"
          className="asset__context-change"
          onClick={onChangeLocation}
        >
          Change
        </button>
      </div>

      {(product.preact_manufacturer || product.preact_model || product.description) && (
        <div className="asset__product">
          <div className="asset__product-top">
            {product.preact_manufacturer && (
              <span className="asset__product-manufacturer">
                {product.preact_manufacturer}
              </span>
            )}
            {lineSlot && (
              <span className="asset__product-slot">
                unit {lineSlot.position} of {lineSlot.total}
              </span>
            )}
          </div>
          {product.preact_model && (
            <span className="asset__product-model">{product.preact_model}</span>
          )}
          {product.description && (
            <span className="asset__product-name">{product.description}</span>
          )}
        </div>
      )}

      <div className="asset__field">
        <label className="asset__field-label">Serial number</label>
        <SegmentedControl<SerialMode>
          value={serialMode}
          options={SERIAL_OPTIONS}
          onChange={setSerialMode}
          ariaLabel="Serial number entry mode"
        />
        {serialMode === 'manual' && (
          <input
            type="text"
            className="asset__serial-input"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Enter serial number"
            autoComplete="off"
            spellCheck={false}
          />
        )}
        {serialMode === 'scan' && (
          <div className="asset__scan">
            {serial ? (
              <div className="asset__scan-value">
                <span className="asset__scan-value-label">Scanned</span>
                <span className="asset__scan-value-text">{serial}</span>
              </div>
            ) : (
              <p className="asset__scan-hint">
                Tap below to open the camera and scan a barcode or QR code.
              </p>
            )}
            <button
              type="button"
              className="asset__scan-button"
              onClick={() => setScannerOpen(true)}
            >
              {serial ? 'Rescan' : 'Open scanner'}
            </button>
          </div>
        )}
        {serialMode === 'none' && (
          <p className="asset__scan-hint">
            "N/A" will be saved against this asset.
          </p>
        )}
      </div>

      <div className="asset__field">
        <label htmlFor="install-date" className="asset__field-label">
          Install date
        </label>
        <input
          id="install-date"
          type="date"
          className="asset__date-input"
          value={installDate}
          onChange={(e) => setInstallDate(e.target.value)}
        />
      </div>

      {networkOpen ? (
        <div className="asset__group">
          <div className="asset__group-header">
            <span className="asset__group-title">Network details</span>
            <button
              type="button"
              className="asset__group-close"
              onClick={() => {
                setIpAddress('');
                setMacAddress('');
                setSoftwareVersion('');
                setNetworkOpen(false);
              }}
              aria-label="Remove network details"
            >
              ×
            </button>
          </div>
          <div className="asset__field">
            <label htmlFor="asset-ip" className="asset__field-label">
              IP address
            </label>
            <input
              id="asset-ip"
              type="text"
              inputMode="numeric"
              className="asset__network-input asset__network-input--mono"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.42"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
          <div className="asset__field">
            <label htmlFor="asset-mac" className="asset__field-label">
              MAC address
            </label>
            <input
              id="asset-mac"
              type="text"
              className="asset__network-input asset__network-input--mono"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>
          <div className="asset__field">
            <label htmlFor="asset-sw" className="asset__field-label">
              Software / firmware version
            </label>
            <input
              id="asset-sw"
              type="text"
              className="asset__network-input"
              value={softwareVersion}
              onChange={(e) => setSoftwareVersion(e.target.value)}
              placeholder="e.g. 4.12.1"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="asset__group-toggle"
          onClick={() => setNetworkOpen(true)}
        >
          <span className="asset__group-toggle-icon" aria-hidden="true">＋</span>
          Add network details
        </button>
      )}

      {notesOpen ? (
        <div className="asset__field">
          <div className="asset__notes-header">
            <label htmlFor="asset-notes" className="asset__field-label">
              Notes
            </label>
            <button
              type="button"
              className="asset__notes-close"
              onClick={() => {
                setNotes('');
                setNotesOpen(false);
              }}
              aria-label="Remove notes"
            >
              ×
            </button>
          </div>
          <textarea
            id="asset-notes"
            className="asset__notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth recording about this unit?"
            rows={3}
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          className="asset__group-toggle"
          onClick={() => setNotesOpen(true)}
        >
          <span className="asset__group-toggle-icon" aria-hidden="true">＋</span>
          Add note
        </button>
      )}

      {lastError && (
        <div className="asset__save-error" role="alert">
          <p className="asset__save-error-message">{lastError.message}</p>
          <div className="asset__save-error-actions">
            <button
              type="button"
              className="asset__skip"
              onClick={handleSkip}
              disabled={saving}
            >
              {skipLabel}
            </button>
            <button
              type="button"
              className="asset__try-again"
              onClick={handleTryAgain}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Try again'}
            </button>
          </div>
        </div>
      )}

      <footer className="asset__footer">
        <button
          type="button"
          className="asset__save"
          onClick={handleSave}
          disabled={!isValid || saving || lastError !== null}
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </footer>

      {scannerOpen && (
        <Suspense fallback={null}>
          <Scanner
            onScan={(value) => {
              setSerial(value);
              setScannerOpen(false);
            }}
            onCancel={() => setScannerOpen(false)}
          />
        </Suspense>
      )}
    </section>
  );
}

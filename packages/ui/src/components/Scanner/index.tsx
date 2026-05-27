import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import './Scanner.css';

export interface ScannerProps {
  onScan: (value: string) => void;
  onCancel: () => void;
}

type Status = 'starting' | 'scanning' | 'error';

// Friendly error mapping for common getUserMedia failures.
function describeCameraError(err: unknown): string {
  if (!(err instanceof Error)) return 'Camera unavailable.';
  switch (err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was denied. Allow camera access in your browser settings and try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
      return 'The camera is in use by another app. Close it and try again.';
    default:
      return err.message || 'Camera unavailable.';
  }
}

export function Scanner({ onScan, onCancel }: ScannerProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>('starting');
  const [error, setError] = useState<string | null>(null);

  // Keep the latest onScan in a ref so the camera-init effect doesn't re-run
  // when parent state changes (which would tear down + restart the camera).
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let controls: IScannerControls | null = null;
    let cancelled = false;
    let scanFired = false;

    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints(
        // Prefer the rear camera on phones; falls back to whatever's available.
        { video: { facingMode: { ideal: 'environment' } } },
        video,
        (result, _err, c) => {
          if (cancelled || scanFired) return;
          if (result) {
            scanFired = true;
            c.stop();
            onScanRef.current(result.getText());
          }
          // _err is usually NotFoundException — normal "no barcode this frame"
        },
      )
      .then((c) => {
        if (cancelled) {
          c.stop();
          return;
        }
        controls = c;
        setStatus('scanning');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(describeCameraError(err));
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  // ESC closes scanner.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="involve-scanner"
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scanner"
    >
      <video
        ref={videoRef}
        className="involve-scanner__video"
        playsInline
        muted
        autoPlay
      />

      <div className="involve-scanner__viewfinder" aria-hidden="true" />

      <header className="involve-scanner__header">
        <h2 className="involve-scanner__title">Scan barcode or QR</h2>
        <button
          type="button"
          className="involve-scanner__cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </header>

      <div className="involve-scanner__status">
        {status === 'starting' && <span>Starting camera…</span>}
        {status === 'scanning' && <span>Point at a barcode or QR code</span>}
        {status === 'error' && error && (
          <span className="involve-scanner__error">{error}</span>
        )}
      </div>
    </div>
  );
}

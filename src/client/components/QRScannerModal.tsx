import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, QrCode, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
  title: string;
  subtitle?: string;
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  title,
  subtitle = 'Point your camera directly at the code badge',
  onScanSuccess,
  onClose,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader-container';

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            html5QrCode?.stop().catch(() => {});
            onScanSuccess(decodedText);
          },
          () => {
            // Ignore scan parse frame misses
          }
        );
        setIsScanning(true);
      } catch (err: any) {
        console.warn('[QRScanner] Camera start failed:', err);
        setCameraError(err.message || 'Camera permission denied or camera not available.');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScanSuccess]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim().toUpperCase());
    }
  };

  return (
    <div className="fixed inset-0 z-[700] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          <p className="text-xs text-slate-400 text-center mb-3">{subtitle}</p>

          {/* Scanner view port */}
          <div className="relative w-full aspect-square max-w-[260px] bg-black rounded-2xl overflow-hidden border-2 border-dashed border-cyan-500/50 flex items-center justify-center">
            <div id={containerId} className="w-full h-full" />
            {cameraError && (
              <div className="absolute inset-0 p-4 bg-slate-900/90 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-xs text-amber-200 font-medium">{cameraError}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Use the manual entry code input below to test!
                </p>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="w-full mt-4 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 text-center">
              Or Enter Token / Code Manually
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. CATCH_P1_ABC12 or WATER_GF"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


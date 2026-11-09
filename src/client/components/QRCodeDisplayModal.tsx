import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ShieldCheck, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface QRCodeDisplayModalProps {
  token: string;
  playerName: string;
  onClose: () => void;
}

export const QRCodeDisplayModal: React.FC<QRCodeDisplayModalProps> = ({
  token,
  playerName,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[700] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center p-6 text-center">
        <div className="w-full flex justify-end">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center text-cyan-300 mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h3 className="text-base font-black text-slate-100 uppercase tracking-wide">
          Crewmate Identity Badge
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
          If cornered by a Hunter, show this QR code to confirm physical catch.
        </p>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl shadow-xl mt-4 mb-4 border-4 border-cyan-500/40">
          <QRCodeSVG value={token} size={180} level="M" />
        </div>

        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-[11px] text-cyan-400">
          <span>{token}</span>
          <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-white transition"
            title="Copy Token"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <p className="text-[10px] text-slate-500 mt-3">
          Anti-Cheat Protected: Server validates token uniqueness and active hunt status.
        </p>
      </div>
    </div>
  );
};

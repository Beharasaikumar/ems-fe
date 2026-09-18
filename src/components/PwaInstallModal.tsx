import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  Check,
  Copy,
  X,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Share2,
  MoreVertical,
  PlusSquare,
  MonitorDown,
} from 'lucide-react';
import { PwaPlatformInfo } from '../hooks/usePwaInstall';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  canInstall: boolean;
  installed: boolean;
  onInstall: () => Promise<boolean>;
  platform: PwaPlatformInfo;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  canInstall,
  installed,
  onInstall,
  platform,
}) => {
  const [copied, setCopied] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is blocked
    }
  };

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await onInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  const isApple = platform.os === 'ios';
  const isAndroid = platform.os === 'android';
  const isDesktop = !platform.isMobile;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient banner */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white p-6 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-white/10 p-2 border border-white/20 shadow-inner flex items-center justify-center shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="Lomaa Logo"
                className="w-full h-full object-contain"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <Sparkles size={8} className="text-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white leading-tight">Lomaa EMS</h3>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                  PWA App
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Lomaa IT Solutions Employee Management System
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Status Message */}
          {installed ? (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-sm text-emerald-800">App is Already Installed!</p>
                <p className="text-emerald-700 mt-0.5">
                  Lomaa EMS is already running or added to your device. You can access it directly from your applications or home screen.
                </p>
              </div>
            </div>
          ) : canInstall ? (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <Sparkles size={20} className="text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="text-xs">
                <p className="font-bold text-sm text-emerald-800">Ready for Instant 1-Click Install</p>
                <p className="text-emerald-700 mt-0.5">
                  Click the button below to install Lomaa EMS directly to your device desktop/home screen with offline access.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
              <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-sm text-slate-900">Install via Browser Menu</p>
                <p className="text-slate-600 mt-0.5">
                  Follow the quick step-by-step instructions below for your device to add Lomaa EMS as a standalone app.
                </p>
              </div>
            </div>
          )}

          {/* Installation steps for user's platform */}
          {!installed && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Installation Steps ({isDesktop ? 'Desktop PC' : isApple ? 'iOS Safari' : 'Android Chrome'}):
              </p>

              {isDesktop && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <MonitorDown size={14} className="text-emerald-600" /> Look for the Install icon in the address bar
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        Click the computer/download icon (<strong>⤓</strong>) located on the right side of your Chrome or Edge URL bar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <MoreVertical size={14} className="text-emerald-600" /> Or use the browser menu
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        Click the three dots (<strong>⋮</strong>) in the top-right &rarr; click <strong>"Install Lomaa IT Solutions..."</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800">Confirm Installation</span>
                      <p className="text-slate-500 mt-0.5">
                        Click <strong>Install</strong>. Lomaa EMS will open in its own clean window and be pinned to your Taskbar or Desktop.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isApple && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Share2 size={14} className="text-emerald-600" /> Tap the Share button
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        In Safari, tap the <strong>Share</strong> button (the box with an upward arrow) in the bottom navigation bar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <PlusSquare size={14} className="text-emerald-600" /> Select "Add to Home Screen"
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        Scroll down the share sheet options and tap <strong>Add to Home Screen</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800">Confirm "Add"</span>
                      <p className="text-slate-500 mt-0.5">
                        Tap <strong>Add</strong> in the top-right corner. Lomaa EMS will appear directly on your Home Screen.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isAndroid && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <MoreVertical size={14} className="text-emerald-600" /> Tap the browser menu
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        In Chrome, tap the three dots (<strong>⋮</strong>) in the top-right corner.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Download size={14} className="text-emerald-600" /> Tap "Install app"
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800">Confirm "Install"</span>
                      <p className="text-slate-500 mt-0.5">
                        Tap <strong>Install</strong> when prompted. Lomaa EMS will be installed directly into your app drawer.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* App features summary */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-lg">⚡</span>
              <p className="text-[11px] font-bold text-slate-800 mt-1">Instant Load</p>
              <p className="text-[9px] text-slate-500">Fast cache &amp; response</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-lg">📱</span>
              <p className="text-[11px] font-bold text-slate-800 mt-1">Standalone</p>
              <p className="text-[9px] text-slate-500">No URL bar distraction</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-lg">🔒</span>
              <p className="text-[11px] font-bold text-slate-800 mt-1">Encrypted</p>
              <p className="text-[9px] text-slate-500">Secure enterprise sync</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            {canInstall && !installed ? (
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <Download size={16} />
                <span>{isInstalling ? 'Installing Lomaa EMS...' : 'Install App Now'}</span>
              </button>
            ) : null}

            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              <span>{copied ? 'Link Copied!' : 'Copy App Link'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

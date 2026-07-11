import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Keyboard, Command } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "dark" | "light";
}

export default function HelpModal({ isOpen, onClose, theme }: HelpModalProps) {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifier = isMac ? "Cmd" : "Ctrl";
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
              theme === "dark" 
                ? "bg-zinc-900 border-white/10 shadow-black/50" 
                : "bg-white border-zinc-200 shadow-zinc-300/50"
            }`}
          >
            {/* Header */}
            <div className={`px-6 py-5 border-b flex items-center justify-between ${theme === "dark" ? "border-white/10" : "border-zinc-200"}`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-white/5 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                    Keyboard Shortcuts
                  </h2>
                  <p className={`text-xs ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
                    Boost your productivity with quick navigation
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  theme === "dark"
                    ? "hover:bg-white/10 text-zinc-400 hover:text-white"
                    : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className={`p-6 space-y-6 ${theme === "dark" ? "bg-zinc-900" : "bg-white"}`}>
              {/* Navigation Group */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${theme === "dark" ? "text-zinc-500" : "text-zinc-400"}`}>
                  Navigation
                </h3>
                <div className="space-y-3">
                  <ShortcutRow label="Go to Logo Tab" keys={[modifier, "1"]} theme={theme} isMac={isMac} />
                  <ShortcutRow label="Go to Product Tab" keys={[modifier, "2"]} theme={theme} isMac={isMac} />
                  <ShortcutRow label="Go to Place Tab" keys={[modifier, "3"]} theme={theme} isMac={isMac} />
                  <ShortcutRow label="Go to Saved Presets Tab" keys={[modifier, "4"]} theme={theme} isMac={isMac} />
                </div>
              </div>

              {/* Actions Group */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${theme === "dark" ? "text-zinc-500" : "text-zinc-400"}`}>
                  Actions
                </h3>
                <div className="space-y-3">
                  <ShortcutRow label="Undo action" keys={[modifier, "Z"]} theme={theme} isMac={isMac} />
                  <ShortcutRow label="Redo action" keys={[modifier, "Shift", "Z"]} alternateKeys={[modifier, "Y"]} theme={theme} isMac={isMac} />
                  <ShortcutRow label="Save current configuration" keys={[modifier, "S"]} theme={theme} isMac={isMac} />
                  <ShortcutRow label="Toggle Quick Preview" keys={[modifier, "K"]} theme={theme} isMac={isMac} />
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className={`px-6 py-4 border-t flex justify-center ${theme === "dark" ? "bg-zinc-950/50 border-white/5" : "bg-zinc-50 border-zinc-200"}`}>
               <p className={`text-[11px] font-medium ${theme === "dark" ? "text-zinc-500" : "text-zinc-400"}`}>
                  Pro Tip: Shortcuts ignore inputs when you're typing.
               </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ShortcutRow({ label, keys, alternateKeys, theme, isMac }: { label: string, keys: string[], alternateKeys?: string[], theme: string, isMac: boolean }) {
  return (
    <div className="flex items-center justify-between group">
      <span className={`text-sm font-medium ${theme === "dark" ? "text-zinc-300 group-hover:text-white" : "text-zinc-600 group-hover:text-zinc-900"} transition-colors`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <KeyGroup keys={keys} theme={theme} isMac={isMac} />
        {alternateKeys && (
          <>
            <span className={`text-[10px] font-bold ${theme === "dark" ? "text-zinc-600" : "text-zinc-400"}`}>OR</span>
            <KeyGroup keys={alternateKeys} theme={theme} isMac={isMac} />
          </>
        )}
      </div>
    </div>
  );
}

function KeyGroup({ keys, theme, isMac }: { keys: string[], theme: string, isMac: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className={`min-w-[24px] h-6 px-1.5 inline-flex items-center justify-center text-[11px] font-bold font-mono rounded border shadow-sm ${
            theme === "dark"
              ? "bg-zinc-800 border-zinc-700 text-zinc-300 shadow-black/20"
              : "bg-white border-zinc-200 text-zinc-700 shadow-zinc-200"
          }`}
        >
          {k === "Cmd" ? <Command className="h-3 w-3" /> : k}
        </kbd>
      ))}
    </div>
  );
}

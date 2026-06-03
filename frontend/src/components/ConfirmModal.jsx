import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = "Confirm Action", 
  message = "Are you sure continuing?",
  requireInput = false,
  inputValue = '',
  onInputChange = () => {},
  inputPlaceholder = 'Enter required link/value...'
}) {
  const isConfirmDisabled = requireInput && !inputValue.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-white/90 backdrop-blur-lg border border-slate-200/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center z-10"
          >
            {/* Animated Icon */}
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
            >
              <HelpCircle size={32} className="animate-pulse" />
            </motion.div>

            {/* Title & Prompt */}
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2">
              {title}
            </h3>
            
            <p className="text-sm font-semibold text-blue-600 mb-4 tracking-wide uppercase">
              {message}
            </p>
            
            <p className="text-xs text-slate-500 max-w-xs mb-6">
              Please review the action details before confirming to proceed. This action will change platform escrow states.
            </p>

            {requireInput && (
              <div className="w-full mb-6 text-left">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => onInputChange(e.target.value)}
                  placeholder={inputPlaceholder}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  required
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-all hover:shadow-md active:scale-95"
              >
                No, Go Back
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirmDisabled}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold rounded-2xl text-sm shadow-lg hover:shadow-xl hover:shadow-blue-500/10 transition-all active:scale-95 disabled:shadow-none disabled:active:scale-100"
              >
                Yes, Continue
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

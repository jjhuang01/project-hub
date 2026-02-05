'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 transform">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {isDestructive && <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertTriangle size={20} /></div>}
             <h3 className="font-bold text-lg text-gray-900">{title}</h3>
          </div>
          <button 
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={clsx(
              "px-6 py-2 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2",
              isDestructive 
                ? "bg-red-600 hover:bg-red-700 hover:shadow-red-500/20" 
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20"
            )}
          >
            {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

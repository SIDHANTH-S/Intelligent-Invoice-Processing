import React from 'react';
import { PlayCircle, ArrowRight, X } from 'lucide-react';

interface GuidedDemoProps {
  isOpen: boolean;
  currentStep: number;
  onClose: () => void;
  onNext: () => void;
  steps: Array<{ key: string; title: string; description: string; cta?: string }>; 
}

export const GuidedDemo: React.FC<GuidedDemoProps> = ({ isOpen, currentStep, onClose, onNext, steps }) => {
  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          aria-label="Close demo"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Guided Demo</h3>
            <p className="text-xs text-gray-500">Step {currentStep + 1} of {steps.length}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-lg font-semibold text-gray-900">{step.title}</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <span>{step.cta || 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};



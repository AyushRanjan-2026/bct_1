import { useState } from 'react';

function CollapsibleCard({ title, children, defaultOpen = false, icon = null }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm animate-slide-up mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-3">
          {icon && <span className="text-2xl">{icon}</span>}
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleCard;

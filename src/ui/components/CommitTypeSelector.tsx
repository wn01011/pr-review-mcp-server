import React from 'react';

interface CommitType {
  value: string;
  label: string;
  color: string;
}

interface CommitTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const CommitTypeSelector: React.FC<CommitTypeSelectorProps> = ({ value, onChange }) => {
  const commitTypes: CommitType[] = [
    { value: 'feat', label: '✨ Feature', color: 'bg-green-100 text-green-800' },
    { value: 'fix', label: '🐛 Bug Fix', color: 'bg-red-100 text-red-800' },
    { value: 'refactor', label: '♻️ Refactor', color: 'bg-blue-100 text-blue-800' },
    { value: 'perf', label: '⚡ Performance', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'docs', label: '📚 Documentation', color: 'bg-purple-100 text-purple-800' },
    { value: 'test', label: '🧪 Testing', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'chore', label: '🔧 Chore', color: 'bg-gray-100 text-gray-800' }
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {commitTypes.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            value === type.value 
              ? type.color + ' ring-2 ring-blue-500 ring-offset-1' 
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
};

export default CommitTypeSelector;

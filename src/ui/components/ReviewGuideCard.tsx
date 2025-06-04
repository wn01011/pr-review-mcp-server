import React, { useState } from 'react';
import { CheckCircle, BarChart3, AlertCircle, FileText, Code } from 'lucide-react';

interface ReviewGuide {
  title: string;
  checklist: string[];
  focus_areas: string[];
  common_issues: string[];
  best_practices: string[];
}

interface ReviewGuideCardProps {
  guide: ReviewGuide;
}

const ReviewGuideCard: React.FC<ReviewGuideCardProps> = ({ guide }) => {
  const [activeTab, setActiveTab] = useState('checklist');
  
  const tabs = [
    { id: 'checklist', label: '체크리스트', icon: CheckCircle },
    { id: 'focus', label: '집중 영역', icon: BarChart3 },
    { id: 'issues', label: '주의사항', icon: AlertCircle },
    { id: 'practices', label: '모범 사례', icon: FileText }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Code className="w-5 h-5 text-purple-500 mr-2" />
          {guide.title}
        </h3>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4 inline mr-1" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-6">
        {activeTab === 'checklist' && (
          <ul className="space-y-3">
            {guide.checklist.map((item, index) => (
              <li key={index} className="flex items-start">
                <input 
                  type="checkbox" 
                  className="mt-1 mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'focus' && (
          <div className="grid grid-cols-2 gap-3">
            {guide.focus_areas.map((area, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-3">
                <span className="text-sm font-medium text-blue-800">{area}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'issues' && (
          <ul className="space-y-3">
            {guide.common_issues.map((issue, index) => (
              <li key={index} className="flex items-start text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                {issue}
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'practices' && (
          <ul className="space-y-3">
            {guide.best_practices.map((practice, index) => (
              <li key={index} className="flex items-start text-sm text-green-600">
                <CheckCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                {practice}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ReviewGuideCard;

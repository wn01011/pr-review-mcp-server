import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface QualityBreakdown {
  complexity: number;
  maintainability: number;
  testability: number;
  security: number;
  performance: number;
}

interface QualityScoreCardProps {
  score: number;
  breakdown?: QualityBreakdown;
}

const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ score, breakdown }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number): JSX.Element => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  const getBreakdownLabel = (key: string): string => {
    const labels: Record<string, string> = {
      complexity: '복잡도',
      maintainability: '유지보수성',
      testability: '테스트 가능성',
      security: '보안',
      performance: '성능'
    };
    return labels[key] || key;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">품질 점수</h3>
        {getScoreIcon(score)}
      </div>
      
      <div className="text-center mb-6">
        <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
        <div className="text-sm text-gray-500">/ 100</div>
      </div>

      {breakdown && (
        <div className="space-y-3">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {getBreakdownLabel(key)}
              </span>
              <div className="flex items-center">
                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className={`h-2 rounded-full ${
                      value >= 8 ? 'bg-green-500' : 
                      value >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${value * 10}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{value}/10</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QualityScoreCard;

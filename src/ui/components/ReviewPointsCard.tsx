import React from 'react';
import { CheckCircle, Shield, Zap } from 'lucide-react';

interface ReviewPointsCardProps {
  points: string[];
  suggestions: string[];
  securityConcerns: string[];
  performanceImpact: string[];
}

const ReviewPointsCard: React.FC<ReviewPointsCardProps> = ({ 
  points, 
  suggestions, 
  securityConcerns, 
  performanceImpact 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
        리뷰 포인트
      </h3>
      
      <div className="space-y-6">
        {/* 검토 사항 */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">🔍 확인 사항</h4>
          <ul className="space-y-2">
            {points.map((point, index) => (
              <li key={index} className="flex items-start text-sm text-gray-600">
                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* 개선 제안 */}
        {suggestions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">💡 개선 제안</h4>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 보안 우려사항 */}
        {securityConcerns.length > 0 && (
          <div>
            <h4 className="font-medium text-red-700 mb-2 flex items-center">
              <Shield className="w-4 h-4 mr-1" />
              보안 검토 필요
            </h4>
            <ul className="space-y-2">
              {securityConcerns.map((concern, index) => (
                <li key={index} className="flex items-start text-sm text-red-600">
                  <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 성능 영향 */}
        {performanceImpact.length > 0 && (
          <div>
            <h4 className="font-medium text-orange-700 mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-1" />
              성능 고려사항
            </h4>
            <ul className="space-y-2">
              {performanceImpact.map((impact, index) => (
                <li key={index} className="flex items-start text-sm text-orange-600">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {impact}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPointsCard;

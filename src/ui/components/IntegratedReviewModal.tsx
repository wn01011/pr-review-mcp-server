import React from 'react';

interface AnalysisResult {
  analysis: {
    summary: string;
    quality_score: number;
    review_points: string[];
    suggestions: string[];
    security_concerns: string[];
    performance_impact: string[];
  };
  metadata: {
    pr_number: number;
    repo: string;
    analyzed_at: string;
    file_count: number;
    lines_changed: {
      added: number;
      deleted: number;
    };
  };
}

interface ReviewGuide {
  title: string;
  checklist: string[];
  focus_areas: string[];
  common_issues: string[];
  best_practices: string[];
}

interface IntegratedReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AnalysisResult;
  reviewGuide: ReviewGuide;
}

const IntegratedReviewModal: React.FC<IntegratedReviewModalProps> = ({ 
  isOpen, 
  onClose, 
  analysisResult, 
  reviewGuide 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">통합 리뷰 체크</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 모달 콘텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽: AI 분석 결과 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">AI 분석 결과</h3>
              
              {/* 요약 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">분석 요약</h4>
                <p className="text-sm text-blue-700">{analysisResult.analysis.summary}</p>
              </div>

              {/* 품질 점수 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">품질 점수</span>
                  <span className={`text-2xl font-bold ${
                    analysisResult.analysis.quality_score >= 80 ? 'text-green-600' :
                    analysisResult.analysis.quality_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {analysisResult.analysis.quality_score}/100
                  </span>
                </div>
              </div>

              {/* 리뷰 포인트 */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">확인 사항</h4>
                <ul className="space-y-2">
                  {analysisResult.analysis.review_points.map((point, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <input 
                        type="checkbox" 
                        className="mt-1 mr-2 rounded border-gray-300"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 개선 제안 */}
              {analysisResult.analysis.suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">개선 제안</h4>
                  <ul className="space-y-2">
                    {analysisResult.analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start text-sm text-green-600">
                        <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 오른쪽: 리뷰 가이드 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">리뷰 가이드</h3>
              
              {/* 체크리스트 */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">체크리스트</h4>
                <ul className="space-y-2">
                  {reviewGuide.checklist.map((item, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <input 
                        type="checkbox" 
                        className="mt-1 mr-2 rounded border-gray-300"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 집중 영역 */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">집중 영역</h4>
                <div className="flex flex-wrap gap-2">
                  {reviewGuide.focus_areas.map((area, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* 주의사항 */}
              <div>
                <h4 className="font-medium text-red-700 mb-2">주의사항</h4>
                <ul className="space-y-1">
                  {reviewGuide.common_issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600">
                      • {issue}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 모범 사례 */}
              <div>
                <h4 className="font-medium text-green-700 mb-2">모범 사례</h4>
                <ul className="space-y-1">
                  {reviewGuide.best_practices.map((practice, index) => (
                    <li key={index} className="text-sm text-green-600">
                      • {practice}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            닫기
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            리뷰 완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegratedReviewModal;

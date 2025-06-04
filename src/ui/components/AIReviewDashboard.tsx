import React, { useState, useEffect } from 'react';
import { Search, GitPullRequest, CheckCircle, AlertCircle, Clock, Settings, BarChart3, FileText, Shield, Zap, Code, RefreshCw, Eye } from 'lucide-react';
import CommitTypeSelector from './CommitTypeSelector';
import QualityScoreCard from './QualityScoreCard';
import ReviewPointsCard from './ReviewPointsCard';
import ReviewGuideCard from './ReviewGuideCard';
import IntegratedReviewModal from './IntegratedReviewModal';
import { useAIReview, useReviewGuide, useQualityScore, useHealthCheck } from '../hooks/useAIReview';

// Mock 데이터
const mockAnalysisResult = {
  success: true,
  analysis: {
    summary: "새로운 사용자 인증 기능이 추가되었습니다. JWT 토큰 기반 인증과 비밀번호 해싱이 구현되었으며, 전반적으로 보안 모범 사례를 잘 따르고 있습니다.",
    quality_score: 87,
    review_points: [
      "JWT 토큰의 만료 시간 설정 확인",
      "비밀번호 복잡성 검증 로직 추가",
      "에러 메시지에서 민감한 정보 노출 여부 확인",
      "입력 데이터 검증 강화 필요"
    ],
    suggestions: [
      "refresh token 구현을 고려해보세요",
      "비밀번호 정책을 더 엄격하게 설정하는 것을 권장합니다",
      "API rate limiting 추가를 검토해보세요"
    ],
    security_concerns: [
      "JWT secret key가 환경변수로 안전하게 관리되는지 확인 필요"
    ],
    performance_impact: [
      "bcrypt 해싱 성능 최적화 고려"
    ]
  },
  metadata: {
    pr_number: 123,
    repo: "company/auth-service",
    analyzed_at: "2024-06-04T10:30:00Z",
    file_count: 8,
    lines_changed: { added: 245, deleted: 12 }
  }
};

const mockReviewGuide = {
  success: true,
  guide: {
    commit_type: "feat",
    title: "새로운 기능 개발 리뷰 가이드",
    checklist: [
      "API 설계가 RESTful 원칙을 따르는가?",
      "비즈니스 요구사항과 일치하는가?",
      "에러 핸들링이 적절한가?",
      "보안 취약점은 없는가?",
      "성능에 미치는 영향을 고려했는가?"
    ],
    focus_areas: ["API 설계", "비즈니스 로직", "에러 처리", "보안", "성능"],
    common_issues: [
      "불완전한 에러 처리",
      "API 설계 미스",
      "보안 고려사항 누락",
      "테스트 커버리지 부족"
    ],
    best_practices: [
      "단위 테스트 작성",
      "API 문서화",
      "에러 코드 표준화",
      "보안 검토 수행"
    ]
  }
};

const AIReviewDashboard: React.FC = () => {
  // 상태 관리
  const [repo, setRepo] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [commitType, setCommitType] = useState('feat');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  // mock 데이터 상태 추가
  const [mockData, setMockData] = useState<any>(null);
  const [mockGuide, setMockGuide] = useState<any>(null);

  // 커스텀 훅 사용
  const aiReview = useAIReview();
  const reviewGuide = useReviewGuide();
  const qualityScore = useQualityScore();
  const healthCheck = useHealthCheck();

  // 컴포넌트 마운트 시 헬스체크
  useEffect(() => {
    healthCheck.checkHealth();
  }, []);

  // PR 분석 실행
  const handleAnalyzePR = async () => {
    if (!repo || !prNumber) {
      alert('저장소와 PR 번호를 입력해주세요.');
      return;
    }

    if (useMockData) {
      setMockData(mockAnalysisResult); // mock 데이터 상태에 저장
    } else {
      setMockData(null);
      try {
        await aiReview.analyzePR({
          repo,
          pr_number: parseInt(prNumber),
          commit_type: commitType
        });
      } catch (error) {
        console.error('PR 분석 실패:', error);
      }
    }
  };

  // 리뷰 가이드 생성
  const handleGenerateGuide = async () => {
    if (useMockData) {
      setMockGuide(mockReviewGuide.guide);
    } else {
      setMockGuide(null);
      try {
        await reviewGuide.generateReviewGuide({
          commit_type: commitType,
          file_changes: []
        });
      } catch (error) {
        console.error('리뷰 가이드 생성 실패:', error);
      }
    }
  };

  // 통합 리뷰 모달 열기
  const openIntegratedReview = () => {
    setIsModalOpen(true);
  };

  // 현재 데이터 (Mock 또는 실제 데이터)
  const currentAnalysisResult = useMockData ? mockData : aiReview.data;
  const currentReviewGuide = useMockData ? mockGuide : reviewGuide.data?.guide;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Code className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">AI Code Review</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 서버 상태 표시 */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  healthCheck.status === 'healthy' ? 'bg-green-500' :
                  healthCheck.status === 'unhealthy' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {healthCheck.status === 'healthy' ? 'Connected' :
                   healthCheck.status === 'unhealthy' ? 'Disconnected' : 'Unknown'}
                </span>
              </div>

              {/* Mock 데이터 토글 */}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Mock 데이터</span>
              </label>

              <button
                onClick={healthCheck.checkHealth}
                className="p-2 text-gray-400 hover:text-gray-600"
                disabled={healthCheck.loading}
              >
                <RefreshCw className={`w-5 h-5 ${healthCheck.loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* PR 분석 입력 섹션 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <GitPullRequest className="w-5 h-5 text-blue-500 mr-2" />
              PR 분석 요청
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  저장소 (owner/repo)
                </label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="예: facebook/react"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PR 번호
                </label>
                <input
                  type="number"
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  placeholder="예: 123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                커밋 타입
              </label>
              <CommitTypeSelector value={commitType} onChange={setCommitType} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAnalyzePR}
                disabled={aiReview.loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiReview.loading ? (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                PR 분석
              </button>

              <button
                onClick={handleGenerateGuide}
                disabled={reviewGuide.loading}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewGuide.loading ? (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                리뷰 가이드 생성
              </button>

              {(currentAnalysisResult && currentReviewGuide) && (
                <button
                  onClick={openIntegratedReview}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  통합 리뷰 체크
                </button>
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {(aiReview.error || reviewGuide.error) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">
                  {aiReview.error || reviewGuide.error}
                </span>
              </div>
            </div>
          )}

          {/* 결과 섹션 */}
          {currentAnalysisResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 품질 점수 카드 */}
              <QualityScoreCard
                score={currentAnalysisResult.analysis.quality_score}
                breakdown={{
                  complexity: 7,
                  maintainability: 8,
                  testability: 6,
                  security: 9,
                  performance: 7
                }}
              />

              {/* 리뷰 포인트 카드 */}
              <div className="lg:col-span-2">
                <ReviewPointsCard
                  points={currentAnalysisResult.analysis.review_points}
                  suggestions={currentAnalysisResult.analysis.suggestions}
                  securityConcerns={currentAnalysisResult.analysis.security_concerns}
                  performanceImpact={currentAnalysisResult.analysis.performance_impact}
                />
              </div>
            </div>
          )}

          {/* 리뷰 가이드 섹션 */}
          {currentReviewGuide && (
            <ReviewGuideCard guide={currentReviewGuide} />
          )}
        </div>
      </main>

      {/* 통합 리뷰 모달 */}
      {currentAnalysisResult && currentReviewGuide && (
        <IntegratedReviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          analysisResult={currentAnalysisResult}
          reviewGuide={currentReviewGuide}
        />
      )}
    </div>
  );
};

export default AIReviewDashboard;

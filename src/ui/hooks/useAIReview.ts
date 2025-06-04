import { useState, useCallback } from 'react';

interface PRAnalysisData {
  repo: string;
  pr_number: number;
  commit_type?: string;
}

interface ReviewGuideData {
  commit_type: string;
  file_changes?: string[];
}

interface QualityScoreData {
  changes: any[];
  metrics?: any;
}

interface AnalysisResult {
  success: boolean;
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

interface ReviewGuideResult {
  success: boolean;
  guide: {
    commit_type: string;
    title: string;
    checklist: string[];
    focus_areas: string[];
    common_issues: string[];
    best_practices: string[];
  };
}

interface QualityScoreResult {
  success: boolean;
  score: {
    overall: number;
    breakdown: {
      complexity: number;
      maintainability: number;
      testability: number;
      security: number;
      performance: number;
    };
    recommendations: string[];
  };
}

const baseURL = process.env.REACT_APP_AI_REVIEW_MCP_URL || 'http://localhost:3001';

export const useAIReview = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisResult | null>(null);

  const analyzePR = useCallback(async (prData: PRAnalysisData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseURL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: AnalysisResult = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI 리뷰 분석 중 오류가 발생했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analyzePR,
    loading,
    error,
    data,
    clearError: () => setError(null),
    clearData: () => setData(null)
  };
};

export const useReviewGuide = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReviewGuideResult | null>(null);

  const generateReviewGuide = useCallback(async (guideData: ReviewGuideData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseURL}/review-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commit_type: guideData.commit_type,
          file_changes: guideData.file_changes || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ReviewGuideResult = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '리뷰 가이드 생성 중 오류가 발생했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    generateReviewGuide,
    loading,
    error,
    data,
    clearError: () => setError(null),
    clearData: () => setData(null)
  };
};

export const useQualityScore = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QualityScoreResult | null>(null);

  const calculateQualityScore = useCallback(async (scoreData: QualityScoreData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseURL}/quality-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes: scoreData.changes,
          metrics: scoreData.metrics || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: QualityScoreResult = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '품질 점수 계산 중 오류가 발생했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    calculateQualityScore,
    loading,
    error,
    data,
    clearError: () => setError(null),
    clearData: () => setData(null)
  };
};

export const useHealthCheck = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');

  const checkHealth = useCallback(async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${baseURL}/health`);
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        setStatus('healthy');
      } else {
        setStatus('unhealthy');
      }
      
      return data;
    } catch (error) {
      setStatus('unhealthy');
      console.error('Health check failed:', error);
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    checkHealth,
    loading,
    status
  };
};

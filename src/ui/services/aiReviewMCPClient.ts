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

class AIReviewMCPClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_AI_REVIEW_MCP_URL || 'http://localhost:3001';
  }

  async analyzePR(prData: PRAnalysisData) {
    try {
      const response = await fetch(`${this.baseURL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI Review MCP 분석 오류:', error);
      throw error;
    }
  }

  async generateReviewGuide(commitType: string, fileChanges: string[] = []) {
    try {
      const response = await fetch(`${this.baseURL}/review-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commit_type: commitType,
          file_changes: fileChanges,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('리뷰 가이드 생성 오류:', error);
      throw error;
    }
  }

  async calculateQualityScore(changes: any[], metrics: any = {}) {
    try {
      const response = await fetch(`${this.baseURL}/quality-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          metrics,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('품질 점수 계산 오류:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return await response.json();
    } catch (error) {
      console.error('MCP 서버 상태 확인 오류:', error);
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getServerInfo() {
    try {
      const response = await fetch(`${this.baseURL}/info`);
      return await response.json();
    } catch (error) {
      console.error('서버 정보 조회 오류:', error);
      throw error;
    }
  }

  // GitHub Webhook 시뮬레이션 (개발용)
  async simulateWebhook(webhookData: any) {
    try {
      const response = await fetch(`${this.baseURL}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Webhook 시뮬레이션 오류:', error);
      throw error;
    }
  }
}

export default new AIReviewMCPClient();

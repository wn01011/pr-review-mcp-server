export interface PRData {
  title: string;
  body: string;
  diff: string;
  files: any[];
  commit_type: string;
}

export interface ReviewResult {
  summary: string;
  qualityScore: number;
  reviewPoints: string[];
  suggestions: string[];
  securityConcerns: string[];
  performanceImpact: string[];
  complexity: {
    score: number;
    reasoning: string;
  };
  maintainability: {
    score: number;
    reasoning: string;
  };
}

export interface ReviewGuide {
  title: string;
  checklist: string[];
  focusAreas: string[];
  commonIssues: string[];
  bestPractices: string[];
}

export interface QualityScore {
  overall: number;
  breakdown: {
    complexity: number;
    maintainability: number;
    testability: number;
    security: number;
    performance: number;
  };
  recommendations: string[];
}

export interface Analysis {
  summary: string;
  quality_score: number;
  review_points: string[];
  suggestions: string[];
  security_concerns: string[];
  performance_impact: string[];
}

export interface Comment {
  body: string;
  path?: string;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
}

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
}
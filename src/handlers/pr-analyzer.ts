import { ClaudeClient } from './claude-client.js';
import { GitHubClient } from './github-client.js';
import { FileAnalyzer } from './file-analyzer.js';

export interface PRData {
  title: string;
  body: string;
  diff: string;
  files: any[];
  commit_type: string;
  commits?: any[];
}

export interface SplitRecommendation {
  shouldSplit: boolean;
  reason: string;
  complexity: number;
  proposals?: {
    title: string;
    description: string;
    files: string[];
    benefits: string[];
    commitTypes: string[];
  }[];
}

export class PRAnalyzer {
  constructor(
    private claude: ClaudeClient,
    private github: GitHubClient
  ) {}

  async analyzePR(prData: PRData, options: { enableSplit?: boolean, deepAnalysis?: boolean } = {}) {
    // Claude로 코드 분석
    const analysis = await this.claude.analyzeCode(
      prData.diff, 
      prData.commit_type,
      {
        title: prData.title,
        body: prData.body,
        fileCount: prData.files.length
      }
    );

    // 추가 메트릭 계산
    const metrics = this.calculateAdditionalMetrics(prData);
    
    // 파일별 체크포인트 분석
    const fileAnalysis = FileAnalyzer.analyzeFileTypes(prData.files);
    
    let splitAnalysis = null;
    if (options.enableSplit) {
      splitAnalysis = await this.analyzePRForSplit(prData, options.deepAnalysis);
    }
    
    return {
      ...analysis,
      metrics,
      fileAnalysis,
      splitAnalysis,
      timestamp: new Date().toISOString()
    };
  }

  async analyzePRForSplit(prData: PRData, deepAnalysis: boolean = false): Promise<SplitRecommendation> {
    // 1. 기본 복잡도 분석
    const complexity = this.calculatePRComplexity(prData);
    
    // 2. 커밋 타입 분석
    const commitTypeAnalysis = this.analyzeCommitTypes(prData.commits || []);
    
    // 3. 파일 카테고리 분석
    const fileCategoryAnalysis = this.analyzeFileCategories(prData.files);
    
    // 4. 변경 크기 분석
    const sizeAnalysis = this.analyzePRSize(prData);
    
    // 분할 필요성 판단
    const shouldSplit = this.shouldSplitPR(complexity, commitTypeAnalysis, fileCategoryAnalysis, sizeAnalysis);
    
    if (!shouldSplit.should) {
      return {
        shouldSplit: false,
        reason: shouldSplit.reason,
        complexity: complexity.score
      };
    }

    // 분할 제안 생성
    const proposals = await this.generateSplitProposals(
      prData, 
      commitTypeAnalysis, 
      fileCategoryAnalysis,
      deepAnalysis
    );

    return {
      shouldSplit: true,
      reason: shouldSplit.reason,
      complexity: complexity.score,
      proposals
    };
  }

  private calculatePRComplexity(prData: PRData) {
    let complexityScore = 0;
    const factors = [];

    // 파일 수
    if (prData.files.length > 15) {
      complexityScore += 3;
      factors.push(`많은 파일 수 (${prData.files.length}개)`);
    } else if (prData.files.length > 8) {
      complexityScore += 1;
      factors.push(`보통 파일 수 (${prData.files.length}개)`);
    }

    // 전체 변경 라인 수
    const totalLines = prData.files.reduce((sum, file) => 
      sum + (file.additions || 0) + (file.deletions || 0), 0
    );
    
    if (totalLines > 500) {
      complexityScore += 3;
      factors.push(`많은 변경 라인 (${totalLines}줄)`);
    } else if (totalLines > 200) {
      complexityScore += 1;
      factors.push(`보통 변경 라인 (${totalLines}줄)`);
    }

    // 디렉토리 분산도
    const directories = new Set(prData.files.map(file => 
      file.filename.split('/').slice(0, -1).join('/')
    ));
    
    if (directories.size > 5) {
      complexityScore += 2;
      factors.push(`분산된 디렉토리 (${directories.size}개)`);
    }

    return {
      score: Math.min(complexityScore, 10),
      factors,
      level: complexityScore > 6 ? 'high' : complexityScore > 3 ? 'medium' : 'low'
    };
  }

  private analyzeCommitTypes(commits: any[]) {
    const commitTypes = new Map();
    const messages = [];

    commits.forEach(commit => {
      const message = commit.commit?.message || commit.message || '';
      messages.push(message);
      
      const type = this.extractCommitType(message);
      commitTypes.set(type, (commitTypes.get(type) || 0) + 1);
    });

    return {
      types: Array.from(commitTypes.keys()),
      distribution: Object.fromEntries(commitTypes),
      messages,
      isMultiPurpose: commitTypes.size > 2
    };
  }

  private extractCommitType(message: string): string {
    const conventionalMatch = message.match(/^(feat|fix|docs|style|refactor|test|chore|perf)(\(.+\))?:/i);
    if (conventionalMatch) {
      return conventionalMatch[1].toLowerCase();
    }

    // 한글 패턴
    const koreanPatterns = {
      '기능': 'feat', '추가': 'feat', '개발': 'feat',
      '수정': 'fix', '버그': 'fix', '오류': 'fix',
      '문서': 'docs', '도큐': 'docs',
      '스타일': 'style', '디자인': 'style',
      '리팩터': 'refactor', '개선': 'refactor',
      '테스트': 'test', '검증': 'test',
      '작업': 'chore', '설정': 'chore'
    };

    for (const [korean, english] of Object.entries(koreanPatterns)) {
      if (message.includes(korean)) {
        return english;
      }
    }

    return 'other';
  }

  private analyzeFileCategories(files: any[]) {
    const categories = {
      components: [],
      styles: [],
      configs: [],
      tests: [],
      docs: [],
      api: [],
      utils: [],
      types: [],
      other: []
    };

    files.forEach(file => {
      const filename = file.filename.toLowerCase();
      const path = file.filename;

      if (filename.includes('component') || filename.includes('.tsx') || filename.includes('.jsx')) {
        categories.components.push(path);
      } else if (filename.includes('.css') || filename.includes('.scss') || filename.includes('style')) {
        categories.styles.push(path);
      } else if (filename.includes('config') || filename.includes('.json') || filename.includes('.env')) {
        categories.configs.push(path);
      } else if (filename.includes('test') || filename.includes('spec')) {
        categories.tests.push(path);
      } else if (filename.includes('.md') || filename.includes('readme') || filename.includes('doc')) {
        categories.docs.push(path);
      } else if (filename.includes('api') || filename.includes('service') || filename.includes('handler')) {
        categories.api.push(path);
      } else if (filename.includes('util') || filename.includes('helper') || filename.includes('lib')) {
        categories.utils.push(path);
      } else if (filename.includes('.d.ts') || filename.includes('type') || filename.includes('interface')) {
        categories.types.push(path);
      } else {
        categories.other.push(path);
      }
    });

    return {
      categories,
      hasMultipleCategories: Object.values(categories).filter(cat => cat.length > 0).length > 2,
      distribution: Object.fromEntries(
        Object.entries(categories).filter(([_, files]) => files.length > 0)
      )
    };
  }

  private analyzePRSize(prData: PRData) {
    const totalLines = prData.files.reduce((sum, file) => 
      sum + (file.additions || 0) + (file.deletions || 0), 0
    );

    return {
      fileCount: prData.files.length,
      totalLines,
      size: totalLines > 500 ? 'large' : totalLines > 200 ? 'medium' : 'small',
      isLarge: prData.files.length > 10 || totalLines > 300
    };
  }

  private shouldSplitPR(complexity: any, commitTypes: any, fileCategories: any, size: any) {
    const reasons = [];

    if (complexity.score > 6) {
      reasons.push('높은 복잡도');
    }

    if (commitTypes.isMultiPurpose) {
      reasons.push(`다양한 변경 타입 (${commitTypes.types.join(', ')})`);
    }

    if (fileCategories.hasMultipleCategories) {
      reasons.push('여러 파일 카테고리에 걸친 변경');
    }

    if (size.isLarge) {
      reasons.push(`큰 변경 크기 (${size.fileCount}개 파일, ${size.totalLines}줄)`);
    }

    const should = reasons.length > 1 || complexity.score > 7;

    return {
      should,
      reason: should 
        ? `다음 이유로 분할을 권장합니다: ${reasons.join(', ')}`
        : `현재 PR은 적절한 크기입니다 (복잡도: ${complexity.score}/10, 파일: ${size.fileCount}개)`
    };
  }

  private async generateSplitProposals(
    prData: PRData, 
    commitTypes: any, 
    fileCategories: any,
    deepAnalysis: boolean
  ) {
    const proposals = [];

    // 1. 커밋 타입별 분할
    if (commitTypes.isMultiPurpose) {
      commitTypes.types.forEach((type: string, index: number) => {
        const relevantFiles = this.getFilesForCommitType(type, prData.files, fileCategories);
        
        proposals.push({
          title: `PR #${index + 1}: ${this.getCommitTypeTitle(type)}`,
          description: `${type} 관련 변경사항`,
          files: relevantFiles.slice(0, 8), // 최대 8개 파일만 표시
          benefits: this.getCommitTypeBenefits(type),
          commitTypes: [type]
        });
      });
    }

    // 2. 파일 카테고리별 분할 (커밋 타입 분할과 중복되지 않는 경우만)
    if (fileCategories.hasMultipleCategories && !commitTypes.isMultiPurpose) {
      const mainCategories = Object.entries(fileCategories.distribution)
        .filter(([_, files]: [string, any]) => Array.isArray(files) && files.length > 2)
        .sort(([_, a], [__, b]) => (Array.isArray(b) ? b.length : 0) - (Array.isArray(a) ? a.length : 0));

      mainCategories.forEach(([category, files], index) => {
        proposals.push({
          title: `PR #${index + 1}: ${this.getCategoryTitle(category)}`,
          description: `${category} 관련 파일 변경`,
          files: Array.isArray(files) ? files.slice(0, 8) : [],
          benefits: this.getCategoryBenefits(category),
          commitTypes: ['mixed']
        });
      });
    }

    // 3. 깊은 분석이 활성화된 경우 추가 분할 제안
    if (deepAnalysis && proposals.length === 0) {
      // 크기 기반 분할
      const halfPoint = Math.ceil(prData.files.length / 2);
      const firstHalf = prData.files.slice(0, halfPoint);
      const secondHalf = prData.files.slice(halfPoint);

      proposals.push(
        {
          title: "PR #1: 핵심 기능 변경",
          description: "주요 비즈니스 로직 및 핵심 기능",
          files: firstHalf.map(f => f.filename).slice(0, 8),
          benefits: ["핵심 로직 집중 리뷰", "비즈니스 영향도 평가"],
          commitTypes: ['mixed']
        },
        {
          title: "PR #2: 부가 기능 및 개선",
          description: "지원 기능 및 개선사항",
          files: secondHalf.map(f => f.filename).slice(0, 8),
          benefits: ["독립적인 배포 가능", "점진적 개선"],
          commitTypes: ['mixed']
        }
      );
    }

    return proposals;
  }

  private getFilesForCommitType(commitType: string, allFiles: any[], fileCategories: any): string[] {
    // 커밋 타입에 따라 관련 파일 추정
    switch (commitType) {
      case 'feat':
        return [
          ...fileCategories.categories.components,
          ...fileCategories.categories.api,
          ...fileCategories.categories.types
        ].slice(0, 10);
      
      case 'fix':
        return [
          ...fileCategories.categories.components,
          ...fileCategories.categories.utils
        ].slice(0, 10);
      
      case 'style':
        return [
          ...fileCategories.categories.styles,
          ...fileCategories.categories.components
        ].slice(0, 10);
      
      case 'docs':
        return fileCategories.categories.docs;
      
      case 'test':
        return fileCategories.categories.tests;
      
      case 'chore':
        return [
          ...fileCategories.categories.configs,
          ...fileCategories.categories.other
        ].slice(0, 10);
      
      default:
        return allFiles.map(f => f.filename).slice(0, 8);
    }
  }

  private getCommitTypeTitle(type: string): string {
    const titles = {
      'feat': '새 기능 구현',
      'fix': '버그 수정',
      'refactor': '코드 리팩토링',
      'style': 'UI/스타일 개선',
      'docs': '문서 업데이트',
      'test': '테스트 코드',
      'chore': '기타 작업',
      'perf': '성능 개선'
    };
    return titles[type as keyof typeof titles] || `${type} 변경사항`;
  }

  private getCategoryTitle(category: string): string {
    const titles = {
      'components': '컴포넌트 변경',
      'styles': '스타일 변경',
      'configs': '설정 변경',
      'tests': '테스트 변경',
      'docs': '문서 변경',
      'api': 'API 변경',
      'utils': '유틸리티 변경',
      'types': '타입 정의 변경'
    };
    return titles[category as keyof typeof titles] || `${category} 변경`;
  }

  private getCommitTypeBenefits(type: string): string[] {
    const benefits = {
      'feat': ['새 기능에 집중된 리뷰', '기능별 테스트 용이', '점진적 배포 가능'],
      'fix': ['긴급 수정 시 빠른 배포', '수정 범위 명확화', '회귀 테스트 집중'],
      'refactor': ['코드 품질 개선 검토', '성능 영향도 평가', '아키텍처 변경 추적'],
      'style': ['시각적 변화 검토', '일관성 확인', 'UX 개선 평가'],
      'docs': ['문서 정확성 검증', '빠른 승인 가능', '독립적 배포'],
      'test': ['테스트 커버리지 확인', '품질 보증 강화', '안정성 검증'],
      'chore': ['인프라 변경 검토', '빌드 시스템 검증', '의존성 관리']
    };
    return benefits[type as keyof typeof benefits] || ['변경사항 집중 리뷰', '영향 범위 최소화', '명확한 목적'];
  }

  private getCategoryBenefits(category: string): string[] {
    const benefits = {
      'components': ['UI 로직 집중 검토', '컴포넌트 재사용성 확인', '접근성 검증'],
      'styles': ['시각적 일관성 확인', 'CSS 구조 검토', '반응형 검증'],
      'configs': ['설정 정확성 검증', '환경별 테스트', '보안 검토'],
      'tests': ['테스트 품질 검토', '커버리지 확인', '안정성 보장'],
      'docs': ['문서 정확성 검증', '사용성 개선', '빠른 병합'],
      'api': ['API 인터페이스 검토', '데이터 흐름 확인', '에러 처리 검증'],
      'utils': ['재사용성 검토', '성능 최적화', '의존성 관리'],
      'types': ['타입 안전성 확인', 'API 계약 검증', '호환성 보장']
    };
    return benefits[category as keyof typeof benefits] || ['관련 기능 집중 리뷰', '독립적 검증', '명확한 범위'];
  }

  async generateReviewGuide(commitType: string, fileChanges: string[]) {
    return await this.claude.generateReviewGuide(commitType, fileChanges);
  }

  async calculateQualityScore(changes: any[], additionalMetrics: any = {}) {
    // 기본 품질 점수 계산 로직
    let score = 70; // 기본 점수
    
    // 파일 수에 따른 점수 조정
    if (changes.length > 10) {
      score -= 10; // 너무 많은 파일 변경
    }
    
    // 라인 수에 따른 점수 조정
    const totalLines = changes.reduce((sum, change) => sum + (change.additions || 0) + (change.deletions || 0), 0);
    if (totalLines > 500) {
      score -= 15; // 너무 많은 라인 변경
    }
    
    // 테스트 파일 포함 여부
    const hasTests = changes.some(change => 
      change.filename && (
        change.filename.includes('.test.') || 
        change.filename.includes('.spec.') ||
        change.filename.includes('__tests__')
      )
    );
    if (hasTests) {
      score += 10;
    }
    
    // 문서 업데이트 여부
    const hasDocUpdates = changes.some(change => 
      change.filename && (
        change.filename.toLowerCase().includes('readme') ||
        change.filename.toLowerCase().includes('.md')
      )
    );
    if (hasDocUpdates) {
      score += 5;
    }

    return {
      overall: Math.max(0, Math.min(100, score)),
      complexity: this.calculateComplexity(changes),
      maintainability: this.calculateMaintainability(changes),
      testability: this.calculateTestability(changes),
      security: this.calculateSecurity(changes),
      performance: this.calculatePerformance(changes),
      recommendations: this.generateRecommendations(changes, score)
    };
  }

  private calculateAdditionalMetrics(prData: PRData) {
    const lines = prData.diff.split('\n');
    let additions = 0;
    let deletions = 0;
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    return {
      linesAdded: additions,
      linesDeleted: deletions,
      filesChanged: prData.files.length,
      netChange: additions - deletions,
      changeRatio: deletions > 0 ? additions / deletions : additions
    };
  }

  private calculateComplexity(changes: any[]): number {
    // 복잡도 계산 로직 (간단한 휴리스틱)
    let complexity = 5; // 기본값
    
    for (const change of changes) {
      if (change.patch) {
        // 중첩된 if문, 루프 등 검출
        const nestedPatterns = (change.patch.match(/\+.*if.*if/g) || []).length;
        const loopPatterns = (change.patch.match(/\+.*(for|while|forEach)/g) || []).length;
        
        complexity += nestedPatterns * 2 + loopPatterns;
      }
    }
    
    return Math.min(10, complexity);
  }

  private calculateMaintainability(changes: any[]): number {
    let score = 7; // 기본값
    
    // 함수 길이, 클래스 크기 등 고려
    for (const change of changes) {
      if (change.patch) {
        const functionCount = (change.patch.match(/\+.*function|=>/g) || []).length;
        const largeBlocks = (change.patch.match(/\+.*\{[\s\S]{200,}\}/g) || []).length;
        
        if (functionCount > 5) score -= 1;
        if (largeBlocks > 0) score -= 2;
      }
    }
    
    return Math.max(1, Math.min(10, score));
  }

  private calculateTestability(changes: any[]): number {
    let score = 6;
    
    const hasTestFiles = changes.some(change => 
      change.filename && (
        change.filename.includes('test') || 
        change.filename.includes('spec')
      )
    );
    
    if (hasTestFiles) score += 3;
    
    return Math.min(10, score);
  }

  private calculateSecurity(changes: any[]): number {
    let score = 8;
    
    for (const change of changes) {
      if (change.patch) {
        // 보안 위험 패턴 검출
        const dangerousPatterns = [
          /eval\(/,
          /innerHTML/,
          /document\.write/,
          /localStorage\.setItem.*password/,
          /sessionStorage\.setItem.*token/
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(change.patch)) {
            score -= 2;
          }
        }
      }
    }
    
    return Math.max(1, score);
  }

  private calculatePerformance(changes: any[]): number {
    let score = 7;
    
    for (const change of changes) {
      if (change.patch) {
        // 성능 관련 패턴 검출
        const performanceIssues = [
          /\.forEach.*\.forEach/, // 중첩 루프
          /while.*true/, // 무한 루프 가능성
          /new.*RegExp.*for/ // 루프 내 정규식 생성
        ];
        
        for (const pattern of performanceIssues) {
          if (pattern.test(change.patch)) {
            score -= 1;
          }
        }
      }
    }
    
    return Math.max(1, score);
  }

  private generateRecommendations(changes: any[], score: number): string[] {
    const recommendations = [];
    
    if (score < 70) {
      recommendations.push('전반적인 코드 품질 개선이 필요합니다.');
    }
    
    if (changes.length > 10) {
      recommendations.push('PR을 더 작은 단위로 분할하는 것을 고려해보세요.');
    }
    
    const hasTests = changes.some(change => 
      change.filename && change.filename.includes('test')
    );
    if (!hasTests) {
      recommendations.push('테스트 코드 추가를 권장합니다.');
    }
    
    const hasDocumentation = changes.some(change =>
      change.filename && change.filename.includes('.md')
    );
    if (!hasDocumentation) {
      recommendations.push('관련 문서 업데이트를 고려해보세요.');
    }
    
    return recommendations;
  }
}
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async analyzeCode(diff: string, commitType: string, additionalContext?: any) {
    const prompt = this.buildAnalysisPrompt(diff, commitType, additionalContext);
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseAnalysisResponse(content.text);
      }
      throw new Error('Unexpected response format from Claude');
    } catch (error: any) {
      console.error('Claude API error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  private buildAnalysisPrompt(diff: string, commitType: string, context?: any): string {
    return `
당신은 시니어 소프트웨어 엔지니어로서 코드 리뷰를 수행합니다. 
다음 PR을 분석하고 **실제 변경 내용에 기반한** 구조화된 리뷰를 제공해주세요.

## 컨텍스트
- **커밋 타입**: ${commitType}
- **PR 제목**: ${context?.title || ''}
- **변경 사항**: 
\`\`\`diff
${diff.length > 8000 ? diff.substring(0, 8000) + '\n... (truncated)' : diff}
\`\`\`

## 분석 요청사항
다음 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "summary": "변경사항에 대한 간결한 요약 (한글, 2-3문장)",
  "qualityScore": 85,
  "reviewPoints": [
    "실제 변경된 내용을 기반으로 한 구체적인 리뷰 포인트 1",
    "실제 변경된 내용을 기반으로 한 구체적인 리뷰 포인트 2",
    "실제 변경된 내용을 기반으로 한 구체적인 리뷰 포인트 3"
  ],
  "suggestions": [
    "개선 제안사항 1",
    "개선 제안사항 2"
  ],
  "securityConcerns": [
    "보안 관련 우려사항 (있다면)"
  ],
  "performanceImpact": [
    "성능에 미치는 영향 (있다면)"
  ],
  "fileSpecificCheckpoints": [
    {
      "filePath": "실제_변경된_파일_경로",
      "checkpoints": [
        "해당 파일의 실제 변경사항을 기반으로 한 체크포인트 1",
        "해당 파일의 실제 변경사항을 기반으로 한 체크포인트 2"
      ]
    }
  ],
  "complexity": {
    "score": 7,
    "reasoning": "복잡도 평가 이유"
  },
  "maintainability": {
    "score": 8,
    "reasoning": "유지보수성 평가 이유"
  }
}
\`\`\`

## 중요한 지침
1. **실제 변경된 파일과 내용만을 기반으로 분석**해주세요
2. **fileSpecificCheckpoints**에는 실제로 변경된 파일에 대해서만 체크포인트를 생성해주세요
3. 변경사항에서 발견되는 구체적인 패턴을 기반으로 리뷰 포인트를 작성해주세요
4. 예를 들어, CI/CD 설정 파일이 변경되었다면 관련 체크포인트를 포함해주세요
5. ESLint, Prettier 설정이 변경되었다면 관련 체크포인트를 포함해주세요

## 평가 기준
- **품질 점수**: 0-100 (코드 품질, 베스트 프랙티스 준수도)
- **복잡도**: 1-10 (낮을수록 좋음)
- **유지보수성**: 1-10 (높을수록 좋음)

## 커밋 타입별 특별 고려사항
${this.getCommitTypeGuidelines(commitType)}

응답은 반드시 유효한 JSON 형식이어야 하며, 한글로 작성해주세요.
`;
  }

  private getCommitTypeGuidelines(commitType: string): string {
    const guidelines = {
      feat: `
**[새로운 기능]**
- API 설계의 RESTful 원칙 준수 여부
- 비즈니스 요구사항과의 일치성
- 에러 핸들링의 적절성
- 보안 취약점 검토
- 성능 영향도 분석`,
      
      fix: `
**[버그 수정]**  
- 근본 원인이 명확히 파악되었는지
- 유사한 패턴의 버그가 다른 곳에도 있는지
- 회귀 테스트 추가 필요성
- 사이드 이펙트 가능성
- 데이터 일관성 유지`,
      
      refactor: `
**[리팩토링]**
- 코드 가독성 개선 여부
- 복잡도 감소 효과
- SOLID 원칙 준수
- 기존 기능 동일성 보장
- 성능 개선 또는 저하 여부`,
      
      perf: `
**[성능 개선]**
- 성능 향상 정도 측정
- 메모리 사용량 변화
- 네트워크 요청 최적화
- 캐싱 전략 적절성
- 사용자 경험 개선도`,
      
      style: `
**[스타일 변경]**
- 코딩 컨벤션 준수
- 일관성 있는 포맷팅
- 불필요한 변경사항 제거
- 가독성 향상 여부`,
      
      docs: `
**[문서화]**
- 문서의 정확성과 완전성
- 개발자 친화적인 설명
- 예제 코드의 적절성
- API 문서 업데이트 여부`,
      
      test: `
**[테스트]**
- 테스트 커버리지 향상도
- Edge case 처리
- 테스트 코드의 가독성
- Mock과 Stub 사용의 적절성`,
      
      chore: `
**[기타 작업]**
- 빌드 시스템 영향도
- 의존성 변경의 적절성
- 설정 파일 변경 검토
- 보안 업데이트 포함 여부`
    };

    return (guidelines as any)[commitType] || guidelines.feat;
  }

  private parseAnalysisResponse(response: string): any {
    try {
      // JSON 블록 추출
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      const parsed = JSON.parse(jsonStr);
      
      // 기본값 설정
      return {
        summary: parsed.summary || '분석 결과를 생성할 수 없습니다.',
        qualityScore: Math.max(0, Math.min(100, parsed.qualityScore || 70)),
        reviewPoints: Array.isArray(parsed.reviewPoints) ? parsed.reviewPoints : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        securityConcerns: Array.isArray(parsed.securityConcerns) ? parsed.securityConcerns : [],
        performanceImpact: Array.isArray(parsed.performanceImpact) ? parsed.performanceImpact : [],
        fileSpecificCheckpoints: Array.isArray(parsed.fileSpecificCheckpoints) ? parsed.fileSpecificCheckpoints : [],
        complexity: {
          score: Math.max(1, Math.min(10, parsed.complexity?.score || 5)),
          reasoning: parsed.complexity?.reasoning || '복잡도 분석 불가'
        },
        maintainability: {
          score: Math.max(1, Math.min(10, parsed.maintainability?.score || 7)),
          reasoning: parsed.maintainability?.reasoning || '유지보수성 분석 불가'
        }
      };
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return {
        summary: 'AI 분석 중 오류가 발생했습니다.',
        qualityScore: 70,
        reviewPoints: ['AI 분석을 다시 시도해 주세요.'],
        suggestions: [],
        securityConcerns: [],
        performanceImpact: [],
        complexity: { score: 5, reasoning: '분석 오류' },
        maintainability: { score: 7, reasoning: '분석 오류' }
      };
    }
  }

  async generateReviewGuide(commitType: string, fileChanges: string[]): Promise<any> {
    const prompt = `
커밋 타입 "${commitType}"에 대한 상세한 코드 리뷰 가이드를 생성해주세요.
변경된 파일들: ${fileChanges.join(', ')}

다음 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "title": "리뷰 가이드 제목",
  "checklist": [
    "확인해야 할 체크리스트 항목들"
  ],
  "focusAreas": [
    "집중적으로 검토해야 할 영역들"
  ],
  "commonIssues": [
    "이 타입에서 자주 발생하는 문제들"
  ],
  "bestPractices": [
    "권장하는 베스트 프랙티스들"
  ]
}
\`\`\`
`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content.text;
        return JSON.parse(jsonStr);
      }
    } catch (error) {
      console.error('Failed to generate review guide:', error);
    }

    // 기본 가이드 반환
    return this.getDefaultReviewGuide(commitType);
  }

  private getDefaultReviewGuide(commitType: string): any {
    const defaultGuides = {
      feat: {
        title: '새로운 기능 개발 리뷰 가이드',
        checklist: [
          'API 설계가 RESTful 원칙을 따르는가?',
          '비즈니스 요구사항과 일치하는가?',
          '에러 핸들링이 적절한가?',
          '보안 취약점은 없는가?'
        ],
        focusAreas: ['API 설계', '비즈니스 로직', '에러 처리', '보안'],
        commonIssues: ['불완전한 에러 처리', 'API 설계 미스', '보안 고려사항 누락'],
        bestPractices: ['단위 테스트 작성', '문서화', 'API 버저닝']
      },
      fix: {
        title: '버그 수정 리뷰 가이드',
        checklist: [
          '근본 원인이 명확히 파악되었는가?',
          '유사한 버그가 다른 곳에도 있는가?',
          '회귀 테스트가 추가되었는가?'
        ],
        focusAreas: ['근본 원인 분석', '사이드 이펙트', '테스트 커버리지'],
        commonIssues: ['증상만 치료', '사이드 이펙트 미고려', '테스트 부족'],
        bestPractices: ['회귀 테스트 추가', '전체적인 영향도 검토']
      }
    };

    return (defaultGuides as any)[commitType] || defaultGuides.feat;
  }
}
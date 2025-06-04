# 🤖 AI Code Review MCP Server

AI 기반 코드 리뷰와 품질 관리를 위한 MCP(Model Context Protocol) 서버입니다.

## ✨ 주요 기능

### 🔍 AI 코드 리뷰
- **커밋 타입별 분석**: feat, fix, refactor 등 타입에 맞는 맞춤 리뷰
- **품질 점수 산출**: 복잡도, 유지보수성, 보안 등 다각도 평가
- **보안 취약점 검사**: 잠재적 보안 이슈 자동 탐지
- **성능 영향 분석**: 성능에 미치는 영향도 평가

### 📋 통합 리뷰 시스템
- **커밋 타입별 분석**: 각 커밋 타입에 맞는 개별 분석
- **통합 리뷰 체크**: 모든 분석 결과를 한 번에 확인
- **체크리스트 제공**: 놓치기 쉬운 리뷰 포인트 체크
- **마크다운 리포트**: 종합 리뷰 결과를 마크다운으로 생성

### 🎯 리뷰 가이드
- **타입별 가이드**: 커밋 타입에 맞는 리뷰 가이드 생성
- **베스트 프랙티스**: 각 타입별 권장사항 제시
- **주의사항**: 자주 발생하는 문제점 사전 안내

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 저장소 클론
git clone <repository-url>
cd ai-review-mcp-server

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

### 2. 환경 변수 구성

```env
# Claude API 설정
CLAUDE_API_KEY=sk-ant-api-03-xxx

# GitHub 설정  
GITHUB_TOKEN=ghp_xxx
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# 서버 설정
PORT=3001
NODE_ENV=development
```

### 3. 서버 시작

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm run build
npm start
```

### 4. 웹 UI 접속

브라우저에서 `http://localhost:3001`로 접속하여 웹 UI를 사용할 수 있습니다.

## 🖥️ 웹 UI 사용법

### PR 분석
1. **저장소 입력**: `owner/repo` 형식으로 입력
2. **PR 번호 입력**: 분석할 PR 번호 입력
3. **커밋 타입 선택**: 적절한 커밋 타입 선택
4. **분석 실행**: "PR 분석" 버튼 클릭

### 통합 리뷰 체크
1. PR 분석이 완료된 후 "통합 리뷰 체크" 버튼 클릭
2. 모달에서 커밋 타입별 분석 결과 확인
3. 통합 리뷰 가이드 확인
4. 체크리스트를 통한 리뷰 진행

## 🔧 API 엔드포인트

### HTTP API

```bash
# PR 분석
POST /analyze
{
  "repo": "owner/repo",
  "pr_number": 123,
  "commit_type": "feat",
  "enable_split": true,
  "deep_analysis": false
}

# 리뷰 가이드 생성
POST /review-guide
{
  "commit_type": "feat",
  "file_changes": ["src/component.tsx"]
}

# 품질 점수 계산
POST /quality-score
{
  "changes": [...],
  "metrics": {}
}

# 헬스 체크
GET /health
```

### MCP Tools

```javascript
// MCP 클라이언트에서 사용
{
  "method": "tools/call",
  "params": {
    "name": "analyze_pr",
    "arguments": {
      "repo": "owner/repo",
      "pr_number": 123,
      "commit_type": "feat"
    }
  }
}
```

## 🐳 Docker 사용

### Docker 빌드 및 실행

```bash
# Docker 이미지 빌드
npm run docker:build

# Docker 컨테이너 실행
npm run docker:run
```

### Docker Compose

```bash
# 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f ai-review
```

## ⚙️ GitHub Webhook 설정

1. GitHub 저장소 → Settings → Webhooks
2. Payload URL: `https://your-domain.com/webhook`
3. Content type: `application/json`
4. Events: `Pull requests`
5. Secret: `.env`의 `GITHUB_WEBHOOK_SECRET` 값

## 📊 응답 형식

### PR 분석 응답

```json
{
  "success": true,
  "pr_number": 123,
  "repo": "owner/repo",
  "analyzed_at": "2024-06-04T10:30:00Z",
  "by_commit_type": {
    "feat": {
      "analysis": {
        "summary": "새로운 기능 분석 요약",
        "quality_score": 87,
        "review_points": ["...", "..."],
        "suggestions": ["...", "..."],
        "security_concerns": ["..."],
        "performance_impact": ["..."]
      },
      "guide": {
        "title": "새로운 기능 개발 리뷰 가이드",
        "checklist": ["...", "..."],
        "focus_areas": ["...", "..."],
        "common_issues": ["...", "..."],
        "best_practices": ["...", "..."]
      }
    }
  },
  "summary_review": {
    "markdown": "# 📋 PR 종합 리뷰\n\n..."
  }
}
```

## 🛠️ 커스터마이징

### 리뷰 템플릿 수정

`src/handlers/claude-client.ts`에서 프롬프트 템플릿을 수정할 수 있습니다:

```typescript
private getCommitTypeGuidelines(commitType: string): string {
  // 커밋 타입별 가이드라인 커스터마이징
}
```

### 품질 점수 기준 조정

`src/handlers/pr-analyzer.ts`에서 품질 점수 계산 로직을 수정할 수 있습니다:

```typescript
async calculateQualityScore(changes: any[], metrics: any = {}) {
  // 품질 점수 계산 로직 커스터마이징
}
```

## 🚨 문제 해결

### 일반적인 문제

1. **CLAUDE_API_KEY 오류**
   - Claude API 키가 올바른지 확인
   - 키의 권한과 잔액 확인

2. **GITHUB_TOKEN 오류**
   - GitHub Personal Access Token 확인
   - repo 권한이 있는지 확인

3. **PR 분석 실패**
   - PR이 존재하는지 확인
   - 저장소 접근 권한 확인

### 로그 확인

```bash
# 개발 모드에서 상세 로그 확인
DEBUG=* npm run dev

# 프로덕션 로그 확인
docker-compose logs ai-review
```

## 📝 기여하기

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [Anthropic](https://anthropic.com) - Claude API 제공
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP 프레임워크
- [GitHub](https://github.com) - GitHub API 제공

---

**Made with ❤️ by 김정규**

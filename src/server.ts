// src/server.ts - AI Review MCP Server 메인
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { ClaudeClient } from './handlers/claude-client.js';
import { GitHubClient } from './handlers/github-client.js';
import { PRAnalyzer } from './handlers/pr-analyzer.js';
import { z } from 'zod';

// 환경 변수 로드
dotenv.config();

// Express 서버 설정 (HTTP API용)
const app = express();

// 보안 미들웨어
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'",
        "https://unpkg.com",
        "https://cdn.tailwindcss.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net"
      ],
      connectSrc: ["'self'", "http://localhost:3001"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"]
    },
  },
  referrerPolicy: {
    policy: ["no-referrer-when-downgrade", "strict-origin-when-cross-origin"]
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15분
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 요청 제한
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/analyze', limiter);
app.use('/review-guide', limiter);
app.use('/quality-score', limiter);

// 기본 미들웨어
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // 정적 파일 제공

// 스팸 요청 차단 미들웨어
app.use((req, res, next) => {
  const blockedPaths = ['/dns-query', '/query', '/resolve'];
  const blockedQueries = ['dns=', 'name=example.com'];
  
  // DNS 관련 경로 차단
  if (blockedPaths.some(path => req.path.includes(path))) {
    console.log(`❌ Blocked DNS request from ${req.ip}: ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'DNS queries not supported' });
  }
  
  // DNS 관련 쿼리 파라미터 차단
  if (blockedQueries.some(query => req.url.includes(query))) {
    console.log(`❌ Blocked DNS query from ${req.ip}: ${req.url}`);
    return res.status(403).json({ error: 'DNS queries not supported' });
  }
  
  next();
});

// MCP 서버 설정
const server = new Server(
  { 
    name: 'ai-review-server', 
    version: '1.0.0' 
  },
  { 
    capabilities: { 
      tools: {},
      resources: {}
    } 
  }
);

// 클라이언트 인스턴스
const claude = new ClaudeClient(process.env.CLAUDE_API_KEY || '');
const github = new GitHubClient(process.env.GITHUB_TOKEN || '');
const analyzer = new PRAnalyzer(claude, github);

// Health check 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 기본 라우트 - index.html로 리다이렉트
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// tools/list 스키마
const ToolsListRequestSchema = z.object({
  method: z.literal('tools/list'),
  params: z.optional(z.object({}))
});

// tools/call 스키마
const ToolsCallRequestSchema = z.object({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.any()
  })
});

// MCP 도구 등록
server.setRequestHandler(ToolsListRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze_pr',
      description: 'PR을 분석하고 AI 리뷰 가이드를 생성합니다',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: '저장소 이름 (owner/repo)' },
          pr_number: { type: 'number', description: 'PR 번호' },
          commit_type: { type: 'string', description: '커밋 타입 (feat, fix, refactor 등)' },
          enable_split: { type: 'boolean', description: 'PR 분할 분석 활성화' },
          deep_analysis: { type: 'boolean', description: '심화 분석 활성화' }
        },
        required: ['repo', 'pr_number']
      }
    },
    {
      name: 'analyze_pr_split',
      description: 'PR 분할 분석만 수행합니다',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: '저장소 이름 (owner/repo)' },
          pr_number: { type: 'number', description: 'PR 번호' },
          deep_analysis: { type: 'boolean', description: '심화 분석 활성화' }
        },
        required: ['repo', 'pr_number']
      }
    },
    {
      name: 'generate_review_guide',
      description: '커밋 타입별 리뷰 가이드를 생성합니다',
      inputSchema: {
        type: 'object',
        properties: {
          commit_type: { type: 'string', description: '커밋 타입' },
          file_changes: { type: 'array', description: '변경된 파일 목록' }
        },
        required: ['commit_type']
      }
    },
    {
      name: 'calculate_quality_score',
      description: '코드 변경사항의 품질 점수를 계산합니다',
      inputSchema: {
        type: 'object',
        properties: {
          changes: { type: 'array', description: '코드 변경사항' },
          metrics: { type: 'object', description: '추가 메트릭 정보' }
        },
        required: ['changes']
      }
    }
  ]
}));

// MCP 도구 호출 핸들러
server.setRequestHandler(ToolsCallRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'analyze_pr':
        return await analyzePR(args);
      case 'analyze_pr_split':
        return await analyzePRSplit(args);
      case 'generate_review_guide':
        return await generateReviewGuide(args);
      case 'calculate_quality_score':
        return await calculateQualityScore(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      error: error.message,
      success: false
    };
  }
});

// HTTP API 엔드포인트들
app.post('/analyze', async (req, res) => {
  try {
    const result = await analyzePR(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('분석 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/analyze-split', async (req, res) => {
  try {
    const result = await analyzePRSplit(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('PR 분할 분석 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/review-guide', async (req, res) => {
  try {
    const result = await generateReviewGuide(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('리뷰 가이드 생성 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/quality-score', async (req, res) => {
  try {
    const result = await calculateQualityScore(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('품질 점수 계산 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 이미 분석된 결과와 프롬프트로 종합 리뷰 마크다운 재생성
app.post('/rebuild-review', async (req, res) => {
  try {
    const { analysis, prompt } = req.body;
    if (!analysis || !analysis.by_commit_type) {
      return res.status(400).json({ error: 'analysis 데이터가 필요합니다.' });
    }
    
    const by_commit_type = analysis.by_commit_type;
    // 통합 데이터 수집
    const allSummaries = [];
    const allChecklists = new Set();
    const allReviewPoints = new Set();
    const allSuggestions = new Set();
    const allFocusAreas = new Set();
    const allCommonIssues = new Set();
    const allBestPractices = new Set();
    const allFileCheckpoints = [];
    
    for (const type in by_commit_type) {
      const { analysis, guide } = by_commit_type[type];
      if (analysis?.summary) allSummaries.push(analysis.summary);
      if (Array.isArray(guide?.checklist)) guide.checklist.forEach(item => allChecklists.add(item));
      if (Array.isArray(analysis?.review_points)) analysis.review_points.forEach(item => allReviewPoints.add(item));
      if (Array.isArray(analysis?.suggestions)) analysis.suggestions.forEach(item => allSuggestions.add(item));
      if (Array.isArray(guide?.focus_areas)) guide.focus_areas.forEach(item => allFocusAreas.add(item));
      if (Array.isArray(guide?.common_issues)) guide.common_issues.forEach(item => allCommonIssues.add(item));
      if (Array.isArray(guide?.best_practices)) guide.best_practices.forEach(item => allBestPractices.add(item));
      if (analysis?.fileSpecificCheckpoints && Array.isArray(analysis.fileSpecificCheckpoints)) {
        analysis.fileSpecificCheckpoints.forEach(item => {
          allFileCheckpoints.push({
            path: item.filePath,
            category: getCategoryFromPath(item.filePath),
            checkpoints: item.checkpoints
          });
        });
      }
    }
    
    function toMdList(arr, checked = false) {
      return arr.length ? arr.map(item => checked ? `- [ ] ${item}` : `- ${item}`).join('\n') : '-';
    }
    
    let summaryReviewMd = `# 📋 PR 종합 리뷰\n\n`;
    if (prompt && prompt.trim()) {
      summaryReviewMd += `## 📝 사용자 요청\n> ${prompt.trim()}\n\n`;
    }
    if (allSummaries.length) {
      summaryReviewMd += `## 🎯 통합 요약\n${allSummaries.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    if (allChecklists.size) {
      summaryReviewMd += `## ✅ 통합 체크리스트\n${toMdList(Array.from(allChecklists), true)}\n\n`;
    }
    if (allReviewPoints.size) {
      summaryReviewMd += `## 📝 주요 리뷰 포인트\n${toMdList(Array.from(allReviewPoints))}\n\n`;
    }
    if (allSuggestions.size) {
      summaryReviewMd += `## 💡 개선 제안\n${toMdList(Array.from(allSuggestions))}\n\n`;
    }
    if (allFocusAreas.size) {
      summaryReviewMd += `## 🎯 중점 리뷰 포커스\n${toMdList(Array.from(allFocusAreas))}\n\n`;
    }
    if (allCommonIssues.size) {
      summaryReviewMd += `## ⚠️ 자주 발생하는 이슈\n${toMdList(Array.from(allCommonIssues))}\n\n`;
    }
    if (allBestPractices.size) {
      summaryReviewMd += `## 🏅 베스트 프랙티스\n${toMdList(Array.from(allBestPractices))}\n\n`;
    }
    if (allFileCheckpoints.length) {
      summaryReviewMd += `## 📁 파일별 체크포인트\n`;
      allFileCheckpoints.forEach(f => {
        summaryReviewMd += `- \`${f.path}\` (${f.category}): ${f.checkpoints.join('; ')}\n`;
      });
      summaryReviewMd += '\n';
    }
    
    res.json({
      success: true,
      summary_review: {
        markdown: summaryReviewMd
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GitHub Webhook 핸들러
app.post('/webhook', async (req, res) => {
  const { action, pull_request, repository } = req.body;
  
  if (action === 'opened' || action === 'synchronize') {
    try {
      console.log(`Processing PR #${pull_request.number} in ${repository.full_name}`);
      
      // PR 자동 분석
      const result = await analyzePR({
        repo: repository.full_name,
        pr_number: pull_request.number,
        commit_type: extractCommitType(pull_request.title),
        enable_split: true, // 웹훅에서는 기본적으로 분할 분석 활성화
        deep_analysis: false
      });
      
      // GitHub에 코멘트 추가
      await github.addPRComment(
        repository.full_name,
        pull_request.number,
        formatReviewComment(result)
      );
      
      res.json({ success: true, result });
    } catch (error: any) {
      console.error('Webhook 처리 오류:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.json({ message: 'Event ignored' });
  }
});

// PR 커밋 내역 조회 API
app.get('/commits', async (req, res) => {
  const { repo, pr_number } = req.query;
  if (!repo || !pr_number) {
    return res.status(400).json({ success: false, error: 'repo, pr_number 쿼리 필요' });
  }
  try {
    const [owner, repoName] = String(repo).split('/');
    const commitsResp = await github.octokit.rest.pulls.listCommits({
      owner,
      repo: repoName,
      pull_number: Number(pr_number),
    });
    res.json({ success: true, commits: commitsResp.data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 핵심 함수들
async function analyzePR(args: any) {
  const { repo, pr_number, enable_split = false, deep_analysis = false } = args;
  console.log(`Analyzing PR #${pr_number} in ${repo} (split: ${enable_split}, deep: ${deep_analysis})`);

  // PR 정보 및 커밋 목록 가져오기
  const prData = await github.getPR(repo, pr_number);
  const diff = await github.getPRDiff(repo, pr_number);
  const files = await github.getPRFiles(repo, pr_number);
  
  // 커밋 목록 가져오기
  const [owner, repoName] = repo.split('/');
  const commitsResp = await github.octokit.rest.pulls.listCommits({
    owner,
    repo: repoName,
    pull_number: pr_number,
  });
  const commits = commitsResp.data;

  // 커밋 타입별로 분류
  const typeMap: Record<string, { messages: string[], files: any[], fileCategories: Record<string, any[]> }> = {};
  for (const commit of commits) {
    const type = extractCommitType(commit.commit.message);
    if (!typeMap[type]) {
      typeMap[type] = { messages: [], files: [], fileCategories: {} };
    }
    typeMap[type].messages.push(commit.commit.message);
  }

  // 파일을 커밋 타입별로 분배
  for (const file of files) {
    const category = getCategoryFromPath(file.filename || '');
    for (const type in typeMap) {
      if (!typeMap[type].fileCategories[category]) typeMap[type].fileCategories[category] = [];
      typeMap[type].fileCategories[category].push(file);
      typeMap[type].files.push(file);
    }
  }

  // 타입별 분석/가이드 생성
  const resultByType = {};
  const allSummaries = [];
  const allChecklists = new Set();
  const allReviewPoints = new Set();
  const allSuggestions = new Set();
  const allFocusAreas = new Set();
  const allCommonIssues = new Set();
  const allBestPractices = new Set();
  const allFileCheckpoints = [];
  
  for (const type in typeMap) {
    // AI 분석 (타입별 파일만 전달)
    const analysisOptions = { enableSplit: enable_split, deepAnalysis: deep_analysis };
    const analysis = await analyzer.analyzePR({
      title: prData.title,
      body: prData.body || '',
      diff,
      files: typeMap[type].files,
      commit_type: type,
      commits: commits
    }, analysisOptions);
    
    // 가이드 생성
    const guide = await analyzer.generateReviewGuide(type, typeMap[type].files);
    
    resultByType[type] = {
      messages: typeMap[type].messages,
      file_categories: typeMap[type].fileCategories,
      analysis: {
        summary: analysis.summary,
        quality_score: analysis.qualityScore,
        review_points: analysis.reviewPoints,
        suggestions: analysis.suggestions,
        security_concerns: analysis.securityConcerns,
        performance_impact: analysis.performanceImpact,
        file_checkpoints: analysis.fileSpecificCheckpoints && analysis.fileSpecificCheckpoints.length > 0 
          ? { files: analysis.fileSpecificCheckpoints.map(item => ({
              path: item.filePath,
              category: getCategoryFromPath(item.filePath),
              checkpoints: item.checkpoints
            })), general: [
              '전체: 코드 일관성 및 프로젝트 컨벤션 준수',
              '전체: 성능에 영향을 주는 변경사항 확인', 
              '전체: 보안 취약점 및 민감 정보 노출 검토',
              '전체: 브라우저 호환성 및 접근성 고려'
            ]}
          : analysis.fileAnalysis?.checkpoints || {},
        split_analysis: analysis.splitAnalysis // PR 분할 분석 결과 추가
      },
      guide: {
        commit_type: type,
        title: guide.title,
        checklist: guide.checklist,
        focus_areas: guide.focusAreas,
        common_issues: guide.commonIssues,
        best_practices: guide.bestPractices
      }
    };
    
    // 종합 리뷰용 통합
    if (analysis.summary) allSummaries.push(analysis.summary);
    if (Array.isArray(guide.checklist)) guide.checklist.forEach(item => allChecklists.add(item));
    if (Array.isArray(analysis.reviewPoints)) analysis.reviewPoints.forEach(item => allReviewPoints.add(item));
    if (Array.isArray(analysis.suggestions)) analysis.suggestions.forEach(item => allSuggestions.add(item));
    if (Array.isArray(guide.focusAreas)) guide.focusAreas.forEach(item => allFocusAreas.add(item));
    if (Array.isArray(guide.commonIssues)) guide.commonIssues.forEach(item => allCommonIssues.add(item));
    if (Array.isArray(guide.bestPractices)) guide.bestPractices.forEach(item => allBestPractices.add(item));
    if (analysis.fileSpecificCheckpoints && Array.isArray(analysis.fileSpecificCheckpoints)) {
      analysis.fileSpecificCheckpoints.forEach(item => {
        allFileCheckpoints.push({
          path: item.filePath,
          category: getCategoryFromPath(item.filePath),
          checkpoints: item.checkpoints
        });
      });
    }
  }

  // 종합 리뷰 마크다운 생성
  function toMdList(arr, checked = false) {
    return arr.length ? arr.map(item => checked ? `- [ ] ${item}` : `- ${item}`).join('\n') : '-';
  }
  
  let summaryReviewMd = `# 📋 PR 종합 리뷰\n\n`;
  if (allSummaries.length) {
    summaryReviewMd += `## 🎯 통합 요약\n${allSummaries.map(s => `- ${s}`).join('\n')}\n\n`;
  }
  if (allChecklists.size) {
    summaryReviewMd += `## ✅ 통합 체크리스트\n${toMdList(Array.from(allChecklists), true)}\n\n`;
  }
  if (allReviewPoints.size) {
    summaryReviewMd += `## 📝 주요 리뷰 포인트\n${toMdList(Array.from(allReviewPoints))}\n\n`;
  }
  if (allSuggestions.size) {
    summaryReviewMd += `## 💡 개선 제안\n${toMdList(Array.from(allSuggestions))}\n\n`;
  }
  if (allFocusAreas.size) {
    summaryReviewMd += `## 🎯 중점 리뷰 포커스\n${toMdList(Array.from(allFocusAreas))}\n\n`;
  }
  if (allCommonIssues.size) {
    summaryReviewMd += `## ⚠️ 자주 발생하는 이슈\n${toMdList(Array.from(allCommonIssues))}\n\n`;
  }
  if (allBestPractices.size) {
    summaryReviewMd += `## 🏅 베스트 프랙티스\n${toMdList(Array.from(allBestPractices))}\n\n`;
  }
  if (allFileCheckpoints.length) {
    summaryReviewMd += `## 📁 파일별 체크포인트\n`;
    allFileCheckpoints.forEach(f => {
      summaryReviewMd += `- \`${f.path}\` (${f.category}): ${f.checkpoints.join('; ')}\n`;
    });
    summaryReviewMd += '\n';
  }

  return {
    success: true,
    pr_number,
    repo,
    analyzed_at: new Date().toISOString(),
    by_commit_type: resultByType,
    summary_review: {
      markdown: summaryReviewMd
    },
    commits: commits // 커밋 정보도 포함
  };
}

async function analyzePRSplit(args: any) {
  const { repo, pr_number, deep_analysis = false } = args;
  console.log(`Analyzing PR split for #${pr_number} in ${repo}`);

  // PR 정보 가져오기
  const prData = await github.getPR(repo, pr_number);
  const diff = await github.getPRDiff(repo, pr_number);
  const files = await github.getPRFiles(repo, pr_number);
  
  // 커밋 목록 가져오기
  const [owner, repoName] = repo.split('/');
  const commitsResp = await github.octokit.rest.pulls.listCommits({
    owner,
    repo: repoName,
    pull_number: pr_number,
  });
  const commits = commitsResp.data;

  // PR 분할 분석 수행
  const splitAnalysis = await analyzer.analyzePRForSplit({
    title: prData.title,
    body: prData.body || '',
    diff,
    files,
    commit_type: extractCommitType(prData.title),
    commits
  }, deep_analysis);

  return {
    success: true,
    pr_number,
    repo,
    analyzed_at: new Date().toISOString(),
    split_analysis: splitAnalysis
  };
}

async function generateReviewGuide(args: any) {
  const { commit_type, file_changes = [] } = args;
  
  const guide = await analyzer.generateReviewGuide(commit_type, file_changes);
  
  return {
    success: true,
    guide: {
      commit_type,
      title: guide.title,
      checklist: guide.checklist,
      focus_areas: guide.focusAreas,
      common_issues: guide.commonIssues,
      best_practices: guide.bestPractices
    }
  };
}

async function calculateQualityScore(args: any) {
  const { changes, metrics = {} } = args;
  
  const score = await analyzer.calculateQualityScore(changes, metrics);
  
  return {
    success: true,
    score: {
      overall: score.overall,
      breakdown: {
        complexity: score.complexity,
        maintainability: score.maintainability,
        testability: score.testability,
        security: score.security,
        performance: score.performance
      },
      recommendations: score.recommendations
    }
  };
}

// 유틸리티 함수들
function extractCommitType(title: string): string {
  const match = title.match(/^\[?(feat|fix|refactor|docs|style|test|chore|perf|ci|hotfix)\]?/i);
  return match ? match[1].toLowerCase() : 'general';
}

function calculateLinesChanged(diff: string): { added: number; deleted: number } {
  const lines = diff.split('\n');
  let added = 0;
  let deleted = 0;
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    if (line.startsWith('-') && !line.startsWith('---')) deleted++;
  }
  
  return { added, deleted };
}

function formatReviewComment(result: any): string {
  const { by_commit_type, summary_review } = result;
  
  let comment = summary_review?.markdown || '## 🤖 AI Code Review\n\n분석 결과가 없습니다.';
  
  // PR 분할 제안이 있는 경우 추가
  let hasSplitRecommendation = false;
  for (const type in by_commit_type) {
    const analysis = by_commit_type[type].analysis;
    if (analysis?.split_analysis?.shouldSplit) {
      hasSplitRecommendation = true;
      break;
    }
  }
  
  if (hasSplitRecommendation) {
    comment += '\n\n## ✂️ PR 분할 권장\n이 PR은 분할을 통해 더 효율적인 리뷰가 가능합니다. 자세한 분할 제안은 AI Review 도구에서 확인하세요.';
  }
  
  comment += '\n\n---\n*Generated by AI Review MCP Server*';
  
  return comment;
}

// 서버 시작
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'mcp') {
  // MCP 모드로 실행
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.log('AI Review MCP Server running in MCP mode');
} else {
  // HTTP 서버 모드로 실행
  app.listen(PORT, () => {
    console.log(`AI Review MCP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
  });
}

export { server, app };

// 파일 경로에서 카테고리 추출
function getCategoryFromPath(filePath: string): string {
  const lowerPath = filePath.toLowerCase();
  
  if (lowerPath.includes('.test.') || lowerPath.includes('.spec.') || lowerPath.includes('__tests__')) {
    return 'tests';
  }
  if (lowerPath.includes('/components/') || (lowerPath.endsWith('.tsx') || lowerPath.endsWith('.jsx'))) {
    return 'components';
  }
  if (lowerPath.startsWith('use') && (lowerPath.endsWith('.ts') || lowerPath.endsWith('.js'))) {
    return 'hooks';
  }
  if (lowerPath.includes('/utils/') || lowerPath.includes('/helpers/')) {
    return 'utils';
  }
  if (lowerPath.endsWith('.css') || lowerPath.endsWith('.scss') || lowerPath.endsWith('.sass')) {
    return 'styles';
  }
  if (lowerPath.includes('config') || lowerPath.startsWith('.') || lowerPath.includes('package.json')) {
    return 'configs';
  }
  if (lowerPath.endsWith('.md') || lowerPath.includes('readme')) {
    return 'docs';
  }
  if (lowerPath.includes('/api/') || lowerPath.includes('/services/')) {
    return 'api';
  }
  if (lowerPath.includes('workflow') || lowerPath.includes('.yml') || lowerPath.includes('.yaml')) {
    return 'ci_cd';
  }
  
  return 'other';
}
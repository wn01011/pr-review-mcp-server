// 전역 변수
let lastMarkdown = '';
let currentAnalysisData = null;
let templates = {};

// 탭 전환
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // PR 분할 탭을 클릭했을 때 데이터가 있으면 자동으로 분석 표시
    if (tabName === 'pr-split' && currentAnalysisData) {
        displayPRSplitAnalysis(currentAnalysisData);
    }
}

// DOM 요소들
const form = document.getElementById('reviewForm');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const submitBtn = document.getElementById('submitBtn');
const progressInfo = document.getElementById('progressInfo');

// 진행 상황 업데이트
function updateProgress(step, message) {
    if (progressInfo) {
        progressInfo.innerHTML = `<div class="progress-step">${step}. ${message}</div>`;
    }
}

// 커밋 내역 불러오기 및 렌더링
async function fetchAndRenderCommits(repo, prNumber) {
    const commitsList = document.getElementById('commitsList');
    const commitsStats = document.getElementById('commitsStats');
    
    commitsList.innerHTML = '<div class="loading-commits"><div class="spinner-small"></div><p>커밋 내역을 불러오는 중...</p></div>';
    commitsStats.innerHTML = '';
    
    try {
        updateProgress(2, '커밋 내역 수집 중...');
        const response = await fetch(`/commits?repo=${encodeURIComponent(repo)}&pr_number=${prNumber}`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.commits)) {
            if (data.commits.length === 0) {
                commitsList.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>커밋 내역이 없습니다.</p></div>';
                commitsStats.innerHTML = '<div class="stats-item">커밋 수: 0</div>';
            } else {
                // 통계 정보 표시
                const commitTypes = {};
                data.commits.forEach(commit => {
                    const message = commit.commit.message;
                    const type = extractCommitType(message);
                    commitTypes[type] = (commitTypes[type] || 0) + 1;
                });
                
                const statsHtml = `
                    <div class="stats-grid">
                        <div class="stats-item">
                            <span class="stats-label">총 커밋 수</span>
                            <span class="stats-value">${data.commits.length}</span>
                        </div>
                        <div class="stats-item">
                            <span class="stats-label">커밋 타입</span>
                            <span class="stats-value">${Object.keys(commitTypes).join(', ')}</span>
                        </div>
                        <div class="stats-item">
                            <span class="stats-label">기간</span>
                            <span class="stats-value">${getDateRange(data.commits)}</span>
                        </div>
                    </div>
                `;
                commitsStats.innerHTML = statsHtml;
                
                // 커밋 목록 표시
                const commitsHtml = data.commits.map(commit => {
                    const type = extractCommitType(commit.commit.message);
                    const typeEmoji = getCommitTypeEmoji(type);
                    return `
                        <div class="commit-item">
                            <div class="commit-header">
                                <span class="commit-sha">${commit.sha.slice(0,7)}</span>
                                <span class="commit-type">${typeEmoji} ${type}</span>
                                <span class="commit-date">${formatDate(commit.commit.author.date)}</span>
                            </div>
                            <div class="commit-author">👤 ${commit.commit.author.name}</div>
                            <div class="commit-message">${escapeHtml(commit.commit.message)}</div>
                        </div>
                    `;
                }).join('');
                
                commitsList.innerHTML = commitsHtml;
            }
        } else {
            commitsList.innerHTML = '<div class="error-state"><div class="error-icon">❌</div><p>커밋 내역을 불러오지 못했습니다.</p></div>';
            commitsStats.innerHTML = '<div class="stats-item error">오류 발생</div>';
        }
    } catch (e) {
        commitsList.innerHTML = '<div class="error-state"><div class="error-icon">❌</div><p>커밋 내역 요청 중 오류가 발생했습니다.</p></div>';
        commitsStats.innerHTML = '<div class="stats-item error">네트워크 오류</div>';
    }
}

// 커밋 타입 추출
function extractCommitType(message) {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf'];
    const match = message.match(/^(feat|fix|docs|style|refactor|test|chore|perf)(\(.+\))?:/i);
    if (match) return match[1].toLowerCase();
    
    // 한글 패턴 체크
    if (message.match(/^\[?(feat|fix|docs|style|refactor|test|chore|perf|기능|수정|문서|스타일|리팩터|테스트|작업)\]?/i)) {
        const koreanToEng = {
            '기능': 'feat', '수정': 'fix', '문서': 'docs', 
            '스타일': 'style', '리팩터': 'refactor', '테스트': 'test', '작업': 'chore'
        };
        const koreanMatch = message.match(/^\[?(기능|수정|문서|스타일|리팩터|테스트|작업)\]?/i);
        if (koreanMatch) return koreanToEng[koreanMatch[1]] || 'other';
    }
    
    return 'other';
}

// 커밋 타입 이모지
function getCommitTypeEmoji(type) {
    const emojis = {
        'feat': '✨', 'fix': '🐛', 'docs': '📚', 'style': '💄',
        'refactor': '♻️', 'test': '✅', 'chore': '🔧', 'perf': '⚡',
        'other': '📝'
    };
    return emojis[type] || '📝';
}

// 날짜 범위 계산
function getDateRange(commits) {
    if (commits.length === 0) return '';
    const dates = commits.map(c => new Date(c.commit.author.date)).sort();
    const start = formatDate(dates[0].toISOString());
    const end = formatDate(dates[dates.length - 1].toISOString());
    return start === end ? start : `${start} ~ ${end}`;
}

// 날짜 포맷
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 폼 제출 이벤트
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const repo = formData.get('repo');
    const prNumber = parseInt(formData.get('prNumber'));
    const enableSplit = document.getElementById('enableSplit').checked;
    const deepAnalysis = document.getElementById('deepAnalysis').checked;
    
    const data = { 
        repo, 
        pr_number: prNumber,
        enable_split: enableSplit,
        deep_analysis: deepAnalysis
    };
    
    submitBtn.disabled = true;
    loading.style.display = 'block';
    result.style.display = 'none';
    
    try {
        updateProgress(1, 'PR 정보 수집 중...');
        
        // 커밋 내역 먼저 불러오기
        fetchAndRenderCommits(repo, prNumber);
        
        updateProgress(3, 'AI 분석 중...');
        
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const analysisResult = await response.json();
        
        if (analysisResult.success) {
            currentAnalysisData = analysisResult;
            displaySuccess(analysisResult);
            result.style.display = 'block';
            
            // PR 분할 탭이 활성화되어 있으면 분할 분석도 표시
            if (document.getElementById('pr-split').classList.contains('active')) {
                displayPRSplitAnalysis(analysisResult);
            }
        } else {
            displayError(analysisResult.error || '분석 중 오류가 발생했습니다.');
        }
    } catch (error) {
        displayError('네트워크 오류가 발생했습니다: ' + error.message);
    } finally {
        loading.style.display = 'none';
        submitBtn.disabled = false;
    }
});

// PR 분할 분석 표시
function displayPRSplitAnalysis(data) {
    const splitAnalysis = document.getElementById('splitAnalysis');
    const splitRecommendations = document.getElementById('splitRecommendations');
    
    if (!data || !data.summary_review) {
        splitAnalysis.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>분석 데이터가 없습니다</h3>
                <p>먼저 PR 분석을 완료해주세요.</p>
            </div>
        `;
        return;
    }
    
    // 현재 PR 상태 분석
    const analysis = analyzePRForSplit(data);
    
    splitAnalysis.innerHTML = `
        <div class="split-overview">
            <h3>📊 현재 PR 분석</h3>
            <div class="analysis-grid">
                <div class="analysis-card ${analysis.complexity}">
                    <h4>🎯 복잡도</h4>
                    <div class="score">${analysis.complexityScore}/10</div>
                    <p>${analysis.complexityText}</p>
                </div>
                <div class="analysis-card ${analysis.size}">
                    <h4>📏 크기</h4>
                    <div class="score">${analysis.fileCount}개 파일</div>
                    <p>${analysis.linesChanged}+ 라인 변경</p>
                </div>
                <div class="analysis-card ${analysis.focus}">
                    <h4>🎭 초점</h4>
                    <div class="score">${analysis.commitTypes.length}개 타입</div>
                    <p>${analysis.commitTypes.join(', ')}</p>
                </div>
            </div>
        </div>
    `;
    
    // 분할 권장사항 생성
    const recommendations = generateSplitRecommendations(analysis, data);
    
    splitRecommendations.innerHTML = `
        <div class="recommendations">
            <h3>✂️ 분할 권장사항</h3>
            ${recommendations.shouldSplit ? `
                <div class="recommendation-alert warning">
                    <div class="alert-icon">⚠️</div>
                    <div class="alert-content">
                        <h4>분할을 권장합니다</h4>
                        <p>${recommendations.reason}</p>
                    </div>
                </div>
                <div class="split-proposals">
                    ${recommendations.proposals.map(proposal => `
                        <div class="proposal-card">
                            <h4>${proposal.title}</h4>
                            <p>${proposal.description}</p>
                            <div class="proposal-files">
                                <strong>포함 파일:</strong>
                                <ul>
                                    ${proposal.files.map(file => `<li>${file}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="proposal-benefits">
                                <strong>기대 효과:</strong>
                                <ul>
                                    ${proposal.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="recommendation-alert success">
                    <div class="alert-icon">✅</div>
                    <div class="alert-content">
                        <h4>현재 PR 크기가 적절합니다</h4>
                        <p>${recommendations.reason}</p>
                    </div>
                </div>
            `}
        </div>
    `;
}

// PR 분할 분석 로직
function analyzePRForSplit(data) {
    // 기본 데이터 추출
    const commitTypes = [];
    const fileCategories = [];
    let totalFiles = 0;
    let totalLines = 0;
    
    // 실제 분석 데이터에서 추출
    if (data.by_commit_type) {
        Object.keys(data.by_commit_type).forEach(type => {
            commitTypes.push(type);
            if (data.by_commit_type[type].file_categories) {
                Object.keys(data.by_commit_type[type].file_categories).forEach(category => {
                    totalFiles += data.by_commit_type[type].file_categories[category].length;
                    data.by_commit_type[type].file_categories[category].forEach(file => {
                        totalLines += (file.additions || 0) + (file.deletions || 0);
                    });
                });
            }
        });
    }
    
    // 복잡도 계산
    let complexityScore = 0;
    if (commitTypes.length > 2) complexityScore += 3;
    if (totalFiles > 10) complexityScore += 3;
    if (totalLines > 300) complexityScore += 2;
    if (commitTypes.includes('feat') && commitTypes.includes('fix')) complexityScore += 2;
    
    return {
        complexityScore: Math.min(complexityScore, 10),
        complexity: complexityScore > 6 ? 'high' : complexityScore > 3 ? 'medium' : 'low',
        complexityText: complexityScore > 6 ? '높음 - 분할 권장' : complexityScore > 3 ? '보통 - 검토 필요' : '낮음 - 적절함',
        fileCount: totalFiles,
        linesChanged: totalLines,
        size: totalLines > 300 ? 'large' : totalLines > 100 ? 'medium' : 'small',
        commitTypes: commitTypes,
        focus: commitTypes.length > 2 ? 'scattered' : 'focused'
    };
}

// 분할 권장사항 생성
function generateSplitRecommendations(analysis, data) {
    const shouldSplit = analysis.complexityScore > 6 || analysis.fileCount > 15 || analysis.commitTypes.length > 2;
    
    if (!shouldSplit) {
        return {
            shouldSplit: false,
            reason: `현재 PR은 ${analysis.fileCount}개 파일, ${analysis.linesChanged}라인 변경으로 적절한 크기입니다. 단일 목적의 변경사항으로 보여 리뷰하기 좋은 상태입니다.`
        };
    }
    
    const proposals = [];
    
    // 실제 데이터 기반 분할 제안 생성
    if (data.by_commit_type) {
        Object.keys(data.by_commit_type).forEach((commitType, index) => {
            const commitData = data.by_commit_type[commitType];
            const files = [];
            
            if (commitData.file_categories) {
                Object.keys(commitData.file_categories).forEach(category => {
                    commitData.file_categories[category].forEach(file => {
                        files.push(file.filename);
                    });
                });
            }
            
            proposals.push({
                title: `PR #${index + 1}: ${getCommitTypeTitle(commitType)}`,
                description: `${commitType} 관련 변경사항 (${commitData.messages.length}개 커밋)`,
                files: files.slice(0, 5), // 최대 5개 파일만 표시
                benefits: getCommitTypeBenefits(commitType)
            });
        });
    }
    
    return {
        shouldSplit: true,
        reason: `${analysis.complexityScore > 6 ? '높은 복잡도' : ''}${analysis.fileCount > 15 ? ', 많은 파일 수' : ''}${analysis.commitTypes.length > 2 ? ', 다양한 변경 타입' : ''}으로 인해 분할을 권장합니다.`,
        proposals
    };
}

// 커밋 타입별 제목
function getCommitTypeTitle(type) {
    const titles = {
        'feat': '새 기능 구현',
        'fix': '버그 수정',
        'refactor': '코드 리팩토링',
        'style': 'UI/스타일 개선',
        'docs': '문서 업데이트',
        'test': '테스트 코드',
        'chore': '기타 작업'
    };
    return titles[type] || `${type} 변경사항`;
}

// 커밋 타입별 기대 효과
function getCommitTypeBenefits(type) {
    const benefits = {
        'feat': ['새 기능에 집중된 리뷰', '기능별 테스트 용이', '점진적 배포 가능'],
        'fix': ['긴급 수정 시 빠른 배포', '수정 범위 명확화', '회귀 테스트 집중'],
        'refactor': ['코드 품질 개선 검토', '성능 영향도 평가', '아키텍처 변경 추적'],
        'style': ['시각적 변화 검토', '일관성 확인', 'UX 개선 평가'],
        'docs': ['문서 정확성 검증', '빠른 승인 가능', '독립적 배포'],
        'test': ['테스트 커버리지 확인', '품질 보증 강화', '안정성 검증']
    };
    return benefits[type] || ['변경사항 집중 리뷰', '영향 범위 최소화', '명확한 목적'];
}

// 종합 리뷰 표시
function displaySuccess(data) {
    const resultDiv = document.getElementById('result');
    let summaryMd = data.summary_review && data.summary_review.markdown ? data.summary_review.markdown.trim() : '';
    lastMarkdown = summaryMd;
    
    if (!summaryMd || summaryMd.replace(/[#\-\s\n`]/g, '').length < 10) {
        resultDiv.innerHTML = '<div class="review-markdown empty">분석된 리뷰 내용이 없습니다.</div>';
        return;
    }
    
    let html = marked.parse(summaryMd);
    html = html.replace(/<h2/g, '<h2 style="margin-top:24px;border-bottom:2px solid #eee;padding-bottom:6px;"')
               .replace(/<h3/g, '<h3 style="margin-top:18px;color:#4a4a4a;"')
               .replace(/<ul>/g, '<ul style="margin-bottom:16px;">')
               .replace(/<li>/g, '<li style="margin-bottom:6px;">')
               .replace(/<hr>/g, '<hr style="border:0;border-top:1px solid #ddd;margin:18px 0;">');
    
    resultDiv.className = 'result review-markdown';
    resultDiv.innerHTML = html;
}

function displayError(errorMessage) {
    result.className = 'result error';
    result.innerHTML = `
        <h2>❌ 오류 발생</h2>
        <p>${errorMessage}</p>
        <details>
            <summary>문제 해결 방법</summary>
            <ul>
                <li>저장소 이름이 정확한지 확인하세요 (예: torooc/portal-react)</li>
                <li>PR 번호가 존재하는지 확인하세요</li>
                <li>GitHub API 토큰이 올바르게 설정되었는지 확인하세요</li>
                <li>Claude API 키가 올바르게 설정되었는지 확인하세요</li>
            </ul>
        </details>
    `;
    result.style.display = 'block';
}

// 복사 버튼 이벤트
const copyBtn = document.getElementById('copyMarkdownBtn');
if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
        if (!lastMarkdown) return;
        try {
            await navigator.clipboard.writeText(lastMarkdown);
            const msg = document.getElementById('copySuccess');
            if (msg) {
                msg.style.display = 'block';
                setTimeout(() => { msg.style.display = 'none'; }, 2000);
            }
        } catch (e) {
            alert('클립보드 복사에 실패했습니다.');
        }
    });
}

// 템플릿 관련 함수들
function initializeTemplates() {
    templates = {
        detailed: `## 📋 코드 리뷰 체크리스트

### 🎯 기능 요구사항
- [ ] 기능이 명세서/이슈와 일치하는가?
- [ ] 예외 상황이 적절히 처리되었는가?
- [ ] 에러 메시지가 명확하고 도움이 되는가?

### 🏗️ 코드 품질
- [ ] 코드가 읽기 쉽고 이해하기 쉬운가?
- [ ] 함수/변수명이 의도를 명확히 표현하는가?
- [ ] 중복 코드가 제거되었는가?
- [ ] 복잡한 로직에 적절한 주석이 있는가?

### 🔒 보안
- [ ] 사용자 입력이 적절히 검증되는가?
- [ ] 민감한 정보가 노출되지 않는가?
- [ ] SQL 인젝션 등 보안 취약점이 없는가?

### ⚡ 성능
- [ ] 불필요한 리렌더링이나 연산이 없는가?
- [ ] 메모리 누수 가능성이 없는가?
- [ ] 대용량 데이터 처리가 효율적인가?

### 📱 사용자 경험
- [ ] 로딩 상태가 적절히 표시되는가?
- [ ] 접근성 가이드라인을 준수하는가?
- [ ] 반응형 디자인이 적용되었는가?

### ✅ 테스트
- [ ] 새로운 기능에 대한 테스트가 있는가?
- [ ] 기존 테스트가 모두 통과하는가?
- [ ] 엣지 케이스가 테스트되었는가?

### 📚 문서화
- [ ] README나 문서가 업데이트되었는가?
- [ ] API 변경사항이 문서화되었는가?
- [ ] 주요 결정사항이 기록되었는가?

---
**리뷰어:** [이름]  
**리뷰 날짜:** ${new Date().toLocaleDateString('ko-KR')}`,

        simple: `## 📝 간단 리뷰

### ✅ 확인 사항
- [ ] 기능이 정상 동작함
- [ ] 코드가 읽기 쉬움
- [ ] 보안 이슈 없음
- [ ] 성능 문제 없음
- [ ] 테스트 통과

### 💬 피드백
[여기에 구체적인 피드백을 작성하세요]

### 🎯 결론
- [ ] 승인
- [ ] 수정 후 재검토 필요

---
**리뷰어:** [이름]`,

        'split-pr': `## ✂️ PR 분할 제안

### 📊 현재 상황
이 PR은 다음과 같은 이유로 분할을 권장합니다:
- [ ] 변경 파일 수가 많음 (10개 이상)
- [ ] 서로 다른 목적의 변경사항 혼재
- [ ] 리뷰 복잡도가 높음

### 🎯 제안하는 분할 방안

#### PR #1: [첫 번째 PR 제목]
**목적:** [구체적인 목적 설명]
**포함 파일:**
- file1.js
- file2.css

**기대 효과:**
- 집중된 리뷰 가능
- 빠른 배포 가능

#### PR #2: [두 번째 PR 제목]
**목적:** [구체적인 목적 설명]
**포함 파일:**
- file3.js
- file4.css

**기대 효과:**
- 독립적인 테스트 가능
- 롤백 시 영향 최소화

### 🚀 다음 단계
1. 현재 PR을 draft로 변경
2. 위 제안에 따라 별도 PR 생성
3. 각 PR에 대해 독립적인 리뷰 진행

---
**제안자:** [이름]  
**제안 날짜:** ${new Date().toLocaleDateString('ko-KR')}`
    };
}

let selectedTemplate = 'detailed';

function selectTemplate(templateName) {
    selectedTemplate = templateName;
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.template-card').classList.add('selected');
    
    updateTemplatePreview();
}

function updateTemplatePreview() {
    const templateContent = document.getElementById('templateContent');
    const customNotes = document.getElementById('customNotes').value;
    
    let template = templates[selectedTemplate] || '';
    if (customNotes.trim()) {
        template += '\n\n### 💭 추가 메모\n' + customNotes;
    }
    
    templateContent.textContent = template;
}

function copyTemplate() {
    const templateContent = document.getElementById('templateContent').textContent;
    
    navigator.clipboard.writeText(templateContent).then(() => {
        const copySuccess = document.getElementById('templateCopySuccess');
        copySuccess.style.display = 'block';
        setTimeout(() => {
            copySuccess.style.display = 'none';
        }, 2000);
    }).catch(err => {
        alert('복사에 실패했습니다: ' + err);
    });
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeTemplates();
    updateTemplatePreview();
    
    // 커스텀 노트 변경 시 템플릿 미리보기 업데이트
    document.getElementById('customNotes').addEventListener('input', updateTemplatePreview);
});
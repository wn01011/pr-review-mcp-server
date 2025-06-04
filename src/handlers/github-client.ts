import { Octokit } from 'octokit';

export class GitHubClient {
  public octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
      request: {
        fetch: fetch,
      },
    });
  }

  async getPR(repo: string, prNumber: number) {
    const [owner, repoName] = repo.split('/');
    
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner,
        repo: repoName,
        pull_number: prNumber,
      });
      
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch PR: ${error.message}`);
    }
  }

  async getPRDiff(repo: string, prNumber: number): Promise<string> {
    const [owner, repoName] = repo.split('/');
    
    try {
      // 먼저 일반 diff를 시도
      try {
        const { data } = await this.octokit.rest.pulls.get({
          owner,
          repo: repoName,
          pull_number: prNumber,
          mediaType: {
            format: 'diff'
          }
        });
        
        return data as unknown as string;
      } catch (error: any) {
        // diff가 너무 크면 파일 목록을 사용해서 요약 생성
        if (error.message.includes('too_large') || error.message.includes('exceeded')) {
          console.log('PR diff too large, using file list instead');
          const files = await this.getPRFiles(repo, prNumber);
          
          // 파일 변경사항을 요약으로 변환
          let summary = `# PR Summary (${files.length} files changed)\n\n`;
          
          files.forEach(file => {
            summary += `## ${file.filename}\n`;
            summary += `- Status: ${file.status}\n`;
            summary += `- Changes: +${file.additions} -${file.deletions}\n`;
            if (file.patch && file.patch.length < 2000) {
              // 작은 패치만 포함
              summary += `\`\`\`diff\n${file.patch.substring(0, 1000)}${file.patch.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
            }
            summary += '\n';
          });
          
          return summary;
        }
        throw error;
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch PR diff: ${error.message}`);
    }
  }

  async getPRFiles(repo: string, prNumber: number) {
    const [owner, repoName] = repo.split('/');
    
    try {
      const { data } = await this.octokit.rest.pulls.listFiles({
        owner,
        repo: repoName,
        pull_number: prNumber,
      });
      
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch PR files: ${error.message}`);
    }
  }

  async addPRComment(repo: string, prNumber: number, comment: string) {
    const [owner, repoName] = repo.split('/');
    
    try {
      const { data } = await this.octokit.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: prNumber,
        body: comment,
      });
      
      return data;
    } catch (error: any) {
      throw new Error(`Failed to add PR comment: ${error.message}`);
    }
  }

  async getPRComments(repo: string, prNumber: number) {
    const [owner, repoName] = repo.split('/');
    
    try {
      const { data } = await this.octokit.rest.issues.listComments({
        owner,
        repo: repoName,
        issue_number: prNumber,
      });
      
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch PR comments: ${error.message}`);
    }
  }

  async updatePRStatus(repo: string, sha: string, state: 'pending' | 'success' | 'failure', description: string) {
    const [owner, repoName] = repo.split('/');
    
    try {
      const { data } = await this.octokit.rest.repos.createCommitStatus({
        owner,
        repo: repoName,
        sha,
        state,
        description,
        context: 'ai-review/quality-gate'
      });
      
      return data;
    } catch (error: any) {
      throw new Error(`Failed to update PR status: ${error.message}`);
    }
  }
}
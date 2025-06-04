export class FileAnalyzer {
  static analyzeFileTypes(files: any[]): any {
    const analysis = {
      components: [],
      hooks: [],
      utils: [],
      styles: [],
      tests: [],
      configs: [],
      docs: [],
      assets: [],
      api: [],
      other: []
    };

    const fileCheckpoints = new Map(); // 파일별로 체크포인트를 그룹화

    files.forEach(file => {
      const path = file.filename || file.path || '';
      const lowerPath = path.toLowerCase();
      
      let category = 'other';
      let checkpointsList = [];

      // 컴포넌트 파일
      if (this.isComponent(path)) {
        analysis.components.push(path);
        category = 'components';
        checkpointsList = [
          'React 컴포넌트 구조와 props 타입 확인',
          'useState/useEffect 훅 사용의 적절성',
          '컴포넌트 분리 및 재사용성 검토',
          '렌더링 성능 최적화 (memo, callback 등)'
        ];
      }
      // 커스텀 훅
      else if (this.isHook(path)) {
        analysis.hooks.push(path);
        category = 'hooks';
        checkpointsList = [
          '훅의 재사용성과 추상화 수준',
          '의존성 배열 관리의 적절성', 
          '훅 내부 로직의 복잡도 확인'
        ];
      }
      // 유틸리티 함수
      else if (this.isUtil(path)) {
        analysis.utils.push(path);
        category = 'utils';
        checkpointsList = [
          '함수의 단일 책임 원칙 준수',
          '입력 검증 및 에러 처리',
          '함수명과 기능의 일치성'
        ];
      }
      // 스타일 파일
      else if (this.isStyle(path)) {
        analysis.styles.push(path);
        category = 'styles';
        checkpointsList = [
          'CSS 클래스명 규칙 준수',
          '반응형 디자인 고려',
          '불필요한 스타일 중복 제거'
        ];
      }
      // 테스트 파일
      else if (this.isTest(path)) {
        analysis.tests.push(path);
        category = 'tests';
        checkpointsList = [
          '테스트 커버리지 충분성',
          '엣지 케이스 테스트 포함',
          '테스트 코드의 가독성과 유지보수성'
        ];
      }
      // 설정 파일
      else if (this.isConfig(path)) {
        analysis.configs.push(path);
        category = 'configs';
        checkpointsList = [
          '환경별 설정 분리',
          '보안 관련 설정 검토',
          '설정 변경의 영향 범위 확인'
        ];
      }
      // 문서 파일
      else if (this.isDoc(path)) {
        analysis.docs.push(path);
        category = 'docs';
        checkpointsList = [
          '문서 내용의 정확성과 최신성',
          '예제 코드의 동작 확인',
          '마크다운 문법 및 링크 검증'
        ];
      }
      // API 관련
      else if (this.isAPI(path)) {
        analysis.api.push(path);
        category = 'api';
        checkpointsList = [
          'API 엔드포인트 설계의 RESTful 준수',
          '에러 응답 처리의 일관성',
          '보안 취약점 및 인증/인가 검토'
        ];
      }
      // 에셋 파일
      else if (this.isAsset(path)) {
        analysis.assets.push(path);
        category = 'assets';
        checkpointsList = [
          '파일 크기 최적화 여부',
          '웹 최적화 포맷 사용 여부'
        ];
      }
      // 기타 파일
      else {
        analysis.other.push(path);
      }

      // 파일별 체크포인트 저장
      if (checkpointsList.length > 0) {
        fileCheckpoints.set(path, {
          category,
          checkpoints: checkpointsList
        });
      }
    });

    // 파일별 체크포인트를 정리된 형태로 변환
    const checkpoints = {
      files: Array.from(fileCheckpoints.entries()).map(([filePath, data]) => ({
        path: filePath,
        category: data.category,
        checkpoints: data.checkpoints
      })),
      general: [
        '전체: 코드 일관성 및 프로젝트 컨벤션 준수',
        '전체: 성능에 영향을 주는 변경사항 확인',
        '전체: 보안 취약점 및 민감 정보 노출 검토',
        '전체: 브라우저 호환성 및 접근성 고려'
      ]
    };

    return { analysis, checkpoints };
  }

  private static isComponent(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return (
      lowerPath.includes('/components/') ||
      lowerPath.includes('/component/') ||
      (lowerPath.endsWith('.jsx') || lowerPath.endsWith('.tsx')) &&
      !lowerPath.includes('test') &&
      !lowerPath.includes('spec') &&
      !lowerPath.startsWith('use')
    );
  }

  private static isHook(path: string): boolean {
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    return (
      fileName.startsWith('use') &&
      (fileName.endsWith('.js') || fileName.endsWith('.ts') || 
       fileName.endsWith('.jsx') || fileName.endsWith('.tsx'))
    );
  }

  private static isUtil(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return (
      lowerPath.includes('/utils/') ||
      lowerPath.includes('/util/') ||
      lowerPath.includes('/helpers/') ||
      lowerPath.includes('/lib/')
    );
  }

  private static isStyle(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return (
      lowerPath.endsWith('.css') ||
      lowerPath.endsWith('.scss') ||
      lowerPath.endsWith('.sass') ||
      lowerPath.endsWith('.less') ||
      lowerPath.endsWith('.styl')
    );
  }

  private static isTest(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return (
      lowerPath.includes('.test.') ||
      lowerPath.includes('.spec.') ||
      lowerPath.includes('__tests__') ||
      lowerPath.includes('/test/') ||
      lowerPath.includes('/tests/')
    );
  }

  private static isConfig(path: string): boolean {
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    const lowerPath = path.toLowerCase();
    return (
      fileName.startsWith('.') ||
      fileName.includes('config') ||
      fileName.includes('setting') ||
      lowerPath.includes('/config/') ||
      fileName.endsWith('.json') ||
      fileName.endsWith('.yml') ||
      fileName.endsWith('.yaml') ||
      fileName === 'package.json'
    );
  }

  private static isDoc(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return (
      lowerPath.endsWith('.md') ||
      lowerPath.endsWith('.mdx') ||
      lowerPath.includes('readme') ||
      lowerPath.includes('/docs/') ||
      lowerPath.includes('/doc/')
    );
  }

  private static isAPI(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return (
      lowerPath.includes('/api/') ||
      lowerPath.includes('/apis/') ||
      lowerPath.includes('/services/') ||
      lowerPath.includes('/service/') ||
      lowerPath.includes('endpoint')
    );
  }

  private static isAsset(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return (
      lowerPath.endsWith('.png') ||
      lowerPath.endsWith('.jpg') ||
      lowerPath.endsWith('.jpeg') ||
      lowerPath.endsWith('.gif') ||
      lowerPath.endsWith('.svg') ||
      lowerPath.endsWith('.webp') ||
      lowerPath.endsWith('.ico') ||
      lowerPath.includes('/assets/') ||
      lowerPath.includes('/images/') ||
      lowerPath.includes('/img/')
    );
  }
}
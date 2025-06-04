#!/bin/bash

echo "🔧 AI Code Review MCP Server 개발 모드 시작..."

# Node.js 18 강제 사용
echo "📌 Node.js 18로 전환 중..."
source ~/.nvm/nvm.sh
nvm use 18.20.8

# 현재 Node 버전 확인
echo "✅ 현재 Node.js 버전: $(node -v)"

# 환경 변수 확인
if [ ! -f .env ]; then
    echo "❌ .env 파일이 없습니다. .env.example을 복사하여 .env 파일을 만들어주세요."
    exit 1
fi

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

echo "🌟 개발 서버 시작..."
echo "📱 웹 UI: http://localhost:3001"
echo "🔗 Health Check: http://localhost:3001/health"
echo "🔄 자동 재시작 활성화 (파일 변경 시)"
echo ""
echo "Ctrl+C로 서버를 종료할 수 있습니다."
echo ""

npm run dev

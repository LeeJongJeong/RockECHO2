# RockECHO2 (Operational Knowledge Echoes Forward)

RockECHO2는 데이터베이스 및 운영 서버 등 인프라 시스템에서 발생하는 장애 로그나 상황(Raw Input)을 파악하여, **AI가 원인(Cause)과 조치(Action) 및 진단 쿼리(Runbook)를 자동으로 분석하고 구조화된 지식으로 축적**하는 지식 플랫폼입니다.

기존에 승인된 사내 과거 장애 조치 사례를 AI가 우선 학습하는 **RAG(검색 증강 생성) 파이프라인**을 통해, 기업 고유의 장애 대응 문화를 완벽하게 계승합니다.

---

## 🚀 Key Features (핵심 기능)

1. **AI 기반 지식 자동 분류 및 초안 작성**
   - 개발자나 DBA가 에러 로그 일부만 복사해 넣으면, AI가 핵심 이슈와 조치 방향을 추론하여 깔끔한 마크다운/JSON 규격으로 지식을 정리합니다.
2. **RAG (Retrieval-Augmented Generation) 연동**
   - 새로운 장애를 입력할 때 벡터 데이터베이스를 검색하여 과거 유사한 승인 지식을 Top-2로 찾아옵니다. 이를 AI의 프롬프트에 주입하여, 무분별한 할루시네이션(거짓 정보)을 막고 **"사내 표준 대응 매뉴얼"**을 작성합니다.
3. **리뷰어(Reviewer) 승인 파이프라인**
   - AI가 작성한 초안(`AI Draft`)은 1차 검토(`Reviewed`)를 거쳐 시니어 엔지니어의 `Approved` 승인을 받아 최종적인 회사의 지식 자산으로 전환됩니다.
4. **강력한 Global Error Handling & Resilience**
   - API 통신 시 429(Rate Limit)나 5xx 에러가 발생해도 백그라운드에서 **Exponential Backoff 재시도 로직**이 동작하여 AI 추론을 보호합니다. 통합된 `AppError` 객체로 일관성 있게 프론트엔드 알림(Toast)을 제어합니다.

---

## 🛠️ Technology Stack (기술 스택)

### Backend (Cloudflare Serverless)
- **Framework**: Hono (`hono/cloudflare-workers`)
- **Database**: Cloudflare D1 (SQLite 기반 서버리스 RDBMS)
- **Vector DB**: Cloudflare Vectorize (사내 유사 장애 RAG 검색용)
- **AI Integration**: OpenAI API (`text-embedding-3-small` & `gpt-4o-mini` 모델)
- **Language**: TypeScript

### Frontend (Vanilla JS SPA)
- **Language**: Vanilla JavaScript (ES Module) + **JSDoc Type Safety**
- **Styling**: Tailwind CSS + FontAwesome
- **Build Tool**: Vite (빠른 HMR 및 `dev:sandbox` 연동)
- **Architecture**: Component-based Modular Architecture (Fat Page 제거 완료)

---

## ⚙️ Development & Quick Start (로컬 개발 환경)

이 프로젝트는 Cloudflare 워커 생태계에 최적화되어 있습니다. 다음 순서로 로컬 개발을 진행할 수 있습니다.

### 1. 의존성 설치
\`\`\`bash
npm install
\`\`\`

### 2. 환경 변수 초기화
미리 제공된 `.dev.vars` 파일에 필요한 키를 입력하세요.
\`\`\`dotenv
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
DEV_DIAGNOSTICS=true
\`\`\`

### 3. 데이터베이스 및 Vectorize 세팅
\`\`\`bash
# 1) 로컬 D1 DB 스키마 생성 및 기초 데이터 주입
npm run db:migrate:local

# 2) Vectorize 로컬 인덱스 구축 (로컬 개발을 위한 가이드 참고)
wrangler vectorize create rockecho-vectors --dimensions=1536 --metric=cosine
\`\`\`

### 4. 컴파일 검증 및 번들링
백엔드의 타입과 프론트엔드 번들링이 정상적인지 확인합니다.
\`\`\`bash
npm run typecheck
npm run build
\`\`\`

### 5. 로컬 개발 서버 구동 (Sandbox)
로컬 데이터베이스(`--local`)를 잡고 Vite 번들결과를 구동하는 명령어입니다.
\`\`\`bash
npm run dev:sandbox
\`\`\`
로컬 서버가 실행되면 브라우저에서 `http://localhost:3000` 로 접속하여 결과물을 확인하세요.

---

## 📁 Directory Structure (프로젝트 구조)

- **`src/index.tsx`**: Hono 서버 엔트리 포인트 및 글로벌 에러 헨들러(`app.onError`).
- **`src/routes/`**: `/api/incidents`, `/api/knowledge`, `/api/ai` 등 분리된 엔드포인트 라우터 집합.
- **`src/services/`**: 순수 비즈니스 로직. D1 및 Vectorize와 직접 소통하고 `AppError`를 발생시키는 핵심 레이어.
- **`src/repositories/`**: 데이터베이스 쿼리를 관리하는 영속성 계층 (D1 접근).
- **`src/ai/`**: 프롬프트 엔지니어링(`prompt.ts`), OpenAI 네트워크 클라이언트(`client.ts`), 임베딩(`embedding.ts`) 관리.
- **`public/static/app/`**: 컴포넌트(`components/`), 라우팅, 유틸리티(`utils.js` 등)를 포함한 순수 바닐라 모듈식 프론트엔드 소스.
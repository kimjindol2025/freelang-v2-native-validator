# FreeLang v2 - AI-First Programming Language

> **AI가 완전히 주도**, **자유로운 입력**, **자동 학습**
>
> "AI는 학생이 아니라 설계자다"

---

## 🎯 핵심 철학

**"오류 = 기회"**

```
❌ 이전: AI가 오류 메시지를 읽고 배운다 (수동)
✅ 새로운: AI가 제안을 평가하고 피드백한다 (능동)
```

FreeLang v2는 AI를 위한 언어입니다.
- AI가 뭐든 입력해도 작동
- v2가 자동으로 헤더 제안
- AI가 선택/수정/피드백
- v2가 누적 학습해서 진화

---

## 🚀 3단계 아키텍처

### Stage 1: 자유 입력
```
AI: "배열 더하기"
또는: "sum([1,2,3])"
또는: "배열 합산"

규칙: 없음, 형식: 없음
```

### Stage 2: 자동 헤더 생성
```
v2가 자동으로:
1️⃣ 텍스트 분석
2️⃣ 의도 패턴 인식 (sum, avg, max, min 등)
3️⃣ 타입 추론 (array<number> → number)
4️⃣ Reason 추론 ("통계 연산 기초")
5️⃣ Directive 결정 ("메모리 효율성 우선")
6️⃣ 헤더 생성
7️⃣ 신뢰도 계산 (95%)

결과: 헤더 제안 + 신뢰도 점수
```

### Stage 3: AI 피드백
```
AI의 선택:
[✅ 승인] [✏️ 수정] [🔄 재제안] [❌ 취소]

선택 → 피드백 저장 → v2 학습 → 다음 제안 개선
```

---

## 📊 입출력 예시

### 입력 (완전 자유)
```
배열 더하기
```

### 자동 제안
```
fn sum: array<number> → number
~ "배열의 모든 수를 더하기"
reason: "통계 연산 기초"
directive: "메모리 효율성 우선"

신뢰도: 95% ✅
```

### AI 응답
```
승인 ✅
```

### 자동 생성 (C 코드)
```c
#include <stdio.h>

double sum(double* arr, int len) {
  double result = 0;

  // 검증
  if (len == 0) {
    printf("Warning: empty array\n");
    return 0;
  }

  // 반복문 (자동 생성)
  for (int i = 0; i < len; i++) {
    result += arr[i];
  }

  return result;
}
```

### 컴파일
```bash
gcc -o sum sum.c
./sum
# 결과: 완벽한 실행 파일
```

---

## 🧠 학습의 진화

```
초기 (첫 사용):
입력: "배열 더하기"
제안 신뢰도: 70% ⚠️

1주일 (10회 피드백):
입력: "배열 더하기"
제안 신뢰도: 85% 📈

1개월 (500회 피드백):
입력: "배열 더하기"
제안 신뢰도: 96% ✅

3개월 (1,500회 피드백):
입력: "배열 더하기"
제안 신뢰도: 98% 🚀
메시지: "거의 확실합니다"
```

v2가 점점 더 똑똑해집니다.

---

## 💡 3개 정의 헤더 계약

### Reason (왜)
```
"통계 연산 기초"
"이 코드가 필요한 비즈니스 우선순위"
```

### Definition (뭐)
```
fn sum: array<number> → number ~ "배열 합산"
"정확한 입력/출력/의도 정의"
```

### Directive (어떻게)
```
"메모리 효율성 우선"
"AI를 위한 최적화 지시"
```

**3개 모두 있어야 완벽:**
- 1개만: 기본 수준 (70%)
- 2개: 좋음 (85%)
- 3개: 완벽 (95%+)

---

## 📈 v1 vs v2

| 항목 | v1 | v2 |
|------|----|----|
| **철학** | 범용 언어 | AI 전용 |
| **입력** | 엄격한 문법 | 자유 텍스트 |
| **검증** | 오류 메시지 | 제안 + 피드백 |
| **학습** | 수동 | 자동 (누적) |
| **진화** | 정적 고정 | 동적 70%→98% |
| **AI 역할** | 코드 작성자 | 설계자 |

---

## 🏗️ 프로젝트 구조

```
v2-freelang-ai/
├── src/
│   ├── automatic-header-engine/    # 자동 헤더 생성 (신규)
│   │   ├── AutoHeaderEngine.ts
│   │   ├── TextNormalizer.ts
│   │   ├── IntentMatcher.ts
│   │   ├── TypeInference.ts
│   │   ├── ReasonInferencer.ts
│   │   ├── DirectiveDecider.ts
│   │   └── ConfidenceCalculator.ts
│   │
│   ├── header-contract/
│   │   ├── HeaderValidator.ts
│   │   ├── HeaderParser.ts
│   │   └── HeaderBuilder.ts
│   │
│   ├── feedback/                   # 피드백 수집 (신규)
│   │   ├── FeedbackCollector.ts
│   │   ├── FeedbackStorage.ts
│   │   └── FeedbackAnalyzer.ts
│   │
│   ├── learning/                   # 학습 엔진 (신규)
│   │   ├── LearningEngine.ts
│   │   ├── PatternUpdater.ts
│   │   ├── ConfidenceUpdater.ts
│   │   └── MetaLearner.ts
│   │
│   ├── codegen/                    # C 코드 생성 (v1 기반)
│   │   ├── CGenerator.ts
│   │   ├── AlgorithmSelector.ts
│   │   ├── CodeTemplate.ts
│   │   └── SafetyChecker.ts
│   │
│   ├── cli/                        # CLI (대화형)
│   │   ├── CLI.ts
│   │   ├── InteractiveMode.ts
│   │   └── BatchMode.ts
│   │
│   └── utils/
│       ├── Logger.ts
│       ├── Database.ts
│       └── Config.ts
│
├── test/
│   ├── automatic-header-engine.test.ts
│   ├── feedback-loop.test.ts
│   ├── learning-engine.test.ts
│   └── integration.test.ts
│
├── docs/
│   ├── AUTO-HEADER-ENGINE.md          # 자동 헤더 생성 설계
│   ├── AI-FEEDBACK-LOOP.md            # 피드백 루프 철학
│   ├── ARCHITECTURE-V2-UPDATED.md     # 전체 아키텍처
│   ├── IMPLEMENTATION-ROADMAP.md      # 7주 구현 계획
│   ├── SPECIFICATION.md               # 스펙
│   ├── HEADER-CONTRACT.md             # 헤더 계약
│   └── README.md                      # 이 파일
│
├── package.json
├── tsconfig.json
├── Makefile
└── README.md
```

---

## 🚀 빠른 시작 (구현 전)

```bash
# 현재는 설계 단계이므로 구현 대기 중
git clone https://gogs.dclub.kr/kim/v2-freelang-ai.git
cd v2-freelang-ai

# 설계 문서 읽기
cat docs/AUTO-HEADER-ENGINE.md
cat docs/AI-FEEDBACK-LOOP.md
cat docs/ARCHITECTURE-V2-UPDATED.md
cat docs/IMPLEMENTATION-ROADMAP.md

# 구현 대기 (다른 Claude가 담당)
```

---

## 📝 지원 범위

### 기본 연산 (6개)
- ✅ `sum` - 배열 합산
- ✅ `average` - 배열 평균
- ✅ `max` - 최대값 탐색
- ✅ `min` - 최소값 탐색
- ✅ `filter` - 조건 필터링
- ✅ `sort` - 배열 정렬

### 지원 타입
- `int`, `number`, `boolean`, `string` (기본)
- `array<T>` (배열)

### 생성 범위
- ✅ 반복문 자동 생성
- ✅ 타입별 검증
- ✅ 오류 처리
- ✅ 메모리 초기화
- ✅ 최적화 선택

---

## 🔗 핵심 문서

| 문서 | 내용 | 대상 |
|------|------|------|
| **[AUTO-HEADER-ENGINE.md](./docs/AUTO-HEADER-ENGINE.md)** | 7단계 파이프라인 | 아키텍트 |
| **[AI-FEEDBACK-LOOP.md](./docs/AI-FEEDBACK-LOOP.md)** | 피드백 철학 | 철학자 |
| **[ARCHITECTURE-V2-UPDATED.md](./docs/ARCHITECTURE-V2-UPDATED.md)** | 9개 레이어 | 설계자 |
| **[IMPLEMENTATION-ROADMAP.md](./docs/IMPLEMENTATION-ROADMAP.md)** | 7주 계획 | 구현자 |
| **[SPECIFICATION.md](./docs/SPECIFICATION.md)** | 상세 스펙 | 참고 |
| **[HEADER-CONTRACT.md](./docs/HEADER-CONTRACT.md)** | 헤더 계약 | 참고 |

---

## 🎯 구현 단계

### Phase 1: 자동 헤더 생성 엔진 ✅ 설계 완료
```
파일: AUTO-HEADER-ENGINE.md
내용: 7단계 파이프라인, 의도 DB, 신뢰도 계산
```

### Phase 2: 헤더 검증 + 코드 생성 ✅ 설계 완료
```
파일: IMPLEMENTATION-ROADMAP.md (Week 2)
내용: HeaderValidator, CGenerator, 템플릿
```

### Phase 3: 피드백 수집 시스템 ✅ 설계 완료
```
파일: IMPLEMENTATION-ROADMAP.md (Week 3)
내용: FeedbackCollector, Storage, CLI
```

### Phase 4: 학습 엔진 ✅ 설계 완료
```
파일: IMPLEMENTATION-ROADMAP.md (Week 4)
내용: PatternUpdater, ConfidenceUpdater, MetaLearner
```

### Phase 5~7: 테스트, 최적화, 배포 ✅ 설계 완료
```
파일: IMPLEMENTATION-ROADMAP.md (Week 5-7)
내용: Unit/Integration/E2E 테스트, 배포
```

---

## 💾 데이터 흐름

```
AI 입력
  ↓
자동 헤더 생성 (7단계)
  ↓
제안 헤더 + 신뢰도
  ↓
AI 피드백 (승인/수정/재제안/취소)
  ↓
피드백 저장
  ↓
자동 학습 (신뢰도 증가)
  ↓
코드 생성 (C)
  ↓
컴파일 + 검증
  ↓
완벽한 실행 파일
```

---

## 📊 성능 목표

| 메트릭 | 목표 | 방법 |
|--------|------|------|
| **제안 시간** | <100ms | 패턴 DB 캐싱 |
| **초기 정확도** | 70% | 의도 패턴 DB |
| **1주 후** | 85% | 피드백 학습 |
| **1개월 후** | 96% | 누적 학습 |
| **신뢰도 점수** | >85% | 패턴 강화 |

---

## 🎓 AI 학습 프로세스

```
1차 입력: "배열 더하기"
  → 제안 신뢰도: 70%
  → AI 피드백: "네"
  → 학습: confidence 70% → 72%

2차 입력: "배열 더하기"
  → 제안 신뢰도: 72% (개선!)
  → AI 피드백: "네"
  → 학습: confidence 72% → 74%

...계속 반복...

100차 입력: "배열 더하기"
  → 제안 신뢰도: 98% (거의 확실)
  → 메시지: "99% 확실합니다"
```

---

## 🚦 현재 상태

| 항목 | 상태 | 진행률 |
|------|------|--------|
| **설계** | ✅ 완료 | 100% |
| **철학** | ✅ 확정 | 100% |
| **문서** | ✅ 4개 | 1,896줄 |
| **구현** | ⏳ 대기 | 0% |

---

## 📄 라이선스

MIT License (v1 동일)

---

## 🔥 최종 철학

```
"AI는 학생이 아니라 설계자다"

- 오류는 실패가 아니라 기회
- 피드백은 강제가 아니라 선택
- 진화는 자동이 아니라 능동적
- 완성도는 고정이 아니라 누적적

이것이 진정한 AI를 위한 언어입니다.
```

---

**설계 완료일**: 2026-02-15
**구현 예정**: 2026-02-22 (7주)
**저장소**: https://gogs.dclub.kr/kim/v2-freelang-ai
**상태**: 🚀 설계 완료, 구현 준비 완료

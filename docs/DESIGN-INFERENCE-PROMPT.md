# FreeLang v2 - LLM 설계 추론 프롬프트

## 🎯 목표

이 문서는 **LLM(Claude)이 FreeLang v2의 최종 설계를 추론하기 위한 가이드**입니다.

---

## 📍 방향 정의 (확정)

### 핵심 철학
```
FreeLang v2 = 자유형 입력 + LLM 의도 추론 + 자동 C 코드 생성

특징:
  • 문법 자유 (필기체 언어) - AI가 대충 써도 이해함
  • 의도 중심 (무엇을 하려는가) - 형식 검증 X
  • LLM 기반 (LLM이 모든 처리) - 파서 없음
  • 자동 코드 생성 - 70%+ 자동화
```

### 입출력 정의
```
입력: 자유형 텍스트 (어떤 언어든, 어떤 형식이든)
  예: "배열 합산", "sum arr", "더하기 수열", "array sum"

처리: LLM 의도 추론
  패턴: operation + input_type + output_type + description
  예: { op: 'sum', input: 'array<number>', output: 'number' }

출력: C 코드 (자동 생성)
  포함: 반복문, 초기화, 검증, 메모리 관리
```

### 지원 범위 (A~Z)
```
A. 배열 연산 (sum, avg, max, min, sort, filter)
B. 기본 타입 (int, number, boolean, string)
C. 반복문 (for, while 자동 선택)
D. 조건문 (if/else 자동 생성)
E. 함수 (입출력 기반)
F. 메모리 (초기화, 할당, 해제 자동)
G. 검증 (범위, 공백 체크 자동)
H. 오류 처리 (안전한 기본값 반환)
I. 최적화 (필요시)
...
Z. 확장성 (새 패턴 추가 용이)
```

---

## 🔄 설계 추론 질문 (LLM이 답할 것)

### 1️⃣ 파이프라인 설계
```
Q: 입력 → LLM 추론 → 코드 생성 파이프라인을 어떻게 구현할까?

답변 포함 사항:
  - LLM 프롬프트 (의도 추론용)
  - 프롬프트 입력: 사용자 자유형 입력
  - 프롬프트 출력: JSON { operation, input_type, output_type, ...}
  - 버전 관리 (v2.0, v2.1... 다른 프롬프트?)
```

### 2️⃣ 의도 패턴 정의
```
Q: "배열 합산"이라는 의도를 어떻게 인식하고 변환할까?

답변 포함 사항:
  - 패턴 매칭 규칙 (sum: ["합산", "더하기", "sum", "addition"])
  - 타입 추론 (array → array<number> vs array<string>?)
  - 엣지 케이스 (빈 배열, NULL 포인터 등)
  - 다국어 지원 (한글, 영문 혼용)
```

### 3️⃣ 코드 생성 규칙
```
Q: 각 operation별로 어떤 C 코드를 생성할까?

답변 포함 사항:
  - sum: { template, init, loop, validation, return }
  - avg: { sum + division + error_handling }
  - max: { comparison_logic, base_case }
  - min: { comparison_logic, base_case }
  - sort: { algorithm_choice (quick/merge/bubble) }
  - filter: { condition_evaluation, array_building }
  - 각 operation별 최적 구현
```

### 4️⃣ 에러 처리
```
Q: 잘못된 입력이나 모호한 의도는 어떻게 처리할까?

답변 포함 사항:
  - 의도 불명확: 유사한 패턴 제시 후 선택
  - 타입 불일치: 안전한 기본값 선택
  - 성능 문제: 경고 (매우 복잡한 연산 등)
```

### 5️⃣ 최종 구조
```
Q: 파일 구조와 구현 전략은?

답변 포함 사항:
  - src/ 구조 (핵심만: intent-inference, codegen, cli)
  - 각 모듈 역할
  - 의존성 최소화
  - 확장 가능성
```

---

## 🎨 설계 인풋 (LLM이 참고할 내용)

### v1에서 배운 것
- ✅ Lexer/Parser 불필요 (LLM이 대체)
- ✅ TokenBuffer 개념 (다시 쓸 게 없음)
- ✅ CEmitter 재사용 가능 (C 코드 생성)
- ❌ TypeChecker 복잡함 (단순화)

### v2 핵심 인사이트
```
인간 언어: 엄격한 문법 필요 (Python, Rust)
AI 언어: 자유형 입력 + 의도 추론 (LLM 기반)

→ "필기체 언어"는 LLM 추론으로만 가능
→ 파서 제거 = 극도의 단순화
→ 자유도 최대 = AI 쓰기 편함
```

### 성능 목표
```
입력 → 의도 추론: <1초 (LLM API)
의도 → C 코드: <100ms (규칙 기반)
C 코드 → 실행: <10ms (gcc)

총 E2E: ~2초 (LLM 대기 시간 주요)
```

---

## 🚀 LLM 추론 시작 프롬프트

```
당신은 AI-First 프로그래밍 언어 "FreeLang v2"의 최종 설계자입니다.

주어진 방향:
- 입력: 자유형 텍스트 (필기체)
- 처리: LLM 의도 추론
- 출력: C 코드 (자동 생성)

위의 5가지 질문에 답해서 v2의 최종 설계를 정의하세요.

답변 형식:
1. 파이프라인 다이어그램
2. 의도 패턴 매핑 테이블
3. operation별 코드 생성 템플릿
4. 에러 처리 전략
5. 최종 파일 구조 + 구현 계획
```

---

## 📊 최종 체크리스트

LLM 추론 완료 후 확인:

- [ ] 파이프라인 명확한가?
- [ ] 모든 operation 커버되나?
- [ ] 에러 처리 완벽한가?
- [ ] C 코드 생성 규칙 일관성 있나?
- [ ] 확장 가능한가?
- [ ] 구현 난이도 적당한가?
- [ ] 성능 목표 달성 가능한가?

---

## 💡 최종 목표

> **"AI가 대충 써도, LLM이 의도를 파악하고, 완벽한 C 코드를 생성한다"**

이것이 **진정한 AI-Native 언어**입니다.

---

**Status**: 방향 확정, LLM 추론 대기 중
**Next**: 이 문서를 읽고 위 5가지 질문에 답하면 v2 완성

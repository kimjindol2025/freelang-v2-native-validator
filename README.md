# FreeLang v2 - AI-First Programming Language

> **AI 전용, 인간 배제**: 의도만 정의하면 AI가 100% 코드 생성

## 🎯 목표

**"다른 종족"**: v1과 완전히 다른 새로운 언어

- **AI 입력**: `@minimal fn 이름 input: 타입 output: 타입 intent: "의도"`
- **AI 생성**: 완전한 C 코드 (반복문, 검증, 연산 자동 포함)
- **검증**: 컴파일 = 구문 정확성 + 타입 안전성
- **철학**: 구현 코딩 배제, 의도 → 자동화

---

## 🧬 핵심 개념

### Minimal Intent 패턴 (30% 입력 + 70% 자동 생성)

```freelang
@minimal
fn sum
  input: array<number>
  output: number
  intent: "배열의 모든 요소를 더하기"
```

**v2가 자동 생성**:
```c
int sum(double* arr, int len) {
  double result = 0;
  for (int i = 0; i < len; i++) {
    result += arr[i];
  }
  if (len == 0) {
    printf("Warning: empty array\n");
  }
  return result;
}
```

---

## 📊 v1 vs v2

| 항목 | v1 | v2 |
|------|----|----|
| **철학** | 범용 언어 | AI 전용 |
| **목표** | 완성도 | 자동화 |
| **인간 역할** | 코드 작성 | 의도만 정의 |
| **AI 역할** | 문법 검증 | 100% 코드 생성 |
| **LOC** | 41,987 | ~3,500 |
| **네트워크** | ✅ | ❌ |
| **표준 라이브러리** | ✅ | ❌ |
| **Type Checker** | 복잡 | 단순 (int/string/array만) |
| **백엔드** | VM + C | C만 |

---

## 🏗️ 프로젝트 구조

```
v2-freelang-ai/
├── src/
│   ├── lexer/              # 토큰화 (v1 핵심 재사용)
│   ├── parser/             # AST 생성 (v1 + @minimal)
│   ├── codegen/            # C 코드 생성 (v1 + 자동 로직)
│   ├── minimal/            # 의도 추론 엔진 (신규)
│   └── cli/                # CLI 인터페이스
├── test/
│   └── minimal-intent.test.ts  # @minimal 테스트
├── docs/
│   ├── SPECIFICATION.md    # 상세 스펙
│   ├── ARCHITECTURE.md     # 아키텍처
│   └── ROADMAP.md          # 로드맵
└── README.md
```

---

## 🚀 빠른 시작

```bash
# v2-freelang-ai 클론
git clone https://gogs.dclub.kr/kim/v2-freelang-ai.git
cd v2-freelang-ai

# 구현 준비 (v1 핵심 코드 발취)
# - src/ 디렉토리 구조 생성
# - Lexer/Parser/CodeGen 패턴 이식

# 빌드 (TypeScript)
npm install
npm run build

# 테스트
npm test

# 컴파일 (@minimal 코드)
freelang sum.minimal.free -o sum.c
gcc sum.c -o sum
./sum
```

---

## 📝 지원 범위 (현재)

### 자동 생성 함수
- ✅ `sum` - 배열 합산
- ✅ `average` - 배열 평균
- ✅ `max` - 최대값 탐색
- ✅ `min` - 최소값 탐색
- ✅ `sort` - 배열 정렬 (v2.1)
- ✅ `filter` - 조건 필터링 (v2.2)

### 지원 타입
- `int`, `number`, `boolean`, `string` (기본)
- `array<T>` (배열)
- 재귀, 동적 메모리 (v2.3+)

### 생성 범위
- ✅ 반복문, 조건문
- ✅ 타입별 검증
- ✅ 오류 처리
- ✅ 메모리 초기화

---

## 🔗 관련 문서

- **[SPECIFICATION.md](./docs/SPECIFICATION.md)** - 상세 스펙
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - 기술 아키텍처
- **[ROADMAP.md](./docs/ROADMAP.md)** - v2.0 ~ v2.5 로드맵
- **[v1-EXTRACTION.md](./docs/v1-EXTRACTION.md)** - v1 핵심 코드 발취 가이드

---

## 📄 라이선스

MIT License (v1 동일)

---

## 🎯 다음 단계

1. **v1 핵심 코드 이식** (1-2일)
   - Lexer, Parser, CodeGen 패턴 이식

2. **@minimal 데코레이터 구현** (2-3일)
   - 파서에 @minimal 인식 추가

3. **의도 추론 엔진** (3-4일)
   - 함수명 + 타입 + 의도 → 코드 생성

4. **자동 생성 로직** (3-4일)
   - 반복문, 검증, 연산 자동 생성

5. **테스트 + 검증** (2-3일)
   - 4개 기본 함수 동작 확인

---

**작성자**: Claude (AI-First Language Design)
**시작일**: 2026-02-15
**상태**: 🚀 준비 완료

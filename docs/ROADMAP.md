# FreeLang v2 - 로드맵

## 🎯 비전

**"AI 전용 프로그래밍 언어"로 진화**

- Phase 1: 기초 구축 (v2.0)
- Phase 2: 기본 함수 지원 (v2.1~2.2)
- Phase 3: 고급 기능 (v2.3~2.5)
- Phase 4: 프로덕션 준비 (v2.6+)

---

## v2.0 - 기초 구축 (2026-02-15 ~ 2026-03-15)

### 목표
- ✅ v1 핵심 코드 이식
- ✅ @minimal 데코레이터 구현
- ✅ 4개 기본 함수 (sum, avg, max, min) 자동 생성

### 마일스톤

#### M1: 인프라 (1주)
- [ ] 저장소 초기화
- [ ] 프로젝트 구조 설정
- [ ] v1 Lexer/Parser/CodeGen 이식
- [ ] 빌드 시스템 구성 (npm + TypeScript)

**예상**: 완료율 20%

#### M2: 핵심 구현 (2주)
- [ ] @minimal 파서 구현
- [ ] Detector + Generator 작성
- [ ] 4개 기본 함수 규칙 추가

**예상**: 완료율 60%

#### M3: 테스트 + 검증 (1주)
- [ ] sum 함수 컴파일/실행 성공
- [ ] average 함수 컴파일/실행 성공
- [ ] max/min 함수 컴파일/실행 성공
- [ ] 문서화 완성

**예상**: 완료율 100%

### 입과 출과

| 함수 | 입력 | 출력 | 예상 도움율 |
|------|------|------|-----------|
| sum | `array<number>` | `number` | 71% |
| average | `array<number>` | `number` | 67% |
| max | `array<number>` | `number` | 75% |
| min | `array<number>` | `number` | 75% |

### 성과 기준
- ✅ 4개 함수 모두 C 코드 생성 가능
- ✅ gcc로 컴파일 성공
- ✅ 실행 시 정확한 결과

---

## v2.1 - 고급 배열 연산 (2026-03-16 ~ 2026-04-30)

### 목표
- 배열 정렬 (sort)
- 배열 필터링 (filter)
- 메모리 안전성 강화

### 주요 기능

#### sort
```freelang
@minimal
fn sort
  input: array<number>
  output: array<number>
  intent: "배열을 오름차순으로 정렬"
```

**생성 알고리즘**: quicksort (O(n log n))

#### filter
```freelang
@minimal
fn filter
  input: array<number>, threshold: number
  output: array<number>
  intent: "threshold보다 큰 값만 필터링"
```

**생성 패턴**: 조건부 루프 + 배열 복사

### 새로운 도전
- ✅ 동적 메모리 할당
- ✅ 두 개 이상의 입력 파라미터
- ✅ 배열 출력

### 일정
- 구현: 3주
- 테스트: 1주
- 문서: 1주

---

## v2.2 - 문자열 처리 (2026-05-01 ~ 2026-06-15)

### 목표
- 문자열 조작 함수
- 형식 변환

### 주요 기능

#### concat (문자열 이어붙이기)
```freelang
@minimal
fn concat
  input: string, string
  output: string
  intent: "두 문자열을 이어붙이기"
```

#### split (문자열 분리)
```freelang
@minimal
fn split
  input: string, delimiter: string
  output: array<string>
  intent: "delimiter로 구분된 부분 문자열 배열"
```

#### toUpperCase / toLowerCase
```freelang
@minimal
fn toUpperCase
  input: string
  output: string
  intent: "문자열을 대문자로 변환"
```

### 새로운 도전
- ✅ 동적 문자열 메모리
- ✅ 버퍼 오버플로우 방지
- ✅ 형식 변환 규칙

---

## v2.3 - 재귀 함수 (2026-06-16 ~ 2026-08-31)

### 목표
- 재귀 함수 패턴 인식
- 스택 오버플로우 방지

### 주요 기능

#### factorial
```freelang
@minimal
fn factorial
  input: number
  output: number
  intent: "n! 계산 (재귀 사용)"
```

**생성 패턴**:
```c
int factorial(int n) {
  // 베이스 케이스 (자동 생성)
  if (n <= 1) return 1;

  // 재귀 케이스 (자동 생성)
  return n * factorial(n - 1);
}
```

#### fibonacci
```freelang
@minimal
fn fibonacci
  input: number
  output: number
  intent: "n번째 피보나치 수열 계산"
```

### 새로운 도전
- ✅ 베이스 케이스 자동 감지
- ✅ 깊이 제한 (스택 오버플로우 방지)
- ✅ 메모이제이션 (v2.4)

---

## v2.4 - 동적 메모리 관리 (2026-09-01 ~ 2026-10-31)

### 목표
- 힙 메모리 자동 관리
- 메모리 누수 방지

### 주요 기능

#### 동적 배열 할당
```c
// v2.4가 자동 생성
T* result = (T*)malloc(sizeof(T) * size);
// ... 사용
free(result);
```

#### 메모리 풀
```c
// 리소스 관리
resource_pool_t pool = create_pool();
T* data = pool_alloc(&pool, sizeof(T) * 1000);
pool_free(&pool);
```

### 새로운 도전
- ✅ 자동 free() 삽입
- ✅ 메모리 누수 감지
- ✅ RAII 패턴 구현

---

## v2.5 - 고차 함수 (2026-11-01 ~ 2026-12-31)

### 목표
- 함수 포인터 지원
- map, reduce, forEach 패턴

### 주요 기능

#### map
```freelang
@minimal
fn map
  input: array<number>, operation: fn(number)->number
  output: array<number>
  intent: "배열의 각 요소에 operation 적용"
```

**생성 패턴**:
```c
double* map(double* arr, int len, double (*op)(double)) {
  double* result = (double*)malloc(sizeof(double) * len);
  for (int i = 0; i < len; i++) {
    result[i] = op(arr[i]);
  }
  return result;
}
```

#### reduce
```freelang
@minimal
fn reduce
  input: array<number>, accumulator: fn(number, number)->number, initial: number
  output: number
  intent: "배열을 누적 계산"
```

### 새로운 도전
- ✅ 함수 포인터 코드 생성
- ✅ 고차 패턴 인식
- ✅ 클로저 시뮬레이션

---

## v2.6+ - 프로덕션 준비

### 목표
- 성능 최적화
- 에코시스템 구축

### 주요 항목
- ✅ LLVM 백엔드 (v2.6)
- ✅ 병렬 처리 (v2.7)
- ✅ GPU 가속 (v2.8+)
- ✅ 표준 라이브러리 (v3.0)
- ✅ IDE 플러그인 (v3.1)
- ✅ 클라우드 통합 (v3.2)

---

## 📊 진행 상황 추적

```
v2.0 ████████░░░░░░░░░░░ 40% (2026-02-15 ~ 2026-03-15)
v2.1 ░░░░░░░░░░░░░░░░░░░░  0% (2026-03-16 ~ 2026-04-30)
v2.2 ░░░░░░░░░░░░░░░░░░░░  0% (2026-05-01 ~ 2026-06-15)
v2.3 ░░░░░░░░░░░░░░░░░░░░  0% (2026-06-16 ~ 2026-08-31)
v2.4 ░░░░░░░░░░░░░░░░░░░░  0% (2026-09-01 ~ 2026-10-31)
v2.5 ░░░░░░░░░░░░░░░░░░░░  0% (2026-11-01 ~ 2026-12-31)
```

---

## 🎯 성공 기준

### v2.0 완성 기준
- [ ] Lexer 100% 동작
- [ ] Parser @minimal 인식
- [ ] 4개 함수 컴파일/실행 성공
- [ ] 도움율 평균 70% 달성

### v2.5 완성 기준 (프로덕션 알파)
- [ ] 20+ 함수 자동 생성
- [ ] 고차 함수 지원
- [ ] 메모리 안전성 보증
- [ ] 단위 테스트 100% 커버리지

### v3.0 완성 기준 (프로덕션 정식)
- [ ] 표준 라이브러리 완성
- [ ] IDE 플러그인 지원
- [ ] 성능 벤치마크 공개
- [ ] 커뮤니티 채택

---

## 🔄 의존성

```
v2.0 (기초)
   ├─▶ v2.1 (배열)
   │    ├─▶ v2.2 (문자열)
   │    └─▶ v2.3 (재귀)
   │         ├─▶ v2.4 (메모리)
   │         └─▶ v2.5 (고차)
   │              └─▶ v2.6 (LLVM)
   │
   └─▶ v3.0 (표준 라이브러리)
```

---

**Last Updated**: 2026-02-15
**Version**: v2.0 Beta
**Status**: 로드맵 확정

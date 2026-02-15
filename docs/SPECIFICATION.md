# FreeLang v2 - 상세 스펙

## 1. 언어 철학

### 핵심 원칙
1. **AI 전용**: 인간 코딩 배제
2. **의도 중심**: 함수명 + 타입 + 의도만 입력
3. **자동 생성**: 70% 이상 코드 자동 생성
4. **검증 우선**: 컴파일 = 구문 + 타입 안전성

### AI 입력 범위
```
최소 정보:
  - 함수명 (이미지)
  - 입력 타입
  - 출력 타입
  - 의도 (자연어)

금지 사항:
  - 반복문 구현
  - 변수 초기화 코드
  - 오류 처리 로직
  - 메모리 관리
```

---

## 2. 문법

### 헤더 계약 정의

```freelang
fn 함수명: 입력타입 → 출력타입 ~ "의도"

형식:
  fn: 함수 선언
  함수명: 함수 이름 (명확하게)
  입력타입: 받을 데이터 (array<T>, int, string 등)
  출력타입: 반환할 데이터
  의도: 자연어로 "무엇을 하는가?"
```

### 예제

```freelang
@minimal
fn sum
  input: array<number>
  output: number
  intent: "배열의 모든 요소를 더하기"

@minimal
fn average
  input: array<number>
  output: number
  intent: "배열의 평균 계산"

@minimal
fn max
  input: array<number>
  output: number
  intent: "배열의 최대값 찾기"

@minimal
fn filter
  input: array<number>, threshold: number
  output: array<number>
  intent: "threshold보다 큰 값만 필터링"
```

### 타입 시스템

```
기본 타입:
  - int          (정수)
  - number       (실수)
  - boolean      (참/거짓)
  - string       (문자열)

복합 타입:
  - array<T>     (배열)

제약 (현재 v2):
  - 포인터 X
  - 구조체 X
  - 열거형 X
  - 제너릭 X
```

---

## 3. 자동 생성 규칙

### Rule 1: 반복문 생성

**입력**:
```freelang
@minimal fn sum input: array<number> output: number intent: "배열 합산"
```

**자동 생성**:
```c
for (int i = 0; i < len; i++) {
  result += arr[i];
}
```

**적용 조건**:
- `array<T>` 입력 + 단일 타입 출력 → `for` 루프
- 배열 크기 = `len` 파라미터

### Rule 2: 초기화 코드

**생성 패턴**:
```c
// 타입별 초기화
T result = DEFAULT_VALUE;  // int=0, number=0.0, bool=false

// 배열 할당 (필요시)
T* result_arr = (T*)malloc(sizeof(T) * MAX_SIZE);
```

### Rule 3: 검증 코드

**생성 패턴**:
```c
// 배열 공백 검사
if (len == 0) {
  printf("Warning: empty array\n");
  return DEFAULT_VALUE;
}

// 범위 검사 (필요시)
if (index < 0 || index >= len) {
  printf("Error: index out of bounds\n");
  return DEFAULT_VALUE;
}
```

### Rule 4: 반환값 처리

**생성 패턴**:
```c
// 단순 값 반환
return result;

// 배열 반환 (필요시)
result_arr[result_len++] = value;  // 요소 추가
return result_arr;
```

---

## 4. 컴파일 프로세스

```
┌─────────────────────────────┐
│   @minimal 코드 입력         │
│   (함수명/타입/의도)         │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   1. Lexer 토큰화            │
│   (@minimal 데코레이터 인식) │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   2. Parser AST 생성         │
│   (함수 시그니처 파싱)       │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   3. 의도 추론 엔진          │
│   (intent → 코드 생성 규칙)  │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   4. CodeGen 자동 생성       │
│   (반복문/검증/메모리 관리)  │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   5. C 코드 출력             │
│   (#include + 함수 정의)     │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   6. gcc 컴파일              │
│   (검증 = 성공/실패)         │
└─────────────────────────────┘
```

---

## 5. 생성 예제

### Example 1: sum

**입력**:
```freelang
@minimal fn sum input: array<number> output: number intent: "배열 합산"
```

**생성 코드**:
```c
#include <stdio.h>
#include <stdlib.h>

double sum(double* arr, int len) {
  // 초기화
  double result = 0;

  // 검증
  if (len == 0) {
    printf("Warning: empty array\n");
    return 0;
  }

  // 자동 생성 (반복문)
  for (int i = 0; i < len; i++) {
    result += arr[i];
  }

  // 반환
  return result;
}

int main() {
  double arr[] = {1, 2, 3, 4, 5};
  printf("Sum: %f\n", sum(arr, 5));
  return 0;
}
```

### Example 2: filter

**입력**:
```freelang
@minimal fn filter input: array<number>, threshold: number output: array<number> intent: "threshold 이상 값만 필터링"
```

**생성 코드**:
```c
double* filter(double* arr, int len, double threshold, int* out_len) {
  // 초기화
  double* result = (double*)malloc(sizeof(double) * len);
  int result_len = 0;

  // 검증
  if (len == 0) {
    *out_len = 0;
    return result;
  }

  // 자동 생성 (필터링 루프)
  for (int i = 0; i < len; i++) {
    if (arr[i] >= threshold) {
      result[result_len++] = arr[i];
    }
  }

  *out_len = result_len;
  return result;
}
```

---

## 6. 타입 지원 매트릭스

| 함수 | array | 반복문 | 초기화 | 검증 | 메모리 | 상태 |
|------|-------|--------|--------|------|--------|------|
| sum | ✅ | ✅ | ✅ | ✅ | ❌ | v2.0 |
| average | ✅ | ✅ | ✅ | ✅ | ❌ | v2.0 |
| max | ✅ | ✅ | ✅ | ✅ | ❌ | v2.0 |
| min | ✅ | ✅ | ✅ | ✅ | ❌ | v2.0 |
| filter | ✅ | ✅ | ✅ | ✅ | ⚠️ | v2.1 |
| sort | ✅ | ✅ | ✅ | ✅ | ❌ | v2.1 |
| map | ✅ | ✅ | ✅ | ✅ | ⚠️ | v2.2 |
| 재귀 | ❌ | ✅ | ✅ | ⚠️ | ❌ | v2.3 |
| 동적 메모리 | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | v2.4 |

---

## 7. 제약사항 (v2.0)

### 현재 불가능
- ❌ 재귀 함수
- ❌ 포인터 조작
- ❌ 구조체/클래스
- ❌ 제네릭
- ❌ 예외 처리
- ❌ 멀티스레드

### 향후 지원 (v2.1+)
- ✅ 재귀 함수 (v2.3)
- ✅ 동적 배열 (v2.4)
- ✅ 문자열 처리 (v2.2)
- ✅ 고차 함수 (v2.5+)

---

## 8. 검증 기준

### 컴파일 성공 = 다음 확인
1. ✅ 구문 정확성 (gcc 통과)
2. ✅ 타입 안전성 (타입 미스매치 없음)
3. ✅ 메모리 안전성 (스택/힙 초과 없음)

### 논리 검증 = 별도 (단위테스트)
1. 입력값 검증
2. 반환값 정확성
3. 엣지 케이스 (빈 배열, 음수 등)

---

## 9. 성능 목표

| 항목 | 목표 | 측정 방법 |
|------|------|---------|
| 컴파일 시간 | <100ms | time freelang sum.free -o sum.c |
| 생성 코드 크기 | <500 LOC | wc -l sum.c |
| 런타임 (배열 크기 1M) | <10ms | time ./sum |
| 메모리 오버헤드 | <10% | valgrind --leak-check=full |

---

**Last Updated**: 2026-02-15
**Version**: v2.0 Beta
**Status**: 스펙 확정, 구현 준비 완료

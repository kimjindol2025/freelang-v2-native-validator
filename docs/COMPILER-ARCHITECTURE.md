# FreeLang v2 - Compiler Architecture

> **목표**: AI가 자연어를 입력하면 즉시 실행 가능한 코드를 생성하는 컴파일러
>
> **핵심**: 자동 헤더 생성 → IR → 멀티 백엔드 (VM / C / LLVM)

---

## 1. 설계 철학

### 1.1 AI-First 컴파일러

```
전통적 컴파일러:
  소스 코드 → 파서 → AST → 최적화 → 바이너리
  "인간이 작성한 코드를 기계어로 번역"

FreeLang v2 컴파일러:
  자연어 → 의도 추론 → 자동 코드 생성 → 최적화 → 실행
  "AI의 의도를 실행 가능한 코드로 변환"
```

### 1.2 듀얼 모드

```
Mode A: 즉시 실행 (AI 테스트/학습용)
  자연어 → IR → VM → 결과 (<10ms)
  용도: REPL, 피드백 루프, 빠른 반복

Mode B: 최적화 컴파일 (프로덕션용)
  자연어 → IR → C/LLVM → 바이너리
  용도: 배포, 성능 벤치마크
```

### 1.3 3가지 원칙

```
1. 즉시성: AI가 입력하면 바로 결과 확인 가능
2. 선택성: 안전/속도/메모리 중 AI가 선택
3. 학습성: 피드백이 다음 컴파일에 반영됨
```

---

## 2. 8단계 파이프라인

### 전체 흐름

```
Stage 0: Free Input
  ↓ "배열 더하기"
Stage 1: Auto Header Generation
  ↓ HeaderContract { fn: sum, in: array<f64>, out: f64 }
Stage 2: Header → Skeleton AST
  ↓ AST (함수 선언 + 본문 골격)
Stage 3: AST → IR
  ↓ IRModule (SSA 형식)
Stage 4: IR Optimization
  ↓ Optimized IR
Stage 5: Multi-Version Fork
  ↓ [Safe IR] [Fast IR] [Balanced IR]
Stage 6: Backend Selection
  ├─ VM → 즉시 결과
  ├─ C → gcc → binary
  └─ LLVM → JIT → native
Stage 7: Test + Feedback
  ↓ 결과 + 성능 데이터
Stage 8: Learning Loop
  ↓ 신뢰도 갱신, 패턴 저장
```

---

### Stage 0: Free Input (자유 입력)

```
입력 형식: 제한 없음

예시:
  "배열 더하기"
  "sum([1,2,3])"
  "배열의 모든 수를 합산"
  "array sum function"

출력: 원문 텍스트 (string)
```

**설계 결정**: 어떤 형식이든 받아들임. 정규화는 Stage 1에서 처리.

---

### Stage 1: Auto Header Generation (자동 헤더 생성)

```
입력: 원문 텍스트
출력: HeaderContract

기존 설계 문서: AUTO-HEADER-ENGINE.md (7단계 파이프라인)

7단계:
  1. TextNormalizer: 텍스트 정규화 (공백, 대소문자, 약어)
  2. IntentMatcher: 의도 패턴 DB에서 매칭
  3. TypeInference: 입력/출력 타입 추론
  4. ReasonInferencer: "왜" 이 코드가 필요한지 추론
  5. DirectiveDecider: 최적화 방향 결정
  6. HeaderBuilder: 헤더 생성
  7. ConfidenceCalculator: 신뢰도 계산
```

**HeaderContract 구조**:

```typescript
interface HeaderContract {
  fn_name: string;        // "sum"
  input_types: Type[];    // [array<f64>, i32]
  output_type: Type;      // f64
  description: string;    // "배열의 모든 수를 더하기"
  reason: string;         // "통계 연산 기초"
  directive: Directive;   // "speed" | "memory" | "safety"
  confidence: number;     // 0.0 ~ 1.0
}

type Directive = "speed" | "memory" | "safety";
```

**참조 코드**: `/tmp/v2-freelang-ai/docs/AUTO-HEADER-ENGINE.md`

---

### Stage 2: Header → Skeleton AST (골격 AST 생성)

```
입력: HeaderContract
출력: AST (함수 선언 + 본문)

전략: 템플릿 DB에서 알고리즘 선택
```

**템플릿 DB**:

```
의도 "sum" + directive "speed":
  → 단일 루프 합산 (O(n), 캐시 친화적)

의도 "sum" + directive "safety":
  → 빈 배열 검사 + 오버플로우 검사 + 루프

의도 "sum" + directive "memory":
  → in-place 누적, 임시 변수 없음

의도 "max" + directive "speed":
  → 단일 패스 최대값 (O(n))

의도 "sort" + directive "speed":
  → 퀵정렬 (평균 O(n log n))

의도 "sort" + directive "safety":
  → 병합정렬 (최악 O(n log n), 안정 정렬)

의도 "filter" + directive "memory":
  → in-place 필터링 (추가 메모리 없음)
```

**AST 노드 구조** (FreeLang v1 참조):

```typescript
// 핵심 노드만 (v1의 34개 Expression에서 필요한 것만)
type Expression =
  | NumberLiteral      // 숫자
  | Identifier         // 변수명
  | BinaryExpression   // a + b
  | CallExpression     // func(args)
  | ArrayLiteral       // [1, 2, 3]

type Statement =
  | LetStatement       // let x = 5
  | ReturnStatement    // return result
  | ForStatement       // for (i in 0..len)
  | IfStatement        // if (condition)
  | FunctionDeclaration // fn sum(arr, len) -> f64

type Program = Statement[]
```

**참조 코드**:
- FreeLang v1 AST: `/home/kimjin/Desktop/kim/freelang/src/parser/`
- Proof_ai codegen: `/home/kimjin/Desktop/kim/Proof_ai/src/codegen/codegen.ts`

---

### Stage 3: AST → IR (중간 표현 생성)

```
입력: AST
출력: IRModule (SSA 형식)

전략: IR-Design의 IRBuilder 패턴 활용
```

**IR 생성 알고리즘**:

```
함수 선언:
  1. IRFunction 생성 (이름, 파라미터, 리턴타입)
  2. entry BasicBlock 생성
  3. 파라미터를 심볼테이블에 등록

변수 선언 (let x = expr):
  1. expr를 IR로 변환 → 레지스터 ID 반환
  2. IR_STORE varname, register_id

이항 연산 (a + b):
  1. 왼쪽 변환 → left_id
  2. 오른쪽 변환 → right_id
  3. IR_ADD result_id, left_id, right_id

for 루프:
  1. loop_test 블록 생성
  2. loop_body 블록 생성
  3. loop_end 블록 생성
  4. IR_BRANCH 조건 → body 또는 end
  5. body 끝에서 IR_JUMP → test

return:
  1. expr를 IR로 변환 → value_id
  2. IR_RETURN value_id
```

**IR 메타데이터** (v2 확장):

```
각 IRInstruction에 메타데이터 첨부:
  confidence: 0.95   (이 코드의 신뢰도)
  directive: "speed" (최적화 방향)
  source: "배열 더하기" (원본 입력)
```

**참조 코드**:
- IR-Design: `/home/kimjin/Desktop/kim/ir-design/Implementation/ir.h`
- IR Builder: `/home/kimjin/Desktop/kim/ir-design/Implementation/ir_builder.h`
- 심볼테이블: `/home/kimjin/Desktop/kim/ir-design/Implementation/symbol_table.h`

---

### Stage 4: IR Optimization (최적화)

```
입력: IRModule
출력: Optimized IRModule

전략: Pass 기반 최적화 (IR-Design 프레임워크 참조)
```

**최적화 Pass 목록**:

```
Pass 1: 상수 폴딩 (Constant Folding)
  IR_ADD %1=const(3), %2=const(5) → IR_CONST %3=8
  참조: ir-design/ir_fold_constants.c

Pass 2: 죽은 코드 제거 (DCE)
  사용되지 않는 레지스터의 명령어 제거
  참조: ir-design/ir_dead_code_elimination.c

Pass 3: Directive 기반 최적화
  directive == "speed":
    - IR_HINT_SIMD 삽입 (배열 연산에)
    - IR_HINT_UNROLL 삽입 (작은 루프에)
    - 불필요한 검사 제거

  directive == "memory":
    - 임시 레지스터 최소화
    - 스택 할당 선호
    - in-place 연산 변환

  directive == "safety":
    - IR_BOUNDS_CHECK 삽입 (모든 배열 접근)
    - IR_NULL_CHECK 삽입 (모든 포인터)
    - 오버플로우 검사 삽입
```

**최적화 옵션**:

```typescript
interface OptimizeOptions {
  constant_folding: boolean;  // 기본: true
  dead_code_elimination: boolean; // 기본: true
  directive_optimization: boolean; // 기본: true
  max_passes: number; // 기본: 3
}
```

**참조 코드**:
- IR-Design: `/home/kimjin/Desktop/kim/ir-design/Implementation/ir_optimizer.c`

---

### Stage 5: Multi-Version Fork (멀티버전 분기)

```
입력: Optimized IRModule
출력: 3개의 IRModule 변형

전략: 하나의 IR을 복제 후 각각 다른 최적화 적용
```

**3가지 버전**:

```
Version A: Safe (안전형)
  - 모든 경계 검사 유지
  - null 검사 유지
  - 오버플로우 보호
  - 에러 핸들링 포함
  - 성능: 기본의 70-80%

Version B: Fast (속도형)
  - 경계 검사 제거
  - SIMD 힌트 활성화
  - 루프 언롤링
  - 인라이닝
  - 성능: 기본의 150-200%

Version C: Balanced (균형형)
  - 핵심 검사만 유지
  - 부분적 최적화
  - 합리적 안전성 + 성능
  - 성능: 기본의 100%
```

**버전 선택 흐름**:

```
AI에게 3가지 제안:
  [A] Safe: 1.5ms, 모든 검증 ✅
  [B] Fast: 0.4ms, 검증 최소 ⚡
  [C] Balanced: 1.0ms, 핵심 검증 ⚖️

AI 선택 → 해당 버전으로 백엔드 진행
```

---

### Stage 6: Backend Selection (백엔드 선택)

#### Mode A: VM (즉시 실행)

```
IR → VM Bytecode → Stack VM → 결과

용도: AI 테스트, REPL, 피드백 루프
지연: <10ms
장점: 즉시 결과, 디버깅 쉬움
단점: 최적화 없음, 느림

변환:
  IR_CONST → LOAD_CONST
  IR_ADD → ADD
  IR_LOAD → LOAD_VAR
  IR_STORE → STORE_VAR
  IR_BRANCH → JUMP_IF_FALSE
  IR_RETURN → RETURN
```

**참조 코드**:
- FreeLang v1 VM: `/home/kimjin/Desktop/kim/freelang/src/vm/bytecode.ts`
- FreeLang v1 VM 실행: `/home/kimjin/Desktop/kim/freelang/src/vm/vm.ts`

#### Mode B: C Code → gcc (표준 컴파일)

```
IR → C Code → gcc -O2 → Binary

용도: 프로덕션 배포
지연: ~500ms (컴파일 포함)
장점: 네이티브 성능, 이식성
단점: 컴파일 시간

변환:
  IR_CONST double_val → "double %r = 3.14;"
  IR_ADD %a, %b → "double %r = %a + %b;"
  IR_LOAD var → "double %r = var;"
  IR_STORE var, %a → "var = %a;"
  IR_BRANCH → "if (%cond) goto true_label; else goto false_label;"
  IR_RETURN %a → "return %a;"
  IR_CALL func, args → "double %r = func(args);"

C 코드 구조:
  #include <stdio.h>
  #include <stdlib.h>

  [타입 정의]
  [함수 선언]
  [함수 구현]
  [main 함수]
```

**참조 코드**:
- IR-Design C 생성: `/home/kimjin/Desktop/kim/ir-design/Implementation/ir_c_emitter.c`
- FreeLang v1 CEmitter: `/home/kimjin/Desktop/kim/freelang/src/codegen/c_emitter.ts`
- FreeLang v1 stdlib: `/home/kimjin/Desktop/kim/freelang/src/codegen/stdlib.ts`

**C 타입 매핑** (FreeLang v1 참조):

```
FreeLang → C
f64     → double
i32     → int
i64     → long long
f32     → float
string  → char*
bool    → int (0/1)
array<T> → T* + int length (구조체)
void    → void
```

**stdlib 매핑** (FreeLang v1 참조):

```
FreeLang → C → 필요 헤더
println  → printf → stdio.h
Math.sqrt → sqrt → math.h
Math.abs → fabs → math.h
String.length → strlen → string.h
Array.length → __array_length → (커스텀)
```

#### Mode C: LLVM JIT (고급)

```
IR → LLVM IR → JIT/AOT → Native

용도: 실시간 최적화, 벤치마크
지연: ~200ms
장점: 최적 성능, 크로스 플랫폼
단점: LLVM 의존성, 복잡도

변환:
  IR_CONST → %r = fadd double 0.0, 3.14
  IR_ADD → %r = fadd double %a, %b
  IR_BRANCH → br i1 %cond, label %true, label %false
  IR_RETURN → ret double %a
```

**참조 코드**:
- FreeLang v1 LLVM: `/home/kimjin/Desktop/kim/freelang/src/codegen/llvm/`

---

### Stage 7: Test + Feedback (테스트 + 피드백)

```
입력: 실행 결과
출력: 테스트 리포트 + AI 피드백

자동 테스트 생성:
  헤더에서 입력/출력 타입을 보고 테스트 케이스 자동 생성

  fn sum: array<f64> → f64 에서:
    test_1: sum([]) == 0
    test_2: sum([1]) == 1
    test_3: sum([1, 2, 3]) == 6
    test_4: sum([−1, 1]) == 0

성능 측정:
  실행 시간: Xms
  메모리 사용: X bytes
  코드 크기: X bytes

AI 피드백 옵션:
  [✅ 승인] → 패턴 저장, 신뢰도 +2%
  [✏️ 수정] → 수정사항 반영, 패턴 업데이트
  [🔄 재제안] → 다른 알고리즘으로 재생성
  [❌ 취소] → 폐기
```

**참조 문서**: `/tmp/v2-freelang-ai/docs/AI-FEEDBACK-LOOP.md`

---

### Stage 8: Learning Loop (학습 루프)

```
입력: AI 피드백
출력: 패턴 DB 업데이트, 신뢰도 갱신

학습 저장:
  "배열 + 더하기" → sum (confidence: 72%)
  → 다음에 같은 입력 시 confidence: 74%
  → 100회 반복 후 confidence: 98%

메타 패턴:
  "배열 + <연산>" → <함수> 패턴 형성
  → 새로운 연산도 예측 가능

신뢰도 공식:
  new_confidence = old_confidence + (1 - old_confidence) * learning_rate
  learning_rate = 0.02 (승인 시)
  learning_rate = -0.01 (거절 시)
```

**참조 문서**: `/tmp/v2-freelang-ai/docs/AI-ADDICTION-MECHANICS.md`

---

## 3. 재사용 매핑 (상세)

### IR-Design에서 가져올 것

| 파일 | 가져올 내용 | 수정 필요 |
|------|-----------|----------|
| `ir.h` | TypeKind (8종), IROpcode (21개), IRValue, IRInstruction, BasicBlock, IRFunction, IRModule | v2 확장 타입/opcode 추가 |
| `ir_builder.h` | IRBuilder struct, gen_* API 패턴 | v2 메타데이터 추가 |
| `symbol_table.h` | SymbolTable, push/pop/lookup | 그대로 사용 가능 |
| `ir_optimizer.c` | Pass 구조, 상수폴딩, DCE | Directive 최적화 추가 |
| `ir_c_emitter.c` | IR→C 변환 패턴, 변수 추적 | v2 타입 매핑 적용 |

### FreeLang v1에서 가져올 것

| 파일 | 가져올 내용 | 수정 필요 |
|------|-----------|----------|
| `codegen/stdlib.ts` | FreeLang→C 함수 매핑 | v2 함수에 맞게 축소 |
| `codegen/c_emitter.ts` | C 타입 매핑, 헤더 자동 관리, 메모리 관리 | 패턴 참조만 |
| `vm/bytecode.ts` | VM opcode 정의, Chunk 구조 | v2 IR에 맞게 조정 |
| `vm/vm.ts` | 스택 VM 실행 모델 | 참조만 |
| `interpreter/values.ts` | Value 타입 (Number, String, Array, Function) | VM에서 사용 |

### Proof_ai에서 가져올 것

| 파일 | 가져올 내용 | 수정 필요 |
|------|-----------|----------|
| `codegen/codegen.ts` | CodeGenerator 프로토콜 패턴, 멀티 타겟 구조 | v2 파이프라인에 맞게 |

---

## 4. 에러 처리 전략

### 컴파일 단계별 에러

```
Stage 1 에러 (헤더 생성 실패):
  "의도를 파악할 수 없습니다"
  → 재입력 요청 + 유사 패턴 제안

Stage 2 에러 (템플릿 없음):
  "이 의도에 맞는 템플릿이 없습니다"
  → 범용 템플릿 사용 + 학습 기록

Stage 3 에러 (IR 생성 실패):
  "타입 불일치: array<string>은 합산 불가"
  → 타입 수정 제안 + 대안 제시

Stage 4 에러 (최적화 실패):
  "SIMD 최적화 불가: 배열 크기 가변"
  → 다른 최적화로 폴백

Stage 6 에러 (컴파일 실패):
  "gcc 오류: undefined reference"
  → 에러 분석 + 자동 수정 시도

Stage 7 에러 (테스트 실패):
  "test_3 실패: expected 6, got 5"
  → 버그 위치 표시 + IR 재검토
```

### AI 친화적 에러 메시지

```
전통적: "error: expected ';' at line 15, column 23"

FreeLang v2:
  "헤더 계약 위반: sum 함수의 출력 타입이 f64인데,
   생성된 코드가 i32를 반환합니다.

   제안: 출력 타입을 i32로 변경하거나,
         반환값에 (double) 캐스팅을 추가합니다.

   신뢰도: 이 수정이 맞을 확률 89%"
```

---

## 5. 성능 목표

| 메트릭 | 목표 | 방법 |
|--------|------|------|
| 헤더 생성 | <50ms | 패턴 DB 캐싱 |
| IR 생성 | <20ms | 템플릿 기반 |
| IR 최적화 | <30ms | 3-pass 제한 |
| VM 실행 | <10ms | 스택 VM |
| C 컴파일 | <500ms | gcc -O2 |
| LLVM JIT | <200ms | 기본 최적화만 |
| **전체 (VM 모드)** | **<100ms** | **즉시 실행** |
| **전체 (C 모드)** | **<600ms** | **프로덕션** |

---

## 6. 구현 우선순위

```
Phase 1 (기본 경로):
  Stage 1 → Stage 2 → Stage 3 → Stage 6B (C→gcc)
  "자연어 → 헤더 → AST → IR → C → 바이너리"
  가장 단순한 엔드투엔드 경로

Phase 2 (즉시 실행):
  Stage 6A (VM) 추가
  "IR → VM → 즉시 결과"
  AI 테스트 루프 활성화

Phase 3 (최적화):
  Stage 4 (최적화) + Stage 5 (멀티버전)
  3가지 버전 선택 가능

Phase 4 (고급):
  Stage 6C (LLVM JIT)
  최적 성능

Phase 5 (학습):
  Stage 7 + Stage 8 (피드백 + 학습)
  AI 진화 루프 완성
```

---

## 7. 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│                   FreeLang v2 Compiler                    │
│                                                          │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐      │
│  │   Stage 1   │→ │   Stage 2   │→ │   Stage 3   │      │
│  │ Auto Header │   │ Template    │   │ IR Gen      │      │
│  │ Engine      │   │ Selector    │   │ (SSA)       │      │
│  └────────────┘   └────────────┘   └──────┬─────┘      │
│                                            ↓             │
│                                   ┌────────────┐        │
│                                   │   Stage 4   │        │
│                                   │ Optimizer   │        │
│                                   │ fold+DCE    │        │
│                                   └──────┬─────┘        │
│                                          ↓               │
│                                 ┌──────────────┐        │
│                                 │   Stage 5     │        │
│                                 │ Multi-Version │        │
│                                 └──┬───┬───┬──┘        │
│                                    ↓   ↓   ↓           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Mode A   │  │  Mode B   │  │  Mode C   │             │
│  │  VM       │  │  C→gcc    │  │  LLVM JIT │             │
│  │  <10ms    │  │  ~500ms   │  │  ~200ms   │             │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘             │
│        └──────────┬───┴──────────────┘                  │
│                   ↓                                      │
│          ┌────────────────┐                              │
│          │ Stage 7: Test   │                              │
│          │ + Feedback      │                              │
│          └───────┬────────┘                              │
│                  ↓                                       │
│          ┌────────────────┐                              │
│          │ Stage 8: Learn  │                              │
│          │ → confidence++  │                              │
│          └────────────────┘                              │
└──────────────────────────────────────────────────────────┘
```

---

## 8. 데이터 흐름 예시

### 입력: "배열 더하기"

```
Stage 0: "배열 더하기"

Stage 1: HeaderContract {
  fn_name: "sum",
  input_types: [array<f64>, i32],
  output_type: f64,
  description: "배열의 모든 수를 더하기",
  reason: "통계 연산 기초",
  directive: "memory",
  confidence: 0.85
}

Stage 2: AST {
  kind: "FunctionDeclaration",
  name: "sum",
  params: [
    { name: "arr", type: "array<f64>" },
    { name: "len", type: "i32" }
  ],
  return_type: "f64",
  body: [
    { kind: "LetStatement", name: "result", value: 0.0 },
    { kind: "ForStatement",
      init: { name: "i", value: 0 },
      condition: { op: "<", left: "i", right: "len" },
      update: { op: "++", target: "i" },
      body: [
        { kind: "ExpressionStatement",
          expr: { op: "+=", target: "result", value: { op: "index", arr: "arr", idx: "i" } }
        }
      ]
    },
    { kind: "ReturnStatement", value: "result" }
  ]
}

Stage 3: IR (SSA) {
  fn sum(arr: array<f64>, len: i32) -> f64:
    entry:
      %0 = const 0.0
      %1 = const 0
      jump loop_test
    loop_test:
      %2 = phi [%1, entry], [%6, loop_body]
      %3 = cmp_lt %2, len
      branch %3, loop_body, loop_end
    loop_body:
      %4 = array_get arr, %2
      %5 = phi [%0, entry], [%7, loop_body]
      %7 = add %5, %4
      %6 = add %2, const(1)
      jump loop_test
    loop_end:
      ret %5
}

Stage 4: Optimized IR (상수 폴딩 등 적용)

Stage 5: 3가지 버전 제안

Stage 6B (C 백엔드):
  #include <stdio.h>

  double sum(double* arr, int len) {
    double result = 0.0;
    for (int i = 0; i < len; i++) {
      result += arr[i];
    }
    return result;
  }

Stage 7: 테스트 결과
  test_1: sum([], 0) == 0.0 ✅
  test_2: sum([1.0], 1) == 1.0 ✅
  test_3: sum([1.0, 2.0, 3.0], 3) == 6.0 ✅
  성능: 0.001ms (1000개 요소 기준)

Stage 8: 학습
  "배열 + 더하기" → sum (confidence: 85% → 87%)
```

---

**Last Updated**: 2026-02-15
**Status**: 설계 완료
**참조 프로젝트**: FreeLang v1, IR-Design, Proof_ai
**다음 단계**: IR-SPECIFICATION.md, COMPILER-PIPELINE.md

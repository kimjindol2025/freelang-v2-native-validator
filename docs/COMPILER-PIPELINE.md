# FreeLang v2 - Compiler Pipeline

> **파이프라인 상세 플로우**: 각 Stage의 입출력, 알고리즘, 에러 처리
>
> **참조**: COMPILER-ARCHITECTURE.md (전체 설계), IR-SPECIFICATION.md (IR 스펙)

---

## 1. 전체 파이프라인 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    FreeLang v2 Compiler                       │
│                                                               │
│   "배열 더하기"                                                │
│        ↓                                                      │
│   ┌─────────────────────────────────────────┐                │
│   │          Stage 1: Auto Header            │                │
│   │                                          │                │
│   │  normalize → match → infer → build      │                │
│   │                                          │                │
│   │  출력: HeaderContract                    │                │
│   │    fn: sum                               │                │
│   │    in: array<f64>, i32                   │                │
│   │    out: f64                              │                │
│   │    directive: memory                     │                │
│   │    confidence: 0.85                      │                │
│   └────────────────┬────────────────────────┘                │
│                    ↓                                          │
│   ┌─────────────────────────────────────────┐                │
│   │          Stage 2: Template               │                │
│   │                                          │                │
│   │  directive + intent → 알고리즘 선택      │                │
│   │  sum + memory → single_loop_sum          │                │
│   │                                          │                │
│   │  출력: Skeleton AST                      │                │
│   │    FunctionDecl(sum)                     │                │
│   │      ├─ params: arr, len                 │                │
│   │      ├─ body: for loop + accumulate      │                │
│   │      └─ return: result                   │                │
│   └────────────────┬────────────────────────┘                │
│                    ↓                                          │
│   ┌─────────────────────────────────────────┐                │
│   │          Stage 3: IR Generation          │                │
│   │                                          │                │
│   │  AST → SSA IR (IRBuilder API)           │                │
│   │                                          │                │
│   │  출력: IRModule                          │                │
│   │    fn sum:                               │                │
│   │      entry: %0=const 0.0, %1=const 0    │                │
│   │      loop_test: phi, cmp, branch         │                │
│   │      loop_body: array_get, add           │                │
│   │      loop_end: ret                       │                │
│   └────────────────┬────────────────────────┘                │
│                    ↓                                          │
│   ┌─────────────────────────────────────────┐                │
│   │          Stage 4: Optimization           │                │
│   │                                          │                │
│   │  Pass 1: 상수 폴딩                       │                │
│   │  Pass 2: 죽은 코드 제거                   │                │
│   │  Pass 3: Directive 최적화                │                │
│   │                                          │                │
│   │  출력: Optimized IRModule                │                │
│   └────────────────┬────────────────────────┘                │
│                    ↓                                          │
│   ┌─────────────────────────────────────────┐                │
│   │          Stage 5: Version Fork           │                │
│   │                                          │                │
│   │  IR 복제 → 3가지 변형 적용               │                │
│   │                                          │                │
│   └───────┬────────┬────────┬───────────────┘                │
│           ↓        ↓        ↓                                │
│     ┌─────────┐┌─────────┐┌──────────┐                      │
│     │  Safe   ││  Fast   ││ Balanced │                      │
│     │ +checks ││ +hints  ││ default  │                      │
│     │ 1.5ms   ││ 0.4ms   ││ 1.0ms    │                      │
│     └────┬────┘└────┬────┘└────┬─────┘                      │
│          └──────────┼──────────┘                             │
│                     ↓  (AI 선택)                              │
│   ┌─────────────────────────────────────────┐                │
│   │          Stage 6: Backend                │                │
│   │                                          │                │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐│                │
│   │  │  Mode A  │ │  Mode B  │ │  Mode C  ││                │
│   │  │   VM     │ │  C→gcc   │ │ LLVM JIT ││                │
│   │  │  <10ms   │ │  ~500ms  │ │  ~200ms  ││                │
│   │  └──────────┘ └──────────┘ └──────────┘│                │
│   └────────────────┬────────────────────────┘                │
│                    ↓                                          │
│   ┌─────────────────────────────────────────┐                │
│   │     Stage 7-8: Test + Learn              │                │
│   │                                          │                │
│   │  자동 테스트 → 결과 → 피드백 → 학습     │                │
│   │  confidence: 0.85 → 0.87                │                │
│   └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stage별 상세

### Stage 1: Auto Header Generation

```
입력:  string (자연어)
출력:  HeaderContract
시간:  <50ms
에러:  의도 인식 실패 → 재입력 요청

파이프라인 (기존 AUTO-HEADER-ENGINE.md의 7단계):
  1. TextNormalizer: "배열 더하기" → "배열_더하기"
  2. IntentMatcher: "배열_더하기" → intent: "sum"
  3. TypeInference: sum → array<f64>, i32 → f64
  4. ReasonInferencer: → "통계 연산 기초"
  5. DirectiveDecider: → "memory" (기본값)
  6. HeaderBuilder: → HeaderContract
  7. ConfidenceCalculator: → 0.85

에러 처리:
  IntentMatcher 실패 (매칭 없음):
    → 유사 패턴 목록 제안
    → "혹시 'sum', 'average', 'max' 중 하나인가요?"

  TypeInference 실패 (타입 모호):
    → 기본 타입으로 폴백 (array<f64> → f64)
    → confidence 낮춤 (0.5)
```

**참조 파일**: `/tmp/v2-freelang-ai/docs/AUTO-HEADER-ENGINE.md`

---

### Stage 2: Template Selector

```
입력:  HeaderContract
출력:  AST (Skeleton)
시간:  <5ms
에러:  템플릿 없음 → 범용 루프 템플릿 사용

알고리즘:
  1. intent + directive → 템플릿 DB 조회
  2. 매칭되는 템플릿 선택
  3. 파라미터 바인딩 (타입, 변수명)
  4. AST 골격 생성

템플릿 DB:
  ┌────────────┬───────────┬──────────────────────────┐
  │ Intent     │ Directive │ Algorithm                │
  ├────────────┼───────────┼──────────────────────────┤
  │ sum        │ speed     │ single_loop_unrolled     │
  │ sum        │ memory    │ single_loop_inplace      │
  │ sum        │ safety    │ checked_loop_sum         │
  ├────────────┼───────────┼──────────────────────────┤
  │ average    │ *         │ sum_then_divide          │
  │ max        │ *         │ single_pass_max          │
  │ min        │ *         │ single_pass_min          │
  │ filter     │ speed     │ two_pointer_filter       │
  │ filter     │ memory    │ inplace_filter           │
  │ sort       │ speed     │ quicksort                │
  │ sort       │ safety    │ mergesort                │
  └────────────┴───────────┴──────────────────────────┘

에러 처리:
  템플릿 미매칭:
    → 범용 템플릿 사용 (generic_loop)
    → confidence -= 0.2
    → "학습 기록: 새 패턴 발견 '{intent}'"
```

---

### Stage 3: IR Generation

```
입력:  AST
출력:  IRModule (SSA)
시간:  <20ms
에러:  타입 불일치 → 에러 메시지 + 타입 수정 제안

알고리즘 (IRBuilder 패턴):
  AST 노드별 재귀 변환:

  FunctionDeclaration:
    1. ir_function_create(name, params, return_type)
    2. entry = ir_builder_add_block("entry")
    3. params → symbol_table_add()
    4. body → gen_stmt() 재귀

  LetStatement (let x = expr):
    1. expr → gen_expr() → register_id
    2. ir_builder_gen_store("x", register_id)
    3. symbol_table_add("x", register_id, type)

  ForStatement (for i in 0..len):
    1. loop_test = add_block("loop_test")
    2. loop_body = add_block("loop_body")
    3. loop_end = add_block("loop_end")
    4. init: gen_expr(0) → %init_id
    5. jump → loop_test
    6. test: phi, cmp_lt, branch → body or end
    7. body: gen_stmts() + increment + jump → test
    8. end: (계속)

  BinaryExpression (a + b):
    1. gen_expr(a) → %left_id
    2. gen_expr(b) → %right_id
    3. ir_builder_gen_add(%left_id, %right_id) → %result_id

  ArrayAccess (arr[i]):
    1. gen_expr(arr) → %arr_id
    2. gen_expr(i) → %idx_id
    3. (safety directive) ir_builder_gen_bounds_check(%arr_id, %idx_id)  ; Phase 5 이후: balanced
    4. ir_builder_gen_array_get(%arr_id, %idx_id) → %val_id

  ReturnStatement:
    1. gen_expr(value) → %val_id
    2. ir_builder_gen_return(%val_id)

에러 처리:
  타입 불일치:
    "타입 에러: array<string>은 add 연산 불가"
    → 제안: "array<f64>로 변환하시겠습니까?"

  심볼 미발견:
    "정의되지 않은 변수: 'x'"
    → 제안: "비슷한 변수: 'arr', 'len'"
```

**참조 파일**:
- `ir-design/Implementation/ir_builder.h` (API)
- `ir-design/Implementation/ast_to_ir.c` (변환 알고리즘)
- `ir-design/Implementation/symbol_table.h` (심볼 관리)

---

### Stage 4: IR Optimization

```
입력:  IRModule
출력:  Optimized IRModule
시간:  <30ms
에러:  최적화 실패 → 원본 IR 유지

Pass 실행 순서:
  for (pass = 0; pass < max_passes; pass++) {
    changed = false;
    changed |= constant_folding(module);
    changed |= dead_code_elimination(module);
    changed |= directive_optimization(module);
    if (!changed) break;  // 수렴
  }

Pass 1: 상수 폴딩
  스캔: 모든 binop 명령어
  조건: 두 피연산자가 모두 CONST
  변환: binop → CONST (계산 결과)

  예: %0=const(3), %1=const(5), %2=add(%0,%1)
   →  %2=const(8)

Pass 2: 죽은 코드 제거 (DCE)
  1. 모든 레지스터의 사용 횟수 카운트
  2. 사용 횟수 == 0인 레지스터의 명령어 제거
  3. 제거로 인해 새로 죽은 코드 발생 가능 → 반복

Pass 3: Directive 최적화
  directive == "speed":
    1. bounds_check 명령어 제거
    2. null_check 명령어 제거
    3. 배열 루프에 hint_simd 삽입
    4. 반복 횟수 ≤ 8인 루프에 hint_unroll 삽입

  directive == "memory":
    1. 임시 레지스터 최소화 (레지스터 재사용)
    2. array_new → 스택 할당 변환 (크기 알려진 경우)

  directive == "safety":
    1. 모든 array_get 앞에 bounds_check 삽입
    2. 모든 포인터 사용 앞에 null_check 삽입
```

**참조 파일**:
- `ir-design/Implementation/ir_optimizer.c`
- `ir-design/Implementation/ir_fold_constants.c`
- `ir-design/Implementation/ir_dead_code_elimination.c`

---

### Stage 5: Multi-Version Fork (Phase 5 이후 구현 예정)

```
입력:  Optimized IRModule
출력:  3개의 IRModule (safe, fast)  ; Phase 5: balanced 추가
시간:  <5ms

알고리즘:
  1. IR 깊은 복사 (deep copy) × 3
  2. 각 복사본에 다른 directive 적용:

  Safe 복사본:
    - directive = "safety"
    - Pass 3 재실행 (safety 모드)
    - version_tag = "safe"

  Fast 복사본:
    - directive = "speed"
    - Pass 3 재실행 (speed 모드)
    - version_tag = "fast"

  Balanced 복사본 (Phase 5 이후):
    - directive = "memory" (기본값)
    - version_tag = "balanced"

AI에게 제안:
  ┌─────────────────────────────────────────────┐
  │ 3가지 버전이 준비되었습니다:                   │
  │                                              │
  │ [A] Safe    | 모든 검증 | 예상 1.5ms | 안전  │
  │ [B] Fast    | 검증 제거 | 예상 0.4ms | 빠름  │
  │ [C] Balanced| 핵심 검증 | 예상 1.0ms | 균형  │
  │                                              │
  │ 선택: [A] [B] [C]                           │
  └─────────────────────────────────────────────┘
```

---

### Stage 6: Backend Selection

#### Mode A: VM (즉시 실행)

```
입력:  IRModule
출력:  실행 결과 (Value)
시간:  <10ms

변환 알고리즘:
  IR → VM Bytecode (선형 스캔)

  for each block in function.blocks:
    for each instr in block.instructions:
      switch (instr.op):
        IR_CONST:    emit(LOAD_CONST, const_pool.add(value))
        IR_LOAD:     emit(LOAD_VAR, var_index)
        IR_STORE:    emit(STORE_VAR, var_index)
        IR_ADD:      emit(ADD)
        IR_SUB:      emit(SUB)
        IR_CMP_LT:   emit(LT)
        IR_JUMP:     emit(JUMP, block_offset[target])
        IR_BRANCH:   emit(JUMP_IF_FALSE, block_offset[false])
        IR_RETURN:   emit(RETURN)
        IR_ARRAY_GET: emit(INDEX)
        IR_BOUNDS_CHECK: emit(BOUNDS_CHECK_RUNTIME)
        IR_HINT_*:   (무시)

  블록 오프셋 계산:
    1차: 모든 블록의 명령어 카운트 합산
    2차: jump/branch 타겟 오프셋 패칭

VM 실행:
  stack = []
  ip = 0
  while (ip < bytecode.length):
    switch (bytecode[ip].op):
      LOAD_CONST: stack.push(constants[operand])
      ADD: b=pop(); a=pop(); push(a+b)
      JUMP_IF_FALSE: if (!pop()) ip = operand; continue
      RETURN: return pop()
    ip++
```

**참조**: `freelang/src/vm/bytecode.ts`, `freelang/src/vm/vm.ts`

#### Mode B: C Code → gcc

```
입력:  IRModule
출력:  C 소스 파일 → gcc → 바이너리
시간:  ~500ms (컴파일 포함)

변환 알고리즘:
  1. 헤더 생성
     - 필요한 #include 자동 결정
     - stdlib.ts의 매핑 참조

  2. 함수 선언 생성
     - 각 IRFunction → C 함수 프로토타입

  3. 함수 구현 생성
     - 레지스터 → C 변수 (double %0 → double r0;)
     - BasicBlock → C label
     - 명령어 → C 코드

  4. main 함수 생성
     - 테스트 코드 자동 삽입

  5. gcc 컴파일
     - gcc -O2 -o output output.c -lm
     - 에러 시 에러 메시지 파싱 + 자동 수정 시도

C 코드 출력 예:

  #include <stdio.h>
  #include <stdlib.h>

  double sum(double* arr, int len) {
    double r0 = 0.0;       // %0 = const 0.0
    int r1 = 0;            // %1 = const 0

  loop_test:;
    int r3 = (r1 < len);   // %3 = cmp_lt %2, len
    if (!r3) goto loop_end; // branch

  loop_body:;
    if (r1 < 0 || r1 >= len) {  // bounds_check
      fprintf(stderr, "Index out of bounds\\n");
      exit(1);
    }
    double r4 = arr[r1];   // %4 = array_get arr, %2
    r0 = r0 + r4;          // %7 = add %5, %4
    r1 = r1 + 1;           // %6 = add %2, 1
    goto loop_test;

  loop_end:;
    return r0;              // ret %5
  }

  int main() {
    double arr[] = {1.0, 2.0, 3.0};
    printf("sum = %f\\n", sum(arr, 3));
    return 0;
  }
```

**참조**:
- `ir-design/Implementation/ir_c_emitter.c`
- `freelang/src/codegen/c_emitter.ts`
- `freelang/src/codegen/stdlib.ts`

#### Mode C: LLVM JIT

```
입력:  IRModule
출력:  JIT 컴파일된 네이티브 코드
시간:  ~200ms

변환 알고리즘:
  IR → LLVM IR 텍스트 생성 → llc/lli 실행

  LLVM IR 출력 예:

  define double @sum(double* %arr, i32 %len) {
  entry:
    br label %loop_test

  loop_test:
    %i = phi i32 [0, %entry], [%i_next, %loop_body]
    %result = phi double [0.0, %entry], [%sum, %loop_body]
    %cond = icmp slt i32 %i, %len
    br i1 %cond, label %loop_body, label %loop_end

  loop_body:
    %ptr = getelementptr double, double* %arr, i32 %i
    %val = load double, double* %ptr
    %sum = fadd double %result, %val
    %i_next = add i32 %i, 1
    br label %loop_test

  loop_end:
    ret double %result
  }

LLVM 최적화:
  - mem2reg: 메모리→레지스터 프로모션
  - instcombine: 명령어 조합 최적화
  - loop-vectorize: 루프 벡터화 (hint_simd 활용)
  - unroll: 루프 언롤링 (hint_unroll 활용)
```

**참조**: `freelang/src/codegen/llvm/`

---

## 3. 백엔드 비교

```
┌────────────┬────────┬─────────┬──────────┬───────────┐
│            │  VM    │  C→gcc  │ LLVM JIT │           │
├────────────┼────────┼─────────┼──────────┼───────────┤
│ 지연       │ <10ms  │ ~500ms  │ ~200ms   │           │
│ 실행 성능  │ 느림   │ 빠름    │ 매우빠름 │           │
│ 최적화     │ 없음   │ gcc -O2 │ LLVM Pass│           │
│ 디버깅     │ 쉬움   │ 보통    │ 어려움   │           │
│ 의존성     │ 없음   │ gcc     │ LLVM     │           │
│ 용도       │ 테스트 │ 배포    │ 벤치마크 │           │
│ SIMD 지원  │ ❌     │ 부분    │ ✅       │           │
│ 크로스컴파일│ ❌    │ ✅      │ ✅       │           │
├────────────┼────────┼─────────┼──────────┼───────────┤
│ 구현 우선  │ 2순위  │ 1순위   │ 3순위    │           │
└────────────┴────────┴─────────┴──────────┴───────────┘
```

---

## 4. Directive별 최적화 전략

### "speed" (속도 우선)

```
적용 범위: 전체 파이프라인

Stage 2: 속도 최적화 템플릿 선택
  sum → unrolled_loop (4배 언롤)
  sort → quicksort (평균 O(n log n))

Stage 4: 최적화 패스
  - bounds_check 제거
  - null_check 제거
  - hint_simd 삽입 (배열 루프)
  - hint_unroll 삽입 (count=4)

Stage 6B (C 백엔드):
  - gcc -O3 -march=native
  - #pragma GCC unroll 4
  - restrict 포인터 사용

Stage 6C (LLVM):
  - -O3 최적화
  - loop vectorization 활성화
  - auto-vectorize 힌트 활용

예상 성능: 기본의 150~200%
위험: 배열 경계 초과 시 정의되지 않은 동작
```

### "memory" (메모리 우선)

```
적용 범위: 전체 파이프라인

Stage 2: 메모리 효율 템플릿 선택
  filter → inplace_filter (추가 배열 없음)
  sort → heapsort (in-place, O(1) 추가 메모리)

Stage 4: 최적화 패스
  - 임시 레지스터 재사용
  - array_new → 스택 할당 (크기 ≤ 1024일 때)
  - 배열 복사 → in-place 변환

Stage 6B (C 백엔드):
  - gcc -Os (크기 최적화)
  - 스택 배열: double arr[N]; (malloc 대신)
  - 임시 변수 최소화

예상 메모리: 기본의 50~70%
위험: 큰 배열에서 스택 오버플로우 가능
```

### "safety" (안전 우선)

```
적용 범위: 전체 파이프라인

Stage 2: 안전 템플릿 선택
  sort → mergesort (안정 정렬, 예측 가능)

Stage 4: 최적화 패스
  - bounds_check 삽입 (모든 array_get/set)
  - null_check 삽입 (모든 포인터)
  - 오버플로우 검사 (add/mul 후)

Stage 6B (C 백엔드):
  - gcc -g -fsanitize=address,undefined
  - 모든 배열 접근에 경계 검사 코드
  - 에러 시 명확한 메시지 출력

예상 성능: 기본의 70~80%
장점: 런타임 에러 방지, 디버깅 쉬움
```

---

## 5. 에러 전파 흐름

```
Stage 1 에러 (의도 인식 실패):
  ┌──────────────────────────────┐
  │ ⚠️ 의도 인식 실패             │
  │                               │
  │ 입력: "뭔가 해봐"             │
  │ 매칭: 없음                    │
  │                               │
  │ 제안:                         │
  │   "sum" - 배열 합산           │
  │   "max" - 최대값              │
  │   "sort" - 정렬               │
  │                               │
  │ [재입력] [제안 선택]           │
  └──────────────────────────────┘

Stage 3 에러 (타입 불일치):
  ┌──────────────────────────────┐
  │ ⚠️ 타입 에러                  │
  │                               │
  │ 위치: sum 함수, loop_body     │
  │ 내용: string + f64 불가       │
  │                               │
  │ 원인: 입력 타입이 array<string>│
  │       인데 add 연산 시도      │
  │                               │
  │ 제안:                         │
  │   1. 타입을 array<f64>로 변경 │
  │   2. 문자열 연결(concat) 사용 │
  │                               │
  │ 신뢰도: 89%                   │
  └──────────────────────────────┘

Stage 6B 에러 (gcc 컴파일 실패):
  ┌──────────────────────────────┐
  │ ⚠️ C 컴파일 에러              │
  │                               │
  │ gcc 출력:                     │
  │   error: implicit declaration │
  │   of function 'sqrt'          │
  │                               │
  │ 자동 수정:                    │
  │   #include <math.h> 추가      │
  │   → 재컴파일 시도             │
  │                               │
  │ 결과: ✅ 수정 후 성공          │
  └──────────────────────────────┘

Stage 7 에러 (테스트 실패):
  ┌──────────────────────────────┐
  │ ⚠️ 테스트 실패                │
  │                               │
  │ test_4: sum([-1, 1]) == 0    │
  │ 실제: -2.38e-15 (부동소수점)  │
  │                               │
  │ 분석: 부동소수점 정밀도 문제   │
  │                               │
  │ 제안:                         │
  │   비교 시 epsilon 허용 (1e-10)│
  │                               │
  │ [수정 적용] [무시]             │
  └──────────────────────────────┘
```

---

## 6. 성능 프로파일

### "배열 더하기" E2E 시간 분석

```
VM 모드 (즉시 실행):
  Stage 1: 헤더 생성    35ms  ████████
  Stage 2: 템플릿        2ms  █
  Stage 3: IR 생성      10ms  ███
  Stage 4: 최적화        8ms  ██
  Stage 5: 버전 분기     1ms
  Stage 6A: VM 실행     5ms   ██
  Stage 7: 테스트        3ms  █
  ────────────────────────────
  합계:                 64ms

C 컴파일 모드:
  Stage 1: 헤더 생성    35ms  ████
  Stage 2: 템플릿        2ms
  Stage 3: IR 생성      10ms  █
  Stage 4: 최적화        8ms  █
  Stage 5: 버전 분기     1ms
  Stage 6B: C 생성       5ms  █
  Stage 6B: gcc 컴파일 400ms  █████████████████████████████████
  Stage 6B: 실행        <1ms
  Stage 7: 테스트        3ms
  ────────────────────────────
  합계:                464ms
```

### 캐싱 효과 (2회차 이후)

```
2회차 "배열 더하기":
  Stage 1: 캐시 히트     2ms  █  (35ms → 2ms)
  Stage 2: 캐시 히트     1ms     (2ms → 1ms)
  Stage 3-6: 동일
  ────────────────────────────
  합계 (VM):           29ms  (64ms → 29ms, 55% 단축)
  합계 (C):           427ms  (464ms → 427ms, 8% 단축)
```

---

## 7. 구현 우선순위 로드맵

```
Phase 1 (기본 경로) - 필수:
  ┌─────────────────────────────────┐
  │ Stage 1 → 2 → 3 → 6B (C→gcc) │
  │ "자연어 → C → 바이너리"         │
  │ 가장 단순한 엔드투엔드           │
  └─────────────────────────────────┘

Phase 2 (즉시 실행) - 중요:
  ┌─────────────────────────────────┐
  │ Stage 6A (VM) 추가              │
  │ "IR → VM → 즉시 결과"          │
  │ AI 피드백 루프 활성화           │
  └─────────────────────────────────┘

Phase 3 (최적화) - 권장:
  ┌─────────────────────────────────┐
  │ Stage 4 + 5 완성                │
  │ 상수 폴딩 + DCE + Directive    │
  │ 3가지 버전 선택 가능            │
  └─────────────────────────────────┘

Phase 4 (LLVM) - 선택:
  ┌─────────────────────────────────┐
  │ Stage 6C (LLVM JIT)             │
  │ 최적 성능 벤치마크              │
  └─────────────────────────────────┘

Phase 5 (학습) - 장기:
  ┌─────────────────────────────────┐
  │ Stage 7 + 8 완성                │
  │ 테스트 자동 생성 + 학습 루프    │
  │ confidence 진화                 │
  └─────────────────────────────────┘
```

---

**Last Updated**: 2026-02-15
**Status**: 설계 완료
**총 Stage**: 8단계 (0-8)
**총 Backend**: 3가지 (VM, C, LLVM)
**참조**: COMPILER-ARCHITECTURE.md, IR-SPECIFICATION.md

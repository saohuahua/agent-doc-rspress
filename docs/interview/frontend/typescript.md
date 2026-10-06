# TypeScript

## `interface` 和 `type` 有什么区别
interface 和 type 都是用于描述对象类型的，但是他们的侧重点不太一样

```latex
interface 更偏向描述“对象结构”
type 更偏向做“类型组合、类型表达”
```

如果就定义普通对象，props，接口返回数据，类结构，两者均可以实现，但是遇到交叉类型，联合类型，工具类型，函数类型等推荐用type

用法区别

+ 基本用法几乎一致

```typescript
interface User {
  name: string
  age: number
}

type User = {
  name: string
  age: number
}

const user: User = {
  name: 'Tom',
  age: 18
}
```

2.`interface` 可以重复声明，因为存在自动合并的机制，`type`则不行，

```typescript
interface User {
  name: string
}

interface User {
  age: number
}
//等价
interface User {
  name: string
  age: number
}

```

3.`type` 可以定义联合类型，`interface`就不行

+ 这也是type最大的优势，表示更复杂的类型关系
    - 联合类型 
        * 状态类型：`type Status = 'success' | 'error' | 'loading'`
        * 按钮类型：`type ButtonType = 'primary' | 'default' | 'danger'`

4.`type` 可以定义交叉类型，`interface`也可以通过`extend`实现类似的效果

```typescript
type Base = {
  id: number
}
// 用 &
type User = Base & {
  name: string
}

// interface extend 
interface Base {
  id: number
}

interface User extends Base {
  name: string
}
```

5.interface 更加适合类和面向对象的结构

```typescript
interface Logger {
  log(message: string): void
}

class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(message)
  }
}

interface Storage {
  get(key: string): string | null
  set(key: string, value: string): void
}
```

6.type 更加适合函数，元祖，工具类型

+ 函数类似 `type Handler = (event: MouseEvent) => void`

总结恶言，具体使用就是

```latex
定义对象结构
  -> interface 优先

定义联合类型、字面量类型、函数类型、元组类型
  -> type 优先

需要类型组合、条件类型、映射类型、工具类型
  -> type 优先

需要声明合并、扩展第三方库、描述类的契约
  -> interface 优先
```

> TypeScript 里的 `type` 和 `interface` 都可以用来描述对象类型，定义普通对象时很多情况下差别不大。核心区别是：`interface` 更偏向描述对象结构，支持 `extends` 扩展和同名声明合并，所以适合定义组件 props、接口返回数据、类的契约，以及扩展第三方库或全局对象类型；而 `type` 更像类型别名，不能重复声明，但表达能力更强，可以定义联合类型、交叉类型、字面量类型、函数类型、元组类型、条件类型和工具类型。
>
> 在前端项目里，我一般会用 `interface` 定义稳定的对象结构，比如接口数据、组件 Props、类需要实现的能力；用 `type` 定义更灵活的类型组合，比如请求状态 `'loading' | 'success' | 'error'`、组件互斥 Props、函数类型、元组和复杂泛型工具类型。简单来说，对象结构优先 `interface`，类型表达和类型计算优先 `type`。
>



## 讲一下TS中的泛型
核心结论

+ 泛型可以理解为 **类型参数**
    - 不是把类型写死，而是使用的时候再确定类型，从而让函数，接口，组件，工具类复用，同时保留类型推导，安全

```typescript
function identity<T>(value: T): T {
  return value;
}
// 传什么就用什么
identity<string>('hello');
identity<number>(123);
```

为什么需要泛型

+ 为了 保留类型的同时复用逻辑

```typescript
// 限制返回类型
function getFirst(arr: string[]): string {
  return arr[0];
}
// 可以使用any，但是少了类型推导
function getFirst(arr: any[]): any {
  return arr[0];
}

//  解决办法
function getFirst<T>(arr: T[]): T {
  return arr[0];
}

const a = getFirst([1, 2, 3]); 
// a: number

const b = getFirst(['a', 'b']);
// b: string
```

项目中常见使用

1.封装接口请求，例如常见接口返回 `code`,`message`,`data`, 其中`code`,`message`基本上都是一样的，`data`不同，可以使用泛型

```typescript
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

function request<T>(url: string): Promise<ApiResponse<T>> {
  return fetch(url).then(res => res.json());
}
// 具体使用就定义 data 类型即可
interface UserInfo {
  id: number;
  name: string;
  age: number;
}

request<UserInfo>('/api/user').then(res => {
  res.data.id;
  res.data.name;
});
```

2.封装工具类函数，例如从对象数组中根据字段取值

```typescript
// K extend keyof T 代表key必须是这个对象真实存在的属性
function getVal<T,K extend keyof T>(obj:T,key:K):T[K]{
  return obj[key]
}
const user = {
  id: 1,
  name: 'Tom'
};

const name = getValue(user, 'name');
// name: string

const id = getValue(user, 'id');
// id: number
```

泛型默认值

```typescript
// 不传默认就是unknown
interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}
```

> TypeScript 中的泛型可以理解为类型参数，它的作用是在定义函数、接口、类或组件时不写死具体类型，而是在使用时再确定类型。这样可以让代码具备复用性，同时保留类型推导和类型安全。
>
> 在前端项目中，泛型非常常见，比如封装接口请求时，可以定义 `ApiResponse<T>`，让不同接口的 `data` 拥有不同类型；封装分页列表时，可以定义 `PageResult<T>`，让不同业务列表复用同一套分页结构；在 React 或 Vue 中，也可以用泛型封装通用组件、hooks 或 composables。
>
> 泛型实际解决的是“逻辑相同，但数据类型不同”的问题。相比 `any`，泛型不会丢失类型信息，TS 仍然可以推导返回值、检查属性是否合法。所以项目里是可以实际使用的，尤其适合接口、列表、表格、表单、工具函数和公共组件封装。但也不建议滥用，简单场景直接写明确类型会更清晰。
>



## TS对比JS多了哪些基础数据类型
```typescript
// 除了基础的JS类型外
let str: string = 'hello';
let num: number = 123;
let bool: boolean = true;
let n: null = null;
let u: undefined = undefined;
let s: symbol = Symbol('id');
let big: bigint = 123n;
```

+ `any` 任意类型，关闭TS检查

```typescript
let value: any = 123;

value = 'hello';
value = true;
value.xxx.yyy;
```

+ `unknown` 未知类型，比any安全一些

```typescript
let value: unknown = 'hello';

value.toUpperCase(); 
// 报错，不能直接使用 除非做一个类型判断 typeof value === 'string'
```

+ `void` 函数无返回值

```typescript
function logMessage(): void {
  console.log('hello');
}
```

+ `never` 永远不会出现的值,常用语函数永远不会正常介绍

```typescript
function throwError(message: string): never {
  throw new Error(message);
}
```

+ `object` 非原始类型

```typescript
let obj: object = {};
obj = [];
obj = function () {};

// 不适合描述普通业务对象，因为不能直接访问属性，推荐用interface，type
let user: object = { name: 'Tom' };

user.name;
// 报错
```

+ `array` 数组

```typescript
let nums: number[] = [1, 2, 3];

let names: Array<string> = ['Tom', 'Jerry'];
```

+ `tuple`元组，固定长度，固定位置类型的数组

```typescript
let point: [number, number] = [10, 20];

let user: [number, string] = [1, 'Tom'];
```

+ `enum` 枚举，定义一组有名字的常量

```typescript
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}

const role: UserRole = UserRole.Admin;  //用的少
// 一般用type定义联合类型去替代
type UserRole = 'admin' | 'user' | 'guest';
```

> TS 的基础类型可以分为两部分：一部分是 JS 本身就有的类型，比如 `string`、`number`、`boolean`、`null`、`undefined`、`symbol`、`bigint`；另一部分是 TS 为静态类型检查额外提供的类型，比如 `any`、`unknown`、`void`、`never`、数组、元组、枚举、字面量类型、联合类型，以及 `type` 和 `interface`。
>
> 和 JS 相比，TS 最大的区别不是运行时多了新的数据类型，而是在开发阶段多了一套类型系统。比如可以用联合类型限制组件 props 的取值，用接口描述接口返回数据，用泛型封装请求响应，用 `unknown` 替代不安全的 `any`。在前端项目里，TS 的类型主要用于约束接口数据、组件参数、状态、事件和工具函数，从而提前发现类型错误，提升代码可维护性。
>

## TS 和 JS 区别在哪里， 为什么需要 TS

核心本质：TS 就是 JS的超集，本质区别：在 JS 基础上 引入一套 **编译期**的**静态类型系统**

核心区别

- 类型检查时机，JS是动态类型，类型错误要运行才暴露，TS在编译阶段就做了检查

```typescript
// JS：这种问题线上才炸
function getUserAge(user) {
  return user.age.toFixed()
}
getUserAge(undefined)      // 运行时报错
getUserAge({ age: '18' })  // 运行时报错


// TS：写代码时就报红，到不了线上
interface User {
  age: number
}

function getUserAge(user: User) {
  return user.age.toFixed()
}

getUserAge({ age: '18' }) // 编译期报错
```

关键认知**：TS不改变JS的运行方式**

- 浏览器和 Node 执行的仍然是编译后的 JS，类型在编译后会被**擦除**，运行时没有任何类型保护
- 所以 TS 的“安全”是开发期安全，把运行时错误提前到编译期拦截，它不替代运行时校验——接口数据不可信时，该做的校验一样要做

**为什么需要****TS**

- **错误前置**：`undefinedisnotafunction` 这类低级错误，写代码时就发现
- **类型即文档**：看函数签名就知道传什么、返回什么，不用读实现
- **IDE 体验**：接口数据、组件 `props`、函数签名都有类型，IDE 能精确提示
- **团队协作**：类型就是模块之间的契约，减少“传错参数”这类沟通成本

> TS是JS的超集，核心区别是引入了一套**静态类型系统**。JS是动态类型，像传错参数、访问不存在的字段这类问题，都要等到运行时才暴露，项目一大、协作者一多就很难维护。TS把类型检查提前到编译期，变量、函数参数、接口返回都可以定义类型，写错在写代码时就会报错。
>
> TS并不改变JS的运行方式，浏览器和Node执行的仍然是编译后的JS，类型在编译后会被擦除。所以TS的价值是把大量低级错误从线上拦截到开发阶段，同时类型本身也是一种文档，看签名就知道怎么调用；重构时改一个interface，所有不兼容的地方会全部报错，改起来很有信心。
>
> 所以需要TS，本质上是前端项目规模变大之后的必然选择：代码多了、协作多了、改动频繁了，就需要类型系统来约束边界、降低维护成本。当然它也有写类型的时间成本，我的习惯是业务项目一定用TS，小脚本和原型直接JS，同时运行时的数据校验不会因为用了TS就省掉。

## 联合类型和交叉类型的区别是什么

**核心结论一句话**：联合类型 `|` 是"**或**"关系，交叉类型 `&` 是"**且**"关系。

```latex
联合类型 A | B
  -> 值满足 A 或 B 其中一个即可
  -> 只能安全访问 A、B 的【共有成员】
  -> 典型：string | number、'loading' | 'success' | 'error'

交叉类型 A & B
  -> 值必须【同时】满足 A 和 B
  -> 合并两边所有成员，能访问全部属性
  -> 典型：A & B = { name: string; age: number }
```

**示例**：

```typescript
// 联合类型：要么 string，要么 number
let value: string | number;
value = 'hello';
value = 123;

// 交叉类型：同时具备 A 和 B 的属性
type A = { name: string };
type B = { age: number };
type Person = A & B;

const p: Person = { name: 'Tom', age: 18 }; // 两个属性都要有
```

**三个关键细节**：

1. **联合类型只能访问共有成员**，想访问独有成员必须先类型收窄：

```typescript
function fn(x: string | number) {
  // x.length 会报错，因为 number 没有 length
  if (typeof x === 'string') {
    console.log(x.length); // 收窄后才行
  }
}
```

2. **基础类型做交叉会得到 `never`**，因为一个值不可能既是 string 又是 number：

```typescript
type Impossible = string & number; // never
```

3. **运算优先级**：`&` 高于 `|`，混用时加括号才不容易搞错：

```typescript
type T = (A | B) & C; // 先联合，再交叉
```

**使用场景对照**：

| 类型      | 场景                                                    |
| --------- | ------------------------------------------------------- |
| 联合 `\|` | 参数允许多种类型、状态/枚举取值、组件 props 的限定值    |
| 交叉 `&`  | 合并多个对象类型、props 混入（mixin）、给类型"叠加"字段 |

> 联合和交叉的区别，我一句话记：
>
> `|` 是"或"，`&` 是"且"。联合类型表示值满足其中一个就行，比如 `string | number`，但它只能安全访问两边共有的成员，想用某一方的独有属性必须先做类型收窄。
>
> 交叉类型表示必须同时满足两边，会把两个类型的成员合并起来，比如 `{ name } & { age }` 就是 `{ name, age }`
>
> 有两个容易踩的坑：一是对基础类型用交叉会得到 `never`，因为一个值不可能既是 string 又是 number；二是 `&` 的优先级比 `|` 高，混用时建议加括号。实际项目里，联合类型我用在状态枚举、参数多类型这些"多选一"的场景，交叉类型用在合并 props、给对象类型叠加字段的场景，两个正好互补。



## `any` / `unknown` / `never` 的区别

**核心结论**：三者安全性不同——`any` 完全关闭类型检查，`unknown` 是"安全的 any"（用之前必须收窄），`never` 是"永远不存在的类型"。

```latex
any
  -> 任意类型，接收任何值，也能赋给任何类型
  -> 关闭类型检查，访问任何属性/方法都不报错
  -> 最不安全，等于放弃 TS 的类型保护

unknown
  -> 未知类型，可以接收任何值
  -> 但不能直接使用（访问属性、调用方法会报错）
  -> 必须先类型收窄（typeof / instanceof / 判断）才能用
  -> 只能赋值给 any 或 unknown，不能直接赋给具体类型

never
  -> 永远不会有值的类型（空集合）
  -> 用于：抛出异常 / 死循环的函数返回值、穷尽性检查
  -> 是任何类型的子类型，可以赋给任何类型，但没有类型能赋给它
```

**代码示例**：

```typescript
// any：完全不管
let a: any = 1;
a.xxx.yyy();        // 不报错，运行时才炸
let s: string = a;  // any 可以直接赋给 string，也不报错

// unknown：必须先收窄
let u: unknown = 'hello';
// u.toUpperCase(); // 报错，不能直接用
if (typeof u === 'string') {
  u.toUpperCase();  // 收窄后才能用
}
let s2: string = u; // 报错，unknown 不能直接赋给 string

// never：永远不存在的值
function throwError(msg: string): never {
  throw new Error(msg); // 永远不会正常 return
}
```

**赋值兼容性对比**：

| 类型      | 能接收什么              | 能赋值给什么         | 能否直接使用   |
| --------- | ----------------------- | -------------------- | -------------- |
| `any`     | 任何类型                | 任何类型             | 能（不检查）   |
| `unknown` | 任何类型                | 仅 `any` / `unknown` | 不能，需先收窄 |
| `never`   | 无（只有 `never` 自己） | 任何类型             | 无值可用       |

> 面试版口述：`any`、`unknown`、`never` 的区别，核心是安全性和取值能力。
>
> `any` 是任意类型，接收任何值也能赋给任何类型，但完全关闭了类型检查，访问不存在的属性方法都不报错，等于放弃了 TS 的保护，所以项目里应该尽量避免。`unknown` 是安全的 `any`，它可以接收任何类型的值，但不能直接使用，访问属性或调用方法会报错，必须先用 `typeof`、`instanceof` 做类型收窄，而且它只能赋值给 `any` 或 `unknown`，不能直接赋给具体类型。`never` 是永远不会有值的类型，通常用在两个地方：一是抛出异常或死循环的函数，因为这种函数永远不会正常返回；二是联合类型的穷尽性检查，把不可能的分支收成 `never`。
>
> 从兼容性上理解：`never` 是任何类型的子类型，所以它能赋给任何类型，但没有类型能赋给它；`unknown` 反过来，是任何类型的父类型，所以任何类型都能赋给它，但它不能直接赋给具体类型。项目里我的原则是：能不用 `any` 就不用，接收不确定的数据用 `unknown` 加收窄，`never` 用在函数不返回和穷尽检查的场景。

## 类型收窄与类型守卫是什么？

**核心结论**：

- 类型收窄（Type Narrowing）是**过程/结果**，TS 根据代码中的判断，把宽类型缩小成更具体的类型；

- 类型守卫（Type Guard）是**手段**——用来触发收窄的、能在运行时判断类型的表达式。

```latex
类型收窄
  -> 一个宽类型（string | number）在某个分支里被缩小成具体类型
  -> TS 自动分析 if / switch / 三元等控制流，判断收窄结果

类型守卫
  -> typeof / instanceof / in / 真值判断 / 相等判断
  -> 自定义守卫：返回值写成 x is Type 的谓词函数
```

**代码示例**：

```typescript
// typeof 守卫：联合类型收窄
function padLeft(value: string | number) {
  if (typeof value === 'string') {
    return value.padStart(10); // 收窄为 string，能用字符串方法
  }
  return value.toFixed(2);     // 收窄为 number
}

// instanceof 守卫
function format(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString(); // 收窄为 Date
  }
  return value;                 // 收窄为 string
}

// in 守卫：区分联合的对象类型
function getArea(shape: { width: number } | { radius: number }) {
  if ('width' in shape) {
    return shape.width * 2;      // 收窄为含 width 的类型
  }
  return shape.radius * 3.14;    // 收窄为含 radius 的类型
}
```

**自定义类型守卫**：当 TS 无法自动判断时，自己写一个返回值是 `x is Type` 的函数：

```typescript
interface Cat { meow(): void }
interface Dog { bark(): void }

function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined; // 运行时判断
}

const animal: Cat | Dog = getAnimal();
if (isCat(animal)) {
  animal.meow(); // 收窄为 Cat，可以直接调 meow
} else {
  animal.bark(); // 收窄为 Dog
}
```

**常见的收窄触发方式**：

| 方式         | 示例                    | 收窄结果                               |
| ------------ | ----------------------- | -------------------------------------- |
| `typeof`     | `typeof x === 'string'` | 基本类型                               |
| `instanceof` | `x instanceof Date`     | 实例类型                               |
| `in`         | `'key' in obj`          | 含该 key 的对象类型                    |
| 真值判断     | `if (x)`                | 排除 `null` / `undefined` / `''` / `0` |
| 相等判断     | `if (x === 'foo')`      | 字面量类型                             |
| 自定义守卫   | `x is Type`             | 任意自定义类型                         |

> 面试版口述：类型收窄和类型守卫是**一体两面**的概念。
>
> 类型收窄是指 TS 根据代码里的判断，把一个宽类型缩小成更具体的类型，比如参数是 `string | number`，在 `if (typeof x === 'string')` 这个分支里，TS 就能确定 x 是 `string`，从而允许访问字符串的方法。类型守卫就是触发这种收窄的表达式，
>
> `typeof`、`instanceof`、`in`、真值判断、相等判断都是内置的类型守卫。
>
> 两者关系上，类型收窄是结果，类型守卫是手段。内置守卫搞不定的场景，还可以写自定义类型守卫，也就是返回值类型写成 `x is Type` 这种谓词函数，函数内部做运行时判断，返回 true 时 TS 就把参数收窄成那个类型。实际项目里最典型的是处理联合类型，比如接口返回的数据可能是多种结构，我用 `in` 或者自定义守卫把结构区分开，之后每个分支里 TS 都能给出正确的类型提示，避免到处写类型断言。

## 泛型约束 + `keyof` 是什么， 有什么作用？

**核心结论**：

- 泛型约束是用 `extends` 限制泛型参数必须满足某个结构；

- `keyof` 是取出类型的所有键组成联合类型。两者组合可以写出"key 自动提示、写错即报错、返回值类型精确"的通用函数。

```latex
泛型约束
  -> T 默认可以是任意类型，约束就是限定 T 必须长什么样
  -> 写法：T extends SomeType
  -> 目的：让泛型具备确定的能力，函数体内才能安全访问

keyof
  -> 取出类型 T 的所有属性名，返回联合类型
  -> keyof { name: string; age: number } = 'name' | 'age'

组合
  -> K extends keyof T：K 只能是 T 的键
  -> T[K]：索引访问类型，精确取到该键对应的值类型
```

**代码示例**：

```typescript
// 泛型约束：限定 T 必须有 length 属性
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest('abc', 'de');   // 字符串有 length，OK
longest([1, 2], [3]);   // 数组有 length，OK
// longest(1, 2);        // 报错，number 没有 length
```

**`keyof` + 约束组合（最经典的工具函数）**：

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'Tom', age: 18 };

const id = getProperty(user, 'id');     // number
const name = getProperty(user, 'name'); // string
// getProperty(user, 'xxx');             // 报错：'xxx' 不是 user 的键
```

- `K extends keyof T` 把第二个参数限制为"只能是 T 的键"，调用时 IDE 会提示可选 key，写错直接编译报错
- 返回类型 `T[K]` 是索引访问类型，能精确推出每个 key 对应的值类型，而不是笼统的联合类型

**为什么比 `any` / 手写重载好**：

| 写法                              | key 提示 | 写错 key | 返回值类型                |
| --------------------------------- | -------- | -------- | ------------------------- |
| `get(obj: any, key: string): any` | 无       | 不报错   | 丢失，`any`               |
| 手写多个重载                      | 有       | 报错     | 精确但每加一个 key 都要写 |
| `T, K extends keyof T`            | 有       | 报错     | 自动精确，一次写完        |

> 面试版口述：**泛型约束就是用 `extends` 给泛型参数加一个限制**。
>
> 泛型默认可以是任意类型，但很多场景下我们需要 T 具备某个确定的能力，比如想访问 `length`，就得约束 `T extends { length: number }`，这样函数体内才能安全地访问，否则 TS 会报错。
>
> `keyof` 是把一个类型的所有键取出来，组成联合类型，比如 `keyof User` 就是 `'id' | 'name' | 'age'`。它最经典的用法是和泛型约束组合，写成一个通用取值函数 `getProperty<T, K extends keyof T>(obj, key): T[K]`。这里 `K extends keyof T` 表示第二个参数只能是 T 的键，调用时 IDE 能提示可选 key，写错 key 编译期直接报错；返回类型 `T[K]` 用索引访问类型精确推出每个 key 对应的值类型，所以 `getProperty(user, 'id')` 返回 `number`，`getProperty(user, 'name')` 返回 `string`。
>
> 对比手写重载，这种方式一次写完、自动精确，不用每加一个字段就补一个重载。项目里我封装根据字段取值、按字段排序这类工具函数时经常用这个模式，既安全又省重复代码。

补充：为什么会把泛型约束和 keyof 放在一起说？

```ts
function getVal<T, K extends keyof T>(obj: T, key: K): T[K]
```

- `keyof T` 产出的联合类型，本身是"死的"——它不知道具体约束谁。只有它作为 `extends` 的右侧去约束 `K` 时，才变成"动态绑定到某个对象"的活约束
- 最实用、最常见的恰恰就是 `keyof T`——因为"参数 key 必须是这个对象的键"，是前端最普遍的需求，按字段取值、按字段排序、封装 setState 更新某个字段……
- 再加上返回类型 `T[K]` 的索引访问，三者拼起来才构成一个完整的"**类型安全的属性访问**"方案：key 有提示、写错报错、返回值类型精确


---
title: JavaScript 语言基础
---

# JavaScript 语言基础

> 语言层面的高频八股：变量与数据类型、类型转换与相等比较、包装类型、Map 与 Object、数组与字符串方法、类型判断与浮点精度。
>
> 姊妹篇：[JavaScript 核心机制](./js-core) · [JavaScript 浏览器与工程](./js-browser)

## 数据类型

分为2大类：**原始数据类型**，**引用数据类型**

### 原始数据类型
将原始值赋值给另外一个变量，相当于是存储了一个该值的副本，修改一个变量不会引起其他变量的变化。

包括如下：

+ `String`字符串，`“hello world”`
+ `Number` 数值
+ `Boolean` 布尔
+ `Undefined` 未定义
+ `Null` 空
+ `Symbol` ES6引入，独一无二的值，主要是用于对象的属性名，防止属性名冲突
+ `BigInt` 大整数，表示任意大的整数

### 引用数据类型
引用数据类型包括

+ `Object` 对象，复杂的数据结构的基石
+ `Array` 数组
+ `Function` 函数，特殊的对象

### 存储上的差别

:::info
先说清楚一个容易被问倒的前提

**ECMAScript 规范规定的是「值的语义」**：原始值不可变，对象通过引用被访问。规范**没有**规定引擎必须把原始值放在栈、对象放在堆，也没有规定变量的内存必须怎么排布。

下面用 **栈 / 堆** 来讲，只是**便于理解的简化模型**。真实的内存布局（对象在堆上如何分配、是否有隐藏类、是否有指针压缩、小整数是否被内联等）取决于**具体 JS 引擎的实现**，属于实现细节，不属于语言规范。面试时可以这么讲，但不要说成「JS 规范规定原始类型存栈、引用类型存堆」。
:::

+ 原始数据类型
    - 可以理解为变量直接持有这个值本身（在简化模型里，常画成栈上的一个小格子）
    - 赋值方式：**传递的是值本身**，把一个原始值赋给另一个变量，相当于把这个值复制了一份
    - 所以修改其中一个变量，不会影响另一个

```javascript
let a = 10;
let b = a; // b 拿到的是 10 这个值本身（副本）
b = 20;    // 修改 b 不会影响 a
console.log(a); // 10
console.log(b); // 20
```

+ 引用数据类型
    - 赋值方式：**传递的同样是值**，只不过对象变量的这个「值」是一个**引用**（可以理解成指向堆上那个对象的一个句柄 / 地址），它让变量能够访问到同一个对象
    - 把对象赋给另一个变量，**不会复制对象本身**，两个变量引用的是同一个对象
    - 所以通过其中一个变量修改对象的属性，另一个变量也能观察到变化

```javascript
let obj1 = { name: "Alice" };
let obj2 = obj1;    // 传递的是同一个引用，obj1 和 obj2 指向同一个对象

obj2.name = "Bob";  // 通过 obj2 修改的正是那个共享的对象
console.log(obj1.name); // Bob，obj1 观察到同一对象的修改
console.log(obj2.name); // Bob
console.log(obj1 === obj2); // true，两个变量引用同一个对象
```

+ **面试表述要点**：不要把它说成「原始类型按值传递、对象按引用传递」。
    - 准确说法是：**JS 里赋值和参数传递传递的都是值**，只是对象变量的这个「值」本身是引用，所以复制这个值以后，两个变量指向同一个对象。
    - 这也解释了为什么「把对象传给函数，函数内部改属性会影响外部，但给参数重新赋一个新对象不会影响外部」——重新赋值只改了形参这个**引用的副本**。

## var / let / const

```text
var
  -> 函数作用域
  -> 有变量提升
  -> 可以重复声明
  -> 可以重新赋值
  -> 全局声明会挂载到 window
  -> 现代项目不推荐

let
  -> 块级作用域
  -> 有暂时性死区
  -> 不能重复声明
  -> 可以重新赋值
  -> 适合会变化的变量

const
  -> 块级作用域
  -> 有暂时性死区
  -> 不能重复声明
  -> 不能重新赋值
  -> 适合常量和不重新赋值的引用
```

> `var`、`let`、`const` 都可以声明变量，但它们在作用域、变量提升、重复声明和是否可重新赋值上有明显区别。`var` 是函数作用域，会发生变量提升，并且声明前访问是 `undefined`，它还允许重复声明，在浏览器全局作用域下会挂载到 `window` 上，所以容易造成变量污染和意外覆盖。
>
> `let` 和 `const` 是 ES6 引入的块级作用域声明，只在当前 `{}` 中有效。它们也会提升，但存在暂时性死区，在声明前访问会直接报错，并且同一作用域内不能重复声明。区别是 `let` 可以重新赋值，适合计数器、分页页码、loading 状态这类会变化的变量；`const` 不能重新赋值，适合接口地址、配置对象、函数引用、数组处理结果等不会重新赋值的变量。
>
> 需要注意的是，`const` 限制的是变量绑定不能变，不代表对象内容不能变。比如 `const obj = {}` 后，`obj.name = 'Tom'` 是可以的，但 `obj = {}` 不行。实际开发里我一般遵循“默认用 `const`，需要重新赋值时用 `let`，尽量不用 `var`”这个原则，这样可以减少作用域污染和变量被误改的问题。
>

## 类型转换机制

javascript是动态类型语言，这意味着变量类型可以在运行时候改变。类型转换`type conversion`主要包括 **显式**类型转换和**隐式**的类型转换（`JavaScript`引擎自动完成）

### 显式类型转换
    - **转为数字number**，主要用`Number()`

```javascript
console.log(Number("123"));     // 123
console.log(Number("hello"));   // NaN (Not a Number)
console.log(Number(true));      // 1
console.log(Number(false));     // 0
console.log(Number(null));      // 0
console.log(Number(undefined)); // NaN
```

    - `**parseInt()**`** 和 **`**parseFloat()**`: 主要用于将字符串转换为整数或浮点数。会解析字符串直到遇到非数字字符，并返回已解析的数字部分  

```javascript
console.log(parseInt("123abc")); //123
console.log(parseInt("3.14abc"));//3
console.log(parseInt("abc123"));//NaN
console.log(parseFloat("abc123"));//NaN
console.log(parseFloat("3.14abc"));//3.14 
console.log(parseInt("    10     ")); // 忽略前后空格
```

+ **转为字符串string**
    - 利用`String()`方法可以将任何类型转为字符串

```javascript
console.log(String(123));        // "123"
console.log(String(true));       // "true"
console.log(String(null));       // "null"
console.log(String(undefined));  // "undefined"
console.log(String({}));         // "[object Object]"
console.log(String([]));          // ""
```

    - 除了null和undefined之外，其他类型都可以利用`.toString()`方法转为字符串

```javascript
console.log((123).toString());       // "123"
console.log(true.toString());        // "true"
console.log([1, 2, 3].toString());   // "1,2,3"
```

+ **转为布尔Boolean**
    - 利用Boolean()方法

```javascript
console.log(Boolean(1));       // true
console.log(Boolean(0));       // false
console.log(Boolean("hello")); // true
console.log(Boolean(""));      // false
console.log(Boolean(null));    // false
console.log(Boolean(undefined)); // false
console.log(Boolean(NaN));     // false
console.log(Boolean({}));      // true
console.log(Boolean([]));       // true
```

        * 注意：`false`,`0`,`-0`,`0n`（BigInt 零）,`null`,`undefined`,`NaN`，`""`会被认为是假的值，其余都为真

### 隐式类型转换
隐式类型转换主要是发生在操作符两边的类型不同的时候， 隐式类型转换是 `JavaScript` 引擎在执行代码时自动进行的  

+ 加法运算符`+`

```javascript
console.log("5" + 5);   // "55" (数字 5 转换为字符串 "5")
console.log(5 + "5");   // "55" (数字 5 转换为字符串 "5")
console.log("hello" + true); // "hellotrue"
```

+ 其他运算符，例如`*`，`-`，`/`

```javascript
console.log("10" - 5);   // 5 ("10" 转换为数字 10)
console.log("10" * "2"); // 20 ("10" 和 "2" 转换为数字 10 和 2)
console.log("10" / "a"); // NaN ("a" 无法转换为数字)
console.log("5" * true); // 5 (true 转换为 1)
```

+ 比较运算符`==`, `>`, `<`, `>=`, `<=` 

```javascript
console.log(5 == "5");   // true (字符串 "5" 转换为数字 5)
console.log(0 == false); // true (false 转换为 0)
console.log(null == undefined); // true (特殊规则)
console.log(null == 0);  // false
console.log("" == false); // true

// >
console.log("10" > 5);   // true ("10" 转换为数字 10)
console.log("2" < "10"); // false (字符串按字典顺序比较，"2" 大于 "1")
```

+ 逻辑运算符`&&`，` || `
    - 需要注意的是：**这些运算符不直接进行类型转换，而是返回操作数之一的原始值**。会根据操作数的真假性来决定返回哪个值。

```javascript
console.log(true && "hello"); // "hello" (返回第二个真值)
console.log(false || "world"); // "world" (返回第一个真值)
console.log(0 || "default");   // "default"
console.log("hello" && 0);     // 0
```

+ 一元加号 (+) 和一元减号 (-)一元加号:,类似于 Number() 函数，尝试将操作数转换为数字

```javascript
console.log(+"123");     // 123
console.log(+"hello");   // NaN
console.log(+true);      // 1
```

## == 与 ===

在JavaScript中，`==`（相等运算符）和 `===`（严格相等运算符）都用于比较两个值  ，两者最主要的区别就是**是否进行隐式类型转换**

### ==具体
+ 若两者类型相同：**不做任何类型转换**，直接比较——原始值比较值本身（但 `NaN` 不等于自身），对象比较是否**是同一个引用**
+ 两者类型不同
    - `null` 和 `undefined`：互相相等，并且**只和彼此相等**（`null == undefined` 为 `true`；`null == 0`、`null == ''`、`undefined == 0` 都是 `false`）
    - 数字与字符串：把字符串转换为数字再比较

```javascript
console.log(10 == "10"); // true ("10" 转换为 10)
```

    - 布尔值，会转为数字`true`为`1`，`false`为`0`

```javascript
console.log(true == 1);  // true (true 转换为 1)
console.log(false == 0); // true (false 转换为 0)
console.log(true == "1"); // true (true 转换为 1, "1" 转换为 1)
```

    - NaN:NaN不等于任何值，包括自己

```javascript
console.log(NaN == NaN); // false
```

### ===具体
`===` 运算符会执行**严格比较**，它**不会进行任何隐式类型转换**。只有当两个值在**值和类型都相同**的情况下，它才返回 `true`,若两者类型不同，直接返回`false`

```javascript
console.log(0 == false);   // true (隐式转换)
console.log(0 === false);  // false (类型不同)

console.log("1" == 1);     // true (隐式转换)
console.log("1" === 1);    // false (类型不同)

console.log(null == undefined); // true (特殊规则)
console.log(null === undefined); // false (类型不同)

console.log(NaN === NaN);  // false
console.log(0 === -0);     // true
```

两个容易被追问的细节（「值和类型都相同就返回 true」的两个例外）：

+ `NaN === NaN` 返回 `false`——`NaN` 不等于任何值，包括它自己
+ `+0 === -0` 返回 `true`——数值比较不区分正负零

> 注意上表里「只有当值和类型都相同时才返回 true」这句是**面向日常使用的简化说法**；严格来说 `NaN === NaN` 是 `false`，判断 `NaN` 要用 `Number.isNaN()` 或 `Object.is()`。

| 特性 | == | === |
| --- | --- | --- |
| 类型转换 | 会进行隐式类型转换 | 不会进行任何类型转换 |
| 比较规则 | 如果类型不同，尝试转换为相同类型再比较 | 只有当值和类型都相同时才返回 true |
| 可预测性 | 较低（可能导致意外行为） | 较高（行为更可预测） |
| 推荐使用 | 不推荐（除非特定且明确的需求） | 强烈推荐（日常开发首选） |

## || 与 && 的返回值

+ ||和&&不仅可以返回布尔值，还能返回操作数本身

### ||
规则如下

1. 对第一个操作数进行条件判断。
2. 如果第一个操作数的条件判断结果为 true，则返回第一个操作数的值
3. 如果第一个操作数的条件判断结果为 false，则返回第二个操作数的值

```javascript
console.log(false || true);       // true
console.log(0 || 42);             // 42
console.log('' || 'default');     // "default"
console.log(null || 'fallback');  // "fallback"
console.log(undefined || 'ok');   // "ok"
console.log(false || 0 || 'foo'); // "foo"
console.log('' || 0 || NaN);      // NaN
```

### &&
规则如下

1. 对第一个操作数进行条件判断
2. 如果第一个操作数的条件判断结果为 false，则返回第一个操作数的值
3. 如果第一个操作数的条件判断结果为 true，则返回第二个操作数的值

```javascript
console.log(true && false);       // false
console.log(42 && 0);             // 0
console.log('foo' && 'bar');      // "bar"
console.log('hello' && 123);      // 123
console.log(true && 'ok');        // "ok"
console.log(1 && 2 && 3);         // 3
console.log('' && 'fallback');    // ""
console.log(null && 'should not reach'); // null
```

总结：

`||`：返回第一个真值，或者全为假返回最后一个操作数

`&&`：返回第一个假值，或者全为真返回最后一个操作数

## 包装类型

+ 简单来说就是让基本数据类型提供一个特殊的对象，使其可以访问对象才有的方法和属性

### 包装类型的运作机制
在原始类型尝试访问属性或方法，`JavaScript`引擎会执行如下步骤

1. **创建临时的包装对象**，例如对于"hello"，创建一个`String`类型的包装对象
2. **执行属性/方法**：在这个临时包装对象执行对应属性or方法，例如`toString()`,`toUpperCase()`
3. **销毁临时包装对象**：操作完成后，临时包装对象立即销毁

### 包装类型
1. `String`
+  示例：`"hello".length` 会创建一个临时的 `new String("hello")` 对象，然后访问其`length` 属性  
2. `Number`
+  示例：`(123.123).toFixed(2)` 会创建一个临时的 `new Number(123.123)` 对象，然后调用其 `toFixed` 方法  

```javascript
 let num=123.123
console.log(num.toFixed());//123
```

3. `Boolean`
+  示例：`true.valueOf()` 会创建一个临时的 `new Boolean(true)` 对象，然后调用其 `valueOf` 方法

## Map 与 Object

1. 键的类型
+ `Object`的键只能是字符串（`string`）或`symbol`,如果用其他类型作键，会被隐式转换为字符串
+ `Map`中的键可以是任意值，包括对象，函数，原始值，`null`,`undefined`,`NaN`。

```javascript
const myMap = new Map();
const key1 = "a";
const key2 = 1;
const key3 = {}; // 对象作为键
const key4= function(){} //函数作为键
const key5=undefined
myMap.set(key1, "value1");
myMap.set(key2, "value2");
myMap.set(key3, "value3");
myMap.set(key4, "value4"); 
myMap.set(key5, "value5"); 
console.log(myMap); 
//{"a" => "value1"} {1 => "value2"} {Object => "value3"} {function(){} => "value4"} {undefined => "value5"}
```

2. 键值对的顺序
+ `Object` 中的数字键按升序排列，其他键按照插入顺序排列
+ `Map` 中的键值对始终按照插入顺序存储
3. 性能与选型
+ **不要背「Map 一定比 Object 快」或反过来的结论。** 真实性能取决于数据规模、具体操作（读多还是写多、是否频繁删除、是否遍历）、键的类型（整数键 / 字符串键 / 对象键）以及**具体引擎的实现与优化策略**，不存在普适的性能排名。
+ 选型首先看**语义和场景**，性能是次要的验证项：
    - 更适合 `Map`：键是对象 / 函数 / 任意类型；需要频繁增删；需要直接拿集合大小；需要可靠的插入顺序；需要把「键值对集合」本身作为一个数据结构来传递。
    - 更适合 `Object`：表达实体属性、配置项、结构化数据（如 `user`、`options`）；键是字符串且结构固定；需要直接写成字面量或做 JSON 序列化。
+ 需要性能结论时，应该在**真实工作负载**下做基准测试（`performance.now()`、`Benchmark.js`），而不是拿一条通用规律去套。
4. 默认原型
+ `Object`继承自`Object.prototype`，自带许多方法
+ `Map`没有默认原型方法，键值对更加纯净
5. 键值对数量
+ `Object`需要通过手动计算
+ `Map`可以直接通过`size`方法获取键值对数量

```javascript
const myMap = new Map([['a', 1], ['b', 2]]);
console.log(myMap.size); // 2
```

1. 操作方法
+ `Object` 只能通过手动逻辑操作键值对，如 `delete` 删除键
+ `Map` 提供了丰富的方法（如 `set`、`get`、`has`、`delete`、`clear`），操作更方便

```javascript
const myMap = new Map();
const key1="a"
const key2=1

myMap.set(key1,"value1")
myMap.set(key2,"value2")

console.log(myMap.get(key1));//value1
console.log(myMap.has(key1));//true
myMap.delete(key2)
console.log(myMap); //'a' => 'value1'
myMap.clear() //清除所有键值对
console.log(myMap);//{size: 0}
```

## 数组常用方法

从`增删改查`，`排序sorting`，`迭代iteration`几个角度回答

### 增
+ `push(）`:
    - 在**数组末尾**添加一个元素
    - 返回值：新数组的长度
    - 特点：修改原数组

```javascript
let fruits = ['apple', 'banana'];
fruits.push('orange', 'grape'); // 添加 'orange', 'grape'
console.log(fruits); // ['apple', 'banana', 'orange', 'grape']
console.log(fruits.push("pineapple")) //5 数组长度
```

+ `unshift()`
    - 在**数组开头**添加一个元素或多个
    - 返回值：新数组的长度
    - 特点：修改原数组

```javascript
let numbers = [3, 4];
numbers.unshift(1, 2); // 添加 1, 2
console.log(numbers); // [1, 2, 3, 4]
console.log(numbers.unshift(5)) //5
```

+ `splice (startIndex,deleteCount,item1,....itemN)`
    - 作用：非常灵活，可以在指定的位置插入元素，将`deleteCount`设置为0，提供要添加的item
    - 返回：一个被包含删除元素的数组（这里为空数组）
    - 特点：修改原数组

```javascript
let colors = ['red', 'green', 'yellow'];
colors.splice(1, 0, 'orange', 'purple'); // 从索引1开始，删除0个，插入 'orange', 'purple'
console.log(colors); // ['red', 'orange', 'purple', 'green', 'yellow']
```

+ `concat(arr1,arr2...arrN)`
    - **作用**：用于合并两个或多个数组，或向数组添加值，并返回一个**新数组**。
    - **返回值**：一个包含所有合并后元素的新数组。
    - **特点**：**不修改原数组**

```javascript
let arr1 = [1, 2];
let arr2 = [3, 4];
let newArr = arr1.concat(arr2, 5, [6, 7]); // 可以合并数组和单个值,
// splice 插入数组时不会展开，会把整个数组作为一个元素插入
console.log(newArr);  // [1, 2, 3, 4, 5, 6, 7]
console.log(arr1);    // [1, 2] (原数组未变)
```

### 删
+ pop()
    - **作用**：删除并返回数组的**最后一个**元素。
    - **返回值**：被删除的元素。如果数组为空，返回 `undefined`。
    - **特点**：修改原数组

```javascript
let fruits = ['apple', 'banana', 'orange'];
let lastFruit = fruits.pop(); // 删除 'orange'
console.log(fruits);     // ['apple', 'banana']
console.log(lastFruit);  // 'orange'
```

+ `shift()`
    - 作用：删除并返回数组**第一个**元素
    - 返回值：被删除的元素。如果数组为空，返回 `undefined`
    - 特点：修改原数组

```javascript
let fruits = ['apple', 'banana', 'orange'];
let lastFruit = fruits.shift(); // 删除 'apple'
console.log(fruits);     // ['banana', 'orange']
console.log(lastFruit);  // 'apple'
```

+ `splice(startIndex,deleteCount)`
    - 作用：从指定位置**删除**指定数量的元素
    - 返回值：返回一个数组，包含的是被删除了的元素
    - 特点：修改原数组

```javascript
let colors = ['red', 'green', 'blue', 'yellow'];
let removed = colors.splice(1, 2); // 从索引1开始删除2个元素 ('green', 'blue')
console.log(colors);  // ['red', 'yellow']
console.log(removed); // ['green', 'blue']
```

### 改
+ `splice (startIndex,deleteCount,item1,....itemN)`
    - 原理：指定位置先删除`deleteCount`个元素，然后进行插入

```javascript
let colors = ['red', 'green', 'blue'];
let replaced = colors.splice(1, 1, 'orange'); // 从索引1删除1个 ('green')，然后插入 'orange'
console.log(colors);   // ['red', 'orange', 'blue']
console.log(replaced); // ['green']
```

### 查
+ `indexOf(searchElement,fromIndex)`
    - 作用：返回`searchElement`在数组的**第一次**索引
    - 特点：使用严格的`===`进行比较

```javascript
let numbers = [10, 20, 30, 20, 40];
console.log(numbers.indexOf(20)); // 1
console.log(numbers.indexOf(50)); // -1
console.log(numbers.indexOf("10")); // -1
```

+ `lastIndexOf(searchElement, fromIndex)`
    - 作用：返回 `searchElement` 在数组中**最后一次出现**的索引
    - 返回值：元素的索引。如果未找到，返回 `-1`
    - 特点：使用严格相等（`===`）比较

```javascript
let numbers = [10, 20, 30, 20, 40];
console.log(numbers.lastIndexOf(20)); // 3
```

+ `includes(valueToSearch,fromIndex)`
    - 作用：判断数组是否包含某个值
    - 返回：`true`/`false`
    - 特点：使用 `SameValueZero` 比较——和 `===` 很接近（`+0` 与 `-0` 视为相等），**但认为 `NaN` 等于 `NaN`**。这也是它和 `indexOf` 的关键区别：`indexOf` 用的是 `===`，所以 `[NaN].indexOf(NaN)` 永远是 `-1`

```javascript
let numbers = [1, 2, 3, NaN];
console.log(numbers.includes(2));   // true
console.log(numbers.includes(5));   // false
console.log(numbers.includes(NaN)); // true（SameValueZero）
console.log(numbers.indexOf(NaN));  // -1（===，判断不了 NaN）
```

+ `find(callback(element,index,array))`
    - 作用：返回数组中满足提供函数条件的**第一个元素值**
    - 返回值：匹配到的元素，没有返回undefined
    - 特点：不修改原数组

```javascript
let users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
let foundUser = users.find(user => user.name === 'Alice');
console.log(foundUser); // { id: 1, name: 'Alice' }
```

+ `findIndex(callback(element, index, array))`
    - 作用：返回数组中满足提供的测试函数的**第一个元素的索引**
    - 返回值：匹配元素的索引。如果没有找到，返回 `-1`
    - 特点：不修改原数组

```javascript
let users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
let foundUser = users.findIndex(user => user.name === 'Alice');
console.log(foundUser); // 0
```

+ 提取数组`slice(startIndex,endIndex)`
    - 作用：从数组中提取一个部分，返回**创建一个新的数组**
    - 特点：不会修改原数组
    - 注意：**起始下标和终止下标的区间是 左闭右开 [ a ，b) 能取到起始，取不到终止，**终止下标 默认值 `length`,可以接收负数,(倒着数)

```javascript
let fruits = ['apple', 'banana', 'orange'];
let subFruits=fruits.slice(1)//['banana', 'orange']
let subFruits2=fruits.slice(1,2)//['banana']
console.log(fruits);//['apple', 'banana', 'orange'];
```

+ `fill(value, start, end)`
    - 作用：用指定值填充数组区间，**修改原数组**，例如 `[1, 2, 3].fill(0)` → `[0, 0, 0]`
### 排序
+ `sort()`
    - 默认排序根据**字符串Unicode编码**进行排序

```javascript
let arr=[1,2,3,4,5,10,20]
arr.sort()
console.log(arr);//[1, 10, 2, 20, 3, 4, 5]
//10的第一个码点"1"小于"2"的码点，故会排在前面
```

    - 若要进行数值排序，需要传入比较函数 `compareFn(a, b)`，**由它的返回值决定 a、b 谁在前**：
        * 返回值 **小于 0**：`a` 排在 `b` **前面**
        * 返回值 **大于 0**：`a` 排在 `b` **后面**
        * 返回 `0`：两者相对顺序保持不变（现代引擎的 `sort` 是稳定的）
        * 所以 `(a, b) => a - b` 是升序，`(a, b) => b - a` 是降序
        * 也可以按对象属性排序，例如 `(a, b) => a.click - b.click`

```javascript
let arr=[4,3,8,1,5,30,50]
arr.sort((a,b)=>a-b) //升序  [1, 3, 4, 5, 8, 30, 50]
arr.sort((a,b)=>b-a)//降序  [50, 30, 8, 5, 4, 3, 1]
```

### 迭代

> 迭代方法（`forEach` / `map` / `filter` / `reduce` / `some` / `every`）的对比详见 [数组高阶方法](#数组高阶方法) 一节。

## 数组高阶方法

| 方法 | 返回值 | 是否修改原数组 | 能否中途跳出 | 典型用途 |
| --- | --- | --- | --- | --- |
| `forEach` | `undefined` | 否 | 不能（`return` 只跳过当前项，`break` 无效） | 遍历执行副作用（打印、请求） |
| `map` | 新数组，长度与原数组一致 | 否 | 不能 | 一对一映射，转换每个元素 |
| `filter` | 新数组，只含满足条件的元素 | 否 | 不能 | 按条件筛选 |
| `reduce` | 任意值（累加结果） | 否 | 不能 | 累加、求和、拍平、转对象 |
| `reduceRight` | 任意值（从右往左累加） | 否 | 不能 | 从右向左累加 |
| `flatMap` | 新数组，先 map 再拍平一层 | 否 | 不能 | 映射后拍平（如一句拆多词） |
| `some` | `boolean` | 否 | 命中即返回 `true`（短路） | 判断是否存在满足条件的项 |
| `every` | `boolean` | 否 | 不满足即返回 `false`（短路） | 判断是否全部满足条件 |
| `find` | 第一个满足条件的元素，找不到返回 `undefined` | 否 | 命中即返回（短路） | 查找单个元素 |
| `findIndex` | 第一个满足条件的索引，找不到返回 `-1` | 否 | 命中即返回（短路） | 查找单个元素索引 |

- 顺带把全部常用数组方法按“是否修改原数组”归类：

| 类别 | 方法 |
| --- | --- |
| 修改原数组 | `push` `pop` `shift` `unshift` `splice` `sort` `reverse` `fill` `copyWithin` |
| 不修改（返回新数组） | `map` `filter` `flat` `flatMap` `slice` `concat` |
| 不修改（返回查找结果） | `find` `findIndex` `indexOf` `lastIndexOf` `includes` `some` `every` |
| 不修改（返回其他值） | `reduce` `reduceRight`（任意值）、`forEach`（`undefined`）、`join`（字符串） |

- `forEach` 能否改变数组，分三种情况：

```javascript
const arr = [1, 2, 3];

// 1. 基本类型：改参数不影响原数组
arr.forEach((item) => {
  item = item * 10; // 改的是形参副本，原数组不变
});
console.log(arr); // [1, 2, 3]

// 2. 引用类型整体替换：不影响原数组
const objs = [{ n: 1 }, { n: 2 }];
objs.forEach((item) => {
  item = { n: 999 }; // 重新赋值形参，不影响原数组
});
console.log(objs); // [{ n: 1 }, { n: 2 }]

// 3. 引用类型改内部属性：会影响原数组
objs.forEach((item) => {
  item.n = 999; // 通过引用改内部属性，原数组被改
});
console.log(objs); // [{ n: 999 }, { n: 999 }]
```

- 记忆点：`forEach` 回调拿到的参数是**值的副本**（基本类型）或**引用的副本**（引用类型），所以基本类型改不动、引用类型改内部属性能生效、整体重新赋值不生效；想产生新数组用 `map`，想筛选用 `filter`

> 这几个数组迭代方法我先记它们的返回值：`forEach` 返回 `undefined`，`map` 和 `filter` 返回新数组，`reduce` 返回累加结果，`some` 和 `every` 返回布尔值。它们都不会修改原数组，也都不能用 `break` 中途跳出，区别在 `some` 命中一项就短路返回 `true`，`every` 遇到不满足的就短路返回 `false`。
>
> `forEach` 能否改数组要分情况。回调里拿到的是形参，基本类型改的是副本，不影响原数组；引用类型如果整体重新赋值，也只是改了形参，原数组不变；只有通过引用去改内部属性，比如 `item.n = 999`，才会真正影响原数组。所以我理解它还是回到「赋值和传参传递的都是值」这一点上——基本类型传的是值的副本，对象传的是引用的副本，所以改不动形参本身，但能顺着这个引用改到对象的内部属性。真正要生成新数组我会用 `map`，要筛选用 `filter`，而不是硬用 `forEach` 去改原数组。
>

## 字符串方法

### 查找和检查
+ `indexOf()`,`lastIndexOf()`,`includes()` 用法可以参照数组的用法
+ `startsWith(searchString, position)`： 检查字符串是否以指定的子字符串开头 ，区分大小写， `endsWith(searchString, length)`， 检查字符串是否以指定的子字符串结尾 ，区分大小写

### 提取字符串
+ `slice(startIndex, endIndex)`
+ `substring(startIndex, endIndex)`
    - 提取字符串，但是和slice区别是不支持负数索引，同时如果 `startIndex` 大于 `endIndex`，会自动交换两者  

```javascript
let text = "Apple, Banana, Kiwi";
console.log(text.substring(7, 13)); // "Banana"
console.log(text.substring(13, 7)); // "Banana" (自动交换索引)
console.log(text.substring(7));     // "Banana, Kiwi"
```

+ `substr(startIndex, length)`

### 转换和拼接
+ 转小写，大写` toLowerCase() `, `toUpperCase()`
+ `concat(string1, string2, ..., stringN)`
+ `split(separator, limit)`
    - 将字符串分割为一个字符串数组，
    - `separator`可选，省略则会返回原字符串作为一个元素的数组
    - `limit`限制返回数量

```javascript
let text = "apple,banana,kiwi";
console.log(text.split(","));      // ["apple", "banana", "kiwi"]
console.log(text.split(""));       // ["a", "p", "p", "l", "e", ",", ...] (按字符分割)
console.log(text.split(",", 2));   // ["apple", "banana"]
```

### 替换
+ `replace(searchValue, replaceValue)`替换第一个, `replaceAll(searchValue, replaceValue)`替换所有

### 格式化和修剪
+ `trim()`去除空白字符，返回新字符串
+ `trimStart()` / `trimLeft()` (ES2019 新增 / 别名) ， 删除字符串开头的空白字符  
+ `trimEnd()` / `trimRight()`  (ES2019 新增 / 别名) ，删除字符串末尾的空白字符  

### 其他常用
+  `length ` 
+  `charAt(index)`，返回指定索引位置的字符
+  `repeat(count)`  ， 将字符串重复指定 `count` 次

## typeof 与 instanceof

### typeof
检测一个变量的原始数据类型，返回如下

+ `**"undefined"**`: 如果变量未赋值。
+ `**"boolean"**`: 布尔值。
+ `**"number"**`: 数值。
+ `**"string"**`: 字符串。
+ `**"symbol"**`: Symbol 类型（ES6 新增）。
+ `**"bigint"**`: BigInt 类型（ES2020 新增）。
+ `**"object"**`: 对象（包括数组、`null`、普通对象等）。**这是一个著名的“坑”**：`typeof null` 也返回 `"object"`。
+ `**"function"**`: 函数

特点

+ 主要判断原始数据类型，
+ **但是无法区分具体的引用类型**（`对象，数组，日期，正则` 等），`typeof`直接返回“`object`”
+ **`typeof null === 'object'`**，这是 JavaScript **历史遗留的兼容性行为**，不是一个可以修的 bug。

### 为什么 `typeof null` 是 `"object"`

+ 早期的 JS 实现里，值是用一个**低位类型标记 + 数据**的表示方式，`null` 被设计成**空指针**（整体全 `0`）。而「对象」的类型标记恰好也是 `0`，于是 `null` 的类型标记和对象重合，`typeof null` 就返回了 `"object"`。
+ 这个行为在语言早期就被发布出去了。后来即使发现了问题也**无法修正**，因为改成返回 `"null"` 会破坏大量依赖这个行为的既有代码（比如用 `typeof x === 'object'` 判空的历史代码），所以它作为兼容性行为被**永久保留**至今。

:::warning
不要把「低位标记」当成规范要求

上面这个「低位类型标记 + 全 0 空指针」的说法，是解释这段历史的**常见说法，属于早期引擎的内部实现思路，不是 ECMAScript 规范规定的要求**。

规范里只明确规定了一条：`typeof null` **必须**返回 `"object"`。现代引擎可以用完全不同的内部表示来描述类型（例如 V8 用对象自身的 Map / 隐藏类来描述对象的形状），并不需要真的去读最低几位。
:::

```text
面试口径（两层就够）
  typeof null === 'object'      → 结论必须记住
  历史遗留 + 兼容性，不可修正    → 原因，不要展开成引擎实现考据
```

示例

```javascript
console.log(typeof 10);              // "number"
console.log(typeof "hello");         // "string"
console.log(typeof true);            // "boolean"
console.log(typeof undefined);       // "undefined"
console.log(typeof Symbol('foo'));   // "symbol"
console.log(typeof 10n);             // "bigint"

console.log(typeof {});              // "object"
console.log(typeof []);              // "object" (无法区分数组和对象)
console.log(typeof null);            // "object" (历史遗留问题)
console.log(typeof new Date());      // "object"
console.log(typeof /abc/);           // "object"

console.log(typeof function(){});    // "function"
```

### instanceof
`instanceof` 操作符用于**检测构造函数的 **`**prototype**`** 属性是否存在于实例对象的原型链上**。  简单说就是判断一个对象是否是某个构造函数的实例

特点

+ 主要是判断引用数据类型
+ 基于原型链的检测，如果object原型链上存在constructor.prototype则返回true
+ 无法判断原始数据类型，因为其不存在原型链

```javascript
let arr = [1, 2, 3];
let obj = { a: 1 };
let date = new Date();
let func = function() {};

console.log(arr instanceof Array);    // true
console.log(obj instanceof Object);   // true
console.log(date instanceof Date);    // true
console.log(func instanceof Function); // true

console.log(arr instanceof Object);   // true (因为数组的原型链上也有 Object.prototype)
console.log(date instanceof Object);  // true

// 原始类型不能用 instanceof
console.log(10 instanceof Number);    // false
console.log("hello" instanceof String); // false
```

## 如何判断数组

1.`Array.isArray`(推荐)

+ 最准确，简洁明了的方法，
+ 缺点：IE8浏览器不支持

```javascript
const arr = [1, 2, 3];
console.log(Array.isArray(arr)); // true
```

2. `instanceof Array`

+ `instanceof` 运算符用于检测构造函数的 `prototype` 属性是否存在于实例对象的原型链上  

```javascript
const arr = [1, 2, 3];
console.log(arr instanceof Array); // true
```

3.`Object.prototype.toString.call()`

+ 通用的方法，可以用于判断其他的内置对象类型（ 如 `"[object Function]"`, `"[object Date]"`, `"[object RegExp]"` 等  ）

```javascript
const arr=[1,2,3]
    const obj={}
    const date=new Date()
    const regExp=new RegExp()

    console.log(Object.prototype.toString.call(arr)); //[object Array]
    console.log(Object.prototype.toString.call(obj)); //[object Object]
    console.log(Object.prototype.toString.call(date));//[object Date]
    console.log(Object.prototype.toString.call(regExp));//[object RegExp]
```

## for...in 与 for...of

- `for...in` 遍历对象的**可枚举属性键**（含原型链上的可枚举属性），返回的是**字符串 key**
- `for...of` 遍历**可迭代对象**（数组、字符串、Map、Set、类数组）的**元素值**，依赖 `Symbol.iterator`

```javascript
// for...in 遍历对象
const obj = { a: 1, b: 2 };
for (const key in obj) {
  console.log(key, obj[key]); // 'a' 1, 'b' 2
}

// for...of 遍历数组
const arr = ['x', 'y'];
for (const val of arr) {
  console.log(val); // 'x', 'y'
}

// for...in 遍历数组拿到的是字符串索引
for (const key in arr) {
  console.log(key, typeof key); // '0' string, '1' string
}

// for...of 不能直接遍历普通对象（没有 Symbol.iterator）
for (const val of obj) {} // TypeError: obj is not iterable
```

- 遍历数组时的关键差异：`for...in` 会遍历到**原型链上的可枚举属性**，`for...of` 不会

```javascript
Array.prototype.last = function () {
  return this[this.length - 1];
};
const list = [1, 2, 3];

for (const key in list) {
  console.log(key); // '0' '1' '2' 'last' ← 连原型上的 last 都打出来
}

for (const val of list) {
  console.log(val); // 1 2 3，不受原型链影响
}
```

- 选型：遍历对象键用 `for...in`（配合 `hasOwnProperty` 过滤原型链），遍历数组/可迭代对象值用 `for...of`

> `for...in` 和 `for...of` 用途完全不同。`for...in` 是遍历对象的可枚举属性键，返回的是字符串 key，而且会沿着原型链把继承来的可枚举属性也一起遍历出来；`for...of` 是遍历可迭代对象的值，依赖 `Symbol.iterator`，数组、字符串、Map、Set 都能用，但普通对象不能直接用。
>
> 遍历数组时的区别最明显：`for...in` 拿到的是字符串索引 `'0'`、`'1'`，如果有人在 `Array.prototype` 上加了可枚举方法，也会被 `for...in` 遍历出来；`for...of` 拿到的直接是元素值，不受原型链影响。所以实际开发里我遍历对象键用 `for...in`（需要时加 `hasOwnProperty` 过滤），遍历数组或可迭代对象的值就统一用 `for...of`。

### 可迭代协议、迭代器与生成器

`for...of` 为什么能用？因为它消费的对象实现了**可迭代协议**。三层关系理顺就够用了：

+ **可迭代对象**：在 `Symbol.iterator` 上提供一个函数，调用它返回一个**迭代器**
+ **迭代器**：有 `next()` 方法，每次返回 `{ value, done }`；`done: true` 表示结束
+ `for...of`、展开运算符 `...`、解构赋值**都走这一套协议**——这也解释了为什么普通对象不能直接用它们（没有 `Symbol.iterator`）

```javascript
// 手写一个可迭代对象：能被 for...of / 展开 / 解构消费
const range = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      },
    };
  },
};

console.log([...range]);              // [1, 2, 3]
for (const n of range) console.log(n); // 1 2 3
const [first, second] = range;
console.log(first, second);            // 1 2
```

**生成器函数 `function*` 就是「写迭代器的语法糖」**：`yield` 负责暂停并产出一个值，`next()` 负责从上一次暂停的地方恢复执行。

```javascript
function* gen(from, to) {
  for (let i = from; i <= to; i++) yield i; // 每次 yield 暂停在这里，下次 next() 从这里继续
}

console.log([...gen(1, 3)]); // [1, 2, 3]

const it = gen(1, 2);
console.log(it.next()); // { value: 1, done: false }
console.log(it.next()); // { value: 2, done: false }
console.log(it.next()); // { value: undefined, done: true }
```

+ **注意区分同步迭代和异步迭代**，这两个不是一回事：
    - **可迭代协议**：`Symbol.iterator` + `next()`，**同步**返回值，配合 `for...of`
    - **异步迭代协议**：`Symbol.asyncIterator`，`next()` 返回 **Promise**，配合 `for await...of`（只能在 `async` 函数或模块顶层使用）
+ 所以 `for...of` 消费不了异步迭代器，必须用 `for await...of`：

```javascript
async function* genAsync() {
  yield 1;
  yield 2;
}
for await (const v of genAsync()) console.log(v); // 1 2
```

**面试追问**

+ 为什么普通对象不能用 `for...of`？→ 它没有实现 `Symbol.iterator`，不是可迭代对象。想遍历可以用 `Object.entries()` / `Object.keys()` 先转成数组。
+ 数组的迭代器产出什么？→ 产出**元素值**（`value` 是元素），不是索引；想要索引可以用 `arr.entries()`（产出 `[index, value]`）。
+ 生成器的价值是什么？→ 用「同步的写法」表达「可暂停、可恢复」的执行流程，同时天然实现了迭代器协议；`async/await` 在历史上就是「生成器 + 自动执行器」这套模式的标准化产物。

## 浮点数精度

问题：进行浮点数计算时候，计算机内部无法正确表示数字，导致计算结果无法精确表示

js中所有数字采用的是64位浮点数格式存储

1. 符号位：1位，正负数
2. 指数位：11位，数字的大小范围
3. 尾数位：52位，表示数字的精确度

 情况：当一个十进制小数转换为二进制表示时，如果它不能被精确地表示为有限位的二进制小数，就会出现**舍入误差**。这就像十进制中 1/3 无法精确表示为有限位小数（0.333...），二进制也存在类似的情况  

经典的就是 0.1+0.2≠0.3

```javascript
console.log(0.1 + 0.2); // 输出: 0.30000000000000004
console.log(0.1 + 0.2 === 0.3); // 输出: false
```

:::info
Tip

如何进行小数的二进制转换（乘2取整法）

+ 小数部分×2，取整数  （只能是 0 或 1）  
+ 乘积的小数部分继续×2取整数部分
+ 终止条件：1.小数部分为0  2.达到所需的二进制精度

例如：0.625

+ `0.625 x 2=1.25 => 取整数 1`
+ `小数部分 0.25x2=0.5  取整数 0`
+ `小数部分0.5x1.0 取整数 1 终止`

得到0.625 => 0.101<sub>2</sub>

:::

0.1用二进制表示是一个无限循环的小数

` 0.0001100110011001100110011001100110011001100110011001101...  `

0.2也是类似

 `0.001100110011001100110011001100110011001100110011001101...  `

二者相加，需要不断的截断舍入，0.1和0.2存储的就不是真实的值，相加就会得到近似值

### 解决办法
1. 将小数转换为整数计算，乘以一个足够大的幂次，转为整数，然后将结果÷回来

```javascript
function accurateAdd(num1, num2) {
    const precision = Math.max(
        (num1.toString().split('.')[1] || '').length,
        (num2.toString().split('.')[1] || '').length
    );
    const multiplier = Math.pow(10, precision);
    return (num1 * multiplier + num2 * multiplier) / multiplier;
}

console.log(accurateAdd(0.1, 0.2)); // 0.3
console.log(accurateAdd(0.123, 0.456)); // 0.579
```

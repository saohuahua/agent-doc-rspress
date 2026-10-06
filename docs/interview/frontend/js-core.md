---
title: JavaScript 核心机制
---

# JavaScript 核心机制

> JS 最核心的运行机制：原型链、this、闭包、深浅拷贝与内存泄漏、事件循环与异步（Promise / async）、函数特性（箭头函数、call/apply/bind）。
>
> 姊妹篇：[JavaScript 语言基础](./js-basics) · [JavaScript 浏览器与工程](./js-browser)

## 原型与原型链

### 原型
+ 每个JavaScript对象都与另外一个对象关联，这个对象就是它的**原型对象，**原型对象充当一个模板，**定义了共享的属性和方法**
+ 访问对象的原型的方法
    - `__proto__`
    -  `Object.getPrototypeOf(具体obj)`

```javascript
function Person(name) {
  this.name = name;
}
const person1=new Person("Alice")
console.log(Object.getPrototypeOf(person1) === Person.prototype); // true
```

+ 特点
    - **共享属性和方法**：通过原型多个实例可以共享一个方法or属性，从而节省内存。例如所有数组实例都会共享其原型`Array.prototype`中的`push()`，`shift()`等方法
    - **实现继承**：也即原型链的思想

### 原型链
+ 当一个对象试图访问一个属性方法，若本身没有该属性or方法，`JavaScript`就会沿着他的原型对象继续往上查找，一直查找到为止。或者查找到原型链的顶端（`null`）、
+ 特点
    - **属性查找机制**：`JavaScript` 通过原型链来实现属性的查找
    - **继承的实现方式**：原型链是 `JavaScript` 中实现继承的基本方式，子对象可以访问父对象原型上的属性和方法
    - **动态性**：原型链上的属性和方法可以在运行时被修改，会影响所有依赖该原型的对象

### `__proto__`和`prototype`
 `prototype` 原型 | 原型对象

+ 1.`prototype`是【**函数**】的一个属性
+ 2.`prototype`是一个【**对象**】
+ 3.创建函数会默认添加`prototype`属性



`__proto__`** 隐式**原型

+ 1.【对象】的属性
+  2.指向其构造函数的prototype
+ 3.`obj.__proto__ === f1.prototype`  true



**原型链顶层：`Object.prototype.__proto__ === null`**

+ `Object.prototype` 是最后一个对象原型，也就是原型链的终点，所以 `Object.prototype.__proto__ === null`

```javascript
 function f1(name) {
      this.name = name;
      this.a = 1;
    }
    f1.prototype.b = 2;
    Object.prototype.c = 3;

    // console.dir(f1.prototype)
    const obj = new f1("xiaoming");
    console.log(obj.__proto__); //指向构造函数f1.prototype
    console.log(obj.__proto__ === f1.prototype); //true
    console.log("obj.a=" + obj.a, "obj.b=" + obj.b, "obj.c=" + obj.c);

    console.log(f1.prototype); //object
    console.log(f1.prototype.__proto__); //指向Object构造函数的prototype
    console.log(Object.prototype.__proto__); //null 到达顶层
```

> 原型是 JavaScript 对象用来共享属性和方法的一种机制。每个对象内部都有一个 `[[Prototype]]` 指向它的原型对象，平时可以通过 `__proto__` 访问。当我们访问一个对象属性时，JS 会先在对象自身查找，如果找不到，就会沿着它的原型继续查找，一直找到 `Object.prototype`，最后到 `null`，这个查找过程就是原型链。
>
> `prototype` 和 `__proto__` 的区别是：`prototype` 是函数上的属性，主要用于构造函数创建实例；`__proto__` 是对象上的属性，指向这个对象的原型。通过 `new` 创建实例时，实例对象的 `__proto__` 会指向构造函数的 `prototype`，也就是 `实例.__proto__ === 构造函数.prototype`。比如 `const p = new Person()`，那么 `p.__proto__ === Person.prototype`。
>
> 从前端角度看，数组的 `map`、`push`，对象的 `hasOwnProperty`，字符串的 `toUpperCase` 等方法，本质上都是通过原型链找到的。原型链的核心价值是方法复用，避免每个实例都重复创建相同的方法。
>

## this 指向

+ 核心结论：**this 指代函数执行时的上下文对象**
+ **重点是看函数是怎么调用**

全局环境中的this，一般指代有两种情况，非严格模式就是`window`，否则就是`undefined`（普通函数也是一样的情况）

构造函数中的`this`

```typescript
function Person(name) {
  this.name = name
}

const p = new Person('Tom')

console.log(p.name) // Tom
```

这里可以理解为 `new Person('Tom')` this指向这个新对象p，new的具体步骤如下

```text
创建新对象
让新对象的 __proto__ 指向构造函数的 prototype
让构造函数中的this指向这个新的对象
执行构造函数
返回新对象
```

+ DOM事件中的 `this`
    - 一般`this`指向绑定该事件的DOM元素

```typescript
button.onclick = function () {
  console.log(this) // button,箭头函数就是外部的this了
}
```

> JS 中的 `this` 可以理解为函数执行时的上下文对象。
>
> **它不是在函数定义时确定的，而是在函数调用时确定的**，所以判断 `this` 不能只看函数写在哪里，而要看函数怎么被调用。
>
> 普通函数直接调用时，非严格模式下 `this` 指向 `window`，严格模式下是 `undefined`；
>
> 如果函数作为对象方法调用，比如 `obj.fn()`，那么 `this` 指向 `obj`；
>
> 如果通过 `new` 调用构造函数，`this` 指向新创建的实例对象；
>
> 如果使用 `call`、`apply`、`bind`，那么 `this` 指向手动绑定的对象；DOM 事件中的普通函数，`this` 通常指向绑定事件的元素。
>
> 另外，箭头函数比较特殊，它没有自己的 `this`，它的 `this` 来自外层作用域，所以不能用 `call`、`apply`、`bind` 改变箭头函数的 `this`。这也是为什么对象方法、Vue Options API 的 methods 一般不建议写箭头函数，但在定时器、Promise 回调、React 类组件方法里，箭头函数又经常用来解决 `this` 丢失问题。
>
> 总体来说，**this 的核心就是：普通函数看调用方式，箭头函数看外层作用域**。
>

## 闭包

**闭包**`closure`是指一个函数能够记住并访问它被创建时所处的词法作用域。换句话说就是该函数可以在其词法作用域以外执行 `=>` **闭包允许你可以在一个内层函数中访问到其外层函数的作用域**

****

先看一个延伸函数中作用域的例子

```javascript
//没有延伸作用域，调用完直接销毁
function f1() {
  let n = 1;
  function f2() {
    console.log(++n);

  }
  f2();
}
f1(); //2
f1(); //2
f1(); //2

```

```javascript
//扩展函数作用域（保留这个词法作用域，让f1()可以实现递增的功能 => 访问外部变量n）
function f1() {
  let n = 1;
  return function f2() {
    console.log(++n);
  };
}
let a = f1();
a(); //2
a(); //3
a(); //4

//函数每次执行会创建新的作用域，独立于a中，不会影响其他的调用
let b=f1()
b()//2
b()//3

```

![画板](https://cdn.nlark.com/yuque/0/2025/jpeg/55783515/1752458462387-e606a3e8-ac14-4f6c-b950-caf24462f25d.jpeg)

```javascript
//类似的，采用嵌套也不会影响，不会出现累加的情况,需要累加m的结果只要返回f3()即可
function f1() {
  let n = 1;
  return function f2() {
    let m=2
    console.log("n="+ (++n));
    function f3(){
      console.log("m="+ (++m));

    }
    f3()
  };
}
let a = f1();
a()//n=2 m=3
a()//n=3 m=3
```



### 使用场景
任何闭包使用的场景无非2点

+ 创建了私有变量
+ 延长变量的生命周期

> 一般函数的词法环境在函数返回后就被销毁，但是闭包会保存对创建时所在词法环境的引用，即便创建时所在的执行上下文被销毁，但创建时所在词法环境依然存在，以达到延长变量的生命周期的目的
>

1.创建私有变量和方法（模块化）

+ ES6之前没有原生支持私有变量的概念，一般就采用闭包实现

```javascript
function createCounter() {
  let count = 0;
  return {
    increment: function () {
      count++;
      console.log(`Count: ${count}`);
    },
    decrement: function () {
      count--;
      console.log(`Count: ${count}`);
    },
    getCount: function () {
      return count;
    },
  };
}
const counter1 = createCounter();
console.log(counter1.count); //undefined
counter1.increment(); // Count: 1
counter1.increment(); // Count: 2
counter1.decrement(); // Count: 1
console.log(counter1.getCount()); //1
```

2.柯里化函数

+ 柯里化函数接受多个参数函数转换为一系列接受一个参数的函数

```javascript
function add(x) {
  return function(y) {
    return x + y;
  };
}

const add5 = add(5); //返回函数 function(y){return 5+y}
console.log(add5(10)); // 15
console.log(add(2)(3)); // 5
```

+ 一个典型的例子是根据柯里化传递的不同字段参数进行排序的问题

```javascript
const list = [
  {
    title: "1",
    click: 10,
    price: 15,
  },
  {
    title: "2",
    click: 30,
    price: 13,
  },
  {
    title: "3",
    click: 2,
    price: 35,
  },
  {
    title: "4",
    click: 9,
    price: 14,
  },
];

function orderByField(field) {
  return function (a, b) {
    return a[field] > b[field] ? 1 : -1;
  };
}

let orderListByprice=list.sort(orderByField('price')) //根据price字段排序
console.table(orderListByprice)
```

### 内存泄漏问题
首先明确，正确的闭包并不会导致内存泄漏，**内存泄漏的发生通常是因为闭包的错误使用**。 导致本应被垃圾回收的变量或对象持续被引用，从而无法被释放 

+ 要了解闭包产生的内存泄漏，需要了解**垃圾回收机制**（见内存泄漏章节），采用标记-清除的垃圾回收算法，闭包延长了词法作用域，也即被持续标记了，而不会被清除回收

闭包产生的内存泄漏的场景

1. DOM元素的引用： 在闭包中引用了 DOM 元素，并且这个闭包的生命周期比 DOM 元素本身更长，那么即使 DOM 元素从页面上被移除，它仍然会因为闭包的引用而留在内存中  

```javascript
function attachEvent() {
  const element = document.getElementById('my-button');
  // 闭包，引用了外部作用域的 element
  element.onclick = function() {
    // 回调闭包引用外部作用域的 element，导致其无法被垃圾回收
    element.textContent = 'clicked';
  };
}
// 执行 attachEvent，即使 my-button 元素之后被 remove()，它所占用的内存也不会被释放。
attachEvent();
```

解决办法： 在不需要时，手动解除引用或移除事件监听器

```javascript
element.onclick = null;
  // 或者
element.removeEventListener('click', handler);
```

## 浅拷贝与深拷贝

深浅拷贝主要是针对JS中的引用数据类型(`object`，`array`，`function`，`date`，`map`，`set`等)

### 浅拷贝
+ 核心思想：只复制对象或数组的第一层。
    - 若对象/数组内部属性为原始数据类型，这些值会被直接复制
    - 若对象/数组内部属性为引用数据类型，那复制的是其**引用地址**

```javascript
const obj1 = {
  name: 'Tom',
  address: {
    city: 'Beijing'
  }
}

// 浅拷贝：obj2 是新对象（地址是新的），但嵌套属性 address 与原对象指向同一份引用
const obj2 = { ...obj1 }
```

```text
obj1 -------> 地址A
                |
                | address
                ↓
               地址C

obj2 -------> 地址B
                |
                | address
                ↓
               地址C
```

```javascript
obj2.name = 'Jerry'
obj2.address.city = 'Shanghai' // 修改嵌套属性，影响原对象

console.log(obj1.name) // Tom
console.log(obj1.address.city) // Shanghai
```

+ 表现为
    - 复制后的新对象与原对象有不同的内存地址
    - 新对象中的原始数据类型：是原对象的副本，**修改不会影响原对象**
    - 新对象中的引用数据类型：与**原对象指向同一个内存地址，**这意味着修改一个会影响另外一个
+ 一些浅拷贝的方法包括 `Object.assign()`，展开运算符`...`，`slice()`，`concat()`
    - 这里需要提到一下对解构赋值`let {name}=obj`的区别

```javascript
const original = {
  name: 'Alice',
  age: 30,
  hobbies: ['reading', 'coding'],
  address: {
    city: 'New York',
    zip: '10001'
  }
};

//1.Object.assign()
const shallowCopy1 = Object.assign({}, original);
shallowCopy1.age = 31; // 修改age,原对象不会改变
shallowCopy1.hobbies.push('swimming'); // 修改引用类型属性的内部内容，原对象改变
console.log('original:', original);
console.log('shallowCopy1:', shallowCopy1);

//2.展开运算符...
const shallowCopy2 = { ...original }; // 适用于对象
shallowCopy2.name = 'Bob'; // 修改原始类型属性，原对象不会改变
shallowCopy2.hobbies.pop(); // 修改引用类型属性，原对象改变
shallowCopy2.address.zip = '90210';//原对象改变
console.log('original:', original);
console.log('shallowCopy2:', shallowCopy2);

//3.展开运算符解构赋值let {name}=obj的区别
const { hobbies } = original;
const shallowCopyArr = [...original.hobbies]; 
shallowCopyArr.push('dancing')// 展开运算符生成的新数组，不会影响原对象
hobbies.push('running')//解构赋值指向原对象的hobbies，会改变原对象
console.log(original);
```



**浅拷贝实际使用场景**

更新数组的某项状态，触发视图更新，更重要的一点就是**方便初始管理状态(不可变更新)**

```typescript
list.value = list.value.map(item =>{
  if(item.id === id){
    return {
      ...item,
      status:1
    }
  }
  return item 
})
```

`{...item}`使用浅拷贝，同时返回的是一个新对象，不会修改原来数组的对象

### 深拷贝
+ 核心思想：**递归复制对象/数组的所有层级**， 它不仅复制第一层的属性值，还会为所有嵌套的引用类型属性创建独立的副本，直到所有层级都被完全复制  
+ 表现
    - 复制后的新对象与原对象：不同内存地址
    - 新对象中所有属性：无论是原始类型还是引用类型，都是原对象中对应属性的**独立副本**
    - **修改新对象中的任何属性：都不会影响原对象，反之亦然  **
+ 深拷贝的方法
    - `_.cloneDeep()`，`lodash`库中的函数
    - ` JSON.parse(JSON.stringify(obj))`
    -  `structuredClone()` 
    - `手写循环递归`

```javascript
const original = {
  name: 'Alice',
  age: 30,
  hobbies: ['reading', 'coding'],
  address: {
    city: 'New York',
    zip: '10001'
  }
};

//JSON.parse(JSON.stringify())
const deepClone = JSON.parse(JSON.stringify(original));
deepClone.age=31//不影响原对象
deepClone.hobbies.push("running")// 深拷贝，不影响原对象
console.log(deepClone);
console.log(original);
```

+ 注意： `JSON.parse(JSON.stringify(obj))`缺点无法处理`函数`，`undefined`，`symbol`值（转换过程会丢失），`RegExp`，`Date`，`Map`等ES6结构

**深拷贝实际使用场景**

表单编辑页避免污染原数据

例如对于用户数据进行编辑的时候，如果直接这样

```typescript
const row = {
  id: 1,
  name: 'Tom',
  roles: [
    { id: 1, name: 'admin' }
  ]
}

//❌ 错误：直接引用 编辑属性直接赋值，指向的是同一个地址
form.value = row 
  
<input v-model="form.name" />
// 此时修改row的某个属性，由于指向同一处地址，同一个对象，就会造成源数据也发生变化
// 此时就会出现编辑本应该是草稿状态，但是缺影响源表单数据
form.value.name = 'Jack'


// ✅ 深拷贝 两者都是新的对象，就不会影响源对象
form.value = structuredClone(row)
```

**深浅拷贝的具体使用参考**

```text
只修改第一层字段：浅拷贝
需要隔离嵌套对象：深拷贝
只修改某个嵌套字段：拷贝到那一层即可，不一定全量深拷贝
数据量很大：尽量避免频繁深拷贝
```

| 对比点 | 浅拷贝 | 深拷贝 |
| --- | --- | --- |
| 拷贝层级 | 只拷贝第一层 | 递归拷贝所有层级 |
| 基本类型属性 | 会复制值，互不影响 | 会复制值，互不影响 |
| 引用类型属性 | 复制引用地址，嵌套对象仍然共享 | 复制新的对象，嵌套对象也独立 |
| 修改第一层属性 | 一般不会影响原对象 | 不会影响原对象 |
| 修改嵌套对象属性 | 可能影响原对象 | 不会影响原对象 |
| 性能成本 | 较低，速度快 | 较高，数据越复杂成本越大 |
| 常见方法 | 展开运算符、`Object.assign()`、`slice()`、`concat()` | `structuredClone()`<br/>、`JSON.parse(JSON.stringify())`<br/>、`lodash.cloneDeep()` |
| 适用场景 | 对象结构简单，只改第一层 | 数据层级复杂，需要完全隔离 |


> 浅拷贝和深拷贝主要是针对对象、数组这种**引用类型**来说的。
>
> 浅拷贝只拷贝对象的第一层属性，如果属性是基本类型，那新旧对象互不影响；但如果属性是对象或数组，拷贝的还是引用地址，所以修改嵌套对象时，可能会影响原对象。
>
> 深拷贝则是把对象内部的嵌套结构也递归复制一份，新对象和原对象在各个层级上都是独立的，修改新对象不会影响原对象。
>
> 我理解它们的关键是看“**嵌套引用有没有被共享**”。比如 `{ ...obj }`、`Object.assign()` 都属于浅拷贝，只适合对象结构比较简单，或者只修改第一层字段的场景。如果是表单编辑、复杂配置备份、弹窗取消回滚这种场景，就需要考虑深拷贝，否则用户还没点保存，编辑表单里的嵌套字段可能已经把表格原数据改掉了。
>
> 在实际 Vue 项目里，我经常会用浅拷贝来处理查询参数、合并组件配置、更新列表中的某一项，比如 `{ ...queryParams.value }` 或 `{ ...item, status: 1 }`。深拷贝更多出现在编辑弹窗里，比如点击表格某一行编辑时，我不会直接 `form.value = row`，因为这样表单和表格行数据指向同一个对象，而是会用 `structuredClone(row)` 或 `cloneDeep(row)` 拷贝一份给表单。这样用户修改表单时不会污染原数据，点取消也能安全回退。实际开发里我不会无脑深拷贝，而是根据数据层级和性能成本判断：只改第一层用浅拷贝，涉及嵌套对象隔离时再用深拷贝。
>

### 手写递归实现
    - 思想：
        * 1.先处理原始数据和null，再处理日期对象，正则表达式等
        * 2.初始化拷贝对象可能是对象 or 数组
        * 3.递归拷贝对象的属性，最后返回深拷贝对象

```javascript
   function deepClone(obj, hash = new WeakMap()) {
      if (obj === null) return obj;
      if (obj instanceof Date) return new Date(obj);
      if (obj instanceof RegExp) return new RegExp(obj);

      // 可能是对象或者普通的值  如果是函数的话是不需要深拷贝，递归的终止条件
      if(typeof obj !=="object") return obj
      //是对象则要进行深拷贝
      if(hash.get(obj)) return hash.get(obj) //处理循环引用
      let cloneObj=new obj.constructor()
     // 找到的是所属类原型上的constructor,而原型上的 constructor指向的是当前类本身
     hash.set(obj,cloneObj)
     for(let key in obj){
      if(obj.hasOwnProperty(key)){
        //实现递归
        cloneObj[key]=deepClone(obj[key],hash)
      }
     }
     return cloneObj


    }

    const obj1 = {
    a: 1,
    b: 'hello',
    c: true,
    d: [1, 2, { e: 3 }],
    f: { g: 'world', h: ['x', 'y'] }
};
const clonedObj1 = deepClone(obj1);
clonedObj1.a=100
clonedObj1.d[0] = 10;
clonedObj1.d[2].e = 30;
clonedObj1.f.g = 'new world';
console.log(clonedObj1);
console.log(obj1);
```



```javascript
/**
 * @param {*} target 要进行深拷贝的源值
 * @param {WeakMap} [map=new WeakMap()] 用于存储已拷贝对象的映射，以处理循环引用
 * @returns {*} 拷贝后的新值
 */
function deepClone(target, map = new WeakMap()) {
    // 1. 处理原始数据类型和 null
    // 如果 target 是 null 或者不是对象类型，直接返回它
    // (因为原始数据类型是按值传递的，无需拷贝；null 也是特殊原始值)
    if (target === null || typeof target !== 'object') {
        return target;
    }

    // 2. 处理日期对象 (Date)
    if (target instanceof Date) {
        return new Date(target);
    }

    // 3. 处理正则表达式对象 (RegExp)
    if (target instanceof RegExp) {
        return new RegExp(target);
    }

    // 4. 处理循环引用
    // 如果 target 已经被拷贝过（在 map 中存在），直接返回之前拷贝过的版本
    // 这避免了无限循环，例如 obj.self = obj
    if (map.has(target)) {
        return map.get(target);
    }

    // 5. 初始化拷贝对象
    // 根据 target 是数组还是普通对象来创建对应的空容器
    const cloneTarget = Array.isArray(target) ? [] : {};

    // 6. 存储已拷贝对象到 map 中，用于处理后续可能出现的循环引用
    // 在递归拷贝其属性之前就存入，确保在子属性引用到它自身时能正确返回
    map.set(target, cloneTarget);

    // 7. 递归拷贝对象的属性或数组的元素
    for (const key in target) {
        // 确保只处理对象自身的属性，排除原型链上的属性
        if (Object.prototype.hasOwnProperty.call(target, key)) {
            // 递归调用 deepClone 来拷贝每个属性的值
            cloneTarget[key] = deepClone(target[key], map);
        }
    }

    return cloneTarget;
}


console.log('--- 测试原始数据类型 ---');
const num = 123;
const clonedNum = deepClone(num);
console.log(`Original: ${num}, Cloned: ${clonedNum}`); // Original: 123, Cloned: 123
console.log(`clonedNum === num: ${clonedNum === num}`); // true (原始类型直接返回，引用地址相同)

console.log('\n--- 测试普通对象和数组 ---');
const obj1 = {
    a: 1,
    b: 'hello',
    c: true,
    d: [1, 2, { e: 3 }],
    f: { g: 'world', h: ['x', 'y'] }
};
const clonedObj1 = deepClone(obj1);

console.log('Original obj1:', JSON.stringify(obj1));
console.log('Cloned obj1:', JSON.stringify(clonedObj1));
```

+ 解析
    - `map=new WeakMap()`,用于处理**循环引用，**`WeakMap`是特殊的`map`，它的键是弱引用（不阻止垃圾回收），这里用途是记录已经拷贝过得对象：_键是原对象，值是拷贝后的新对象_
    - ` map.has(target)/hash.get(obj)`：用于处理循环引用，在创建新的拷贝对象的时候，需要检查`map`是否已经`target`。
        * 若存在，也即这个`target`已经处理过or正在其父级的某个属性被递归拷贝（发生了循环引用），这个时候需要直接返回`map`中存储的该对象的新拷贝，避免无限递归
    - `const cloneTarget = Array.isArray(target) ? [] : {};`：初始化拷贝对象，根据`target`类型，一个外层容器
    - ` map.set(target, cloneTarget); **or**  hash.set(obj,cloneObj)`:存储已拷贝对象`target`和空拷贝容器`cloneTarget`到`map`中去
        * 这一步目的是为了在`target`的任何子属性再次引用`target`自身时，能够及时从`map`中获取到`cloneTarget`的引用，防止再次拷贝

## 内存泄漏

+ 内存泄漏指程序中已经分配的内存，但是这些内存不再被程序需要，但是**又没有被垃圾回收机制(garbage collector)回收**，导致这些内存无法被重新使用。JavaScript中通常是有垃圾回收器，但是由于代码的无意引用，会造成垃圾回收器无法正确判断这块内存是否真的“不再需要”

### 垃圾回收机制
 找到那些程序不再需要的（不可达的）对象，然后释放它们占用的内存，供后续代码重新使用  

垃圾回收的基本原理：**可达性**。垃圾回收器从根(全局对象`window`，nodejs中的`global`)开始查找可达对象

```javascript
let a = { name: "objA" }; // objA 可达 (通过全局变量 a)
let b = { name: "objB" }; // objB 可达 (通过全局变量 b)
a = b;
console.log(a, b);
b = null;
console.log(a, b); // 现在 b 失去引用，但 objB 仍然被 a 引用着，所以 objB 仍然可达
// 此时，objA 已经被垃圾回收器标记为可回收对象
```

垃圾回收算法

+ **引用计数**
    - 原理：当一个对象的引用次数为0，代表这个对象不再需要，可以被回收。每当一个对象被引用，引用计数加1，解除引用，引用计数减1
    - 优点：实现简单，垃圾可以被及时回收
    - 缺点：**无法处理循环引用的问题**,这种方式适用早期IE6,IE7浏览器

```javascript
let obj1 = {};
let obj2 = {};

obj1.prop = obj2; // obj1 引用 obj2 (obj2 引用计数 +1)
obj2.prop = obj1; // obj2 引用 obj1 (obj1 引用计数 +1)

obj1 = null; // obj1 引用计数 -1，变为 1 (因为它还被 obj2.prop 引用)
obj2 = null; // obj2 引用计数 -1，变为 1 (因为它还被 obj1.prop 引用)

// 此时 obj1 和 obj2 互相引用，它们的引用计数都是 1，
// 都不会变为 0，因此都不会被回收，造成内存泄漏。
```

+ **标记-清除**
    - 原理：
        * 标记阶段：垃圾回收器从根对象（全局对象、调用栈上的变量等）开始，递归地遍历所有可达的对象，并将其标记为“活动”（即非垃圾）所有从根无法到达的对象，都被标记为“非活动”（即垃圾）
        * 清除阶段：垃圾回收器遍历堆内存，回收未被标记为“活动”对象所占内存

### 常见的内存泄漏情况
+ 全局变量
    - 隐式全局变量

```javascript
function createLeak() {
    // message 在非严格模式下会成为全局变量 window.message
  // 使用 'use strict' 严格模式 会报错
    message = '这是一个泄漏的字符串，永远不会被回收，除非页面关闭或手动置null。';
}
createLeak();

```

+ 未清除的定时器
    - `setTimeout` 和 `setInterval` 的回调函数如果引用了外部作用域的变量（**闭包**），并且定时器本身没有被清除，那么这些变量（以及整个回调函数的闭包）将永远不会被垃圾回收  

```javascript
var someResource = getData();
setInterval(function() {
    var node = document.getElementById('Node');
    if(node) {
        // 处理 node 和 someResource
        node.innerHTML = JSON.stringify(someResource);
    }
}, 1000);
//如果 node节点从dom中移除，定时器仍然会存在
//同时由于闭包引用了someResource， someResource仍然会存在
```

+ 没有清理DOM元素的引用

```javascript
let refA = document.getElementById('refA');
document.body.removeChild(refA); // DOM 删除了
console.log(refA, 'refA'); // 但 refA 仍持有引用，还能 console 出整个 div，未被回收
refA = null; // 解除引用
console.log(refA, 'refA'); // null
```




### 可达性判断

```typescript
let obj = { name: 'test' }

// 如果后面 obj 不再被使用
// 并且没有任何地方引用它,obj可以被垃圾回收机制回收
obj = null

//不可回收的例子
const cache = []

function createData() {
  const data = new Array(100000).fill('data')
  cache.push(data)
}
// createData执行完成，但是里面的data仍然被cache引用，所以不会被回收
```

内存泄漏主要就是看**垃圾回收机制中“对象是否可达”，而不是“你是否还需要它”**

+ 也就是自己写的代码会让**无用的对象仍然处于可达状态**

比如一些可达的例子

```text
window
document
全局变量
闭包作用域
当前作用域
DOM引用
定时器回调
事件监听回调
```

只要能访问到，垃圾回收机制就会认为它还活着，不会回收

常见的泄漏场景

+ 定时器没有清除，如果定时器回调还引用了当前组件的相关状态，接口数据等等，就会导致内存无法释放
+ 事件监听没有移除，常见像resize，监听窗口大小，又引用了组件数据，也会造成组件实例无法被释放

```vue
import { ref, onMounted } from 'vue'
const message = ref('hello')
function handleResize() {
  console.log(message.value) 
}

onMounted(() => {
  //没注销事件 window 一直持有handleResize，handleResize闭包引用组件状态message，
  // 造成整个组件作用域 无法被GC
  window.addEventListener('resize', handleResize)
})
```

+ 第三方实例没有被销毁，例如Echarts

```typescript
let chart

onMounted(() => {
  chart = echarts.init(chartRef.value)
})

// 若组件注销没有释放，图表实例可以还保留DOM，事件等
onUnmounted(() => {
  chart.dispose()
})
```

实际项目中如何避免内存泄漏

+ 核心思路就是 清理副作用，解除引用

```typescript
// 常见清理内容
clearTimeout(timer)
clearInterval(timer)
removeEventListener(...)
observer.disconnect()
socket.close()
chart.dispose()
abortController.abort()
```

> 内存泄漏指的是一些业务上已经不再使用的数据，本来应该被释放，但因为代码里仍然保留着引用，导致垃圾回收器无法回收它。
>
> JS 的**垃圾回收**主要是基于**可达性分析**，只要一个对象还能从 `window`、当前调用栈、闭包、DOM、事件回调等地方访问到，就会被认为是活的，不会被回收。所以内存泄漏和垃圾回收的关系是：垃圾回收负责自动释放不可达对象，而内存泄漏通常是因为我们让无用对象仍然保持可达，导致 GC 回收不了。
>
> 实际项目里我遇到比较多的是 Vue 组件中的副作用没有清理，比如页面中使用 `setInterval` 做轮询，组件切走后没有 `clearInterval`，或者监听了 `window.resize`、`scroll` 事件但没有在 `onUnmounted` 里移除。还有像 ECharts、地图、播放器这种第三方实例，如果组件销毁时没有调用 `dispose` 或关闭连接，也可能导致 DOM、事件和数据缓存一直存在。
>
> 所以我一般会把内存泄漏理解成“无用对象仍然被引用”。在 Vue 项目里，重点就是在组件卸载时清理副作用，比如清定时器、移除事件监听、关闭 WebSocket、销毁图表实例、取消请求或者断开大对象引用，这样才能让对象变成不可达，交给垃圾回收器去释放。
>

## 事件循环

+ **事件循环就是 JS主线程不断的从任务队列取任务执行，并在合适的时机清空微任务，更新页面的过程。**

### 为什么需要事件循环？
JavaScript是单线程语言，任何时间点JavaScript引擎只能执行1个任务。如果有一个复杂的网络请求阻塞了主线程加载，整个网页就会冻结，用户体验差，为了解决这个问题，引入了

+ **异步编程**
+ **事件循环**

### 事件循环的核心组件
**堆**`**heap**`**和栈**`**stack**`

+ 堆：内存中存储对象（引用类型）
+ 栈：执行JavaScript代码的地方，准确来说就是同步代码的地方

### 宏任务 微任务
+ **宏任务可以理解成一次完整的异步任务**

常见的宏任务

```text
script 整体代码
setTimeout
setInterval
setImmediate（Node）
I/O 操作
UI 事件，比如 click、scroll
postMessage
MessageChannel
```

需要说明的是，**整个JavaScript脚本本身也是一个宏任务**

微任务

+ 指的是在当前宏任务执行完成之后，立即要执行的任务
+ 常见微任务有:

```text
Promise.then / catch / finally （promise 本身是同步的，回调是异步的微任务）
async await
queueMicrotask
MutationObserver
process.nextTick（Node 中优先级更特殊）
```

微任务特点

+ 当前宏任务执行完之后，会先清空所有微任务，然后再执行宏任务
+ 核心就是微任务一定会在下一个宏任务执行前清空，优先级高于下一个宏任务

**执行优先级： 同步代码 > 微任务 > 宏任务  **

```typescript
console.log('start')

setTimeout(() => {
  console.log('setTimeout')
}, 0)

Promise.resolve().then(() => {
  console.log('promise')
})

console.log('end')
// start end promise settimeout
```

> 事件循环是 JavaScript 处理异步任务的机制。因为 JS 是单线程的，同一时间只能执行一个调用栈里的任务，但浏览器里有定时器、网络请求、DOM 事件、Promise、页面渲染等异步行为，所以需要事件循环来协调同步代码、异步回调和渲染时机。
>
> 它的基本流程是：先执行一个宏任务，比如整体 `script`；执行过程中同步代码直接进调用栈，遇到 `setTimeout`、点击事件这类宏任务就放到宏任务队列，遇到 `Promise.then`、`queueMicrotask` 这类微任务就放到微任务队列。当前宏任务执行完以后，会立即清空所有微任务，微任务清空后浏览器可能进行页面渲染，然后再取下一个宏任务继续执行。
>
> 宏任务常见的有 `script`、`setTimeout`、`setInterval`、DOM 事件、I/O 等；微任务常见的有 `Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`。核心区别是宏任务一次事件循环执行一个，而微任务会在当前宏任务结束后、下一个宏任务开始前全部执行完。所以常见执行顺序是：同步代码先执行，Promise 微任务其次，setTimeout 宏任务最后。
>
> 从前端角度看，事件循环不只是为了理解执行顺序，也会影响页面渲染和性能。如果同步代码或微任务太多，会阻塞渲染，导致页面卡顿；所以实际开发里会用任务拆分、`requestAnimationFrame`、`requestIdleCallback`、Web Worker 等方式优化主线程压力。
>

### 事件循环流程

![](https://cdn.nlark.com/yuque/0/2025/png/55783515/1752546935775-a8f91775-96cb-4397-89ff-55d6874e8854.png)

细分宏任务和微任务之后


![](https://cdn.nlark.com/yuque/0/2025/png/55783515/1752547079036-b225f399-525e-4750-b27d-3c4d6744d2d1.png)

### 事件循环示例

![](https://cdn.nlark.com/yuque/0/2025/png/55783515/1752546798065-7fd06d81-bf05-4eff-983a-687f4df1a8ab.png)

```javascript
new Promise((resolve,reject)=>{
  console.log(4); // 同步代码先执行
  resolve(1)
  new Promise((resolve,reject)=>{
    resolve(2)
  }).then(data=>{console.log(data);})//微任务队列先进入的是resolve(2)的回调，会先执行它
}).then(data=>{console.log(data);})//其次才是resolve(1)的回调
console.log(3);
//输出顺序 4 3 2 1 
```



可以用[https://www.jsv9000.app/](https://www.jsv9000.app/)来具体了解事件循环的执行流程

```javascript
setTimeout(() => {
  console.log(1);

}, 0);

new Promise((resolve,reject)=>{
  console.log(2);
  resolve('p1')

  new Promise((resolve,reject)=>{
    console.log(3);
    setTimeout(() => {
      resolve('setTimeout2') // Promise 早已 resolve，此处不会再生效，属于迷惑项
      console.log(4);
    }, 0);
    resolve('p2')
  }).then(data=>{console.log(data);
                })
  setTimeout(() => {
    resolve('setTimeout1')
    console.log(5);

  }, 0);

}).then(data=>{console.log(data);
              })
console.log(6);
// 输出顺序 2 3 6 p2 p1 1 4 5
```

执行流程参照


![](https://cdn.nlark.com/yuque/0/2025/png/55783515/1752547942327-6c9a4ce2-c157-4bf0-8121-740c26473351.png)

## Promise 常用方法

### `then()`方法
`then()`方法是`promise`原型上的方法（对象方法），用于注册`promise`**状态改变时要执行的回调函数**，当`promise`状态变为`fulfilled`或者`reject`状态，`then()`就会执行

基本语法

+ `promise.then(onFulfilled, onRejected)`
    -  `onFulfilled` 在`resolve`时调用
    - `onRejected`在`reject`时调用

```javascript
const promise=Promise.resolve('success')
promise.then(data=>{console.log(data);})//success

const anotherPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error("数据加载失败!"));
  }, 1000);
});

anotherPromise.then(
  (data) => {
    console.log("成功处理:", data);
  },
  (error) => {
    console.error("失败处理:", error.message); // 1秒后输出: 失败处理: 数据加载失败!
  });
```

`then()`方法的**关键**特性：**返回一个新的**`**Promise**`

+ 这也就解释了为什么可以**链式调用**` .then().then() ` 
+ 如果`onFulfilled` 或 `onRejected`的回调函数返回的是一个**普通值**（非`promise`），那么`then()`返回新的`promise`会以**该返回值作为解决值**

```javascript
Promise.resolve(1)
  .then((value) => {
    console.log(value);
    return value * 2; //返回值2 作为then()返回新的promise的解决值
  })
  .then((newVal) => {
    console.log(newVal); //2
    return newVal + 2; //返回4 作为then()返回新的promise的解决值
  })
  .then((finalVal) => {
    console.log(finalVal); //4
  });
```

+ 如果`onFulfilled` 或 `onRejected`的回调函数返回的是一个**新的**`**promise**`，那么`then()`返回的`promise`会**等待**这个新的`promise`解决或拒绝状态，**并以其最终状态作为自己的状态**

```javascript
Promise.resolve("步骤1完成").then((message) => {
  console.log(message);
  return new Promise((resolve) => {
    resolve("步骤2完成");
  })
    .then((message) => {
      console.log(message);
      return "全部步骤完成";
    })
    .then((finalMessage) => {
      console.log(finalMessage);// 所有步骤完成
    });
});
```

### .catch()方法
 `promise.catch(onRejected)`是 `.then(null, onRejected)`语法糖，专门处理`promise`链式中的错误，通常放在`promise`的**末尾**，作为统一的错误处理入口 

+ 类似的， `.catch()`方法也会返回一个`promise`

```javascript
Promise.reject(' wrong')
  // .then(.....)
  .catch(error => {
    console.log('Caught:', error);
  });
// 输出：Caught: wrong

Promise.resolve()
  .then(() => {
    throw new Error('error1');
  })
  .catch(error => {
    console.log(error.message); //error1
    return 'error2';
  })
  .then(value => {
    console.log(value); //  error2
  });

```

### `.finally()`方法(ES2018)
`promise.finally(onFinally)` 不管 `Promise` 是成功还是失败，`finally()` 回调都会被执行。  

+ 一般被用于执行清理操作， 关闭加载动画、释放资源、记录日志  

```javascript
Promise.resolve('Success')
  .finally(() => {
    console.log('Finally '); // 总会执行
  })
  .then(value => {
    console.log('Value:', value);
  });

// Finally 
// Value: Success

Promise.reject("success")
  .finally(() => {
    throw new Error("final error"); //新的promise变为rejected
  })
  .then((value) => {
    console.log(value); //不会执行
  })
  .catch((error) => {
    console.log(error); //final error
  });
```

### 类方法
`promise.all(iterable)`

+ 作用：等待**所有的promise都成功才会执行回调**，若其中任何一个`promise`失败（`rejected`），则整个`Promise.all`失败
+ iterable：接收一个可迭代对象，里面都元素都是`promise`（普通值也会转为`promise`）
+ 返回值：成功的情况返回的`promise`，解决值是一个**数组**，失败的情况返回的`promise`是**第一个失败的**`**promise**`**拒绝原因**
+ 所有promise**并发执行**

```javascript
const p1 = Promise.resolve("success p1");
const p2 = new Promise((resolve) => {
  resolve("success p2");
});
const p3 = Promise.resolve(true);

Promise.all([p1, p2, p3])
  .then((values) => {
    console.log(values); //['success p1', 'success p2', true]
  })
  .catch((error) => {
    console.log(error);
  });
```



`Promise.allSettled(iterable)` (ES2020)

+ **作用**：等待所有 Promise 都**结算（settled）**，无论它们是成功还是失败，都会返回结果，返回一个新的promise，解决值为一个数组，描述了对应promise的状态

 `Promise.race(iterable)`

+  等待可迭代对象中**第一个** `Promise` 结算（无论是成功还是失败），并以该promise的结果作为自身的解决值
+ 特点：谁先完成状态谁赢

```javascript
const raceP1 = new Promise((resolve) =>
  setTimeout(() => resolve("fast"), 50)
                          );
const raceP2 = new Promise((resolve) =>
  setTimeout(() => resolve("slow"), 100)
                          );

Promise.race([raceP1, raceP2])
  .then((data) => {
    console.log(data); //fast
  })
  .catch((error) => {
    console.log(error);
  });
```

## async / await

`async` 和 `await` 是 JavaScript 中用于处理**异步操作**的两个关键字。它们是 ECMAScript 2017 (ES8) 引入的语法糖，旨在让异步代码看起来和写起来更像同步代码，从而大大提高可读性和可维护性  

+ 本质上就是避免链式调用过深的问题，提升异步流程的可读性，可维护性
+ `async`，`await`和事件循环

```typescript
async function fn() {
  console.log(1) //await前面的代码还是属于同步代码，会优先执行
  await Promise.resolve() // await 之后的代码就属于微任务，同步代码执行完成才会执行微任务
  console.log(2)
}

console.log(3)
fn()
console.log(4)
// 3 1 4 2

tips: await Promise.resolve() 
  console.log(2)
可以理解为
 Promise.resolve().then(()=>{console.log(2)})
```



`async`用于修饰一个函数，表明函数是异步，被`async`修饰的函数总是会**返回一个**`**promise**`

```typescript
async function fn() {
  return 1
}
// 等价于
function fn() {
  return Promise.resolve(1)
}

console.log(fn())
```

+ `async` 函数返回普通值-> `Promise.resolve(value)`
+ `async` 函数抛出**错误**->`Promise.reject(error)`

`**await**`：只能在 `async` 函数内部使用。它会“暂停” `async` 函数的执行，直到一个 `Promise` 被解决 (`resolved`) 或被拒绝 (`rejected`)。然后，`await` 会返回 `Promise` 解决后的值，或者抛出 `Promise` 拒绝后的错误  

需要注意的是

+ async函数内部代码从头到尾执行，直到遇到一个`await`，函数暂停执行， 并将控制权交还给调用者。`await` 后面的代码被放入**微任务队列**中，等待 `Promise` 解决后，再被重新放回执行栈中继续执行  
+ await后面通常跟着一个`promise`对象，如果不是则会立即返回该表达式的值

```text
语法层面
  -> async / await 让异步代码写起来像同步代码

机制层面
  -> async 函数返回 Promise
  -> await 后面的代码会进入微任务

工程层面
  -> 它更适合组织有顺序依赖的异步流程
  -> 但没有依赖的异步任务要用 Promise.all 并行
  -> 错误处理要配合 try...catch

```

> `async / await` 是 Promise 的语法糖，主要是为了让异步代码写起来更像同步代码，避免大量 `.then()` 链式调用。
>
> `async` 用来声明异步函数，**它一定会返回一个 Promise**；如果函数里返回普通值，相当于 `Promise.resolve(value)`，如果抛出异常，相当于返回 `Promise.reject(error)`。
>
> `await` 用来等待一个 Promise 的结果，它只能在 `async` 函数里使用。
>
> 需要注意的是，`await` 并不会阻塞整个 JS 主线程，它只是**暂停当前 async 函数后续代码的执行**。**await 前面的代码是同步执行的**，`await` 后面的代码会在 Promise 状态完成后进入微任务队列，所以它和事件循环里的微任务机制关系很密切。
>
> 在前端开发里，`async / await` 最常用于接口请求、页面初始化、表单提交等异步流程。对于有依赖关系的请求，可以用多个 `await` 串行执行；但如果多个请求之间没有依赖，就应该用 `Promise.all` 并行执行，避免请求瀑布流。错误处理一般配合 `try...catch...finally`，比如请求失败提示用户，最后关闭 loading。总体来说，我理解 `async / await` 不是新的异步机制，而是基于 Promise 的更易读、更适合组织复杂异步流程的写法。
>

## 箭头函数与普通函数

1. 语法不同

```javascript
// 函数声明
function sum(a, b) {
  return a + b;
}

// 函数表达式
const multiply = function(a, b) {
  return a * b;
};

// 箭头函数
// 只有一个表达式，隐式返回
const sum = (a, b) => a + b;

// 只有一个参数，可以省略括号
const double = a => a * 2;

// 没有参数，需要空括号
const sayHello = () => console.log("Hello!");

// 多行代码或需要显式返回时使用花括号和 return
const calculate = (a, b) => {
  const result = a * b;
  return result / 2;
};
```

### 最根本的区别：`this`指向
普通函数的`this`：

+ 对象的方法调用时，this指向改对象
+ 普通函数调用，this在非严格模式下指向全局对象（`window`或`global`）,严格模式就是`undefined`
+ ** **使用 `call()`、`apply()` 或 `bind()` 调用时，`this` 会被显式绑定到传入的第一个参数  
+ 作为构造函数调用，`this`指向新创建的实例

箭头函数的`this`

+ 没有自己的this绑定，但是他会捕获其**定义时**（词法作用域）**的外部**`**this**`，并且永久的继承这个`this`，**也即无论函数在哪里调用，这个**`**this**`**的值都不会再变了**

```javascript
function Person(name) {
  this.name = name;
  this.greet = () => {
    console.log(`Hello, my name is ${this.name}`);  //this 指向person实例
  };
  this.greetLater = () => {
    setTimeout(() => {
      // console.log(`Later, my name is ${this.name}`); // 虽然被定时器包裹，this 指向person实例
      console.log(this);

    }, 1000);
  };
}

const bob = new Person("Bob");
bob.greet(); // 输出: Hello, my name is Bob
bob.greetLater(); // 1 秒后输出 Person 实例（this 继承外层，指向 bob）
```

### arguments对象
普通函数拥有自己的`arguments`对象，包含函数调用时传入的**所有参数**

```javascript
function showArgs() {
  console.log(arguments);
}
showArgs(1, 2, 3); // 输出: [Arguments] { '0': 1, '1': 2, '2': 3 } (或类似数组的对象)
```

+ 箭头函数，**没有**自己的`arguments`对象，如果尝试访问箭头函数内部的`arguments`，会沿着作用域链向上查找，**并且引用外层最近的普通函数的**`**arguments**`**对象，** 如果外层没有普通函数，则 `arguments` 将是未定义的。 当然也可以直接用`...args`剩余参数来访问

```javascript
const showArgsWithRest = (...args) => {
  console.log(args); // 输出: [1, 2, 3]
};
showArgsWithRest(1, 2, 3);
```

### 构造函数constructor
+ 普通函数可以作为构造函数使用，通过new关键字创造新实例
+ 箭头函数不能用作构造函数使用， 箭头函数没有 `[[Construct]]` 内部方法  

```javascript
const Bike = (make) => {
  this.make = make;
};
// const myBike = new Bike("Giant"); // TypeError: Bike is not a constructor
```

### prototype属性
+ 普通函数 有 `prototype` 属性，这个属性用于实现原型继承  
+ 箭头函数**：没有**`prototype` 属性。因为它们不能作为构造函数，所以也就不需要 `prototype` 属性

### 函数声明
+ **箭头函数没有声明提升**
+ 普通函数存在声明提升

```javascript
fn1()//hello

function fn1() {
  console.log('hello')
}


fn2() //error

const fn2 = () => {
  console.log('hello')
}

```

### 适用场景
+ 箭头函数总结就是不需要this的情况，例如

```text
数组方法回调
Promise / async 流程回调
setTimeout / setInterval 回调
不需要 this 的工具函数
需要继承外层 this 的场景
React 函数组件里的事件处理
Vue3 Composition API 里的普通逻辑函数
```

+ 普通函数则需要自己的this，argument，prototype，或者需要调用者动态决定this的情况

```text
对象方法
构造函数
原型方法
需要 arguments 的函数
需要动态 this 的函数
Vue Options API 的 methods / computed / watch / lifecycle
需要 function hoisting 的工具函数
Generator 函数
```

> 箭头函数和普通函数除了 `this` 不同之外，还有几个重要区别。
>
> 普通函数有自己的 `arguments`、`prototype`，可以作为构造函数被 `new` 调用，也可以定义 Generator；而箭头函数没有自己的 `arguments` 和 `prototype`，不能被 `new` 调用，也不能作为构造函数或 Generator。
>
> 普通函数声明还存在函数提升，而箭头函数通常是函数表达式，需要先声明再使用。
>
> 实际使用时，我会根据场景选择。如果是数组方法、Promise 回调、定时器回调，或者希望保留外层 `this`，一般用箭头函数；如果是对象方法、构造函数、原型方法、DOM 事件里需要 `this` 指向元素，或者函数需要根据调用方式动态绑定 `this`，就用普通函数。
>
> 在 Vue 里要特别注意 Options API 和 Composition API 的区别。Options API 中的 `methods`、`computed`、`watch`、生命周期函数不要写箭头函数，因为这些函数里的 `this` 应该指向当前组件实例，箭头函数会导致 `this` 失效；但是在这些普通函数内部，比如 `setTimeout`、`forEach`、Promise 回调里，可以用箭头函数来保留外层组件实例的 `this`。而在 Vue 3 Composition API 里，通常不依赖 `this`，数据通过 `ref`、`reactive` 和闭包管理，所以普通业务函数用箭头函数是比较常见的。
>

## call / apply / bind

`bind`,`call`,`apply`都是函数原型上的方法，**用于改变函数执行时的**`**this**`**指向问题**

示例

```javascript
const name = "Alice";
const person = {
  name: "tom",
  say:function(){
    console.log(this.name);

  }
};
person.say() //tom
setTimeout(person.say, 0); //Alice 
```

`say`放在`setTimeout`中，执行环境是在全局上下文执行，这个时候`this`指向`window`，所以会输出Alice

### call()
**call()会立即执行函数**，并改变函数内部this指向到指定的对象。接受的参数是逐个列举

+ `function.call(thisArg,arg1,arg2.....)`
    - 若`thisArg`为`null`,`undefined`，`this`指向全局对象

```javascript
const name = "Alice";

const person={
  name:'tom'
}
function getName() {
  console.log(this.name);
}
getName.call(person) // tom
getName.call(null)  //Alice this指向的是window
```

### apply()
`apply()` 方法与 `call()` 类似，也会**立即执行**函数，并改变函数内部 `this` 的指向到指定的对象。

但它接受的参数是一个**数组或类数组对象**

+ `function.apply(thisArg,[argsArray])`

```javascript
function fn(...args){
  console.log(this,args);

}
let obj2={
  name:'zs'
}
fn.apply(obj2,[1,2]) //{name:'zs'},[1,2] this 指向obj2 传入参数必须是数组
fn([1,2]) //window,[1,2]
```

### bind()
`bind()`**不会立即执行函数**。它会**返回一个新的函数**，这个新函数的`this`**永远**被绑定到`bind()`中的第一个参数上（`apply()`，`call()`只会临时改变`this`指向一次）

```javascript
function fn(...args) {
  console.log(this, args);
}
let obj = {
  myname: "张三",
};

const bindFn = fn.bind(obj); // this 也会变成传入的obj ，bind不是立即执行需要执行一次
bindFn(1, 2); // this指向obj
fn(1, 2); // this指向window
```

| 特征 | `call()` | `apply()` | `bind()` |
| --- | --- | --- | --- |
| **执行时机** | **立即执行**函数 | **立即执行**函数 | **不立即执行**，返回一个新的绑定函数 |
| **参数传递** | 参数**逐个列举**。 | 参数以**数组或类数组**形式传递。 | 参数**逐个列举**，可以预设部分参数（柯里化） |
| `**this**`** 绑定** | 临时绑定 `this` 并执行 | 临时绑定 `this` 并执行。 | **永久绑定**`this`，返回的新函数不能再改变 `this` |
| **返回值** | 函数的执行结果 | 函数的执行结果 | 一个新的、绑定了 `this` 和预设参数的函数 |
| **主要用途** | 调用函数时，需要精确控制 `this` 和参数 | 调用函数时，参数已在一个数组中 | 创建一个可以重复使用的、固定 `this` 和部分参数的函数 |

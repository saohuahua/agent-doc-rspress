# CSS 基础

## 移动端适配
```latex
1. 设计稿基准：375px 或 750px
2. 基础配置：viewport
3. 主体布局：flex / grid / 百分比
4. 尺寸转换：postcss-px-to-viewport 或 rem
5. 最大宽度：max-width 限制大屏展示
6. 图片：aspect-ratio + object-fit + 懒加载 + 多倍图
7. 底部栏：处理 safe-area
8. 表单页：处理键盘遮挡和 fixed 异常
9. 列表页：虚拟列表或分页加载
10. 多端测试：iOS Safari、Android Chrome、微信 WebView、App WebView
```

## <font style="color:rgb(51, 65, 85);background-color:rgb(250, 250, 250);">盒模型</font>
介绍盒模型之前需要知道盒子的组成部分：

`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">content</font>`<font style="color:rgb(44, 62, 80);">、</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">padding</font>`<font style="color:rgb(44, 62, 80);">、</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">border</font>`<font style="color:rgb(44, 62, 80);">、</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">margin</font>`

+ `<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">content</font>`<font style="color:rgb(44, 62, 80);">：实际内容，显示文本和图像</font>
+ `<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">boreder</font>`<font style="color:rgb(44, 62, 80);">，边框，围绕元素内容的内边距的一条或多条线，由粗细、样式、颜色三部分组成</font>
+ `<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">padding</font>`<font style="color:rgb(44, 62, 80);">，内边距，清除内容周围的区域，内边距是透明的，取值不能为负，受盒子的</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">background</font>`<font style="color:rgb(44, 62, 80);">属性影响</font>
+ `<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">margin</font>`<font style="color:rgb(44, 62, 80);">，即外边距，在元素外创建额外的空白，空白通常指不能放其他元素的区域</font>

<font style="color:rgb(51, 65, 85);background-color:rgb(250, 250, 250);">CSS 的盒模型主要包括以下两种，可通过 </font>[<font style="color:rgb(230, 96, 0);background-color:rgb(250, 250, 250);">box-sizing</font>](https://developer.mozilla.org/zh-CN/docs/Web/CSS/box-sizing)<font style="color:rgb(51, 65, 85);background-color:rgb(250, 250, 250);"> 属性进行配置：</font>

+ `<font style="color:rgb(51, 65, 85);background-color:rgba(0, 0, 0, 0.03);">content-box</font>`<font style="color:rgb(51, 65, 85);background-color:rgb(250, 250, 250);">：默认属性。width 只包含 content</font>
+ `<font style="color:rgb(51, 65, 85);background-color:rgba(0, 0, 0, 0.03);">border-box</font>`<font style="color:rgb(51, 65, 85);background-color:rgb(250, 250, 250);">：width 包含 (content、padding、border)</font>

![画板](https://cdn.nlark.com/yuque/0/2025/jpeg/55783515/1749998687484-3b0c7d0d-b533-49dc-ae00-ae181852c8d1.jpeg)



## CSS 选择器
按照类型区分，有如下：

+ **基础选择器**：类型选择器，类`class`，ID选择器`#`，通配符选择器 `*`
+ **层次选择器**：后代，子（`parent > child`），相邻兄弟（`previous + next`），通用兄弟（`previous ~ sibling`）
+ **属性选择器**：例 `[attr = value]` ，部分属性值选择：<font style="color:rgb(31, 35, 40);background-color:rgb(246, 248, 250);">[attribute^=value]</font>
+ **<font style="color:rgb(31, 35, 40);">伪类选择器</font>**<font style="color:rgb(31, 35, 40);">：</font>`<font style="color:rgb(31, 35, 40);background-color:rgb(246, 248, 250);"> ：hover</font>``<font style="color:rgb(31, 35, 40);background-color:rgb(246, 248, 250);"> :nth-child</font>`
+ **<font style="color:rgb(31, 35, 40);">伪元素选择器</font>**<font style="color:rgb(31, 35, 40);">：</font>`<font style="color:rgb(31, 35, 40);"> ::before ::after</font>`

<font style="color:rgb(31, 35, 40);">优先级顺序(高到低)：</font>`<font style="color:rgb(31, 35, 40);">!import </font>`<font style="color:rgb(31, 35, 40);">> 内联 > ID > 类，属性选择器 > 元素选择器，伪类选择器 > 通配符*</font>

## <font style="color:rgb(15, 23, 42);background-color:rgb(250, 250, 250);">CSS specificity (权重)</font>
> <font style="color:rgb(153, 153, 153);">内联 > ID选择器 > 类选择器 > 标签选择器</font>
>

优先级等级从**高到低**

+ **<font style="color:rgb(31, 35, 40);">内联样式</font>**<font style="color:rgb(31, 35, 40);">（直接在 HTML 元素上的 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">style</font>`<font style="color:rgb(31, 35, 40);"> 属性）</font>
+ **<font style="color:rgb(31, 35, 40);">ID </font>**<font style="color:rgb(31, 35, 40);">选择器（ </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">#id</font>`<font style="color:rgb(31, 35, 40);">）</font>
+ **<font style="color:rgb(31, 35, 40);">类</font>**<font style="color:rgb(31, 35, 40);">选择器、</font>**<font style="color:rgb(31, 35, 40);">属性</font>**<font style="color:rgb(31, 35, 40);">选择器和</font>**<font style="color:rgb(31, 35, 40);">伪类</font>**<font style="color:rgb(31, 35, 40);">选择器（如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">.class</font>`<font style="color:rgb(31, 35, 40);">、</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">[attr=value]</font>`<font style="color:rgb(31, 35, 40);">、</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">:hover</font>`<font style="color:rgb(31, 35, 40);">）</font>
+ **<font style="color:rgb(31, 35, 40);">元素</font>**<font style="color:rgb(31, 35, 40);">选择器和</font>**<font style="color:rgb(31, 35, 40);">伪元素</font>**<font style="color:rgb(31, 35, 40);">选择器（如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">div</font>`<font style="color:rgb(31, 35, 40);">、</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">::before</font>`<font style="color:rgb(31, 35, 40);">）</font>
+ **<font style="color:rgb(31, 35, 40);">通配符</font>**<font style="color:rgb(31, 35, 40);">选择器（如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">*</font>`<font style="color:rgb(31, 35, 40);">）、后代选择器（如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">div p</font>`<font style="color:rgb(31, 35, 40);">）、子选择器（如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">div > p</font>`<font style="color:rgb(31, 35, 40);">）等组合选择器</font>

---

优先级的计算通过 **特定的计算规则 **确定

+ <font style="color:rgb(31, 35, 40);">每个内联样式加 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">1000</font>`<font style="color:rgb(31, 35, 40);"> 分</font>
+ <font style="color:rgb(31, 35, 40);">每个 ID 选择器加 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">100</font>`<font style="color:rgb(31, 35, 40);"> 分</font>
+ <font style="color:rgb(31, 35, 40);">每个类选择器、属性选择器和伪类选择器加 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">10</font>`<font style="color:rgb(31, 35, 40);"> 分</font>
+ <font style="color:rgb(31, 35, 40);">每个元素选择器和伪元素选择器加 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">1</font>`<font style="color:rgb(31, 35, 40);"> 分</font>

<font style="color:rgb(31, 35, 40);background-color:#FBDE28;">注：需要注意优先级等级，即使 类选择器 权重加起来等于100w，也无法覆盖权重为100的 id选择器</font>

```html
<div id='div' class='div' style="color: yellow">测试 CSS 优先级</div>
```

```css
// 优先级为 `100`
#div {
    width: 100px;
    height: 100px;
    color: red;
}
// 优先级为 `10`
.div {
    border: 1px solid #333;
    color: green;
}
// 优先级为 `1`
div {
    font-size: 16px;
    color: blue !important;
}
// 可以得出字体颜色最终生效的是 color: blue !important;，所以最终字体展示的颜色为 blue
```



## CSS继承属性
<font style="color:rgb(44, 62, 80);">在</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">css</font>`<font style="color:rgb(44, 62, 80);">中，继承是指的是给父元素设置一些属性，后代元素会自动拥有这些属性</font>

<font style="color:rgb(44, 62, 80);background-color:#FBDE28;">可继承属性</font><font style="color:rgb(44, 62, 80);">，按照类别分别如下：</font>

```css
font:组合字体
font-family:规定元素的字体系列
font-weight:设置字体的粗细
font-size:设置字体的尺寸
font-style:定义字体的风格
font-variant:偏大或偏小的字体
```

```css
text-indent：文本缩进
text-align：文本水平对刘
line-height：行高
word-spacing：增加或减少单词间的空白
letter-spacing：增加或减少字符间的空白
text-transform：控制文本大小写
direction：规定文本的书写方向
color：文本颜色
```

```css
visibilty
```

```css
caption-side：定位表格标题位置
border-collapse：合并表格边框
border-spacing：设置相邻单元格的边框间的距离
empty-cells：单元格的边框的出现与消失
table-layout：表格的宽度由什么决定
```

```css
list-style-type：文字前面的小点点样式
list-style-position：小点点位置
list-style：以上的属性可通过这属性集合
```

```css
cursor：箭头可以变成需要的形状
```



<font style="background-color:#FBDE28;">不可继承属性</font>

```css
display

文本属性：vertical-align、text-decoration

盒子模型的属性：宽度、高度、内外边距、边框等

背景属性：背景图片、颜色、位置等

定位属性：浮动、清除浮动、定位position等

生成内容属性：content、counter-reset、counter-increment

轮廓样式属性：outline-style、outline-width、outline-color、outline

页面样式属性：size、page-break-before、page-break-after
```



默认值继承

+ 某些css属性虽然不是继承属性，但是为明确定义，浏览器会默认继承 例如：`line-height`
+ 可以使用`inherit`关键字，明确某个属性去继承父元素

```css
.child {
    color: inherit; // 强制继承父元素的文字颜色
}
```



## em/px/rem/vh/vw区别
css中的单位分为相对长度单位，绝对长度单位，具体：

| <font style="color:rgb(44, 62, 80);">相对长度单位</font> | <font style="color:rgb(44, 62, 80);">em、ex、ch、rem、vw、vh、vmin、vmax、%</font> |
| --- | --- |
| <font style="color:rgb(44, 62, 80);">绝对长度单位</font> | <font style="color:rgb(44, 62, 80);">cm、mm、in、px、pt、pc</font> |


<font style="color:rgb(44, 62, 80);"></font>

<font style="color:rgb(44, 62, 80);">px</font>

+ 像素(显示器中的一个个点，每个像素点大小等同)，绝对长度单位

em

+ 相对长度单位，**<font style="color:rgb(44, 62, 80);">相对于当前对象内文本的字体尺寸</font>**<font style="color:rgb(44, 62, 80);">，如当前对行内文本的字体尺寸未被人为设置，则相对于浏览器的默认字体尺寸（</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">1em = 16px</font>`<font style="color:rgb(44, 62, 80);">）</font>

<font style="color:rgb(44, 62, 80);">为了简化 </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">font-size</font>`<font style="color:rgb(44, 62, 80);"> 的换算，需要在</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">css</font>`<font style="color:rgb(44, 62, 80);">中的 </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">body</font>`<font style="color:rgb(44, 62, 80);"> 选择器中声明</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">font-size</font>`<font style="color:rgb(44, 62, 80);">= </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">62.5%</font>`<font style="color:rgb(44, 62, 80);">，这就使 em 值变为 </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">16px*62.5% = 10px</font>`<font style="color:rgb(71, 101, 130);">，</font><font style="color:rgb(44, 62, 80);">这样 </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">12px = 1.2em</font>`<font style="color:rgb(44, 62, 80);">, </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">10px = 1em</font>`<font style="color:rgb(44, 62, 80);">, 也就是说只需要将原来的</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">px</font>`<font style="color:rgb(44, 62, 80);"> 数值除以 10，然后换上 </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">em</font>`<font style="color:rgb(44, 62, 80);">作为单位就行了</font>

```html
<div class="big">
    我是14px=1.4rem<div class="small">我是12px=1.2rem</div>
</div>
<style>
    html {font-size: 10px;  } /*  公式16px*62.5%=10px  */  
    .big{font-size: 1.4rem}
    .small{font-size: 1.2rem}
</style>
<!-- .big font-size 14px .small font-size 12px  -->
```



rem

+ 相对单位，相对的就是 HTML 根元素的 `font-size` 值



vh,vw

`vw`,根据窗口的宽度，分成100等份，100vw => 满宽，50vw => 一半宽，同理`vh`则为窗口的高度

+ 桌面端：浏览器的可视区域
+ 移动端布局视口

<font style="color:rgb(44, 62, 80);">像</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">vw</font>`<font style="color:rgb(44, 62, 80);">、</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">vh</font>`<font style="color:rgb(44, 62, 80);">，比较容易混淆的一个单位是</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">%</font>`<font style="color:rgb(44, 62, 80);">，不过百分比宽泛的讲是相对于父元素：</font>

+ <font style="color:rgb(44, 62, 80);">对于普通定位元素就是理解的父元素</font>
+ <font style="color:rgb(44, 62, 80);">对于position: absolute;的元素是相对于已定位的父元素</font>
+ <font style="color:rgb(44, 62, 80);">对于position: fixed;的元素是相对于 ViewPort（可视窗口）</font>

<font style="color:rgb(44, 62, 80);"></font>

## <font style="color:rgb(44, 62, 80);">CSS 隐藏元素的方法，区别</font>
方法如下：

```css
display:none;
visibility:hidden;
opacity:0;
//设置 height,width 为0
position:absolute;
```

具体却别如下：

`display:none;`

+ 不会占据空间(所占空间会被其他元素占有)
+ 自身绑定的事件不会触发，_例如无法响应点击事件_
+ 不会有过渡效果



`visibility:hidden;`

+ 只是隐藏，DOM仍存在，会占据空间(不会重发重排，会触发重绘)
+ 自身绑定的事件不会触发



`opacity:0;`

> <font style="color:rgb(153, 153, 153);">如果利用 animation 动画，对 opacity 做变化（animation会默认触发GPU加速），则只会触发 GPU 层面的 composite，不会触发重绘</font>
>

+ 占据页面空间，
+ 可以响应点击事件

`设置height、width属性为0`

+ <font style="color:rgb(44, 62, 80);">将元素的</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">margin</font>`<font style="color:rgb(44, 62, 80);">，</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">border</font>`<font style="color:rgb(44, 62, 80);">，</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">padding</font>`<font style="color:rgb(44, 62, 80);">，</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">height</font>`<font style="color:rgb(44, 62, 80);">和</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">width</font>`<font style="color:rgb(44, 62, 80);">等影响元素盒模型的属性设置成0，如果元素内有子元素或内容，还应该设置其</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">overflow:hidden</font>`<font style="color:rgb(44, 62, 80);">来隐藏其子元素</font>
+ <font style="color:rgb(44, 62, 80);">元素不可见，不占据页面空间，无法响应点击事件</font>

<font style="color:rgb(44, 62, 80);"></font>

`<font style="color:rgb(44, 62, 80);">position:absolute; </font>`<font style="color:rgb(44, 62, 80);"> </font>

+ 将元素移出可视区域，<font style="color:rgb(44, 62, 80);">元素不可见，不影响页面布局</font>

```css
.hide {
   position: absolute;
   top: -9999px;
   left: -9999px;
}
```



`clip-path`

+ 通过裁剪形式

```css
.hide {
  clip-path: polygon(0px 0px,0px 0px,0px 0px,0px 0px);
}
```

小结：最常用的`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">display:none</font>`<font style="color:rgb(44, 62, 80);">和</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">visibility:hidden</font>`



## <font style="color:rgb(71, 101, 130);">Link 和 @import 区别</font>
| **<font style="color:rgb(31, 35, 40);">特性</font>** | `**<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);"><link></font>**`**<font style="color:rgb(31, 35, 40);">标签</font>** | **<font style="color:rgb(31, 35, 40);">@import</font>** |
| :---: | :---: | :---: |
| <font style="color:rgb(31, 35, 40);">用法</font> | <font style="color:rgb(31, 35, 40);">在 HTML 文档的 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);"><head></font>`<font style="color:rgb(31, 35, 40);"> 部分使用</font><br/><font style="color:rgb(56, 58, 66);background-color:rgb(246, 248, 250);"><</font><font style="color:rgb(228, 86, 73);background-color:rgb(246, 248, 250);">link</font><font style="color:rgb(152, 104, 1);background-color:rgb(246, 248, 250);">rel</font><font style="color:rgb(56, 58, 66);background-color:rgb(246, 248, 250);">=</font><font style="color:rgb(80, 161, 79);background-color:rgb(246, 248, 250);">"stylesheet"</font><font style="color:rgb(152, 104, 1);background-color:rgb(246, 248, 250);">href</font><font style="color:rgb(56, 58, 66);background-color:rgb(246, 248, 250);">=</font><font style="color:rgb(80, 161, 79);background-color:rgb(246, 248, 250);">"styles.css"</font><font style="color:rgb(56, 58, 66);background-color:rgb(246, 248, 250);">></font> | <font style="color:rgb(31, 35, 40);">在 CSS 文件或 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);"><style></font>`<font style="color:rgb(31, 35, 40);"> 标签内使用</font><br/><font style="color:rgb(166, 38, 164);background-color:rgb(246, 248, 250);">@import</font><font style="color:rgb(56, 58, 66);background-color:rgb(246, 248, 250);"> url(</font><font style="color:rgb(80, 161, 79);background-color:rgb(246, 248, 250);">"styles.css"</font><font style="color:rgb(56, 58, 66);background-color:rgb(246, 248, 250);">);</font> |
| <font style="color:rgb(31, 35, 40);">加载顺序</font> | <font style="color:rgb(31, 35, 40);">页面加载时立即加载样式表</font> | <font style="color:rgb(31, 35, 40);">在加载包含它的 CSS 文件后加载</font> |
| <font style="color:rgb(31, 35, 40);">浏览器支持</font> | <font style="color:rgb(31, 35, 40);">支持所有主流浏览器</font> | <font style="color:rgb(31, 35, 40);">支持 IE5+ 和所有现代浏览器</font> |
| <font style="color:rgb(31, 35, 40);">性能</font> | <font style="color:rgb(31, 35, 40);">加载并行进行，速度较快</font> | <font style="color:rgb(31, 35, 40);">加载顺序依赖，速度较慢</font> |
| <font style="color:rgb(31, 35, 40);">DOM 可操作性</font> | <font style="color:rgb(31, 35, 40);">可通过 JavaScript 操作和控制</font> | <font style="color:rgb(31, 35, 40);">不易通过 JavaScript 操作</font> |
| <font style="color:rgb(31, 35, 40);">样式权重</font> | <font style="color:rgb(31, 35, 40);">样式权重相同</font> | <font style="color:rgb(31, 35, 40);">样式权重相同</font> |




```css
/* 在CSS中使用@import的场景示例 */
/* main.css */
@import "reset.css";       /* 基础重置样式 */
@import "variables.css";   /* 变量定义 */
@import "components.css" screen and (min-width: 768px); /* 条件加载 */
```



## 伪类和伪元素的区别
| 特性 | 伪类（Pseudo-class） | 伪元素（Pseudo-element） |
| :---: | :---: | :---: |
| **本质** | 选择**真实**元素的状态 | 创建**虚拟**元素 |
| **作用** | 匹配元素的特定**状态或位置** | **生成并样式化**不存在的元素 |
| **语法** | 单冒号或双冒号均可（`:hover`） | 推荐双冒号（`::after`） |
| **例子** | `:hover`, `:focus`, `:first-child` | `::before`, `::after`, `::first-line` |
| `**content**` | 通常不需要，因为作用于真实元素 | 经常需要，因为要创建内容 |




## CSS 中的transition和animation区别
`transition` 和 `animation` 都是用于元素改变样式时候的平滑过渡，关键区别：

+ `transition`  针对的是元素属性变化的过渡结果，需要触发某个事件(鼠标悬停，点击等)，`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">transition</font>`<font style="color:rgb(31, 35, 40);"> 只能在两个状态之间转换，并且需要一个触发条件 </font>**<font style="color:rgb(31, 35, 40);">过渡用</font>**
+ `<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">animation</font>`<font style="color:rgb(31, 35, 40);"> 提供更多的控制选项，允许我们定义关键帧（keyframes），并且可以在复数个状态之间进行变化。</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">animation</font>`<font style="color:rgb(31, 35, 40);"> 可以在页面加载时自动开始运行，不需要特定的触发事件  </font>**<font style="color:rgb(31, 35, 40);">自定义动画用</font>**

<font style="color:rgb(31, 35, 40);"></font>

## `<font style="color:rgb(31, 35, 40);">display:none</font>`<font style="color:rgb(31, 35, 40);"> 和 </font>`<font style="color:rgb(31, 35, 40);">visibility:hidden</font>` <font style="color:rgb(31, 35, 40);">的区别</font>
<font style="color:rgb(31, 35, 40);">1、</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">display: none</font>`<font style="color:rgb(31, 35, 40);"> 会</font>**<font style="color:rgb(31, 35, 40);">完全从页面上移除该元素</font>**<font style="color:rgb(31, 35, 40);">，元素占用的</font>**<font style="color:rgb(31, 35, 40);">空间也会被移除</font>**<font style="color:rgb(31, 35, 40);">，相当于这个元素从未存在过，因此它后面的元素会顶上来，并重新排列</font>

<font style="color:rgb(31, 35, 40);">2、</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">visibility: hidden</font>`<font style="color:rgb(31, 35, 40);"> 则是</font>**<font style="color:rgb(31, 35, 40);">将元素设置为不可见</font>**<font style="color:rgb(31, 35, 40);">，但元素</font>**<font style="color:rgb(31, 35, 40);">依然占据它原本的空间</font>**<font style="color:rgb(31, 35, 40);">，页面的布局不会变化，只是看不到这个元素</font>

<font style="color:rgb(31, 35, 40);"></font>

**<font style="color:rgb(31, 35, 40);">性能影响：</font>**

`<font style="color:rgb(31, 35, 40);">display:none</font>`<font style="color:rgb(31, 35, 40);"> 浏览器不会为这个元素进行绘制 和 事件处理，性能上更有效率（频繁添加或移除元素的场景中）</font>

`<font style="color:rgb(31, 35, 40);">visibility:hidden</font>`<font style="color:rgb(31, 35, 40);">：浏览器会保留该元素的布局信息，且会绘制这个元素为不可见状态，占用内容资源</font>

**<font style="color:rgb(31, 35, 40);">动画效果</font>**

`<font style="color:rgb(31, 35, 40);">display:none</font>`<font style="color:rgb(31, 35, 40);">：通常不能使用CSS动画过渡transition来进行显示隐藏，</font>

`<font style="color:rgb(31, 35, 40);">visibility:hidden</font>`<font style="color:rgb(31, 35, 40);">：可以与css动画和过渡效果结合使用</font>

<font style="color:rgb(31, 35, 40);"></font>

## <font style="color:rgb(31, 35, 40);">为什么有时用 </font>`<font style="color:rgb(31, 35, 40);">translate</font>`<font style="color:rgb(31, 35, 40);"> 来改变位置而不是用定位</font>
主要是 **性能 **方面的考虑

+ 这里引出两个概念，重排`Reflow` 和 重绘 `Repaint`
+ `重排Reflow：` <font style="color:rgb(31, 35, 40);">指浏览器在 DOM 发生变化时重新计算元素的位置和几何形状。当使用定位属性（如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">top</font>`<font style="color:rgb(31, 35, 40);">, </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">left</font>`<font style="color:rgb(31, 35, 40);">）改变元素位置时，就会触发 Reflow，这在页面复杂时会非常消耗性能。</font>
+ `重绘Repaint:`<font style="color:rgb(31, 35, 40);">指元素的外观发生变化（如背景颜色、边框等）时，需要重新绘制这些元素，但不涉及重新计算布局。Repaint 的开销相对较小。</font>



+ 重点是` translate `是通过矩阵变化来操作元素的视觉效果，这一部分在**合成线程**<font style="color:rgb(31, 35, 40);">完成的，</font>**<font style="color:rgb(31, 35, 40);">不走主渲染线程</font>**<font style="color:rgb(31, 35, 40);">，效率更高</font>

<font style="color:rgb(31, 35, 40);"></font>

## **<font style="color:rgba(0, 0, 0, 0.88);">为什么 li 与 li 元素之间有看不见的空白间隔？如何解决？ </font>**
**原因**：多个`<li>`元素并排（设置为`display：inline-block`，或`内联元素`），换行符/空格符会被浏览器解析为文本节点，生成默认宽度的空白间隔

**方法**：

+ 消除HTML中的空白字符

```html
<ul><li>Item1</li><li>Item2</li><li>Item3</li></ul>
```

+ 使用负的margin，padding压缩

```css
li {
  display: inline-block;
  margin-right: -4px; /* 通常需根据字体大小调整 */
}
```

+ **<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">设置父元素 </font>**`**<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">font-size: 0</font>**`**<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">（兼容性方案）</font>**
    - <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">通过父元素清除空白节点宽度，子元素重置字体：</font>

```css
ul {
  font-size: 0;    /* 消除空白间隙 */
}
li {
  display: inline-block;
  font-size: 16px; /* 重置子元素字体大小 */
}
```

## 替换元素
元素内容不是由css控制，由外部资源控制。

常见的替换元素

+ `<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);"><img></font>`<font style="color:rgb(31, 35, 40);">：显示外部图片。</font>
+ `<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);"><video></font>`<font style="color:rgb(31, 35, 40);">：嵌入外部视频。</font>
+ `<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);"><object></font>`<font style="color:rgb(31, 35, 40);">：嵌入外部对象资源。</font>
+ `<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);"><embed></font>`<font style="color:rgb(31, 35, 40);">：嵌入外部程序或插件。</font>
+ `<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);"><iframe></font>`<font style="color:rgb(31, 35, 40);">：嵌入一个文档中的另一个HTML文档。</font>

<font style="color:rgb(31, 35, 40);"></font>

## <font style="color:rgb(31, 35, 40);">CSS sprites 精灵图</font>
将多个小图标/背景图合并到一张大图的前端优化技术，通过background-position定位显示，减少http请求。

示例代码：

```css
.icon {
  background: url('sprites.png') no-repeat; /* 加载合并后的大图 */
}

/* 使用坐标定位显示指定部分 */
.icon-home {
  width: 30px;
  height: 30px;
  background-position: -60px 0; /* 显示大图中第3个图标（每图标宽30px） */
}
```



## 什么是物理像素，逻辑像素和像素密度？为什么在移动端开发时需要用到 @3x, @2x 这种图片
| <font style="color:rgba(0, 0, 0, 0.9);">概念</font> | <font style="color:rgba(0, 0, 0, 0.9);">定义</font> | <font style="color:rgba(0, 0, 0, 0.9);">特性</font> |
| :---: | :---: | :---: |
| **<font style="color:rgba(0, 0, 0, 0.9);">物理像素    </font>****<font style="color:rgba(0, 0, 0, 0.9);">(Physical Pixels)</font>** | <font style="color:rgba(0, 0, 0, 0.9);">显示设备上最小的发光单元</font> | <font style="color:rgba(0, 0, 0, 0.9);">• 硬件决定的实际发光点   </font><font style="color:rgba(0, 0, 0, 0.9);">• 如iPhone 13屏幕有1170×2532个物理像素</font> |
| **<font style="color:rgba(0, 0, 0, 0.9);">逻辑像素   </font>****<font style="color:rgba(0, 0, 0, 0.9);"> (Logical Pixels/CSS Pixels)</font>** | <font style="color:rgba(0, 0, 0, 0.9);">用于UI布局的虚拟像素单位</font> | <font style="color:rgba(0, 0, 0, 0.9);">• 软件层面的抽象单位   </font><font style="color:rgba(0, 0, 0, 0.9);">• 所有设备统一标准   </font><font style="color:rgba(0, 0, 0, 0.9);">• 在CSS中定义元素尺寸</font> |
| **<font style="color:rgba(0, 0, 0, 0.9);">像素密度    </font>****<font style="color:rgba(0, 0, 0, 0.9);">(PPI/Pixels Per Inch)</font>** | <font style="color:rgba(0, 0, 0, 0.9);">每英寸物理像素的数量</font> | <font style="color:rgba(0, 0, 0, 0.9);">• 设备清晰度指标   </font><font style="color:rgba(0, 0, 0, 0.9);">• iPhone 4：326PPI（首次"视网膜屏"）   </font><font style="color:rgba(0, 0, 0, 0.9);">• MacBook：约220PPI</font> |


**<font style="color:rgb(31, 35, 40);">@2x 和 @3x 图片</font>**<font style="color:rgb(31, 35, 40);">：在不同像素密度的设备上，如果使用相同大小的图片，低像素密度的设备上图片会显示清晰，但在高像素密度设备上图片会显得模糊。通过使用 @2x 和 @3x，这些设备可以加载分辨率更高的图片以保持清晰度。例如，@2x 图片的分辨率是标准分辨率的两倍，每个逻辑像素对应2x2个物理像素。</font>

<font style="color:rgb(31, 35, 40);"></font>

## <font style="color:rgb(31, 35, 40);">说说</font>`<font style="color:rgb(31, 35, 40);">margin</font>`<font style="color:rgb(31, 35, 40);">和</font>`<font style="color:rgb(31, 35, 40);">padding</font>`<font style="color:rgb(31, 35, 40);">的使用场景</font>
**<font style="color:rgb(31, 35, 40);">Margin</font>**<font style="color:rgb(31, 35, 40);"> 和 </font>**<font style="color:rgb(31, 35, 40);">Padding</font>**<font style="color:rgb(31, 35, 40);"> 是 CSS 中用来控制元素与其周围环境之间距离的两个重要属性。</font>

1. `<font style="color:rgb(31, 35, 40);">Margin</font>`<font style="color:rgb(31, 35, 40);">（外边距）用于控制元素与其他元素的距离，在外部起作用</font>
2. `<font style="color:rgb(31, 35, 40);">Padding </font>`<font style="color:rgb(31, 35, 40);">（内边距）用于控制元素内容与其边框的距离，在内部起作用</font>

<font style="color:rgb(31, 35, 40);">通常情况下：</font>

<font style="color:rgb(31, 35, 40);">1）</font>**<font style="color:rgb(31, 35, 40);">Margin</font>**<font style="color:rgb(31, 35, 40);"> 常用于创建元素之间的间隔。例如用 </font>`<font style="color:rgb(31, 35, 40);">margin</font>`<font style="color:rgb(31, 35, 40);"> 为段落、图片、块级元素等设置外边距</font>

<font style="color:rgb(31, 35, 40);">2）</font>**<font style="color:rgb(31, 35, 40);">Padding</font>**<font style="color:rgb(31, 35, 40);"> 常用于增加元素内部的间距。例如，给按钮、输入框等增加 </font>`<font style="color:rgb(31, 35, 40);">padding</font>`<font style="color:rgb(31, 35, 40);"> 可以让它们内部文字与边框之间保持合适的距离，从而看起来更美观。它会增加元素的总尺寸，但不会直接影响元素</font>`<font style="color:rgb(31, 35, 40);">width</font>`<font style="color:rgb(31, 35, 40);">，</font><font style="color:rgba(0, 0, 0, 0.9);">✅</font><font style="color:rgba(0, 0, 0, 0.9);"> 背景色/边框会延伸</font><font style="color:rgb(31, 35, 40);">。</font>

<font style="color:rgb(31, 35, 40);"></font>

**<font style="color:rgb(31, 35, 40);">注意的点</font>**

**<font style="color:rgb(31, 35, 40);">合并外边距问题</font>**<font style="color:rgb(31, 35, 40);">：相邻块级元素会在某些情况合并为1个。比如两个相邻段落上下margin会合并取其最大值</font>

```html
<div class="box" style="margin-bottom: 50px">元素 A</div>
<div class="box" style="margin-top: 30px">元素 B</div>
<!-- 结果是元素 A 和 B 之间的间距为 50px（不是 50+30=80px） -->

<!--  父元素与子元素间的折叠 -->
<!-- 当父元素没有边框、内边距或内联内容分隔时，父元素的上边距可能会与第一个子元素的上边距折叠；
同样地，父元素的下边距可能会与最后一个子元素的下边距折叠。 -->

<section class="parent" style="margin-top: 40px">
  <div class="child" style="margin-top: 60px">子元素</div>
</section>
<!-- 结果是父元素的顶部与子元素之间的间距为 60px（取较大值） -->
```

+ tips:可以使用添加边框，设置内边距，设置弹性布局`flex`来解决

**<font style="color:rgb(31, 35, 40);">负值</font>**<font style="color:rgb(31, 35, 40);">：负值</font>`<font style="color:rgb(31, 35, 40);">margin</font>`<font style="color:rgb(31, 35, 40);">适用一些特殊场景，</font>`<font style="color:rgb(31, 35, 40);">padding</font>`<font style="color:rgb(31, 35, 40);">不允许负值</font>

```css
margin:-5px;
padding:-5px //不可用
```



## **<font style="color:rgba(0, 0, 0, 0.88);">说说你对 line-height 的理解及其赋值方式 </font>**
line-height:用于控制行高，定义行与行之间的距离，会影响文本的垂直空间，间接作用于元素的高度计算

**赋值方式**：

1. **<font style="color:rgb(31, 35, 40);">数字值（推荐）</font>**<font style="color:rgb(31, 35, 40);">：例如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">line-height: 1.5</font>`<font style="color:rgb(31, 35, 40);">，这种方式是一个无单位的乘数，会根据字体大小计算实际的行高，支持继承</font>
2. **<font style="color:rgb(31, 35, 40);">百分比</font>**<font style="color:rgb(31, 35, 40);">：例如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">line-height: 150%</font>`<font style="color:rgb(31, 35, 40);">，这种方式以当前字体大小为基准，设置的百分比值作为行高，</font>**<font style="color:rgb(31, 35, 40);">不推荐</font>**<font style="color:rgb(31, 35, 40);">，可能会在嵌套结构中产生计算的问题</font>
3. **<font style="color:rgb(31, 35, 40);">长度值</font>**<font style="color:rgb(31, 35, 40);">：例如 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">line-height: 20px</font>`<font style="color:rgb(31, 35, 40);">，直接使用具体的长度单位来设置行高</font>
4. **<font style="color:rgb(31, 35, 40);">关键字</font>**<font style="color:rgb(31, 35, 40);">：常见的关键字有 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">normal</font>`<font style="color:rgb(31, 35, 40);">，浏览器会根据默认算法来计算行高，一般接近1.2到1.4倍的字体大小</font>

<font style="color:rgb(31, 35, 40);">注意的点：</font>

1. <font style="color:rgb(31, 35, 40);">继承性：</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">line-height</font>`<font style="color:rgb(31, 35, 40);"> 是一个继承属性，这意味着它会从父元素继承值</font>
2. <font style="color:rgb(31, 35, 40);">行高塌陷： 比如设置了一个父元素的 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">line-height</font>`<font style="color:rgb(31, 35, 40);">，但由于子元素设置了较大的行高，会导致整体的行高被撑开，这在设计布局时需要特别注意和调整。</font>
3. <font style="color:rgb(31, 35, 40);">和vertical-align的关系：对于要居中显示的图片or文字，同时调整</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">line-height</font>`<font style="color:rgb(31, 35, 40);"> 和 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">vertical-align</font>`

```html
<style>
  .container {
      width: 300px;
      height: 300px;
      line-height: 300px;
      /* 关键：行高=容器高度 */
      text-align: center;
      background: #f0f0f0;
  }
  .container img {
      vertical-align: middle;
      /* 与行框中点对齐 */
  }
</style>

 <div class="container">
    <img src="https://picsum.photos/id/238/50/50" alt="" style="width: 100px;height: 100px;">
</div>
```



## CSS优化和提高性能的方法有哪些
1. **优化选择器**
+ 避免使用通用选择器（*），匹配所有元素需要进行大量计算
+ 减少嵌套深度，`#id .class tag` 优于 `#id .class ul li a`
+ 优先使用ID 和 class 选择器
2. **精简CSS代码**
+ <font style="color:rgb(31, 35, 40);">通过工具（如 Webpack、Gulp）将多个 CSS 文件合并为一个，并最小化 CSS 代码，减少文件大小和请求数</font>
+ <font style="color:rgb(31, 35, 40);">合并重复的css规则</font>
3. **使用CSS预处理器**
+ 利用Sass，Less预处理器
4. **优化CSS交付**
+ 使用外部样式表，便于后续页面加载直接从缓存中读取
+ 首屏渲染的关键样式放置在HTML中的`<head>` 中  ，加速首屏渲染
5. **利用浏览器特性或者新css特性**
+ 使用css变量，避免使用计算资源高的css属性（`box-shadow`,`border-radius`,`opacity`等）



## 谈一下对BFC的理解
页面布局常见的问题：

+ 元素高度为什么没了
+ <font style="color:rgb(44, 62, 80);">这两个元素的间距怎么有点奇怪的样子</font>

<font style="color:rgb(44, 62, 80);">这里其实是元素相互之间的影响，设计到</font>`<font style="color:rgb(44, 62, 80);">BFC</font>`<font style="color:rgb(44, 62, 80);">概念</font>

`<font style="color:rgb(44, 62, 80);">BFC</font>`<font style="color:rgb(44, 62, 80);">，全称是 </font>**块级格式化上下文 (Block Formatting Context)**<font style="color:rgb(44, 62, 80);">，是 CSS 视觉渲染的一部分，它定义了</font>**<font style="color:rgb(44, 62, 80);">块级</font>**<font style="color:rgb(44, 62, 80);">盒子的布局方式，以及浮动、清除浮动、边距合并等行为。  </font>

---

<font style="color:rgb(44, 62, 80);">简单理解为：</font>`**<font style="color:rgb(44, 62, 80);">BFC</font>**`**<font style="color:rgb(44, 62, 80);">是一个“封闭容器”，</font>**<font style="color:rgb(44, 62, 80);">有如下的规则：</font>

+ 内部盒子在垂直方向上一个个的排列
+ BFC区域不会与浮动元素重叠：这可以用于清除浮动
+ BFC会包含其内部所有的浮动元素：包含所有的浮动元素可以解决父元素**塌陷**的问题
+ 外边距会发生折叠（margin collapsing）

如何建立一个`BFC`

+ **根元素 **`**<html>**`： 整个页面就是最大的一个 BFC
+ **存在浮动属性**： （`float: left;` 或 `float: right;`）都会创建一个 BFC  
+ `**position**`** 属性为 **`**absolute**`** 或 **`**fixed**`： 绝对定位或固定定位的元素会脱离文档流，并创建一个 BFC  
+ `**overflow**`** 属性不为 **`**visible**`： 当 `overflow` 属性设置为 `hidden`、`scroll` 或 `auto` 时，会创建一个 BFC。这是最常用的创建 BFC 来清除浮动的方法  
+ `**display**`** 属性为 **`**inline-block**`**、**`**flex**`** 或 **`**grid**`，其中`flex` 容器 (display: flex) 和 `grid` 容器 (display: grid) 本身会创建一个 BFC，它们的子元素则成为` flex item` 或 `grid item`，遵循 flex 或 grid 布局规则  



例子：

```html

<style>
        .parent {
            border: 2px solid red; /* 方便观察父元素边界 */
            padding: 10px;
            margin-bottom: 20px;
        }
        .child {
            width: 100px;
            height: 100px;
            background-color: lightblue;
            margin: 10px;
        }

        /* 浮动子元素 */
        .child.float-left {
            float: left;
        }

        .bfc-cleared {
            overflow: hidden; 
            /* 创建 BFC */
            /* 其他创建 BFC 的方式也可以：
            display: flow-root; /* 现代方法，明确表示创建 BFC */
            /* float: left; /* 父元素也浮动，但会影响其在文档流中的位置 */
            /* position: absolute; /* 父元素脱离文档流 */
            /* display: inline-block; /* 父元素变为行内块 */
            
        }
    </style>

<h2>未清除浮动 - 父元素塌陷</h2>
    <div class="parent">
        <div class="child float-left">子元素 1</div>
        <div class="child float-left">子元素 2</div>
    </div>

    <h2>已清除浮动 (通过创建 BFC)</h2>
    <div class="parent bfc-cleared">
        <div class="child float-left">子元素 1</div>
        <div class="child float-left">子元素 2</div>
  </div>
```

```html
<style>
        .float-box {
            width: 150px;
            height: 150px;
            background-color: lightgreen;
            float: left; /* 浮动元素 */
            margin-right: 20px;
            border: 1px solid darkgreen;
        }

        .text-content {
            background-color: #f0f0f0;
            padding: 15px;
            border: 1px solid #ccc;
        }

        /* 创建 BFC 的文本容器样式 */
        .bfc-text-content {
            overflow: hidden; /* 创建 BFC */
            /* display: flow-root; */
        }
    </style>

      <h2>文本环绕浮动元素</h2>
    <div class="float-box">浮动方块</div>
    <div class="text-content">
        这是一段长文本内容，它会环绕在浮动元素的周围。在默认情况下，块级元素会占据一行，但是如果旁边有浮动元素，其内容会尝试绕开浮动元素。这是 CSS 布局的一个常见现象。

    </div>

    <hr style="margin: 40px 0;">

    <h2>避免文本环绕 (通过创建 BFC)</h2>
    <div class="float-box">浮动方块</div>
    <div class="text-content bfc-text-content">
        这是一段长文本内容，它将不会环绕在浮动元素的周围，因为它自身创建了一个 BFC。这意味着它的区域将完全独立于浮动元素，不会与之重叠。

    </div>
```



---

## 清除浮动的方法
首先要引出CSS布局中的常见的**元素塌陷collapsing**问题，分别包括父元素塌陷和外边距塌陷

+ 父元素塌陷只要是指：**子元素脱离了正常文档流**，父元素无法根据子元素来计算自身高度， 导致高度塌陷为0，或接近0
    - 脱离正常文档流的方式：`float`,`postion:absolute/fixed`
+ 示例：

```html
 <h1>父元素高度塌陷示例</h1>

    <h2>未清除浮动导致的塌陷</h2>
    <div class="parent-collapsed">
        <div class="float-child">子元素 1</div>
        <div class="float-child">子元素 2</div>
        <div class="float-child">子元素 3</div>
        </div>
    <div class="normal-flow-after">
        这个元素会紧跟在父元素后面，而不是在浮动子元素下面，因为父元素高度塌陷了。
    </div>

    <hr>

    <h2>清除浮动后的父元素（高度正常）</h2>
    <div class="parent-clearfix">
        <div class="float-child">子元素 A</div>
        <div class="float-child">子元素 B</div>
        <div class="float-child">子元素 C</div>
    </div>
    <div class="normal-flow-after">
        这个元素会正常地在父元素下方，因为父元素高度被正确计算了。
    </div>
    <style>
        .parent-collapsed {
            border: 2px dashed red; /* 红色虚线边框，方便观察高度 */
            background-color: #f0f0f0;
            padding: 10px;
            margin-bottom: 30px;
            /* height: auto; /* 这是默认行为，如果子元素脱离文档流，高度就会塌陷 */
        }

        .float-child {
            width: 100px;
            height: 100px;
            background-color: lightblue;
            margin: 10px;
            float: left; /* 让子元素脱离文档流 */
            text-align: center;
            line-height: 100px;
        }

        .normal-flow-after {
            background-color: lightgreen;
            padding: 20px;
            border: 1px solid green;
            margin-top: 20px; /* 注意这个元素的定位 */
        }

        /* --- 解决方案示例 --- */
        .parent-clearfix {
            border: 2px dashed blue; /* 蓝色虚线边框 */
            background-color: #f9f9f9;
            padding: 10px;
            margin-top: 30px;
        }
        /* 清除浮动的常用方法：伪元素法 */
        .parent-clearfix::after {
            content: "";
            display: block;
            clear: both;
        }
        /* 或者：overflow: hidden; (如果不会裁剪内容) */
        /* .parent-clearfix { overflow: hidden; } */
        /* 或者：display: flow-root; (现代浏览器支持) */
        /* .parent-clearfix { display: flow-root; } */
    </style>
    
```

**如何清除浮动？**

+ 1.利用伪元素清除（推荐）

```css
.clearfix::after {
    content: "";
    display: table;
    clear: both;
}
```

+ 2.`overflow`
+ 3.`display:flow-root`,创建BFC



外边距塌陷

 - 父子元素之间的垂直外边距会合并  

## <font style="color:rgb(44, 62, 80);">元素水平垂直居中的方法有哪些？如果元素不定宽高呢？</font>
1.使用定位+`margin:auto` （适用于块级元素）

```html
<div class="container fixed-size-container">
    <div class="box fixed-size-box-margin-auto">
        定宽定高元素
    </div>
</div>

<style>
.fixed-size-container {
    position: relative; /* 父元素需要相对定位 */
    width: 300px;
    height: 200px;
    border: 2px dashed #ccc;
}

.fixed-size-box-margin-auto {
    width: 100px; /* 定宽 */
    height: 60px; /* 定高 */
    background-color: lightblue;
    position: absolute; /* 子元素绝对定位 */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto; /* 水平垂直居中 */
}
</style>
```

原理是：

1.子元素绝对定位后，设置`top: 0; left: 0; right: 0; bottom: 0;` 使其在四个方向上都拉伸到父元素的边缘 ，

<font style="color:rgb(44, 62, 80);">2.子元素设置了宽高，所以宽高会按照设置来显示，但是实际上子级的虚拟占位已经撑满了整个父级，这时候再给它一个</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">margin：auto</font>`<font style="color:rgb(44, 62, 80);">就可以上下左右都居中</font>



2.使用定位+`transform` （推荐，性能突出）

```html
<div class="container fixed-size-container">
    <div class="box fixed-size-box-transform">
        定宽定高元素
    </div>
</div>

<style>
.fixed-size-container {
    position: relative; /* 父元素需要相对定位 */
    width: 300px;
    height: 200px;
    border: 2px dashed #ccc;
}

.fixed-size-box-transform {
    width: 100px; 
    height: 60px; 
    background-color: lightgreen;
    position: absolute;
    top: 50%; 
    left: 50%; 
    transform: translate(-50%, -50%); /* 向上左各移动自身宽度/高度的一半 */
}
</style>
```

原理：

+ 1. 将元素的左上角移动到父元素中心 (`top: 50%; left: 50%;`)
+ 2.  `transform: translate(-50%, -50%);` 将元素自身向左和向上各平移其宽度和高度的 50%，从而精确居中  

tical

3.使用`flex`

```html
<div class="container flex-container">
    <div class="box variable-size-box">
        内容不确定<br>可能多行
      
    </div>
</div>

<style>
.flex-container {
    display: flex; 
    justify-content: center; /* 水平居中 */
    align-items: center; /* 垂直居中 */
    width: 300px;
    height: 200px;
    border: 2px dashed #ccc;
}

.variable-size-box {
    
    background-color: lightcoral;
    padding: 15px;
}
</style>
```

## css怎么实现单行，多行文本溢出隐藏
**单行文本溢出隐藏**

```css
white-space: nowrap; //防止文本换行，强制所有文本显示在同一行。

overflow: hidden;//将隐藏超出容器边界的所有内容。

text-overflow: ellipsis;//文本溢出时，用省略号 (...) 来表示被裁剪的文本。 默认则是clip,直接裁剪
```

**多行文本溢出隐藏**

主要依靠`webkit-line-clamp`属性

```css
overflow: hidden;//隐藏溢出内容。

text-overflow: ellipsis;//溢出时显示省略号。

display: -webkit-box;//将元素设置为弹性伸缩盒模型。

-webkit-box-orient: vertical;//将伸缩盒对象的子元素排列方式设置为垂直方向。

-webkit-line-clamp: N;//限制文本显示在指定的行数 N 内。
```

例子

```html
<h2>多行文本溢出隐藏 (限制 3 行)</h2>
    <div class="multi-line-ellipsis">
        这是一段非常非常长的多行文本内容，它的目的是为了演示在 CSS 中如何实现
      文本溢出隐藏的效果。当文本内容超出预设的行数时，它将会被裁剪掉，并在末尾显示一个省略号，
      以提示用户还有更多内容。这种方法在展示摘要或有限空间内的文本时非常有用。
      请仔细观察当文本超过三行时，是如何被隐藏并显示省略号的。
    </div>
<style>
        .multi-line-ellipsis {
            width: 300px; /* 设定一个固定宽度 */
            height: 60px; /* 设定一个固定高度，确保文本能溢出 */
            border: 1px solid #ccc;
            padding: 10px;
            margin-bottom: 20px;
            line-height: 1.5; /* 通常需要设置行高以确保精确的行数计算 */
            
            /* 核心 CSS 属性 */
            overflow: hidden;           /* 1. 隐藏溢出部分 */
            text-overflow: ellipsis;    /* 2. 溢出部分显示省略号 */
            display: -webkit-box;       /* 3. 将对象作为弹性伸缩盒子模型显示 */
            -webkit-box-orient: vertical; /* 4. 设置或检索伸缩盒对象的子元素的排列方式 */
            -webkit-line-clamp: 3;      /* 5. 限制在一个块元素显示的文本的行数 */
            /* 注意：-webkit-line-clamp 是一个非标准属性，但目前兼容性良好 */
        }
    </style>
```



## css动画有哪些
元素从一种样式过渡到另外一种样式的过程

实现动画有如下几种方式

+ `transition` 渐变
+ `transform` 转变
+ `animation` 自定义



**transition**:只需要定义元素起始和结束状态，浏览器自动计算过渡帧数,css属性如下：

+ `transition-property`：用于指定哪个css属性应用过渡效果，默认：`**all**`，可以指定具体属性（如`background-color`，`transform`，`opacity`）
+ `transition-duartion`：定义过渡效果完成所需的时间，s，ms
+ `transition-timing-function`：定义过渡的速度曲线，有`linear`（匀速），`ease`（慢 快 慢），`ease-in` （慢慢变快），`ease-out`（慢慢变慢），`ease-in-out`（快 慢）
+ `**transition-delay**`: 定义过渡开始前的延迟时间。值：时间单位 (s 或 ms)。

例子：

```html
<body>
    <button class="btn-transition">鼠标移上来</button>
</body>

<style>
.btn-transition {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;

    /* 定义过渡效果 */
    transition: background-color 0.3s ease-in-out, /* 背景色过渡 0.3秒 */
                transform 0.3s ease-in-out;        /* 大小过渡 0.3秒 */
    /* 也可以使用简写：transition: all 0.3s ease-in-out; */
}

.btn-transition:hover {
    background-color: #0056b3; /* 悬停时的背景色 */
    transform: scale(1.1);     /* 悬停时放大 1.1 倍 */
}
</style>
```



`transform`:用于对元素进行静态的二维或三维空间变化，例如平移，旋转，缩放，倾斜等，不会影响文档流，利用GPU进行加速，性能好。

+ <font style="color:rgb(44, 62, 80);">注意的是，</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">transform</font>`<font style="color:rgb(44, 62, 80);">不支持</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">inline</font>`<font style="color:rgb(44, 62, 80);">元素，使用前把它变成</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">block</font>`

css属性如下：

+ 二维
    - translate(x,y)
    - `translate(x, y)`: 平移 (x, y)
    - `translateX(x)`: 水平平移
    - `translateY(y)`: 垂直平移
    - `scale(sx, sy)`: 缩放 (x, y)
    - `scaleX(sx)`: 水平缩放
    - `scaleY(sy)`: 垂直缩放
    - `rotate(angle)`: 旋转 (如 `45deg`)
    - `skew(ax, ay)`: 倾斜 (x, y 轴)
+ **三维变换** (需要 `transform-style: preserve-3d;` 和 `perspective` 配合)：
    - `translate3d(x, y, z)`
    - `scale3d(sx, sy, sz)`
    - `rotateX(angle)`
    - `rotateY(angle)`
    - `rotateZ(angle)`
    - `rotate3d(x, y, z, angle)`
+ `**transform-origin**`: 设置变换的基点（默认为元素中心）

```html
<body>
    <div class="box-transform"></div>
</body>

<style>
.box-transform {
    width: 100px;
    height: 100px;
    background-color: #ffc107;
    margin: 50px;
    border-radius: 10px;
    
    /* 结合 transition 实现平滑的动画 */
    transition: transform 0.5s ease-in-out;
}

.box-transform:hover {
    transform: rotate(45deg) scale(1.2); /* 悬停时旋转 45 度并放大 */
}
</style>
```



`animation`：结合`@keyframs`规则，可以创建多步骤，循环的自定义动画，有如下属性

+ `@keyframs name{}`:指定动画名称和时间段（0%-100%， from/to ）样式
+ `animation-name`: 指定要应用的 `@keyframes` 动画的名称。
+ `animation-duration`: 定义动画完成一个周期所需的时间。
+ `animation-timing-function`: 定义动画的速度曲线。
+ `animation-delay`: 定义动画开始前的延迟时间。
+ `animation-iteration-count`: 定义动画重复的次数 (数字或 `infinite`)。
+ `animation-direction`: 定义动画在每次循环中是否反向播放 (`normal`, `reverse`, `alternate`, `alternate-reverse`)。

例子

```html
<body>
    <div class="box-animation"></div>
</body>

<style>
/* 定义动画的关键帧 */
@keyframes slide-and-fade {
    0% {
        transform: translateX(0);
        opacity: 1;
        background-color: purple;
    }
    50% {
        transform: translateX(200px); /* 向右移动 200px */
        opacity: 0.5; /* 半透明 */
        background-color: orange;
    }
    100% {
        transform: translateX(0);
        opacity: 1;
        background-color: purple;
    }
}

.box-animation {
    width: 100px;
    height: 100px;
    background-color: purple;
    margin-top: 50px;
    border-radius: 10px;
    position: relative; /* 确保 transform 能够相对定位 */

    /* 应用动画 */
    animation: slide-and-fade 2s ease infinite alternate;
    /* 动画名称 持续时间 速度曲线 重复次数 播放方向 */
}
</style>
```

总结：

| 特性 / 属性 | transition | transform | animation |
| :---: | :---: | :---: | :---: |
| 用途 | 元素状态变化时的平滑过渡 | 对元素进行空间变换 (平移/旋转/缩放/倾斜) | 创建自定义、多步骤、循环的动画 |
| 触发方式 | 元素状态改变 <br/>(如 :hover, :active, JS 添加/移除类) | 自身不触发动画，需结合 transition 或 animation | 自动播放，或通过 JS 控制播放/暂停 |
| 关键帧 | 只有开始和结束状态，中间由浏览器补间 | 仅定义变换的最终状态 | 通过 @keyframes 定义多个关键帧 |
| 循环 | 不支持直接循环 | 不支持直接循环 | 支持无限循环 (infinite) |
| 控制 | 较少，主要通过状态变化 | 静态变换，配合其他属性控制动画 | 通过多个子属性进行详细控制 |
| 性能 | 良好，常利用硬件加速 | 极佳，常利用硬件加速 | 良好，常利用硬件加速 |




## 说一下对媒体查询的理解
<font style="color:rgb(31, 35, 40);">媒体查询（Media Query）用于</font>**<font style="color:rgb(31, 35, 40);">针对不同的设备类型或设备特性应用不同的样式</font>**<font style="color:rgb(31, 35, 40);"></font>

```css
/* 直接在CSS文件中使用 */
@media (min-width: 600px) {
  body {
    background-color: lightblue;
  }
}

/* 通过link标签 */
<link rel="stylesheet" media="screen and (max-width: 600px)" href="style.css">

/* 使用import语句 */
@import url("style.css") screen and (max-width: 600px);

```

例子：

```html
 <div class="responsive-box">
            这个方块的宽度和背景色会根据屏幕尺寸变化。
  </div>
  <style>
    .responsive-box {
    width: 90%; /* 默认宽度 */
    height: 100px;
    background-color: lightblue;
    margin: 20px auto;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
    text-align: center;
    transition: all 0.3s ease; /* 为了观察变化时的平滑过渡 */
}
/* 当屏幕宽度小于或等于 768px 时应用（通常用于平板电脑及以下） */
@media screen and (max-width: 768px) {
 
    .responsive-box {
        width: 80%; /* 宽度缩小 */
        background-color: lightgreen;
    }

}
    
  </style>
```



## 如何实现网页的两栏布局
1.`flex`布局

+ 核心思想：父元素设置为`flex`容器，利用`flex`属性控制`flex item`

```html
<body>
    <div class="flex-container">
        <div class="left-sidebar">左侧栏</div>
        <div class="main-content">
            <p>这是主要内容区域。使用 Flexbox 实现两栏布局非常方便，只需将父容器设置为 `display: flex;`，然后控制子元素的宽度即可。</p>
            <p>左侧栏固定宽度，右侧内容区自适应。</p>
        </div>
    </div>
</body>

<style>
.flex-container {
    display: flex; /* 开启 Flex 布局 */
    width: 100%;
    min-height: 300px; /* 示例高度 */
    border: 2px dashed #ccc;
}

.left-sidebar {
    width: 100px; /* 固定左侧栏宽度 */
    background-color: #f0f8ff;
    padding: 15px;
    border-right: 1px solid #ddd;
    flex-shrink: 0; /* 防止左侧栏被压缩 */
}

.main-content {
    flex-grow: 1; /* 右侧内容区域占据剩余空间 */
    background-color: #e0ffff;
    padding: 15px;
}
</style>
```

2.`grid`布局

+ 将父元素设置为grid容器，通过网格模板定义列结构

```html
<body>
    <div class="grid-container">
        <div class="left-sidebar-grid">左侧栏</div>
        <div class="main-content-grid">
            <p>这是主要内容区域。使用 Grid 布局也可以轻松实现两栏布局。</p>
            <p>可以精确控制列的宽度，甚至使用 `fr` 单位来实现自适应布局。</p>
        </div>
    </div>
</body>

<style>
.grid-container {
    display: grid; /* 开启 Grid 布局 */
    /* 定义两列：第一列固定 200px，第二列占据剩余空间 */
    grid-template-columns: 200px 1fr;
    width: 100%;
    min-height: 300px; /* 示例高度 */
    border: 2px dashed #ccc;
}

.left-sidebar-grid {
    background-color: #f0f8ff;
    padding: 15px;
    border-right: 1px solid #ddd;
}

.main-content-grid {
    background-color: #e0ffff;
    padding: 15px;
}
</style>
```

3.`float`

+ 左侧栏浮动到左侧，右侧内容设置左边距，父容器清除浮动(利用之前说到的BFC)

```html
<body>
    <div class="float-container clearfix"> <div class="left-sidebar-float">左侧栏</div>
        <div class="main-content-float">
            <p>这是主要内容区域。使用浮动实现两栏布局是传统方法，需要特别注意清除浮动。</p>
            <p>左侧栏浮动到左侧，右侧内容区设置左外边距来留出空间。</p>
            <p>父容器需要通过 `clearfix` 类清除浮动，以避免高度塌陷。</p>
        </div>
    </div>
</body>

<style>
.float-container {
    width: 100%;
    min-height: 300px; /* 示例高度 */
    border: 2px dashed #ccc;
    /* 注意：这里不需要设置 overflow: hidden; 来清除浮动，因为我们使用了 clearfix */
}

.left-sidebar-float {
    float: left; /* 左侧栏向左浮动 */
    width: 200px; /* 固定左侧栏宽度 */
    background-color: #f0f8ff;
    border-right: 1px solid #ddd;
}

.main-content-float {
    /* 右侧内容区通过左外边距避开左侧栏 */
    margin-left: 201px; /* 200px (左侧栏宽度) + 1px (边框) */
    background-color: #e0ffff;
    padding: 15px;
}

/* 清除浮动：使用伪元素 (推荐) */
.clearfix::after {
    content: "";
    display: block;
    clear: both;
}
/* 或 .float-container { overflow: hidden; } 也能创建BFC来清除浮动，但可能会裁剪内容 */
</style>
```



## 如何实现网页的三栏布局
1.flex

+ **推荐**，适合用于中间栏自适应

```html
<body>
    <div class="flex-container-three">
        <div class="left-sidebar-flex">左侧栏</div>
        <div class="main-content-flex">
            <p>这是主要内容区域。Flexbox 在实现三栏布局时非常方便。</p>
            <p>通过 `flex-grow: 1;` 让中间内容区域自动填充可用空间，而左右侧栏可以固定宽度。</p>
        </div>
        <div class="right-sidebar-flex">右侧栏</div>
    </div>
</body>

<style>
.flex-container-three {
    display: flex; /* 开启 Flex 布局 */
    width: 100%;
    min-height: 300px; 
    border: 2px dashed #ccc;
}

.left-sidebar-flex, .right-sidebar-flex {
    width: 180px; /* 左右侧栏固定宽度 */
    background-color: #f0f8ff;
    padding: 15px;
    flex-shrink: 0; /* 防止左右侧栏被压缩 */
}

.left-sidebar-flex {
    border-right: 1px solid #ddd;
}

.right-sidebar-flex {
    border-left: 1px solid #ddd;
}

.main-content-flex {
    flex-grow: 1; /* 中间内容区域占据剩余空间 */
    background-color: #e0ffff;
    padding: 15px;
}
</style>
```

2.`grid`

+ 方法类似两栏布局，在父容器中设置 具体宽度即可

```html
<body>
    <div class="grid-container-three">
        <div class="left-sidebar-grid">左侧栏</div>
        <div class="main-content-grid">
            <p>这是主要内容区域。Grid 布局在实现三栏布局时非常直观和强大。</p>
            <p>你可以使用 `fr` 单位来实现中间列的自适应，也可以定义固定像素宽度的列。</p>
        </div>
        <div class="right-sidebar-grid">右侧栏</div>
    </div>
</body>

<style>
.grid-container-three {
    display: grid; /* 开启 Grid 布局 */
    /* 定义三列：左侧 180px，中间自适应 (1fr)，右侧 180px */
    grid-template-columns: 40px 1fr 40px;
    width: 100%;
    min-height: 300px; /* 示例高度 */
    border: 2px dashed #ccc;
}

.left-sidebar-grid, .right-sidebar-grid {
    background-color: #f0f8ff;
    padding: 15px;
    text-align:center
}

</style>
```

3.`float`

+ 左右浮动，中间设置margin

```html
<body>
    <div class="float-container-three clearfix"> <div class="left-sidebar-float">左侧栏</div>
        <div class="right-sidebar-float">右侧栏</div>
        <div class="main-content-float">
            <p>这是主要内容区域。使用浮动实现三栏布局需要更仔细地处理。</p>
            <p>左右侧栏分别浮动，中间内容区需要设置左右外边距来避免与浮动元素重叠。同时，父容器必须清除浮动。</p>
        </div>
    </div>
</body>

<style>
.float-container-three {
    width: 100%;
    border: 2px dashed #ccc;
}

.left-sidebar-float {
    float: left; /* 左侧栏左浮动 */
    width: 180px; /* 固定宽度 */
    background-color: #f0f8ff;
}

.right-sidebar-float {
    float: right; /* 右侧栏右浮动 */
    width: 180px; /* 固定宽度 */
    background-color: #f0f8ff;
}

.main-content-float {
    /* 中间内容区设置左右外边距，避开浮动元素 */
    margin-left: 181px; /* 左侧栏宽度 + 边框 */
    margin-right: 181px; /* 右侧栏宽度 + 边框 */
    background-color: #e0ffff;
}

/* 清除浮动：使用伪元素 */
.clearfix::after {
    content: "";
    display: block;
    clear: both;
}
</style>
```



## 说一下`grid`布局
`grid`布局由一个_网格容器_与其内部的_网格项目_组成

1. 启用grid布局

```css
.container {
  display: grid;        /* 块级网格容器 */
  /* 或 */
  display: inline-grid; /* 行内网格容器 */
}
```

2.定义网格的列和行的数量及大小:`grid-template-columns` 和 `grid-template-rows`

```css
grid-template-columns:100px 200px 1fr;
/* 百分比 */
grid-template-columns: 25% 50% 25%;

/*fr：分数单位，表示占据可用空间的比例  */
grid-template-columns: repeat(3, 1fr); (三列，每列等宽)

/* (自动填充列，每列最小 200px，最大占据 1fr) */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
```

示例 

```html
<div class="grid-container">
      <div class="content-box">content</div>
      <div class="content-box">content</div>
      <div class="content-box">content</div>
      <div class="content-box">content</div>
      <div class="content-box">content</div>
      <div class="content-box">content</div>
      <div class="content-box">content</div>
     
    </div>
     <style>
      .grid-container {
        display: grid;
        /* grid-template-columns: repeat(4,1fr); */
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        width: 80%;
        min-height: 300px;
        background-color: beige;
        border-radius: 5px;
        margin: auto;
        gap: 30px;
        padding: 10px;
      }

      .content-box {
        height: 100px;
        background-color: burlywood;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 5px;
      }
    </style>
```

3.`grid-gap` (`gap`)

+ 用于设置网格行和列之间的间隙

```css
grid-row-gap: 设置行间隙
grid-column-gap: 设置列间隙
gap: 20px 10px; (行间隙 20px，列间隙 10px) 
```



`grid`项目属性

1.`grid-column` 和 `grid-row`

+ 用于定义网格项目跨越的行和列
+ 包括 `start-line / end-line`: 通过网格线编号指定起始和结束线  

```css
.box1{
        grid-row: 1/3;
        grid-column: 1/3; 从第 1 列线到第 3 列线，占据两列
      }
```



## 如何理解回流和重绘，什么场景会触发
### 什么是回流 (Reflow) 和重绘 (Repaint)？
可以把浏览器渲染页面的过程想象成画一幅画：

1. **浏览器解析 HTML 和 CSS**：这相当于画家在草稿纸上规划画面的布局，确定每个物体的位置和大小。
2. **构建渲染树 (Render Tree)**：这是将 DOM 树和 CSSOM 树结合起来，生成一个包含所有可见元素及其计算后样式（位置、大小、颜色等）的树状结构。
3. **布局 (Layout) / 回流 (Reflow) / 重排 (Relayout)**：
    - **概念：** 当渲染树中的**部分或全部元素**的尺寸、位置、布局等几何属性发生变化时，浏览器需要重新计算这些元素的几何属性，并将它们重新放置在屏幕上的正确位置。这个过程就叫做**回流**。
    - **理解：** 想象画家发现画中的某个物体（比如一棵树）变大了，它周围的物体就必须挪动位置，甚至整个画面的布局都要重新调整，以适应这棵变大的树。这是一个非常耗时的过程，因为它可能影响到很多其他元素。
4. **绘制 (Painting) / 重绘 (Repaint)**：
    - **概念：** 当元素的**可见样式**发生改变，但其几何属性（位置、大小等）没有变化时，浏览器会将重新绘制受影响的元素，将其新的样式（如颜色、背景、阴影等）呈现在屏幕上。
    - **理解：** 想象画家只是改变了画中某个物体的颜色，但它的大小和位置都没有变。这时，画家只需重新涂色，不需要挪动其他物体，相对而言比调整布局要快得多。

**核心区别：**

+ **回流**是**布局层面的变化**，它一定会伴随**重绘**。
+ **重绘**是**样式层面的变化**，不一定会触发回流。

**性能开销：**

+ **回流的开销远大于重绘**。因为回流需要重新计算布局，这可能导致浏览器重新构建渲染树的很大一部分，甚至整个文档，从而触发后续的重绘。重绘则只需要更新元素的像素。因此，应尽量避免不必要的回流。

---

### 什么场景下会触发回流和重绘？
**会触发回流的场景（同时会触发重绘）：**

任何导致元素几何属性（位置、大小、形状等）变化的操作，都可能触发回流。

1. **改变 DOM 元素的几何属性**：
    - **元素尺寸变化**：`width`, `height`, `margin`, `padding`, `border` 改变。
    - **位置变化**：`top`, `left`, `right`, `bottom` 改变 (当使用 `position: relative`, `position: absolute`, `position: fixed` 等定位时)。
    - **字体属性变化**：`font-size`, `font-family` 改变，这会影响文本的宽高。
    - **文本内容变化**：文本数量或内容改变，可能导致元素大小变化。
    - **滚动条出现或消失**：改变了视口的可用空间。
    - `overflow`** 属性的变化**：例如从 `hidden` 变为 `scroll`。
2. **DOM 结构变化**：
    - **添加或删除可见的 DOM 元素**。
    - **移动 DOM 元素**。
3. **计算样式 (Computed Style) 的请求**：
    - 当你通过 JavaScript 请求某些会强制浏览器计算布局的属性时，即使你没有修改它们，也会触发回流。这是因为浏览器需要最新的布局信息才能返回正确的值。常见的有：
        * `offsetTop`, `offsetLeft`, `offsetWidth`, `offsetHeight`
        * `scrollTop`, `scrollLeft`, `scrollWidth`, `scrollHeight`
        * `clientTop`, `clientLeft`, `clientWidth`, `clientHeight`
        * `getComputedStyle()` 或 `currentStyle` (获取元素的所有计算后样式)
        * 读取元素的任何几何属性（例如 `elem.getBoundingClientRect()`）。
    - **注意：** 如果在读取这些属性后，又修改了导致回流的样式，浏览器可能会为了优化而将多次回流合并。但为了安全起见，尽量避免在短时间内频繁读写可能触发回流的属性。
4. **改变浏览器窗口大小 (Resize)**：
    - 调整浏览器窗口大小时，页面布局会重新计算。
5. **CSS 伪类激活**：
    - 例如 `:hover` 伪类中改变了元素的几何属性（如 `width`）。

**仅触发重绘的场景 (不触发回流)：**

如下变化只会影响元素的视觉外观，而不会影响其布局。

1. **颜色变化**：`color`, `background-color`。
2. **背景变化**：`background-image`, `background-position`, `background-repeat`。
3. **边框颜色/样式变化**：`border-color`, `border-style` (不改变宽度)。
4. **可见性变化**：`visibility` (但 `display: none` 会触发回流)。
5. **文本装饰**：`text-decoration`。
6. **阴影**：`box-shadow`, `text-shadow`。
7. `outline`** 属性**。
8. `opacity`** 属性**：透明度变化。
9. `transform`** 属性**：平移、旋转、缩放等，现代浏览器会将其推到 GPU 进行处理，通常不会引起回流和重绘，而是**复合层 (Compositing Layer)** 的变化。

### 优化策略
+ **避免频繁操作 DOM**：批量处理 DOM 操作，例如使用 `DocumentFragment` 或将元素设置为 `display: none` 后再进行多次操作，操作完成后再显示
+ **避免频繁读取会触发回流的属性**：将这些值缓存起来，避免重复计算
+ **使用 CSS **`transform`** 和 **`opacity`** 进行动画**：这些属性通常可以由 GPU 加速，不会引起回流和重绘
+ **避免使用 **`table`** 布局**：`table` 布局的元素在改变时，会因为其复杂的布局特性而更容易触发整个表格甚至整个页面的回流
+ **将动画元素脱离文档流**：使用 `position: absolute` 或 `position: fixed`，使动画元素的回流影响范围局限在自身，不影响其他元素
+ **使用 **`will-change`** 属性**：提前告知浏览器哪些属性会发生变化，让浏览器进行优化
+ **改变class**类名来修改样式，

```javascript
const container = document.getElementById('container')
container.style.width = '100px'
container.style.height = '200px'
container.style.border = '10px solid red'
container.style.color = 'red'

// 可以修改为
<style>
    .basic_style {
        width: 100px;
        height: 200px;
        border: 10px solid red;
        color: red;
    }
</style>
<script>
    const container = document.getElementById('container')
    container.classList.add('basic_style')
</script>
```



## 如何定位一个页面渲染性能问题？

**核心结论**：不要只凭经验说“`transform` 比 `top` 快”或“少写选择器就能优化”。先录制浏览器 trace，确认时间实际消耗在 JS、样式计算、布局、绘制还是合成，再针对瓶颈处理。

### 浏览器渲染流水线

```latex
DOM + CSSOM
  -> Style：计算每个节点最终生效的样式
  -> Layout：计算盒模型、尺寸和位置
  -> Paint：把文字、背景、边框、阴影等绘制成绘制指令
  -> Composite：组合图层并显示到屏幕
```

一次改动不一定会走完整条流水线：

- 改 `width`、`font-size`、插入会影响尺寸的内容，通常会触发 `Layout -> Paint -> Composite`。
- 改背景、阴影、颜色，通常不需要重新布局，但可能需要 `Paint -> Composite`。
- 改 `transform`、`opacity` 有机会只进入 `Composite`，但是否能在合成器处理取决于元素是否被提升为图层、是否有滤镜/遮罩、图层大小等，不能把“GPU 加速”当成结论。

### 实际定位步骤

1. 打开 Chrome DevTools 的 **Performance**，录制卡顿发生的操作，例如滚动、展开 Markdown、流式追加消息。
2. 先看 Main 线程：长时间黄色块通常是 JS，紫色块通常是 Style/Layout，绿色块通常是 Paint。
3. 点开耗时任务，确认是哪个组件、哪次 DOM 更新或哪条样式变更触发；不要只看总耗时。
4. 打开 **Rendering** 中的 Paint flashing 和 Layout Shift Regions，确认是否在反复重绘，或内容加载导致页面位移。
5. 用 **Layers** 检查图层数量和尺寸。图层不是越多越好，过多图层会增加显存与合成成本。

### 根据证据优化

| Trace 现象 | 常见原因 | 优先处理方式 |
| --- | --- | --- |
| JS 长任务 | 每个 token/滚动事件都同步更新 UI；大量同步解析 | 缓冲数据，在 `requestAnimationFrame` 或短时间窗口内批量提交；把重解析延后到流结束 |
| Style/Layout 频繁出现 | 交替读写布局，如读 `offsetHeight` 后马上改样式；内容尺寸反复变化 | 先集中读取再集中写入；给图片、卡片预留稳定尺寸；用 `contain` 缩小影响范围 |
| Paint 很长 | 大面积模糊阴影、`filter`、`backdrop-filter`、复杂裁剪频繁变化 | 缩小绘制区域，降低效果复杂度，避免对大面积元素做高频视觉变化 |
| Composite 很长或掉帧 | 大图层移动、图层过多、频繁创建/销毁图层 | 控制动画元素和图层数量；只对短时动画谨慎使用 `will-change` |

**一个常见误区**：把多条内联样式改成一次 `classList.add()`，确实更利于集中管理样式，但它不天然保证只发生一次布局。浏览器本身会批处理更新；真正容易强制同步布局的是“写样式 -> 读几何信息 -> 再写样式”的读写交错。

> 面试版口述：页面卡顿时，我不会先背哪些 CSS 属性慢，而是先在 Performance 里录制操作。浏览器大致经过 Style、Layout、Paint、Composite 四步，我会先判断耗时在主线程的 JS、布局、绘制还是合成。如果是流式内容每个 token 都触发更新，问题通常先在 JS 和频繁布局，我会做缓冲并按帧批量更新；如果是阴影、滤镜导致 Paint 很长，就缩小效果范围；如果是布局变化，就检查是否读写交错、图片和异步内容是否预留尺寸。`transform` 和 `opacity` 通常更适合动画，因为有机会只做合成，但最终仍以 trace 为准。


## 长列表或长文档如何用 CSS 减少渲染成本？`content-visibility` 能替代虚拟列表吗？

**核心结论**：`content-visibility` 解决的是“屏幕外内容暂时少布局、少绘制”，虚拟列表解决的是“屏幕外内容根本不保留在 DOM”。消息量不大但单条内容复杂时优先考虑前者；消息数量持续增长时，虚拟列表仍不可替代。

### `content-visibility` 解决什么问题

长聊天记录、Markdown 文档、工具调用日志通常已经在 DOM 中，但用户当前只能看到很小一部分。对屏幕外消息使用：

```css
.chat-message {
  content-visibility: auto;
  contain-intrinsic-block-size: 240px;
}
```

- `content-visibility: auto`：元素离开视口后，浏览器可以跳过其子树的渲染工作；进入视口时再恢复。
- `contain-intrinsic-block-size`：为未渲染内容提供预估高度，避免浏览器不知道它占多大空间而让滚动条跳动。
- 预估高度要来自真实消息的典型高度。估得太小或太大，元素首次进入视口时仍会修正尺寸，所以它是减少成本的手段，不是消除布局变化的魔法。

适合的场景：单条消息有代码块、表格、图片、SVG 图表，页面存在几十到几百个已完成消息，但当前只浏览其中一段。

### `contain` 应该怎么用

```css
.message-card {
  contain: layout paint;
}
```

`contain` 的价值是把组件的布局或绘制影响限制在边界内：一个消息卡片内部更新时，浏览器不必把整页都当作可能受影响的区域。它适合边界清晰、相互独立的消息卡片、日志项和侧栏模块。

但 `contain` 有代价：`paint` containment 会裁剪绘制溢出内容，布局 containment 也会改变尺寸计算边界。因此下拉菜单、悬浮提示、`position: sticky` 等依赖外部布局或溢出的元素，不能不加验证地放进 containment 容器。

### 为什么它不能替代虚拟列表

| 对比项 | `content-visibility` | 虚拟列表 |
| --- | --- | --- |
| 屏幕外 DOM | 仍存在 | 被卸载或不创建 |
| 内存、事件监听、DOM 查询成本 | 仍会随总消息数增长 | 主要与可视区数量相关 |
| 屏幕外布局和绘制 | 可跳过 | 不发生 |
| 适用场景 | 内容复杂、总量中等、改造成本低 | 无限滚动、会话极长、列表项数量持续增长 |

实际项目中可以组合：虚拟列表控制 DOM 数量，已挂载但暂时不可见的复杂消息用 `content-visibility` 减少绘制；图片、流程图等异步内容用 `aspect-ratio` 或明确宽高预留空间，避免它们完成加载后把阅读位置顶走。

> 面试版口述：长对话的性能不能只看“有没有虚拟列表”。如果问题是几百条消息都在 DOM 中、每条 Markdown 又有代码高亮和图表，`content-visibility: auto` 可以让浏览器跳过屏幕外内容的渲染；但 DOM、内存和事件成本还在，所以它不能代替虚拟列表。我的判断标准是总节点数和会话增长是否无上限：总量中等、单条复杂时先用 `content-visibility` 和 `contain`；无限会话或超长日志必须上虚拟列表。使用 containment 前还要检查菜单、tooltip、sticky 是否被裁剪或改变定位。


## 说一下网页元素的层叠顺序
网页元素的层叠顺序主要由`z-index`决定，`z-index`值越大，元素堆叠顺序越靠前

层叠上下文中，如下情况会创建层叠上下文。

+ `position`为`absolute`,`relative`,`fixed`,`sticky`,且`z-index`不为`auto`
+ `flex`，`grid`容器的子元素，且`z-index`不为`auto`
+ `opacity`小于1
+ `transform`的属性不为`none`，例如` transform: scale(1)  `

注：其中`z-index` 只在**同一个层叠上下文内部有效**  ，** 层叠上下文是独立的  **

1.默认层叠顺序

+ 没有指定z-index，浏览器按照DOM树出现的顺序进行堆叠，DOM树中靠后的元素层级更高，
+ 同时`z-index`只对已定位的元素生效，**非定位元素无效**

2.层叠顺序规则

+ 

> ⬆️ 高  
                +----+  
                |  7. 定位元素（z-index > 0） |  
                |------------------|  
                |  6. 定位元素（z-index: 0 / auto）及其他创建层叠上下文的元素 |  
                |------------------|  
                |  5. 非定位的内联/行内块级元素 |  
                |------------------|  
                |  4. 浮动元素             |  
                |------------------|  
                |  3. 非定位的块级元素      |  
                |------------------|  
                |  2. 定位元素（z-index < 0） |  
                |------------------|  
                |  1. 元素背景和边框        |  
                +----+  
          ⬇️ 低
>

看一个典型例子

```html
<div class="container-a">
  <div class="box-a box-a1">Box A1 (z-index: 10)</div>
  <div class="box-a box-a2">Box A2 (z-index: 5)</div>
</div>

<div class="container-b">
  <div class="box-b box-b1">Box B1 (z-index: 100)</div>
  <div class="box-b box-b2">Box B2 (z-index: 50)</div>
</div>
<style>
  .container-a, .container-b {
    width: 250px;
    height: 150px;
    margin-bottom: 50px;
    border: 2px dashed #ccc;
    position: relative; /* 使子元素可以相对于它定位 */
  }

  .box-a, .box-b {
    width: 150px;
    height: 80px;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-weight: bold;
    font-size: 1.1em;
    border-radius: 5px;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
  }

  /* Container A 的样式：不创建新的层叠上下文（相对于 body 根层叠上下文） */
  .container-a {
    background-color: #f0f0f0;
  }
  .box-a1 {
    background-color: #ff6347; 
    top: 20px;
    left: 20px;
    z-index: 10; /* 相对于 body 的 z-index */
  }
  .box-a2 {
    background-color: #4682b4; 
    top: 50px;
    left: 50px;
    z-index: 5; /* 相对于 body 的 z-index */
  }


  /* Container B 的样式：创建一个新的层叠上下文 */
  .container-b {

    background-color: #e0e0e0;
    transform: translateX(0); /* 触发创建新的层叠上下文 */
    /* 或者 opacity: 0.99; 或 z-index: 1; 等 */
  }
  .box-b1 {
    background-color: #20b2aa; 
    top: 20px;
    left: 20px;
    z-index: 100; /* 注意这个z-index，它只在 container-b 内部有意义 */
  }
  .box-b2 {
    background-color: #daa520; 
    top: 50px;
    left: 50px;
    z-index: 50; /* 注意这个z-index */
  }
</style>
```

分析：在`containerA`中，`box-a1`，`box-a2`中的`z-index`都是基于`body`的，在containerB中，创建了内部的层叠上下文，`box-b1` (z-index: 100) 会显示在 `box-b2` (z-index: 50) 上方  



## 说一下CSS新特性
1. 属性值选择器，例如`[attr^=value]`：匹配属性值以 `value` 开头的元素  
2. 结构伪类元素，例如 `:first-child`  ，`:nth-child(n)` 
3. 边框，包括 `border-radius`  ，`box-shadow `，`border-image`
4. 背景，`background-size`：控制背景图片的尺寸 ，`background-origin`：指定背景图片的定位区域 ，`background-clip`：指定背景图片的裁剪区域   
5. 文本效果，包括`text-shadow`,`word-break`,`text-overflow`,
6. 颜色和透明度，例如RGBA： 在 RGB 颜色的基础上增加了`Alpha (透明度)` 通道 ，`opacity`
7. `transform`，`transition`，`animation`
8. `flex-layout`,`grid-layout`
9. 媒体查询`@media `
10. 自定义属性，例如`css变量`，`--variable-name: value; `  `var(--variable-name);`  



##  在网页输入url，页面渲染出来的全部流程是什么  
1.URL解析与DNS查询

+ 浏览器解析输入的URL，如`http/https`,`www.example.com`,端口号`80/43`,路径`/path`
+ DNS查询，浏览器检查本地的DNS缓存，如果查到对应IP则直接使用，没有则会向DNS客户端发起请求

2.建立TCP连接（三次握手）

+ 有目标服务器的`IP`之后，浏览器与服务器建立TCP（ `Transmission Control Protocol ` ）连接，这个过程称作三次握手。

3.发送HTTP请求

+ TCP建立之后，浏览器会构造并向服务器发送HTTP请求，请求通常包含
    - 请求行：请求方式（`GET,POST`），`URL`，`HTTP`协议版本
    - 请求头：客户端信息，例如：`User-Agent` (浏览器类型)、`Accept` (接受的文件类型)、`Cookie` (会话信息)、`Cache-Control` (缓存控制)  
    - 请求体：对于`POST`请求，包含表单数据

4.服务器响应请求并返回HTTP响应

+ HTTP响应通常包含：
    - 状态行：HTTP协议版本，状态码（200 OK， 404 Not Found、500 Internal Server Error 等）、状态信息  ）
    - 响应头（response headers）：包含服务器信息，例如`content-type`（返回内容类型，`text/html`,`application/json`），`content-length`（内容长度），`Set-Cookie` (设置 Cookie)、`Cache-Control` (缓存控制)  
    - 响应体：实际返回的HTML，CSS，Javascript，图片等资源

5.浏览器解析响应并渲染到具体页面

+ **整个流程最关键的阶段**
+ 1.**解析HTML创建DOM（Document Object Model）树**
    - 遇到标签创建对应DOM节点，按照层级关系建立DOM树
    - 构建DOM是渐进的过程，边下载边解析
+ 2.**解析CSS并建立CSS树**
    - CSS是阻塞渲染的资源，必须等到所有的CSS文件下载完成解析后，才会进行构造渲染树
+ 3.**构造渲染树Render Tree**
    - 当DOM树,，CSS树构建完成后，浏览器会进行合并，构建**渲染树**
    - 渲染树只包含渲染可见的节点（例`display:none`不会出现在渲染树）
+ 4.**布局（**`**Layout**`**）/回流（**`**Refolw**`**）/重排（**`**Relayout**`**）**
    - 浏览器根据渲染树计算每个可见元素的几何信息，包括在屏幕上的确切位置和尺寸
    - 这个过程是**回流**，它决定了元素在屏幕上的最终排列方
+ **5.绘制（**`**painting**`**）和重绘（**`**repaint**`**）**
    - 布局完成后，浏览器根据布局的样式信息绘制到屏幕上
+ **6.复合**`**composition**`
    - 为了优化性能，浏览器会将页面分成多个层（Layer）。例如，有动画效果的元素、使用 `transform` 或 `opacity` 的元素，通常会被提升到单独的层。
    - 复合是将这些独立的层按照正确的顺序堆叠在一起，最终显示在屏幕上。这个过程通常由 GPU 加速，性能非常好。

6.`Javascript`执行

+ `**JavaScript**`** 是阻塞 **`**HTML**`** 解析的资源**：因为 JavaScript 可能会修改 `DOM` 和 `CSSOM`，所以浏览器会等待脚本执行完毕才能继续解析 HTML。为了避免阻塞，通常将 `<script>` 标签放在 `<body>` 底部  



## 说一下对`sticky`定位的理解
+ 完美结合了`relative`，`fixed`优点，可以使元素在滚动的时候像普通元素滚动，达到某个“阈值”，“粘”在某个位置，像`fixed`定位一样，直到父容器不可见才脱离。
+ **工作原理**：<font style="color:rgb(31, 35, 40);">元素在没有达到指定的方向位置时，它表现为相对定位（</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">position: relative</font>`<font style="color:rgb(31, 35, 40);">）；而一旦达到其滚动位置时，它便切换为固定定位（</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">position: fixed</font>`<font style="color:rgb(31, 35, 40);">），但只固定在指定的相对位置</font>
    - <font style="color:rgb(31, 35, 40);">1.触发状态：元素超过预设的</font>`<font style="color:rgb(31, 35, 40);">top,bottom,left,right</font>`<font style="color:rgb(31, 35, 40);">值，会粘在视口</font>`<font style="color:rgb(31, 35, 40);">viewpoint</font>`<font style="color:rgb(31, 35, 40);">，表型为</font>`<font style="color:rgb(31, 35, 40);">position:fixed</font>`
    - <font style="color:rgb(31, 35, 40);">2.脱离状态：当父容器完全脱离视口，sticky会随父容器一起消失</font>
+ `<font style="color:rgb(31, 35, 40);">sticky</font>`<font style="color:rgb(31, 35, 40);">与</font>`<font style="color:rgb(31, 35, 40);">fixed</font>`<font style="color:rgb(31, 35, 40);">，</font>`<font style="color:rgb(31, 35, 40);">absolute</font>`<font style="color:rgb(31, 35, 40);">不同的是，它</font>**<font style="color:rgb(31, 35, 40);">不会脱离文档流</font>**<font style="color:rgb(31, 35, 40);">，仍然占据其原始位置，这意味着不会造成父元素塌陷，影响其他元素布局</font>
+ <font style="color:rgb(31, 35, 40);">注：父元素不能有 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">overflow: hidden;</font>`<font style="color:rgb(31, 35, 40);">、</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">overflow: auto;</font>`<font style="color:rgb(31, 35, 40);"> 或 </font>`<font style="color:rgb(31, 35, 40);background-color:rgba(175, 184, 193, 0.2);">overflow: scroll;</font>`<font style="color:rgb(31, 35, 40);">，否则 sticky 定位将失效</font>

例子：

```html
<div class="content-wrapper">
  <div class="sticky-sidebar">
    <h3>我是粘性侧边栏</h3>
    <ul>
      <li>Section 1</li>
    </ul>
  </div>
  <div class="main-content">
    <h2>主要内容区域</h2>
    <p>向下滚动页面，你会看到左侧的侧边栏在达到顶部时会固定住。</p>
    <div class="content-box"></div>
  </div>
</div>
<style>
  .content-wrapper {
    display: flex; /* 使用 Flexbox 实现两栏布局 */
    padding: 0 20px; 
    align-items: flex-start; 
  }

  .sticky-sidebar {
    width: 200px;
    background-color: #e6f7ff;
    border: 1px solid #cceeff;
    margin-right: 20px;

    position: sticky; 
    top: 20px; /* 当元素距离视口顶部 20px 时开始粘性 */
    /* z-index: 10; 如果需要确保它在其他内容之上 */
  }

  .main-content {
    flex-grow: 1; /* 主内容区占据剩余空间 */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .content-box {
    height: 1500px;
  }
</style>
```



## CSS如何实现一个三角形
原理：<font style="color:rgb(31, 35, 40);">CSS 边框具有“</font>**<font style="color:rgb(31, 35, 40);">夹角</font>**<font style="color:rgb(31, 35, 40);">”的特性。当元素的左右边框宽度相等，且上边框隐藏或透明时，这两个边框会从底部延伸并在顶部的中央点相交， 当一个元素的宽度和高度都设置为 0，但边框有宽度时，它的边框会形成三角形的形状  </font>

<font style="color:rgb(31, 35, 40);">例子：</font>

```html
<style>
  body {
    font-family: Arial, sans-serif;
    display: flex;
    flex-wrap: wrap;
    gap: 40px; /* 增加间距 */
    padding: 50px;
    justify-content: center; /* 居中显示 */
    background-color: #f8f8f8;
  }

  .triangle-container {
    width: 150px;
    height: 150px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column; /* 垂直排列文本和三角形 */
    border: 1px dashed #ccc; /* 辅助观察 */
    padding: 10px;
    box-sizing: border-box;
  }

  .triangle-text {
    margin-bottom: 15px;
    font-size: 1.1em;
    color: #333;
  }

  /* 基础三角形样式 */
  .triangle {
    width: 0;
    height: 0;
  }

  /* --- 向上三角形 --- */
  .triangle-up {
    border-left: 50px solid transparent;    /* 左边透明 */
    border-right: 50px solid transparent;   /* 右边透明 */
    border-bottom: 80px solid #4CAF50;      /* 底部实色，决定三角形颜色和高度 */
  }

  /* --- 向下三角形 --- */
  .triangle-down {
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-top: 80px solid #2196F3;
  }

  /* --- 向左三角形 --- */
  .triangle-left {
    border-top: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-right: 80px solid #FFC107;
  }

  /* --- 向右三角形 --- */
  .triangle-right {
    border-top: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-left: 80px solid #FF5722;
  }

  /* --- 斜向三角形 (例如：左上角) --- */
  .triangle-top-left {
    border-top: 80px solid #9C27B0;         /* 顶部实色 */
    border-right: 80px solid transparent;   /* 右边透明 */
    border-bottom: 80px solid transparent;  /* 底部透明 */
    border-left: 80px solid transparent;    /* 左边透明 */
  }

  /* 斜向三角形 (例如：右下角) */
  .triangle-bottom-right {
    border-top: 80px solid transparent;
    border-right: 80px solid #673AB7;       /* 右边实色 */
    border-bottom: 80px solid transparent;
    border-left: 80px solid transparent;
  }

  /* 还可以通过控制边框宽度来控制三角形的形状 */
  .triangle-thin {
    border-left: 60px solid transparent;
    border-right: 60px solid transparent;
    border-bottom: 30px solid #E91E63; /* 较矮的三角形 */
  }

  .triangle-wide {
    border-left: 30px solid transparent;
    border-right: 30px solid transparent;
    border-bottom: 80px solid #00BCD4; /* 较窄的三角形 */
  }

</style>

<div class="triangle-container">
  <div class="triangle-text">向上三角形</div>
  <div class="triangle triangle-up"></div>
</div>

<div class="triangle-container">
  <div class="triangle-text">向下三角形</div>
  <div class="triangle triangle-down"></div>
</div>

<div class="triangle-container">
  <div class="triangle-text">向左三角形</div>
  <div class="triangle triangle-left"></div>
</div>

<div class="triangle-container">
  <div class="triangle-text">向右三角形</div>
  <div class="triangle triangle-right"></div>
</div>

<div class="triangle-container">
  <div class="triangle-text">左上三角形</div>
  <div class="triangle triangle-top-left"></div>
</div>

<div class="triangle-container">
  <div class="triangle-text">右下三角形</div>
  <div class="triangle triangle-bottom-right"></div>
</div>

<div class="triangle-container">
  <div class="triangle-text">较矮的三角形</div>
  <div class="triangle triangle-thin"></div>
</div>

<div class="triangle-container">
  <div class="triangle-text">较窄的三角形</div>
  <div class="triangle triangle-wide"></div>
</div>
```

<font style="color:rgb(31, 35, 40);"></font>

## <font style="color:rgb(31, 35, 40);">canvas和svg的区别</font>
**SVG 是什么？**

+ **基于 XML 的矢量图形格式**：SVG 是一种使用 **XML 格式**来描述二维矢量图形的语言。意味着 SVG 图形是由数学指令（点、线、曲线、形状等）而非像素组成的。
+ **DOM 元素**：SVG 图形中的每个形状（如圆形、矩形、路径）都是一个独立的 **DOM 元素**。可以使用 CSS 对这些元素进行样式设置，也可以使用 JavaScript 来操作（例如，改变颜色、位置、添加事件监听器）。
+ **可伸缩性**：由于是矢量图，SVG 图像无论如何放大或缩小，都不会失真或像素化，始终保持清晰锐利
+ **适合静态、复杂的图形**：例如图标、Logo、图表（当数据量不大时）、地图等。 

**Canvas是什么**

+ HTML的一个元素`**<canvas>**`，本质上是一个位图的画布区域
+ 通过J**avaScript中的API进行绘制**
+ 绘制的是**像素**，也即位图，放大可能会出现模糊
+ **适合动态、高性能的图形**：例如游戏、数据可视化（数据量大时）、图片编辑器、实时视频处理等。 

```html
<canvas id="myCanvas" width="200" height="100" style="border:1px solid #000;"></canvas>

<script>
  const canvas = document.getElementById('myCanvas');
  const ctx = canvas.getContext('2d'); // 获取2D渲染上下文

  // 绘制矩形
  ctx.fillStyle = 'blue';
  ctx.fillRect(10, 10, 80, 80);

  // 绘制圆形
  ctx.beginPath();
  ctx.arc(150, 50, 40, 0, Math.PI * 2);
  ctx.fillStyle = 'red';
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 绘制文本
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Canvas', 150, 50);
</script>
```

### 具体区别
| 特性 | SVG  | Canvas |
| :---: | :---: | :---: |
| **本质** | **矢量图**，基于 `XML` 描述，每个形状都是独立的 DOM 元素。 | **位图**（栅格图），通过 JavaScript 绘制像素。 |
| **绘制方式** | 声明式，通过定义标签和属性来描述图形。 | 命令式，通过 JavaScript API 逐像素绘制。 |
| **DOM 结构** | **有**，每个图形元素都是可被访问的 DOM 节点。 | **无**，Canvas 自身是 DOM 元素，但其内部绘制的图形不是。 |
| **可伸缩性** | **无限放大不失真**，始终清晰。 | 放大时**会失真**（像素化）。 |
| **修改** | 容易，直接操作 DOM 元素或修改 XML 代码。 | 困难，需要重新绘制整个或部分画布。 |
| **事件处理** | **支持**，可以直接在 SVG 元素上绑定事件监听器。 | 困难，需要手动计算鼠标/触摸位置与图形的关系。 |
| **文本渲染** | 语义化，可选择、复制、搜索。 | 作为像素绘制，不具语义，不可直接选择或复制。 |
| **性能** | 适合**静态或少量动态图形**，DOM 操作开销较大。 | 适合**大量动态图形、像素操作**，性能高。 |
| **文件大小** | 通常对简单图形文件较小，复杂图形可能较大。 | 取决于画布大小和内容，通常对复杂图形文件较小。 |
| **应用场景** | Logo、图标、图表（数据量小）、地图、交互式 UI 组件。 | 游戏、动画、数据可视化（数据量大）、图像处理、图表（大数据量）、视频播放器。 |




```html
<div class="container-flex">
  <div class="left-flex">左侧固定</div>
  <div class="right-flex">右侧自适应</div>
</div>

<style>
  .container-flex {
    display: flex; /* 开启 Flexbox 布局 */
  }

  .left-flex {
    width: 200px; /* 左侧固定宽度 */
    background-color: #f0f8ff;
    padding: 20px;
  }

  .right-flex {
    flex: 1; /* 关键：占据剩余空间 */
    background-color: #e6e6fa;
    padding: 20px;
  }
</style>
```


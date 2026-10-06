# 打包工具

## webpack
核心原理

+  `Webpack` 从一个或多个入口文件开始，递归分析模块之间的依赖关系，把项目中的 `JS`、`CSS`、图片、字体等资源都当成模块，经过 `Loader` 转换、`Plugin` 扩展，最终生成浏览器可以运行的静态资源  

大致流程

```latex
入口 entry
  ↓
分析依赖 dependency graph
  ↓
Loader 转换模块
  ↓
Plugin 介入构建生命周期
  ↓
生成 chunk
  ↓
输出 bundle
```

主要解决的问题就是：浏览器不能直接理解所有前端工程化代码，例如`ts`，`jsx`，`vue`，`sass`，`css module`

这里引用一个经典的webpack配置

```typescript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  mode: 'production',

  entry: './src/main.tsx',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
    clean: true,
    publicPath: '/',
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
        ],
      },
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'less-loader',
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024,
          },
        },
        generator: {
          filename: 'assets/images/[name].[hash:8][ext]',
        },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: 'body',
    }),

    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css',
    }),
  ],

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin(),
    ],

    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        reactVendor: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'react-vendor',
          priority: 20,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
        },
      },
    },

    runtimeChunk: 'single',
  },

  devtool: 'source-map',
}
```

`entry`：打包入口

+ `entry: './src/main.tsx'`从main分析依赖， 然后继续分析它 import 了哪些文件，然后递归分析这些文件的依赖，最终形成一张**依赖图 dependency graph**

`output`:输出结果

```typescript
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: 'js/[name].[contenthash:8].js',
  clean: true,
}
```

+ 重点就这个：`filename: 'js/[name].[contenthash:8].js'` 根据文件内容生成hash，适合用于浏览器缓存

`resolve`: 模块解析规则

```typescript
resolve: {
  extensions: ['.tsx', '.ts', '.jsx', '.js'], //用于省略后缀
  alias: {
    '@': path.resolve(__dirname, 'src'), // @ 替代 src
  },
}
```

`Loader` 资源转换器

```typescript
{
  test: /\.[jt]sx?$/,
  exclude: /node_modules/,
  use: 'babel-loader',
}
```

+ 使用babel-loader 将 ts,jsx,es语法转为浏览器可运行js

`plugin`:构建扩展机制

```typescript
new HtmlWebpackPlugin({
  template: './public/index.html',
  inject: 'body',
})
```

+ 自动生成HTML，并将打包好的CSS,JS注入进去

`splitChunks`: 代码分割

```typescript
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    reactVendor: {
      test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
      name: 'react-vendor',
      priority: 20,
    },
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendor',
      priority: 10,
    },
  },
}
```

+ 将公共代码，第三方依赖拆解，避免所有代码塞入一个`bundle`

核心原理总结下来就

```latex
以 entry 为起点
递归分析 import / require
形成模块依赖图
使用 Loader 转换不同类型资源
使用 Plugin 扩展构建流程
根据 optimization 做代码分割、压缩、Tree Shaking
最后通过 output 生成浏览器可运行的静态资源
```

> Webpack 的核心原理是从 entry 入口开始，递归分析项目中的 import 和 require，构建出一张模块依赖图，然后通过 Loader 把不同类型的资源转换成 Webpack 能处理的模块，比如 Babel 处理 JS/TS/JSX，css-loader 处理 CSS，less-loader 处理 Less。接着 Webpack 会通过 Plugin 扩展整个构建流程，比如 HtmlWebpackPlugin 生成 HTML，MiniCssExtractPlugin 抽离 CSS。最后 Webpack 根据 output 和 optimization 配置生成最终产物，包括代码压缩、Tree Shaking、splitChunks 拆包、runtimeChunk 运行时代码抽离等。
>
> 一个典型配置里，entry 决定入口，output 决定输出目录和文件名，module.rules 配置 Loader，plugins 配置构建插件，resolve 配置模块解析规则，optimization 配置生产优化。比如生产环境通常会使用 contenthash 做长期缓存，用 splitChunks 把 node_modules 和公共代码拆出去，用 MiniCssExtractPlugin 抽离 CSS，用 TerserPlugin 和 CssMinimizerPlugin 压缩 JS 和 CSS。
>
> 所以我理解 Webpack 不是简单地把 JS 合成一个文件，而是一个完整的前端工程化构建系统，它解决的是模块依赖管理、资源转换、构建扩展、代码优化和最终产物输出的问题。
>




## Vite 原理，为什么比 webpack 快
**核心结论一句话**：开发环境下 Vite **不打包**，利用浏览器原生 `ES Module` 按需编译；生产环境再交给 Rollup 打包。

```latex
开发环境（快的关键）
  浏览器原生 ES Module
    -> 请求到哪个模块，才编译哪个模块（按需）
    -> 不预先全量打包，冷启动与项目规模无关
  依赖预构建（esbuild）
    -> 把 node_modules 里的 CJS/UMD 提前转成 ESM
    -> 合并成少量 chunk，减少请求数，缓存复用
  转译用 esbuild（Go 写的）
    -> 比 babel/tsc（JS）快 10~100 倍

生产环境
  -> 交给 Rollup 打包，追体积、兼容、tree-shaking
```

三个快的来源：

1. **原生 ESM 按需编译**：webpack 启动要递归构建整个依赖图并打包，项目越大越慢；Vite 起 dev server 后，浏览器请求哪个模块才编译哪个模块。

2. **依赖预构建**：用 esbuild 把 `node_modules` 里的 CommonJS/UMD 依赖提前转成 ESM、合并成少量 chunk，缓存到 `node_modules/.vite/deps`。既解决浏览器只认 ESM 的兼容问题，又避免几百个依赖文件逐个请求造成瀑布式请求。

3. **esbuild 转译**：esbuild 用 Go 写，比 JS 实现的 babel/tsc 快 10~100 倍，负责 TS/JSX 转译、依赖预构建和压缩。

> 面试版口述：Vite 快，本质是它把「开发时」和「生产时」分开了。开发环境它不做全量打包，而是利用浏览器原生的 ES Module，浏览器请求到哪个模块，Vite 才实时编译哪个模块，所以冷启动基本和项目规模无关，这一点我自己体感很明显——之前一个 webpack 项目冷启动要十几秒，切到 Vite 之后基本秒开，改代码的反馈也快很多。同时它用 esbuild 做两件事：一是依赖预构建，把 node_modules 里大量 CommonJS/UMD 依赖提前转成 ESM 并合并成少量 chunk，解决兼容和请求过多两个问题；二是做 TS/JSX 转译，esbuild 是 Go 写的，比 babel/tsc 快一个数量级。这里我踩过一个坑：某些 CJS 依赖预构建时偶尔会失败，需要配 `optimizeDeps.include` 手动指定。生产环境 Vite 交给 Rollup 打包，因为 Rollup 的 tree-shaking 和产物体积优化更成熟。一句话总结：webpack 是先全量打包再服务，Vite 是请求到哪才编译到哪，再叠加 esbuild 的原生速度，冷启动和热更新都快得多。


## Webpack vs Vite 对比
**核心结论一句话**：Webpack 是「先全量打包再服务」的老牌构建系统，Vite 是「开发按需编译、生产 Rollup 打包」的新方案，差距主要在开发环境。

| 维度 | Webpack | Vite |
|---|---|---|
| 开发服务器 | 启动全量构建依赖图并打包 | 原生 ESM 按需编译，冷启动快 |
| 转译引擎 | babel/tsc（JS 实现） | esbuild（Go 实现），快 10~100 倍 |
| HMR | 重编受影响 chunk | 基于 ESM 精确失效单个模块 |
| 生产打包 | webpack 自身 | 交给 Rollup |
| 配置复杂度 | 配置项多、可深度定制 | 开箱即用、约定优于配置 |
| 生态 | 最成熟，覆盖 SSR/微前端等复杂场景 | 发展快，部分老 webpack 插件需迁移 |
| 浏览器兼容 | 可配 target 支持老浏览器 | 默认现代浏览器，老浏览器需 plugin-legacy |

**面试怎么答「Vite 为什么快」**：

```latex
1. 开发期不打包：Vite 按需编译，webpack 全量打包
2. esbuild 快：Go 原生转译，比 babel/tsc 快一个数量级
3. HMR 精确：基于 ESM 只失效单个模块，webpack 重编 chunk
4. 但生产环境两者都要打包（Vite 用 Rollup），差距在开发体验
```

**容易被追问的认知点**：

+ Vite 快主要体现在开发环境，生产构建 Vite 用 Rollup，并不必然比 webpack 生产构建快
+ webpack 的生态、定制能力、老浏览器和复杂工程（SSR/微前端）支持仍是优势
+ webpack 也能接 esbuild-loader / swc-loader 提速转译，所以「快」的核心不是用了 esbuild，而是开发模式不同（全量打包 vs 按需）

> 面试版口述：Webpack 和 Vite 的对比，核心是开发模式的差异。Webpack 是启动时就递归构建整个依赖图、把模块打包成 bundle 再服务，项目一大冷启动就慢；Vite 开发时不打包，利用浏览器原生 ESM，请求到哪个模块才编译哪个模块，冷启动基本和项目规模无关。速度上 Vite 用 esbuild 做转译和依赖预构建，esbuild 是 Go 写的，比 webpack 用的 babel 快 10 到 100 倍，HMR 也因为是 ESM 所以能精确失效单个模块。生产环境 Vite 交给 Rollup 打包，所以快主要体现在开发体验上，生产构建两者都要打包。
>
> 我自己的选型标准不是「谁新用谁」，而是看三件事：一是项目阶段，新起的 SPA、追求开发体验的，我直接上 Vite，配置省心；二是生态依赖，如果项目强依赖某个只有 webpack 插件的场景，或者要做 SSR、微前端这类复杂工程，webpack 的可定制性和成熟生态更稳；三是浏览器兼容，Vite 默认面向支持 ESM 的现代浏览器，要兼容老浏览器还得加 plugin-legacy，webpack 配 target 更省事。所以结论是：新项目默认 Vite，存量老项目不动 webpack，不为换而换。


## Webpack 常见优化手段
**核心结论一句话**：先定位是「构建慢」还是「包太大」，再对症下药——构建速度走缓存/多进程/缩小范围，产物体积走拆包/摇树/压缩/懒加载。

```latex
构建速度（开发体验）
  -> 缩小 Loader 范围：include / exclude（exclude node_modules）
  -> 持久化缓存：cache: { type: 'filesystem' }
  -> 多进程：thread-loader、Terser parallel: true
  -> 精简 resolve：extensions 别配太多、alias、modules 限定查找路径
  -> noParse：跳过已打包的库
  -> externals + CDN：第三方库外置不打包

产物体积（上线质量）
  -> splitChunks 拆包：第三方包 / 公共代码 / 业务代码分离
  -> Tree Shaking：ESM + sideEffects 剔除未用代码
  -> 压缩：TerserPlugin（JS）、CssMinimizerPlugin（CSS）
  -> 路由懒加载：动态 import，首屏按需加载
  -> 图片：小图转 base64、大图压缩 + 懒加载 + WebP
  -> 长期缓存：contenthash 命名 + runtimeChunk 抽离运行时
```

构建速度：

```javascript
// 1. 缩小范围 + 持久化缓存
module.exports = {
  module: {
    rules: [{ test: /\.js$/, exclude: /node_modules/, use: 'babel-loader' }]
  },
  cache: { type: 'filesystem' },
  // 2. 多进程压缩
  optimization: {
    minimizer: [new TerserPlugin({ parallel: true })]
  }
}
```

产物体积：

```javascript
// 3. 拆包 + 运行时抽离 + 长期缓存
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendor', priority: 10 }
      }
    },
    runtimeChunk: 'single'
  },
  output: { filename: 'js/[name].[contenthash:8].js' }
}
```

> 面试版口述：Webpack 优化我会先分两条线，一条是构建速度，一条是产物体积，而且一定先定位再动手。我之前接手过一个打包特别慢的老项目，先用 `speed-measure-webpack-plugin` 和产物体积分析看瓶颈，发现是 loader 范围没限制、每次都全量重新编译 node_modules，后来加了 exclude、开了 filesystem 缓存，构建时间直接砍下来一截，这比我一开始就堆配置有效得多。构建速度这条线，常用的是缩小 loader 范围、持久化缓存、thread-loader 或 Terser 的 parallel 多进程、精简 resolve 减少文件查找、noParse 跳过已打包的库、大依赖走 externals 加 CDN。产物体积这条线，主要靠 splitChunks 拆包、路由懒加载、Tree Shaking、Terser 和 CssMinimizer 压缩、图片小图转 base64 大图压缩懒加载，以及 contenthash 加 runtimeChunk 做长期缓存。我会强调一点：优化要有数据，先测量出瓶颈，优化前后对比构建耗时和包体积，而不是无脑背配置。

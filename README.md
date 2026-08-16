# FlowTick

一个基于 Vue 3 的多阶段定时器工具，支持自定义音乐、提醒、主题和多语言。

[English](./README.en.md)

## 功能特性

- **多阶段编排** - 创建包含多个阶段的定时器序列，每个阶段独立配置
- **倒计时音乐** - 阶段开始时播放背景音乐，支持内置音效和用户上传音频
- **结束提示音** - 阶段结束后播放短提示音
- **提前提醒** - 倒计时剩余指定秒数时触发提醒音效，支持自定义提醒音
- **用户音频上传** - 上传 MP3/WAV/OGG 等格式音频，支持播放范围选择和循环播放
- **循环播放** - 整个序列循环执行，显示当前轮次
- **明暗主题** - 深色/浅色两种主题，一键切换
- **多语言** - 中文/英文双语支持，首次自动检测浏览器语言
- **动态倒计时** - 渐变进度环、发光效果、循环指示器

## 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Vite](https://vite.dev/) - 极速构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Tone.js](https://tonejs.github.io/) - Web Audio 音效合成
- [vue-i18n](https://vue-i18n.intlify.dev/) - 国际化
- [Lucide](https://lucide.dev/) - 图标库

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 项目结构

```
src/
├── assets/           # 静态资源
├── components/       # Vue 组件
│   ├── AudioUploader.vue   # 音频上传管理
│   ├── SettingsPanel.vue   # 设置面板
│   ├── TimerDisplay.vue    # 倒计时显示
│   ├── TimerEditor.vue     # 序列编辑器
│   └── TimerList.vue       # 序列列表
├── composables/      # 组合式函数
│   ├── useAudio.ts         # 音频播放控制
│   ├── useStorage.ts       # 数据持久化
│   └── useTimer.ts         # 定时器核心逻辑
├── i18n/             # 国际化语言包
│   ├── index.ts
│   ├── zh-CN.ts
│   └── en-US.ts
├── types/            # TypeScript 类型定义
├── App.vue           # 根组件
├── main.ts           # 入口文件
└── style.css         # 全局样式
```

## License

MIT

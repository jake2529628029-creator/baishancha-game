# 白山茶遗嘱

女性向悬疑调查网页游戏。

当前版本为 V0.4.2 Investigation Tools UI Prototype。第一章试玩内容和
V0.4 Script Lock 保持不变，新增：

- React、TypeScript 与 Vite 基础工程
- JSON 剧情加载与 Schema 校验
- Zustand 游戏状态
- IndexedDB 自动存档与 V1／V2／V3→V4 迁移
- 可递归组合的剧情条件
- 白名单事件执行器
- Chapter 0—5 独立清单、章节解锁、分章进度、切换恢复与完成状态
- JSON 驱动的 Relationship Engine，使用分类理解状态而非数值好感
- 可提交顺序并判断正确性的 Timeline Engine
- 支持人物、证据、时间节点、自由连接与命题的 Detective Board Engine
- 完全由 chapter-manifest 驱动的章节选择页
- 展示分类理解状态和变化记录的人物关系图
- 同时支持鼠标、触控与无障碍按钮排序的时间线面板
- 支持卡片拖动、自由连线、删除连接和布局存档的侦探墙
- 手机竖屏调查布局与手势缩放图片查看器
- 第一章 Content、Observation、Evidence、Dialogue 与 Reasoning 数据
- JSON 驱动的双场景调查工作台
- 文档、图片热点与聊天记录查看器
- 可回溯来源的观察与证据簿
- 固定话题、证据出示与失败反馈
- 证据槽位、推理提交、章节结论与完整通关流程
- 自动更新的侦探日志
- 材料、观察、证据与推理的可追溯关系链
- 调查完成度、线索统计、错误推理与玩家评价结算
- 统一图片比例、色彩、排版和交互规范

第二章剧情 JSON、完整地图与 AI NPC 尚未进入开发。第一章尚未提供关系、
时间线和侦探墙剧情数据，因此正式工作台会显示诚实空状态；开发验收可访问
`/?ui-prototype=1`，使用不进入剧情包的中性 TypeScript fixture 验证交互。

## 常用命令

- `pnpm dev`：启动本地开发环境
- `pnpm dev:mobile`：允许同一局域网内的手机访问开发版
- `pnpm build`：执行类型检查并构建
- `pnpm preview:mobile`：在 4173 端口启动生产构建预览
- `pnpm test`：运行自动测试

## PWA 与手机试玩

1. 执行 `pnpm build`，再执行 `pnpm preview:mobile`。
2. 电脑可通过 `http://localhost:4173` 测试安装、离线启动和存档恢复。
3. 手机与电脑连接同一 Wi-Fi 后，通过
   `http://电脑局域网IP:4173` 访问试玩版。
4. 手机安装 PWA 必须使用 HTTPS 地址。获得 HTTPS 地址后：
   - Android Chrome：浏览器菜单 →“安装应用”或页面中的“添加到手机桌面”。
   - iPhone Safari：分享 →“添加到主屏幕”。

局域网 HTTP 地址适合调试布局和游戏流程；Service Worker、离线模式与
桌面安装应在 localhost 或 HTTPS 环境测试。

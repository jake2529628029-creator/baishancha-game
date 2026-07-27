# 白山茶遗嘱

女性向悬疑调查网页游戏。

当前版本为 V0.3 第一章正式试玩 Demo，包含：

- React、TypeScript 与 Vite 基础工程
- JSON 剧情加载与 Schema 校验
- Zustand 游戏状态
- IndexedDB 自动存档与 V1→V2 迁移
- 可递归组合的剧情条件
- 白名单事件执行器
- 第一章章节进入、自动解锁、目标与完成状态
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

完整地图、时间线、人物关系图与 AI NPC 尚未进入开发。

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

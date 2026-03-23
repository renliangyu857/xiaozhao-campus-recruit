# Task Plan

## Goal
修复导航栏中文文案显示为 `????` 的问题，确认根因并做最小范围修复。

## Phases
| Phase | Status | Notes |
|---|---|---|
| 建立排查上下文 | complete | 已创建规划文件 |
| 定位文案来源与损坏链路 | complete | 确认 `components/NavBar.tsx` 源码本身损坏，并从 Git 历史恢复正确文案 |
| 实施修复 | complete | 已修复桌面端/移动端导航可见文案与相关中文注释 |
| 验证 | complete | `eslint` 通过（仅保留既有 `<img>` 警告），残留乱码扫描为空 |

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `npx eslint components/NavBar.tsx` 被 PowerShell 执行策略拦截 | 1 | 改用 `cmd /c` 或直接调用本地 `eslint.cmd` |
| `cmd /c npx eslint components\\NavBar.tsx` 超时 | 2 | 改用 `.\\node_modules\\.bin\\eslint.cmd components\\NavBar.tsx` 成功完成检查 |

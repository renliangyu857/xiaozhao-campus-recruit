# Findings

- 2026-03-13：`components/NavBar.tsx` 以 UTF-8 读取后，源码中确实存在 `????` 与乱码（如 `杩涘害`），不是 PowerShell 显示假象。
- `git diff b2b8759 8495af6 -- components/NavBar.tsx` 显示，提交 `8495af6` 将多处导航文案从已有内容直接改成了 `????`。
- `git show e2ee835:components/NavBar.tsx` 中可恢复出该文件早期正确中文：`职位查询`、`进度统计`、`笔面试资料`、`内推码`、`邀请有礼`、`会员中心`、`退出登录`、`微信登录`，以及移动端短标签。
- 当前修复限定在 `components/NavBar.tsx`，同时修正了同文件内已损坏的用户可见移动端标签与相关中文注释。

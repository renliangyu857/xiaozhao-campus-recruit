# Task Plan: 登录后自动加载数据 + 邀请有礼页改造

## Goal
1. 用户登录后若有查询权限则自动加载职位数据（目前未自动加载）。2. 邀请页：邀请码改为6位大写字母+数字唯一编码；页面名改为「邀请有礼」；图标改为礼物相关。

## Current Phase
Phase 5

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify where login completes and where jobs are loaded
- [x] Identify invite code generation (backend) and invite page (frontend)
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define: trigger data load after login when user has query permission
- [x] Define: 6-char alphanumeric invite code + page title/icon
- **Status:** complete

### Phase 3: Implementation
- [x] Auto-load jobs after login (frontend)
- [x] Backend: invite code 6-char uppercase+digits unique
- [x] Frontend: 邀请有礼 title + gift icon
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Backend compile OK; no frontend lint errors
- **Status:** complete

### Phase 5: Delivery
- [x] Review and deliver
- **Status:** complete

## Key Questions
1. 查询权限如何判断？→ 有剩余免费次数或 VIP 即视为有权限
2. 邀请码唯一性？→ 后端生成时保证唯一（如查重或随机碰撞重试）

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| (filled as we go) | |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |

## Notes
- Planning files in project root. Update phase status after each phase.

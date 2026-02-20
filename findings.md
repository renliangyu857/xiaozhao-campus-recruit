# Findings & Decisions

## Requirements
- 用户登录后若有查询权限则自动加载职位数据（当前未自动加载）
- 邀请码：6位大写字母+数字组成的唯一编码
- 邀请页面名：改为「邀请有礼」
- 邀请页图标：礼物相关图标

## Research Findings
- App.tsx: jobs state + fetchJobsPage; handleLogin had commented preload. HomePage loadPage consumes query when !isVip && resetPage.
- Auto-load: call fetchJobsPage(defaultFilters, false, 0, 30) after setUser in both getCurrentUser useEffect and handleLogin; setJobs(result.content). No consume on this preload.
- InviteService: generate() used UUID 0,16; getOrCreateInviteCode uses generate. Added 6-char A-Z+0-9 with existsByInviteCode uniqueness loop.
- NavBar: 邀请 + UserPlus → 邀请有礼 + Gift. InvitePage: badge 邀请有礼 + Gift, title "邀请有礼 · 免费领 VIP".

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| (filled as we go) | |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| | |

## Resources
- frontend: App.tsx (login flow), HomePage (jobs load), invite/InvitePage
- backend: InviteService (generate code), UserInvitationRepository

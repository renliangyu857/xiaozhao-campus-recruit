# Task Plan: å¾®ä¿¡Nativeæ”¯ä»˜æ¥å…¥

## Goal
æ¥å…¥å¾®ä¿¡Nativeæ”¯ä»˜ï¼ˆæ‰«ç æ”¯ä»˜ï¼‰ï¼Œæ›¿æ¢å½“å‰çš„æ¨¡æ‹Ÿæ”¯ä»˜æµç¨‹ã€‚

## Phases

### Phase 1: è®¾è®¡ç¡®è®¤ âœ…
- **Status:** complete
- **Started:** 2026-03-08
- **Deliverable:** `docs/wechat-native-payment-design.md`
- **å·²ç¡®è®¤:** å•†æˆ·å‚æ•°å·²é¢„ç•™ï¼ŒNativeæ”¯ä»˜æ–¹å¼ç¡®è®¤

### Phase 2: æ•°æ®åº“è¿ç§» âœ…
- **Status:** complete
- **Completed:** 2026-03-08
- **Tasks:**
  - [x] æ›´æ–° schema.prisma æ·»åŠ  Order è¡¨
  - [x] åŒæ­¥åˆ°æ•°æ®åº“ (prisma db push)
  - [x] ç”Ÿæˆ Prisma Client

### Phase 3: åç«¯APIå¼€å‘ âœ…
- **Status:** complete
- **Completed:** 2026-03-08
- **Tasks:**
  - [x] åˆ›å»º `lib/payment-config.ts` ä»·æ ¼é…ç½®
  - [x] åˆ›å»º `lib/wechat-pay.ts` å¾®ä¿¡æ”¯ä»˜å·¥å…·
  - [x] åˆ›å»º `/api/payment/create` æ¥å£
  - [x] åˆ›å»º `/api/payment/notify` å›è°ƒæ¥å£
  - [x] åˆ›å»º `/api/payment/order/:orderNo` æŸ¥è¯¢æ¥å£
  - [x] åˆ›å»º `/api/payment/qrcode/:orderNo` äºŒç»´ç æ¥å£

### Phase 4: å‰ç«¯æ”¯ä»˜ç»„ä»¶ âœ…
- **Status:** complete
- **Completed:** 2026-03-08
- **Tasks:**
  - [x] åˆ›å»º `lib/payment.ts` æ”¯ä»˜æœåŠ¡
  - [x] åˆ›å»º `PaymentQRCodeModal` ç»„ä»¶
  - [x] æ›´æ–°VIPè´­ä¹°æµç¨‹ ([app/vip/page.tsx])
  - [ ] æ›´æ–°èµ„æ–™è´­ä¹°æµç¨‹

### Phase 5: æµ‹è¯•ä¸éƒ¨ç½²
- **Status:** pending
- **Tasks:**
  - [ ] æ²™ç®±ç¯å¢ƒæµ‹è¯•
  - [ ] è”è°ƒæµ‹è¯•
  - [ ] ç”Ÿäº§ç¯å¢ƒéƒ¨ç½²
  - [ ] ç›‘æ§é…ç½®

## Current Phase

**Phase 4: å‰ç«¯æ”¯ä»˜ç»„ä»¶** - VIPé¡µé¢å·²å®Œæˆï¼Œèµ„æ–™è´­ä¹°æµç¨‹å¾…æ›´æ–°

## Files

- `docs/wechat-native-payment-design.md` - è¯¦ç»†è®¾è®¡æ–‡æ¡£
- `prisma/schema.prisma` - æ•°æ®åº“schemaï¼ˆå·²æ·»åŠ Orderè¡¨ï¼‰
- `lib/payment-config.ts` - ä»·æ ¼é…ç½®
- `lib/wechat-pay.ts` - å¾®ä¿¡æ”¯ä»˜å·¥å…·
- `lib/payment.ts` - å‰ç«¯æ”¯ä»˜æœåŠ¡
- `app/api/payment/create/route.ts` - åˆ›å»ºè®¢å•API
- `app/api/payment/notify/route.ts` - æ”¯ä»˜å›è°ƒAPI
- `app/api/payment/order/[orderNo]/route.ts` - æŸ¥è¯¢è®¢å•API
- `app/api/payment/qrcode/[orderNo]/route.ts` - äºŒç»´ç å›¾ç‰‡API
- `components/PaymentQRCodeModal.tsx` - æ”¯ä»˜äºŒç»´ç å¼¹çª—ç»„ä»¶
- `app/vip/page.tsx` - VIPé¡µé¢ï¼ˆå·²æ¥å…¥å¾®ä¿¡æ”¯ä»˜ï¼‰

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| P3006 Migration error | 1 | ä½¿ç”¨ `prisma db push` ç›´æ¥åŒæ­¥ |
| BigIntåºåˆ—åŒ–é”™è¯¯ | 1 | å°† m.id æ”¹ä¸º String(m.id) |

## Decisions
| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-08 | é€‰æ‹©Nativeæ”¯ä»˜ï¼ˆæ‰«ç ï¼‰ | PCç½‘ç«™ï¼Œç”¨æˆ·æ‰«ç æ”¯ä»˜ |
| 2026-03-08 | æ–°å»ºOrderè¡¨ç»Ÿä¸€ç®¡ç†è®¢å• | æ”¯æŒVIPå’Œèµ„æ–™ä¸¤ç§ä¸šåŠ¡ |
| 2026-03-08 | é¦–æœˆä¼˜æƒ 5.8å…ƒé€»è¾‘ | åç«¯æ£€æŸ¥æ˜¯å¦è´­ä¹°è¿‡VIP |
| 2026-03-08 | ä½¿ç”¨ `prisma db push` | è¿ç§»çŠ¶æ€ä¸ä¸€è‡´ï¼Œç›´æ¥åŒæ­¥ |

## é…ç½®æ¸…å•

### ç¯å¢ƒå˜é‡ï¼ˆéœ€è¦é…ç½®ï¼‰
```bash
# å¾®ä¿¡æ”¯ä»˜é…ç½®
WECHAT_PAY_MCHID=å•†æˆ·å·
WECHAT_PAY_APPID=å…¬ä¼—å·APPID
WECHAT_PAY_APIV3_KEY=APIv3å¯†é’¥
WECHAT_PAY_CERT_SERIAL_NO=è¯ä¹¦åºåˆ—å·
WECHAT_PAY_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----

# å¾®ä¿¡æ”¯ä»˜å…¬é’¥ï¼ˆå›è°ƒéªŒç­¾ç”¨ï¼‰
WECHAT_PAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
```

## å¾…å®Œæˆä»»åŠ¡

1. æ›´æ–°èµ„æ–™è´­ä¹°æµç¨‹ï¼ˆexamé¡µé¢ï¼‰
2. æ²™ç®±ç¯å¢ƒæµ‹è¯•
3. é…ç½®ç”Ÿäº§ç¯å¢ƒå¾®ä¿¡æ”¯ä»˜å‚æ•°
4. ç”Ÿäº§ç¯å¢ƒéƒ¨ç½²


---

## Session: 2026-03-10 Î¢ĞÅÖ§¸¶/µÇÂ¼Ñ²¼ì

### Phase 1: Ñ²¼ìÓëÕï¶Ï
- **Status:** complete
- **Completed:** 2026-03-10
- **Findings:**
  1. `payment/create` »á¸´ÓÃ 30 ·ÖÖÓÄÚµÄ´ıÖ§¸¶¶©µ¥£¬µ«¶şÎ¬Âë½Ó¿ÚÖ»ÔÊĞí 5 ·ÖÖÓÄÚ·ÃÎÊ£¬µ¼ÖÂ·µ»Ø¡°ÒÑ¹ıÆÚ¡±µÄ¾É¶©µ¥¡£
  2. PC É¨ÂëµÇÂ¼³É¹¦ºóÖ»Ğ´ÈëÁË Session£¬Î´Í¬²½Ğ´Èë `campus_api_secret`£¬»áÓ°ÏìºóĞøÊÜ±£»¤½Ó¿ÚµÄÇ©ÃûÇëÇó¡£
  3. ×ÊÁÏµ¥ÂòÂ·¾¶Î´À¹½ØÒÑ¹º×ÊÁÏ£¬ÇÒÖ§¸¶»Øµ÷Ê¹ÓÃ `create` Ğ´Èë `pan_material_purchase`£¬ÔÚÀúÊ·¼ÇÂ¼/ÖØ¸´Í¨Öª³¡¾°ÏÂ¿ÉÄÜ´¥·¢Î¨Ò»Ô¼Êø´íÎó¡£
  4. ×ÊÁÏÖ§¸¶¶©µ¥ºöÂÔÁËÇ°¶Ë´«ÈëµÄ `materialName`£¬Ö§¸¶µ¯´°ºÍ¶©µ¥¼ÇÂ¼»áÍË»¯³ÉÍ¨ÓÃÃû³Æ¡°±ÊÃæÊÔ×ÊÁÏ¡±¡£

### Phase 2: ĞŞ¸´Óë»Ø¹é
- **Status:** in_progress
- **Started:** 2026-03-10
- **Tasks:**
  - [x] Í³Ò»Ö§¸¶¶©µ¥ÓĞĞ§ÆÚ³£Á¿
  - [x] ĞŞ¸´´ıÖ§¸¶¶©µ¥¸´ÓÃ´°¿Ú
  - [x] Îª PC É¨ÂëµÇÂ¼²¹³ä API Secret Cookie
  - [x] ĞŞ¸´×ÊÁÏ¹ºÂòÃİµÈÓë»Øµ÷ upsert
  - [x] ĞŞÕıÎÄµµÖĞµÄÕæÊµÅäÖÃÊ¾Àı
  - [ ] Ö´ĞĞ¶¨ÏòĞ£Ñé
- **Validation:** `npx eslint` (Õë¶Ô±ä¸üÎÄ¼ş) Í¨¹ı£»`npx tsc --noEmit` ÈÔ±»²Ö¿â¼ÈÓĞ E2E ÀàĞÍ´íÎó×èÈû¡£
- [x] ĞŞ¸´ Playwright API E2E ÀàĞÍ´íÎó
- **Validation:** `npx tsc --noEmit` Óë¶¨Ïò `npx eslint` ÒÑÍ¨¹ı¡£

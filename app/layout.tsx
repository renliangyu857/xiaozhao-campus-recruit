import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/components/UserContext";
import { AppShell } from "@/components/AppShell";

const notoSans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSerif = Noto_Serif_SC({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "校招喵 - 校招信息聚合平台 | 内推码库 | 投递进度管理",
    template: "%s | 校招喵 - 你的校招助手",
  },
  description: "校招喵提供全网校招信息聚合、投递进度管理、名企内推码库、笔面试资料库服务，助你一站式拿下心仪Offer",
  keywords: ["校招", "校招信息", "内推码", "投递进度管理", "笔面试资料", "校园招聘", "2026校招", "实习信息"],
  authors: [{ name: "校招喵", url: "https://xiaozhaomiao.cn" }],
  creator: "校招喵",
  publisher: "校招喵",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "校招喵 - 你的校招助手",
    description: "校招信息聚合、投递进度管理、内推码库，一站式助你拿下心仪Offer",
    url: "https://xiaozhaomiao.cn",
    siteName: "校招喵",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "https://xiaozhaomiao.cn/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "校招喵 - 校招信息聚合平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "校招喵 - 你的校招助手",
    description: "校招信息聚合、投递进度管理、内推码库，一站式助你拿下心仪Offer",
    creator: "@xiaozhaomiao",
    images: ["https://xiaozhaomiao.cn/twitter-image.jpg"],
  },
  verification: {
    google: "eqzZEOKe4P1fjmMOmLp_OgdbZKsqUebACD2F_JlA85Y", // Google验证代码（只需要等号后面的值）
    baidu: "", // 留空，可在需要时添加
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "校招喵",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSans.variable} ${notoSerif.variable} antialiased`}>
        <UserProvider>
          <AppShell>{children}</AppShell>
        </UserProvider>
      </body>
    </html>
  );
}

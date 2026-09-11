import localFont from "next/font/local";

export const satoshi = localFont({
  src: [
    { path: "./satoshi/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./satoshi/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "./satoshi/Satoshi-Bold.woff2", weight: "700", style: "normal" },
    { path: "./satoshi/Satoshi-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

/* Qori OpenGraph image — generated via next/og ImageResponse.
   Re-exported as app/twitter-image.tsx so X/Twitter uses the same card. */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Career Agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Career Agent";
const SUBTITLE = "Resume in, tailored applications out.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "96px",
          background: "#FAF7F0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="96" height="96" viewBox="0 0 512 512">
            <rect width="512" height="512" rx="123" fill="#F1AE04" />
            <circle cx="231" cy="231" r="128" fill="none" stroke="#251E18" strokeWidth="56" />
            <line x1="261" y1="282" x2="379" y2="410" stroke="#251E18" strokeWidth="56" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 40, color: "#8A8073" }}>qori.land</div>
        </div>
        <div style={{ marginTop: 56, fontSize: 88, fontWeight: 600, color: "#251E18", letterSpacing: "-0.02em" }}>
          {TITLE}
        </div>
        <div style={{ marginTop: 20, fontSize: 40, color: "#5C5346" }}>{SUBTITLE}</div>
      </div>
    ),
    size
  );
}

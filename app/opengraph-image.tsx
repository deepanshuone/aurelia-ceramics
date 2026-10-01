import { ImageResponse } from "next/og";

// Default social-share card (WhatsApp, Facebook, X, LinkedIn…) for every page
// that doesn't set its own image. Products use their own photo.
export const alt = "AURELIA Ceramics — premium ceramic tableware";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          padding: "0 90px",
          background: "#171614",
          color: "#f5f1e9",
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 8, color: "#c5a77d", display: "flex" }}>PREMIUM CERAMIC TABLEWARE</div>
        <div style={{ fontSize: 120, marginTop: 24, lineHeight: 1.05, display: "flex" }}>AURELIA</div>
        <div style={{ fontSize: 44, marginTop: 8, letterSpacing: 14, display: "flex" }}>CERAMICS</div>
        <div style={{ fontSize: 30, marginTop: 40, color: "#cfc8bb", display: "flex" }}>
          Dinner sets, plates, bowls, mugs &amp; hand-painted Khurja pottery
        </div>
      </div>
    ),
    size
  );
}

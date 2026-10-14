// Brand mark: a ceramic vase holding an "AV" monogram (thick/thin strokes,
// small serifs). Draws in currentColor so it works on light and dark backgrounds.
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        d="M16.5 4H31.5M19.5 4C20.5 5.5 20.5 7.5 20.5 9.5C20.5 12.5 8.5 15.5 8.5 27C8.5 35.5 13.5 41 18.5 43H29.5C34.5 41 39.5 35.5 39.5 27C39.5 15.5 27.5 12.5 27.5 9.5C27.5 7.5 27.5 5.5 28.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="translate(24 30) scale(0.68) translate(-24 -23.5)" stroke="currentColor" fill="none">
        <line x1="12" y1="34" x2="20" y2="13" strokeWidth="1.5" />
        <polygon points="18.2,13 21.8,13 29.8,34 26.2,34" fill="currentColor" stroke="none" />
        <line x1="28" y1="34" x2="36" y2="13" strokeWidth="1.5" />
        <line x1="15.05" y1="26" x2="24.95" y2="26" strokeWidth="1.35" />
        <line x1="9.5" y1="34" x2="14.5" y2="34" strokeWidth="1.35" />
        <line x1="17" y1="13" x2="22.5" y2="13" strokeWidth="1.35" />
        <line x1="33.5" y1="13" x2="38.5" y2="13" strokeWidth="1.35" />
      </g>
    </svg>
  );
}

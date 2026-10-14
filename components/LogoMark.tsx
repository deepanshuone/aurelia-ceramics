// Brand mark: a ceramic cup on a saucer, with steam, holding an "AV" monogram
// (thick/thin strokes, small serifs). Draws in currentColor so it works on
// light and dark backgrounds.
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17H35C35 29 30.5 36.5 21 36.5C11.5 36.5 7 29 7 17Z" />
        <path d="M34.6 21C41.5 20 42 29.5 32 31" />
        <path d="M6 40.5C13 43.5 31 43.5 38 40.5" />
        <path d="M17 13C15.5 11 18.5 9.5 17 7.5" strokeWidth="1" />
        <path d="M22.5 13C21 10.5 24.5 9 22.5 5" strokeWidth="1" />
        <path d="M28 13C26.5 11 29.5 9.5 28 7.5" strokeWidth="1" />
      </g>
      <g transform="translate(21 26.5) scale(0.5) translate(-24 -23.5)" stroke="currentColor" fill="none">
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

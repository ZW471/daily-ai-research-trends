"use client";

interface DownloadButtonProps {
  url: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function DownloadButton({
  url,
  label = "Download",
  showLabel = false,
  className = "",
}: DownloadButtonProps) {
  return (
    <button
      type="button"
      title={label}
      className={`inline-flex items-center gap-1.5 text-muted hover:text-accent transition-colors ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, "_blank");
      }}
    >
      {showLabel && <span className="text-sm font-medium">{label}</span>}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}

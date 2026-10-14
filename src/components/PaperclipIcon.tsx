import React from 'react';

interface PaperclipIconProps {
  className?: string;
  title?: string;
}

export function PaperclipIcon({ className, title }: PaperclipIconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path
        d="M16.5 6.5l-7.9 7.9a3 3 0 104.2 4.2l8.4-8.4a5 5 0 10-7.1-7.1L5.7 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

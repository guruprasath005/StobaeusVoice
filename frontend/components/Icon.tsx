export function Icon({ path, path2 }: { path: string; path2?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
      {path2 && <path d={path2} />}
    </svg>
  );
}

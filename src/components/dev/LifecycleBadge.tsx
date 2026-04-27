/**
 * Dev-only badge that names the lifecycle hook powering the current page.
 * Renders nothing in production builds.
 */
export function LifecycleBadge({ hook }: { hook: string }) {
  if (import.meta.env.PROD) return null;
  return (
    <div className="fixed bottom-2 right-2 z-[60] rounded-md bg-foreground/80 px-2 py-1 text-[10px] font-mono text-background shadow-lg pointer-events-none select-none">
      lifecycle: {hook}
    </div>
  );
}

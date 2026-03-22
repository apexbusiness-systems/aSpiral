import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface QuickLink {
  label: string;
  to: string;
}

/**
 * Shared "Explore" quick-links bar.
 * Used across public pages (Privacy, Support, etc.)
 */
export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <section className="px-6 pb-20 border-t border-border/15 pt-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-muted-foreground/50 text-xs uppercase tracking-widest text-center mb-6 font-medium">
          Explore
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {links.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/30 bg-card/20 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-card/40 transition-all duration-200"
            >
              {label}
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import aspiralLogo from "@/assets/aspiral-logo.png";

/**
 * Shared page header with back-to-home link and logo.
 * Used across public pages (Privacy, Support, Story, etc.)
 */
export function PageHeader({ maxWidth = "max-w-5xl" }: Readonly<{ maxWidth?: string }>) {
  return (
    <header className="relative z-10 border-b border-border/30 backdrop-blur-sm">
      <div className={`mx-auto ${maxWidth} px-6 py-4 flex items-center justify-between`}>
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to home</span>
        </Link>
        <Link to="/">
          <img
            src={aspiralLogo}
            alt="aSpiral"
            className="h-[2.78rem] drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)] transition-all duration-300"
          />
        </Link>
      </div>
    </header>
  );
}

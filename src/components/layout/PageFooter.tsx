import { Link } from "react-router-dom";
import aspiralLogo from "@/assets/aspiral-logo.png";

const CONTACT_EMAIL = "info-outreach@aspiral.icu";

/**
 * Shared page footer with logo, contact info, and nav links.
 * Used across public pages (Privacy, Support, etc.)
 */
export function PageFooter() {
  return (
    <footer className="relative z-10 border-t border-border/20 py-12 px-6">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img
            src={aspiralLogo}
            alt="aSpiral"
            className="h-8 drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
          />
          <span className="text-muted-foreground text-sm">• aspiral.icu</span>
        </div>
        <div className="text-muted-foreground/60 text-sm text-center md:text-right space-y-1">
          <p>Built during a breakdown • Edmonton, AB</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-foreground transition-colors inline-block"
          >
            {CONTACT_EMAIL}
          </a>
          <div className="flex items-center justify-center md:justify-end gap-3 pt-1">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link to="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

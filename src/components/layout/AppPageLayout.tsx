import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Flame } from 'lucide-react';

interface AppPageLayoutProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly streakDays?: number;
  readonly onBack?: () => void;
  readonly backTo?: string;
  readonly headerActions?: ReactNode;
  readonly children: ReactNode;
}

export function AppPageLayout({
  title,
  subtitle,
  streakDays = 0,
  onBack,
  backTo = '/app',
  headerActions,
  children
}: AppPageLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(backTo);
  };

  return (
    <div className="app-container min-h-screen">
      {/* Ambient background */}
      <div className="ambient-orb w-96 h-96 bg-primary/30 top-0 left-0" />
      <div className="ambient-orb w-80 h-80 bg-secondary/20 bottom-20 right-10" style={{ animationDelay: '-5s' }} />
      
      <div className="relative z-10 container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            {streakDays > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/15 border border-warning/30 text-warning">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-semibold">{streakDays}</span>
                <span className="text-xs text-warning/80">day{streakDays === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}

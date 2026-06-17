import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Clock } from 'lucide-react';

const Workspaces = () => {
  const navigate = useNavigate();

  return (
    <div className="app-container min-h-screen">
      <div className="ambient-orb w-96 h-96 bg-primary/30 top-0 left-0" />
      <div className="ambient-orb w-80 h-80 bg-secondary/20 bottom-20 right-10" style={{ animationDelay: '-5s' }} />

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Workspaces</h1>
            <p className="text-sm text-muted-foreground">Team collaboration</p>
          </div>
        </div>

        <div className="glass-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Coming Soon</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">Workspaces are in development</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Collaborative workspaces are being built. This feature will let you share sessions and insights with your team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Workspaces;

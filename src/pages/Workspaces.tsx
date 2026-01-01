import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { normalizeError, type NormalizedError } from '@/lib/normalizeError';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Building2,
  Plus,
  Users,
  Settings,
  Loader2,
  Crown,
  UserPlus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name: string;
    avatar_url: string;
  };
}

const Workspaces = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadWorkspaces = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsRetrying(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const db = supabase as any;
      
      // Get workspaces where user is a member
      const { data: memberData, error: memberError } = await db
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user!.id);

      // Handle member query errors - but empty is OK
      if (memberError) {
        const normalized = normalizeError(memberError);
        // Empty is success (no workspaces yet), not error
        if (normalized.kind !== 'empty') {
          throw memberError;
        }
      }

      const workspaceIds = memberData?.map((m: any) => m.workspace_id) || [];
      
      if (workspaceIds.length > 0) {
        const { data: workspacesData, error: workspacesError } = await db
          .from('workspaces')
          .select('*')
          .in('id', workspaceIds);

        if (workspacesError) {
          const normalized = normalizeError(workspacesError);
          if (normalized.kind !== 'empty') {
            throw workspacesError;
          }
        }
        
        setWorkspaces(workspacesData || []);
      } else {
        // No workspaces - this is SUCCESS, not an error
        setWorkspaces([]);
      }

      // Clear any previous error on success
      setError(null);

    } catch (err) {
      console.error('Error loading workspaces:', err);
      const normalized = normalizeError(err);
      
      // Only show error banner for real errors, not empty states
      if (!normalized.isNonError) {
        setError(normalized);
        toast({
          title: 'Error loading workspaces',
          description: normalized.message,
          variant: 'destructive',
        });
      } else {
        // "Empty" is not an error - just show empty state
        setWorkspaces([]);
        setError(null);
      }
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user, loadWorkspaces]);

  const handleRetry = () => {
    loadWorkspaces(true);
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    
    setIsCreating(true);
    try {
      const slug = newWorkspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const db = supabase as any;
      const { data: workspace, error: workspaceError } = await db
        .from('workspaces')
        .insert({
          name: newWorkspaceName.trim(),
          slug: `${slug}-${Date.now().toString(36)}`,
          owner_id: user!.id,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add creator as admin
      const { error: memberError } = await db
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user!.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      toast({ title: 'Workspace created!' });
      setNewWorkspaceName('');
      setDialogOpen(false);
      loadWorkspaces();
    } catch (err: any) {
      console.error('Error creating workspace:', err);
      const normalized = normalizeError(err);
      toast({
        title: 'Failed to create workspace',
        description: normalized.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="app-container min-h-screen">
      <div className="ambient-orb w-96 h-96 bg-primary/30 top-0 left-0" />
      <div className="ambient-orb w-80 h-80 bg-secondary/20 bottom-20 right-10" style={{ animationDelay: '-5s' }} />
      
      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Workspaces
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your team workspaces
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRetry}
              disabled={isRetrying || isLoading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border">
                <DialogHeader>
                  <DialogTitle>Create Workspace</DialogTitle>
                  <DialogDescription>
                    Create a new workspace for your team
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Workspace Name</Label>
                    <Input
                      placeholder="My Team"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <Button 
                    onClick={createWorkspace} 
                    disabled={isCreating || !newWorkspaceName.trim()}
                    className="w-full"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Create Workspace
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Error Banner - Only for real errors, not empty states */}
        {error && !error.isNonError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Error loading workspaces</p>
              <p className="text-sm text-destructive/80">{error.message}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Retry'
              )}
            </Button>
          </div>
        )}

        {/* Workspaces List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : workspaces.length === 0 && !error ? (
          // Empty state - NOT an error, valid first-run state
          <div className="glass-card p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              No workspaces yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Create a workspace to collaborate with your team
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Workspace
            </Button>
          </div>
        ) : workspaces.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="glass-card p-4 hover:bg-glass-hover transition-colors cursor-pointer"
                  onClick={() => navigate(`/workspaces/${workspace.id}`)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground flex items-center gap-2">
                          {workspace.name}
                          {workspace.owner_id === user?.id && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          /{workspace.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="rounded-lg">
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-lg">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : null}
      </div>
    </div>
  );
};

export default Workspaces;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Key,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

const ApiKeys = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    try {
      const db = supabase as any;
      const { data, error } = await db
        .from('api_keys')
        .select('id, name, last_used_at, created_at, expires_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: 'Error loading API keys',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sp_';
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashApiKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    setIsCreating(true);
    try {
      const key = generateApiKey();
      const keyHash = await hashApiKey(key);

      const db = supabase as any;
      const { error } = await db
        .from('api_keys')
        .insert({
          user_id: user!.id,
          name: newKeyName.trim(),
          key_hash: keyHash,
        });

      if (error) throw error;

      setNewKeyValue(key);
      setShowNewKey(true);
      toast({ title: 'API key created!' });
      loadApiKeys();
    } catch (error: any) {
      console.error('Error creating API key:', error);
      toast({
        title: 'Failed to create API key',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async () => {
    if (!deleteTarget) return;
    
    try {
      const db = supabase as any;
      const { error } = await db
        .from('api_keys')
        .delete()
        .eq('id', deleteTarget);

      if (error) throw error;

      setApiKeys(prev => prev.filter(k => k.id !== deleteTarget));
      toast({ title: 'API key deleted' });
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: 'Failed to delete API key',
        variant: 'destructive',
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  const closeNewKeyDialog = () => {
    setDialogOpen(false);
    setNewKeyName('');
    setNewKeyValue(null);
    setShowNewKey(false);
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
                API Keys
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your API access keys
              </p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) closeNewKeyDialog();
            else setDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                New API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border">
              <DialogHeader>
                <DialogTitle>
                  {newKeyValue ? 'API Key Created' : 'Create API Key'}
                </DialogTitle>
                <DialogDescription>
                  {newKeyValue 
                    ? 'Copy your API key now. You won\'t be able to see it again!'
                    : 'Create a new API key for programmatic access'
                  }
                </DialogDescription>
              </DialogHeader>
              
              {newKeyValue ? (
                <div className="space-y-4 pt-4">
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono break-all">
                        {showNewKey ? newKeyValue : '•'.repeat(40)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowNewKey(!showNewKey)}
                      >
                        {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(newKeyValue)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button onClick={closeNewKeyDialog} className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Key name (e.g., Production)"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <Button 
                    onClick={createApiKey} 
                    disabled={isCreating || !newKeyName.trim()}
                    className="w-full"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    Generate API Key
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* API Keys List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              No API keys yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Create an API key to access Spiral programmatically
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First API Key
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="glass-card p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Key className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {apiKey.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}
                          </span>
                          {apiKey.last_used_at && (
                            <span>
                              Last used {formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(apiKey.id)}
                      className="rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* API Docs Link */}
        <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
          <h3 className="font-medium text-foreground mb-2">API Documentation</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Use your API key with the x-api-key header to authenticate requests.
          </p>
          <code className="block p-3 rounded bg-background text-xs font-mono overflow-x-auto">
            curl -H "x-api-key: sp_your_key_here" \{'\n'}
            {'  '}https://eqtwatyodujxofrdznen.supabase.co/functions/v1/api-sessions
          </code>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any applications using this key will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteApiKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApiKeys;

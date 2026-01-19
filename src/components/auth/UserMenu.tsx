import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const { signOut: appSignOut } = await import('@/lib/auth');
      await signOut();
      await appSignOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        size="default"
        onClick={() => navigate('/auth')}
        className="border-primary/50 text-primary bg-primary/5 hover:bg-primary/15 hover:border-primary font-medium px-4 py-2 min-w-[100px]"
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleSignOut}
      className="border-destructive/50 text-destructive bg-destructive/5 hover:bg-destructive/15 hover:border-destructive font-medium px-4 py-2 min-w-[100px]"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  );
};

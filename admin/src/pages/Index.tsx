import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to admin login after a short delay
    const timer = setTimeout(() => {
      navigate('/admin/login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="p-6 bg-accent/10 rounded-3xl">
            <Camera className="w-20 h-20 text-accent" />
          </div>
        </div>
        <h1 className="text-5xl font-display font-bold">Varnika Visuals</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Professional photography file management system
        </p>
        <div className="pt-4">
          <Button
            onClick={() => navigate('/admin/login')}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
          >
            Go to Admin Panel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

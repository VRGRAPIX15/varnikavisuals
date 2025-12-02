import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';

const Branding = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Branding</h1>
        <p className="text-muted-foreground">Customize your brand appearance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Brand Settings
          </CardTitle>
          <CardDescription>Logos, colors, and theme settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Branding options will be displayed here
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Branding;

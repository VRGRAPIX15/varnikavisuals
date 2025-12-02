import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your application</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Application Settings
          </CardTitle>
          <CardDescription>Manage system configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Settings panel will be displayed here
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Webhook } from 'lucide-react';

const Webhooks = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Webhooks</h1>
        <p className="text-muted-foreground">Configure webhook notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>Set up automated notifications and integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Webhook settings will be displayed here
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Webhooks;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload as UploadIcon } from 'lucide-react';

const Uploads = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Uploads</h1>
        <p className="text-muted-foreground">Manage file uploads</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <UploadIcon className="w-5 h-5" />
            Upload History
          </CardTitle>
          <CardDescription>View all uploaded files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Upload history will be displayed here
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Uploads;

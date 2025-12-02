import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { ADMIN_KEY } from '@/lib/auth';
import { formatRelativeTime } from '@/lib/format';
import { Activity as ActivityIcon } from 'lucide-react';

interface Activity {
  timestamp: string;
  userId: string;
  action: string;
  target: string;
  payload: string;
}

const Activities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const res = await api.getActivities(ADMIN_KEY);
      if (res.ok && res.activities) {
        setActivities(res.activities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Activities</h1>
        <p className="text-muted-foreground">Monitor all system activities</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <ActivityIcon className="w-5 h-5" />
            Activity Log
          </CardTitle>
          <CardDescription>Complete history of all actions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No activities found</div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{activity.userId || 'System'}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-sm text-accent">{activity.action}</span>
                    </div>
                    {activity.target && (
                      <p className="text-sm text-muted-foreground mt-1">Target: {activity.target}</p>
                    )}
                    {activity.payload && activity.payload !== '{}' && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                        {activity.payload}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Activities;

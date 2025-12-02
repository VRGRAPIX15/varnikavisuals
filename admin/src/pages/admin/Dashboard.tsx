import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { ADMIN_KEY } from '@/lib/auth';
import { Users, Image, Heart, UserCheck } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';

interface Stats {
  totalClients: number;
  activeClients: number;
  totalPhotos: number;
  totalLikes: number;
}

interface Activity {
  timestamp: string;
  userId: string;
  action: string;
  target: string;
  payload: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, activitiesRes] = await Promise.all([
        api.getStats(ADMIN_KEY),
        api.getActivities(ADMIN_KEY)
      ]);

      if (statsRes.ok) {
        setStats({
          totalClients: statsRes.totalClients || 0,
          activeClients: statsRes.activeClients || 0,
          totalPhotos: statsRes.totalPhotos || 0,
          totalLikes: statsRes.totalLikes || 0
        });
      }

      if (activitiesRes.ok && activitiesRes.activities) {
        setActivities(activitiesRes.activities.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your photography business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold">{stats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All registered clients</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold">{stats?.activeClients || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold">{stats?.totalPhotos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded images</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold">{stats?.totalLikes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Client favorites</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Recent Activities</CardTitle>
          <CardDescription>Latest actions across your platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recent activities</div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{activity.userId || 'System'}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{activity.action}</span>
                    </div>
                    {activity.target && (
                      <p className="text-sm text-muted-foreground mt-1">{activity.target}</p>
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

export default Dashboard;

import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Upload,
  Activity,
  Settings,
  Palette,
  Webhook,
  LogOut,
  Camera
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { toast } from 'sonner';

const menuItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Clients', url: '/admin/clients', icon: Users },
  { title: 'File Browser', url: '/admin/files', icon: FolderOpen },
  { title: 'Uploads', url: '/admin/uploads', icon: Upload },
  { title: 'Activities', url: '/admin/activities', icon: Activity },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
  { title: 'Branding', url: '/admin/branding', icon: Palette },
  { title: 'Webhooks', url: '/admin/webhooks', icon: Webhook },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  const handleLogout = () => {
    authService.logout();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  return (
    <Sidebar className={open ? 'w-60' : 'w-14'}>
      <SidebarContent>
        <div className={`px-4 py-6 border-b border-sidebar-border ${!open ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Camera className="w-5 h-5 text-accent" />
            </div>
            {open && (
              <div>
                <h2 className="font-display font-semibold text-sm">Varnika Visuals</h2>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="py-4">
          <SidebarGroupLabel className={!open ? 'sr-only' : ''}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className={`h-4 w-4 ${!open ? '' : 'mr-2'}`} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto border-t border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive transition-colors">
                <LogOut className={`h-4 w-4 ${!open ? '' : 'mr-2'}`} />
                {open && <span>Logout</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

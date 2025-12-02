import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { authService } from '@/lib/auth';

export function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated() || !authService.isAdmin()) {
      navigate('/admin/login');
    }
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-background flex items-center px-6 sticky top-0 z-10">
            <SidebarTrigger className="-ml-2" />
            <div className="ml-4 font-display font-semibold">Admin Panel</div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

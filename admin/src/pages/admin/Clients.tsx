// Enhanced Clients page with folder creation and assignment
// File: Admin_new/src/pages/admin/Clients.tsx

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api, User, FolderItem } from '@/lib/api';
import { ADMIN_KEY } from '@/lib/auth';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FolderOpen, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const Clients = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<User | null>(null);
  const [assignFolderDialog, setAssignFolderDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: '', userName: '' });
  
  const [availableFolders, setAvailableFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    displayName: '',
    photoUrl: '',
    isActive: true,
    selectionLimit: 25,
    createFolder: false,
    folderName: ''
  });

  // Auto-sync every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadClients();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await api.getClients(ADMIN_KEY);
      if (res.ok && res.clients) {
        // Convert string booleans to actual booleans
        const processedClients = res.clients.map(client => ({
          ...client,
          isActive: String(client.isActive).toLowerCase() !== 'false',
          isAdmin: String(client.isAdmin).toLowerCase() === 'true'
        }));
        setClients(processedClients);
      }
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await loadClients();
    setSyncing(false);
    toast.success('Synced with Google Sheets');
  };

  const loadFolders = async () => {
    try {
      const res = await api.listFolders(ADMIN_KEY);
      if (res.ok) {
        setAvailableFolders(res.folders || []);
      }
    } catch (error) {
      console.error('Failed to load folders');
    }
  };

  const handleCreate = async () => {
    if (!formData.userId || !formData.password) {
      toast.error('User ID and password are required');
      return;
    }

    try {
      const res = await api.createClient(ADMIN_KEY, formData);
      if (res.ok) {
        toast.success('Client created successfully');
        setDialogOpen(false);
        resetForm();
        loadClients();
      } else {
        toast.error(res.error || 'Failed to create client');
      }
    } catch (error) {
      toast.error('Failed to create client');
    }
  };

  const handleUpdate = async () => {
    if (!editingClient) return;
    
    try {
      const updateData: Partial<User> & { userId: string } = {
        userId: editingClient.userId,
        displayName: formData.displayName,
        photoUrl: formData.photoUrl,
        isActive: formData.isActive,
        selectionLimit: formData.selectionLimit
      };
      
      // Only include password if it's not empty
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }
      
      const res = await api.updateClient(ADMIN_KEY, updateData);
      if (res.ok) {
        toast.success('Client updated successfully');
        setDialogOpen(false);
        setEditingClient(null);
        resetForm();
        loadClients();
      } else {
        toast.error(res.error || 'Failed to update client');
      }
    } catch (error) {
      toast.error('Failed to update client');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this client? This will not delete their folder.')) return;
    
    try {
      const res = await api.deleteClient(ADMIN_KEY, userId);
      if (res.ok) {
        toast.success('Client deleted successfully');
        loadClients();
      } else {
        toast.error(res.error || 'Failed to delete client');
      }
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const handleAssignFolder = async () => {
    if (!selectedFolderId) {
      toast.error('Please select a folder');
      return;
    }

    try {
      const res = await api.assignFolder(ADMIN_KEY, assignFolderDialog.userId, selectedFolderId);
      if (res.ok) {
        toast.success('Folder assigned successfully');
        setAssignFolderDialog({ open: false, userId: '', userName: '' });
        setSelectedFolderId('');
        loadClients();
      } else {
        toast.error(res.error || 'Failed to assign folder');
      }
    } catch (error) {
      toast.error('Failed to assign folder');
    }
  };

  const handleCreateAndAssignFolder = async (userId: string, displayName: string) => {
    const folderName = prompt(`Enter folder name for ${displayName}:`, `${userId}_gallery`);
    if (!folderName) return;

    try {
      // Create folder
      const createRes = await api.createFolder(ADMIN_KEY, {
        folderName,
        userId
      });

      if (createRes.ok) {
        // Assign folder
        const assignRes = await api.assignFolder(ADMIN_KEY, userId, createRes.folderId);
        if (assignRes.ok) {
          toast.success('Folder created and assigned successfully');
          loadClients();
        } else {
          toast.error(assignRes.error || 'Failed to assign folder');
        }
      } else {
        toast.error(createRes.error || 'Failed to create folder');
      }
    } catch (error) {
      toast.error('Failed to create and assign folder');
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      password: '',
      displayName: '',
      photoUrl: '',
      isActive: true,
      selectionLimit: 25,
      createFolder: false,
      folderName: ''
    });
    setEditingClient(null);
  };

  const openEditDialog = (client: User) => {
    setEditingClient(client);
    setFormData({
      userId: client.userId,
      password: '',
      displayName: client.displayName,
      photoUrl: client.photoUrl || '',
      isActive: client.isActive !== false,
      selectionLimit: client.selectionLimit || 25,
      createFolder: false,
      folderName: ''
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openAssignFolderDialog = (userId: string, displayName: string) => {
    setAssignFolderDialog({ open: true, userId, userName: displayName });
    loadFolders();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Clients</h1>
          <p className="text-muted-foreground">Manage your photography clients and their folders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingClient ? 'Edit Client' : 'Create New Client'}
                </DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Update client information' : 'Add a new client to your platform'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID *</Label>
                  <Input
                    id="userId"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    disabled={!!editingClient}
                    placeholder="client01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password {editingClient && '(leave empty to keep current)'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingClient ? 'Leave empty to keep current' : '••••••••'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="John & Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photoUrl">Photo URL (optional)</Label>
                  <Input
                    id="photoUrl"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selectionLimit">Selection Limit</Label>
                  <Input
                    id="selectionLimit"
                    type="number"
                    value={formData.selectionLimit}
                    onChange={(e) => setFormData({ ...formData, selectionLimit: parseInt(e.target.value) || 25 })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="isActive" className="cursor-pointer">Active Status</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
                {!editingClient && (
                  <>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between space-x-2 mb-2">
                        <Label htmlFor="createFolder" className="cursor-pointer">
                          Create Folder Automatically
                        </Label>
                        <Switch
                          id="createFolder"
                          checked={formData.createFolder}
                          onCheckedChange={(checked) => setFormData({ ...formData, createFolder: checked })}
                        />
                      </div>
                      {formData.createFolder && (
                        <div className="space-y-2 mt-2">
                          <Label htmlFor="folderName">Folder Name</Label>
                          <Input
                            id="folderName"
                            value={formData.folderName}
                            onChange={(e) => setFormData({ ...formData, folderName: e.target.value })}
                            placeholder={`${formData.userId || 'client'}_gallery`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Leave empty to use default: {formData.userId || 'user'}_gallery
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={editingClient ? handleUpdate : handleCreate}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {editingClient ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">All Clients</CardTitle>
          <CardDescription>
            Total: {clients.length} | Active: {clients.filter(c => c.isActive).length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No clients found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Folder</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.userId}>
                      <TableCell className="font-medium">{client.userId}</TableCell>
                      <TableCell>{client.displayName || '-'}</TableCell>
                      <TableCell>
                        {client.folderName ? (
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-accent" />
                            <span className="text-sm">{client.folderName}</span>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateAndAssignFolder(client.userId, client.displayName)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Create
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.isActive ? (
                          <Badge variant="default" className="bg-accent text-accent-foreground">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{client.selectionLimit || 25}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!client.folderName && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAssignFolderDialog(client.userId, client.displayName)}
                            >
                              <FolderOpen className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(client)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(client.userId)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Folder Dialog */}
      <Dialog
        open={assignFolderDialog.open}
        onOpenChange={(open) => setAssignFolderDialog({ ...assignFolderDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Folder</DialogTitle>
            <DialogDescription>
              Assign an existing folder to {assignFolderDialog.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderSelect">Select Folder</Label>
              <select
                id="folderSelect"
                className="w-full p-2 border rounded-md"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
              >
                <option value="">-- Select a folder --</option>
                {availableFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignFolderDialog({ open: false, userId: '', userName: '' })}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignFolder}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
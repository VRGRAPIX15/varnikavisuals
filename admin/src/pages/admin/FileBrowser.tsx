// Enhanced FileBrowser with 2-way sync, upload, and folder management
// File: Admin_new/src/pages/admin/FileBrowser.tsx

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { api, FileItem, FolderItem, BreadcrumbItem } from '@/lib/api';
import { ADMIN_KEY } from '@/lib/auth';
import { toast } from 'sonner';
import { formatBytes, formatDate } from '@/lib/format';
import {
  FolderOpen,
  File,
  Search,
  Grid3x3,
  List,
  Upload,
  FolderPlus,
  Home,
  ChevronRight,
  Image as ImageIcon,
  Video,
  MoreVertical,
  Trash2,
  Edit,
  Move,
  RefreshCw,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const MASTER_FOLDER_ID = '1jOwj7-MYL6EGPxRUPK2RCI7546NiKj2q';

const FileBrowser = () => {
  const [currentFolderId, setCurrentFolderId] = useState(MASTER_FOLDER_ID);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialogs
  const [uploadDialog, setUploadDialog] = useState(false);
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; type: 'file' | 'folder'; id: string; currentName: string }>({
    open: false,
    type: 'file',
    id: '',
    currentName: ''
  });
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; fileId: string; fileName: string }>({
    open: false,
    fileId: '',
    fileName: ''
  });
  
  // Form states
  const [newFolderName, setNewFolderName] = useState('');
  const [newName, setNewName] = useState('');
  const [targetFolderId, setTargetFolderId] = useState(MASTER_FOLDER_ID);
  const [allFolders, setAllFolders] = useState<FolderItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load folder contents
  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const res = await api.getFiles(ADMIN_KEY, folderId);
      if (res.ok) {
        setFolders(res.folders || []);
        setFiles(res.items || res.files || []);
        setBreadcrumb(res.breadcrumb || []);
      } else {
        toast.error(res.error || 'Failed to load folder');
      }
    } catch (error) {
      toast.error('Failed to load folder');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30 seconds for 2-way sync
  useEffect(() => {
    const interval = setInterval(() => {
      loadFolder(currentFolderId);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentFolderId, loadFolder]);

  // Initial load
  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, loadFolder]);

  // Manual sync
  const handleSync = async () => {
    setSyncing(true);
    await loadFolder(currentFolderId);
    setSyncing(false);
    toast.success('Synced with Google Drive');
  };

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadFolder(currentFolderId);
      return;
    }
    setLoading(true);
    try {
      const res = await api.search(ADMIN_KEY, searchQuery, currentFolderId);
      if (res.ok) {
        setFolders(res.folders || []);
        setFiles(res.items || res.files || []);
      } else {
        toast.error(res.error || 'Search failed');
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const res = await api.createFolder(ADMIN_KEY, {
        folderName: newFolderName,
        parentId: currentFolderId
      });

      if (res.ok) {
        toast.success('Folder created successfully');
        setCreateFolderDialog(false);
        setNewFolderName('');
        loadFolder(currentFolderId);
      } else {
        toast.error(res.error || 'Failed to create folder');
      }
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  // Upload files
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const base64 = event.target?.result?.toString().split(',')[1];
            if (!base64) throw new Error('Failed to read file');

            const res = await api.uploadFile(ADMIN_KEY, {
              folderId: currentFolderId,
              base64,
              filename: file.name,
              mimeType: file.type
            });

            if (res.ok) {
              toast.success(`Uploaded ${file.name}`);
              resolve();
            } else {
              toast.error(`Failed to upload ${file.name}: ${res.error}`);
              reject(new Error(res.error));
            }
          } catch (error) {
            toast.error(`Failed to upload ${file.name}`);
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
      });
    });

    try {
      await Promise.all(uploadPromises);
      loadFolder(currentFolderId);
    } catch (error) {
      console.error('Upload errors:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Rename file/folder
  const handleRename = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a new name');
      return;
    }

    try {
      const res = renameDialog.type === 'file'
        ? await api.renameFile(ADMIN_KEY, renameDialog.id, newName)
        : await api.renameFolder(ADMIN_KEY, renameDialog.id, newName);

      if (res.ok) {
        toast.success(`${renameDialog.type === 'file' ? 'File' : 'Folder'} renamed successfully`);
        setRenameDialog({ open: false, type: 'file', id: '', currentName: '' });
        setNewName('');
        loadFolder(currentFolderId);
      } else {
        toast.error(res.error || 'Failed to rename');
      }
    } catch (error) {
      toast.error('Failed to rename');
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const res = await api.deleteFile(ADMIN_KEY, fileId);
      if (res.ok) {
        toast.success('File deleted successfully');
        loadFolder(currentFolderId);
      } else {
        toast.error(res.error || 'Failed to delete file');
      }
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  // Load all folders for move dialog
  const loadAllFolders = async () => {
    try {
      const res = await api.listFolders(ADMIN_KEY, MASTER_FOLDER_ID);
      if (res.ok) {
        setAllFolders(res.folders || []);
      }
    } catch (error) {
      console.error('Failed to load folders');
    }
  };

  // Move file
  const handleMoveFile = async () => {
    try {
      const res = await api.moveFile(ADMIN_KEY, moveDialog.fileId, targetFolderId);
      if (res.ok) {
        toast.success('File moved successfully');
        setMoveDialog({ open: false, fileId: '', fileName: '' });
        loadFolder(currentFolderId);
      } else {
        toast.error(res.error || 'Failed to move file');
      }
    } catch (error) {
      toast.error('Failed to move file');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (mimeType?.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-display font-bold">File Browser</h1>
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
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateFolderDialog(true)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mt-4 text-sm flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBreadcrumbClick(MASTER_FOLDER_ID)}
            className="h-8 px-2"
          >
            <Home className="w-4 h-4" />
          </Button>
          {breadcrumb.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(item.id)}
                className="h-8 px-2"
              >
                {item.name}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {folders.map((folder) => (
                  <Card
                    key={folder.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className="w-full flex justify-between items-start">
                        <div className="flex-1" onClick={() => handleFolderClick(folder.id)}>
                          <FolderOpen className="w-12 h-12 text-accent mx-auto" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setRenameDialog({ open: true, type: 'folder', id: folder.id, currentName: folder.name });
                              setNewName(folder.name);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm font-medium truncate w-full" onClick={() => handleFolderClick(folder.id)}>
                        {folder.name}
                      </p>
                    </div>
                  </Card>
                ))}
                {files.map((file) => (
                  <Card
                    key={file.id}
                    className="group cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="aspect-square bg-muted relative">
                      <img
                        src={file.thumbnail}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setRenameDialog({ open: true, type: 'file', id: file.id, currentName: file.name });
                              setNewName(file.name);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setMoveDialog({ open: true, fileId: file.id, fileName: file.name });
                              loadAllFolders();
                            }}>
                              <Move className="w-4 h-4 mr-2" />
                              Move
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(file.downloadUrl, '_blank')}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteFile(file.id, file.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors group"
                  >
                    <FolderOpen
                      className="w-5 h-5 text-accent flex-shrink-0 cursor-pointer"
                      onClick={() => handleFolderClick(folder.id)}
                    />
                    <span className="flex-1 font-medium cursor-pointer" onClick={() => handleFolderClick(folder.id)}>
                      {folder.name}
                    </span>
                    <span className="text-sm text-muted-foreground">Folder</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setRenameDialog({ open: true, type: 'folder', id: folder.id, currentName: folder.name });
                          setNewName(folder.name);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors group"
                  >
                    {getFileIcon(file.mimeType)}
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-sm text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(file.modifiedAt)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setRenameDialog({ open: true, type: 'file', id: file.id, currentName: file.name });
                          setNewName(file.name);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setMoveDialog({ open: true, fileId: file.id, fileName: file.name });
                          loadAllFolders();
                        }}>
                          <Move className="w-4 h-4 mr-2" />
                          Move
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(file.downloadUrl, '_blank')}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
            {folders.length === 0 && files.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'No results found' : 'This folder is empty'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialog} onOpenChange={setCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in the current location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ ...renameDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameDialog.type === 'file' ? 'File' : 'Folder'}</DialogTitle>
            <DialogDescription>
              Enter a new name for "{renameDialog.currentName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">New Name</Label>
              <Input
                id="newName"
                placeholder="Enter new name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ open: false, type: 'file', id: '', currentName: '' })}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move File Dialog */}
      <Dialog open={moveDialog.open} onOpenChange={(open) => setMoveDialog({ ...moveDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
            <DialogDescription>
              Move "{moveDialog.fileName}" to another folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetFolder">Destination Folder</Label>
              <select
                id="targetFolder"
                className="w-full p-2 border rounded-md"
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
              >
                <option value={MASTER_FOLDER_ID}>Master Folder</option>
                {allFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog({ open: false, fileId: '', fileName: '' })}>
              Cancel
            </Button>
            <Button onClick={handleMoveFile}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileBrowser;
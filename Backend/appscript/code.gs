/**
 * Unified Apps Script backend for VarnikaVisuals
 * - Single deployment for Admin + Client
 * - Admin actions protected by ADMIN_KEY
 * - Uses Google Sheets as DB and Drive for storage
 *
 * IMPORTANT: set CONFIG.GOOGLE_SHEET_ID to your Sheet ID before deploy.
 */

const CONFIG = {
  GOOGLE_SHEET_ID: '14QNY4mqEuRbOgZqRSs5EnqgjAX2fHCS4B401OAmOeqk',
  MASTER_FOLDER_ID: '1jOwj7-MYL6EGPxRUPK2RCI7546NiKj2q', // VARNIKA_MASTER_FOR_CLIENTS (hardcoded)
  DEFAULT_UPLOAD_FOLDER_ID: 'REPLACE_WITH_DEFAULT_FOLDER_ID', // optional
  ADMIN_KEY: 'ADMIN@1234',
  SESSION_TTL_HOURS: 48,
  SHEETS: {
    USERS: 'Users',
    FOLDERS: 'Folders',
    FOLDER_STATE: 'FolderState',
    COMMENTS: 'Comments',
    SESSIONS: 'Sessions',
    AUDIT: 'Audit',
    SUBMISSION_BATCHES: 'SubmissionBatches',
    SUBMISSION_ITEMS: 'SubmissionItems',
    SELECTIONS: 'Selections',
    BRANDING: 'Branding',
    UPLOADS: 'Uploads'
  }
};

/* ---------- Helpers ---------- */
function ss(){ return SpreadsheetApp.openById(CONFIG.GOOGLE_SHEET_ID); }
function ts(){ return new Date(); }
function formatBytes(bytes){ if(!bytes && bytes!==0) return ''; const thresh = 1024; if(Math.abs(bytes) < thresh) return bytes + ' B'; const units = ['KB','MB','GB','TB','PB','EB','ZB','YB']; let u = -1; do { bytes = bytes / thresh; ++u; } while(Math.abs(bytes) >= thresh && u < units.length-1); return bytes.toFixed(2) + ' ' + units[u]; }
function jsonOut(obj, callback) {
  // Return JSON (or JSONP if callback provided) via ContentService.
  // We do NOT set custom HTTP response headers here because the Vercel proxy
  // (google-proxy.ts) is already handling CORS. Returning plain JSON text
  // avoids HtmlService HTML responses that break JSON parsing in the frontend.
  const body = JSON.stringify(obj || {});
  const output = callback ? `${callback}(${body});` : body;
  return ContentService
    .createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
function indexMap(header){ const m={}; header.forEach((h,i)=>m[h]=i); return m; }
function audit(userId, action, targetId, payload){ try{ ss().getSheetByName(CONFIG.SHEETS.AUDIT).appendRow([ts(), userId||'', action||'', targetId||'', payload||'']); }catch(e){} }

/* ---------- Init sheets (run at start) ---------- */
function ensureSheet(name, headers){
  const s = ss();
  let sh = s.getSheetByName(name);
  if(!sh){ sh = s.insertSheet(name); sh.appendRow(headers); }
  else {
    // ensure header shape
    const cur = sh.getRange(1,1,1,headers.length).getValues()[0];
    if(cur.join('|') !== headers.join('|')) sh.getRange(1,1,1,headers.length).setValues([headers]);
  }
  return sh;
}
function initSheets(){
  ensureSheet(CONFIG.SHEETS.USERS, ["Timestamp","User ID","Password","Display Name","Photo URL","Is Active","Is Admin","Selection Limit"]);
  ensureSheet(CONFIG.SHEETS.FOLDERS, ["Timestamp","User ID","Folder Name","Folder ID","Folder URL","Submit (TRUE/FALSE)"]);
  ensureSheet(CONFIG.SHEETS.FOLDER_STATE, ["Folder ID","Media ID","User ID","Liked","Like Count","Comments","Preset","Timestamp"]);
  ensureSheet(CONFIG.SHEETS.COMMENTS, ["Timestamp","User ID","Folder ID","File ID","Comment Text"]);
  ensureSheet(CONFIG.SHEETS.SESSIONS, ["Timestamp","User ID","Token","Expires At (ISO)"]);
  ensureSheet(CONFIG.SHEETS.AUDIT, ["Timestamp","User ID","Action","Target ID","Payload JSON"]);
  ensureSheet(CONFIG.SHEETS.SUBMISSION_BATCHES, ["Batch ID","Timestamp","User ID","Folder ID","File Count","Status"]);
  ensureSheet(CONFIG.SHEETS.SUBMISSION_ITEMS, ["Batch ID","User ID","Folder ID","File ID","Timestamp"]);
  ensureSheet(CONFIG.SHEETS.SELECTIONS, ["Timestamp","User ID","Folder ID","File ID","Selected (TRUE/FALSE)"]);
  ensureSheet(CONFIG.SHEETS.BRANDING, ["Key","Value"]);
  ensureSheet(CONFIG.SHEETS.UPLOADS, ["Timestamp","File ID","Filename","Folder ID","Uploader","MimeType","Size","DriveUrl"]);
  ensureSheet('FolderStats', ["Folder ID","File Count","Folder Count","Total SizeBytes","LastComputedISO"]);
}

/* ---------- Request handlers ---------- */
function doGet(e){
  initSheets();
  if (e && e.parameter && e.parameter._cors) return jsonOut({ ok: true, cors: "enabled" });
  const p = e && e.parameter ? e.parameter : {};
  const action = (p.action || 'ping').toLowerCase();
  const cb = p.callback || null;
  try{
    switch(action){
      case 'ping': return jsonOut({ ok:true, now:new Date().toISOString(), service:'VarnikaVisuals' }, cb);
      case 'login': return jsonOut(handleClientLogin(p), cb);
      case 'me': return jsonOut(handleMe(p), cb);
      case 'list': return jsonOut(handleList(p), cb);
      case 'list_folders': return jsonOut(handleListFolders(p), cb);
      case 'search': return jsonOut(adminGuard(p, handleSearch.bind(null, p)), cb);
      case 'get_branding': return jsonOut(handleGetBranding(p), cb);
      case 'get_stats': return jsonOut(adminGuard(p, handleGetStats), cb);
      case 'get_clients': return jsonOut(adminGuard(p, handleGetClients), cb);
      case 'get_files': return jsonOut(adminGuard(p, handleGetFiles), cb);
      case 'get_folder_stats': return jsonOut(adminGuard(p, function(){ return handleGetFolderStats(p); }), cb);
      case 'get_activities': return jsonOut(adminGuard(p, handleGetActivities), cb);
      case 'read_comments': return jsonOut(requireAuth(p.token, user => handleReadComments(p)), cb);
      case 'counts': return jsonOut(requireAuth(p.token, user => handleCounts(user, p)), cb);
      default: return jsonOut({ ok:false, error:'unknown_action' }, cb);
    }
  }catch(err){ return jsonOut({ ok:false, error: String(err) }, cb); }
}

function doPost(e){
  initSheets();
  let params = {};
  if(e && e.postData && e.postData.type === 'application/json'){ try{ params = JSON.parse(e.postData.contents || '{}'); }catch(_){ params = {}; } }
  else params = e.parameter || {};
  if (params._cors) return jsonOut({ ok: true, cors: "enabled" });
  const action = (params.action || '').toLowerCase();
  try{
    switch(action){
      /* Admin actions (require adminKey) */
      case 'admin_login': return jsonOut(handleAdminLogin(params));
      case 'create_client': return jsonOut(adminGuard(params, handleCreateClient.bind(null, params)));
      case 'update_client': return jsonOut(adminGuard(params, handleUpdateClient.bind(null, params)));
      case 'delete_client': return jsonOut(adminGuard(params, handleDeleteClient.bind(null, params)));
      case 'create_folder': return jsonOut(adminGuard(params, handleCreateFolder.bind(null, params)));
      case 'assign_folder': return jsonOut(adminGuard(params, handleAssignFolder.bind(null, params)));
      case 'upload': return jsonOut(adminGuard(params, handleUpload.bind(null, params)));
      case 'delete_file': return jsonOut(adminGuard(params, handleDeleteFile.bind(null, params)));
      case 'rename_file': return jsonOut(adminGuard(params, handleRenameFile.bind(null, params)));
      case 'rename_folder': return jsonOut(adminGuard(params, handleRenameFolder.bind(null, params)));
      case 'move_file': return jsonOut(adminGuard(params, handleMoveFile.bind(null, params)));
      case 'update_branding': return jsonOut(adminGuard(params, handleUpdateBranding.bind(null, params)));
      /* Client actions (use token for auth) */
      case 'like': return jsonOut(requireAuth(params.token, user => handleLike(user, params)));
      case 'comment': return jsonOut(requireAuth(params.token, user => handleComment(user, params)));
      case 'setpreset': return jsonOut(requireAuth(params.token, user => handleSetPreset(user, params)));
      case 'submitselected': return jsonOut(requireAuth(params.token, user => handleSubmitSelected(user, params)));
      case 'readjsonfile': return jsonOut(requireAuth(params.token, user => securedReadJSON(user, params)));
      case 'writejsonfile': return jsonOut(requireAuth(params.token, user => securedWriteJSON(user, params)));
      case 'logout': return jsonOut(handleLogout(params));
      default: return jsonOut({ ok:false, error:'unknown_post_action' });
    }
  }catch(err){ return jsonOut({ ok:false, error: String(err) }); }
}

/* ---------- Admin guard ---------- */
function adminGuard(params, fn){
  const key = params.adminKey || (params.headers && params.headers['x-admin-key']) || '';
  if(key !== CONFIG.ADMIN_KEY) return { ok:false, error:'invalid_admin_key' };
  return fn();
}

/* ---------- Admin: login (for admin UI) ---------- */
function handleAdminLogin(p){
  if((p.adminKey||'') !== CONFIG.ADMIN_KEY) return { ok:false, error:'invalid_admin_key' };
  const userId = (p.userId||'').toString().trim();
  const pwd = (p.password||'').toString().trim();
  if(!userId || !pwd) return { ok:false, error:'missing' };
  const sh = ss().getSheetByName(CONFIG.SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  const header = data.shift(); const idx = indexMap(header);
  for(let i=0;i<data.length;i++){
    const r = data[i];
    if(String(r[idx['User ID']]) === userId && String(r[idx['Password']]) === pwd && String(r[idx['Is Admin']]).toLowerCase()==='true'){
      const token = Utilities.getUuid();
      const expiresAt = new Date(Date.now() + CONFIG.SESSION_TTL_HOURS*3600*1000).toISOString();
      ss().getSheetByName(CONFIG.SHEETS.SESSIONS).appendRow([ts(), userId, token, expiresAt]);
      audit(userId, 'admin_login', '', '{}');
      return { ok:true, token, user:{ userId, displayName: r[idx['Display Name']] }, expiresAt };
    }
  }
  return { ok:false, error:'invalid_credentials_or_not_admin' };
}

/* ---------- Client login & session ---------- */
function handleLogout(p){
  const token = (p.token||'').toString().trim();
  if(!token) return { ok:false, error:'missing_token' };
  const sh = ss().getSheetByName(CONFIG.SHEETS.SESSIONS);
  const data = sh.getDataRange().getValues();
  const header = data.shift(); const idx = indexMap(header);
  for(let i=data.length-1;i>=0;i--){
    if(String(data[i][idx['Token']]) === token){
      sh.deleteRow(i+2);
      return { ok:true };
    }
  }
  return { ok:true };
}

function handleClientLogin(p){
  const userId = (p.userId||'').toString().trim();
  const pwd = (p.password||'').toString().trim();
  if(!userId || !pwd) return { ok:false, error:'missing' };
  const sh = ss().getSheetByName(CONFIG.SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  const header = data.shift(); const idx = indexMap(header);
  for(let i=0;i<data.length;i++){
    const r = data[i];
    if(String(r[idx['User ID']]) === userId && String(r[idx['Password']]) === pwd && String(r[idx['Is Active']]).toLowerCase() !== 'false'){
      // find assigned folder
      const folder = findFolderByUser(userId);
      const token = Utilities.getUuid();
      const expiresAt = new Date(Date.now() + CONFIG.SESSION_TTL_HOURS*3600*1000).toISOString();
      ss().getSheetByName(CONFIG.SHEETS.SESSIONS).appendRow([ts(), userId, token, expiresAt]);
      audit(userId, 'login', '', '{}');
      return {
        ok:true,
        token,
        user: {
          userId: userId,
          displayName: r[idx['Display Name']],
          photoUrl: r[idx['Photo URL']],
          selectionLimit: Number(r[idx['Selection Limit']]) || 25,
          folderId: folder ? folder.folderId : '',
          folderName: folder ? folder.folderName : ''
        },
        expiresAt
      };
    }
  }
  return { ok:false, error:'invalid_credentials' };
}

function handleMe(p){
  const token = (p.token||'').toString().trim();
  const sess = validateToken(token);
  if(!sess) return { ok:false, error:'unauthorized' };
  const users = getAllUsers();
  const user = users.find(u => u.userId === sess.userId);
  if(!user) return { ok:false, error:'user_not_found' };
  const folder = findFolderByUser(user.userId);
  return { ok:true, user: { userId: user.userId, displayName: user.displayName, photoUrl: user.photoUrl, selectionLimit: user.selectionLimit || 25, folderId: folder ? folder.folderId : '', folderName: folder ? folder.folderName : '' } };
}

/* ---------- Helper: sessions ---------- */
function validateToken(token){
  token = (token||'').toString().trim();
  if(!token) return null;
  const sh = ss().getSheetByName(CONFIG.SHEETS.SESSIONS);
  const data = sh.getDataRange().getValues();
  const header = data.shift(); const idx = indexMap(header);
  const now = Date.now();
  for(let i=0;i<data.length;i++){
    if(data[i][idx['Token']] === token){
      const exp = new Date(data[i][idx['Expires At (ISO)']]).getTime();
      if(isNaN(exp) || exp < now) return null;
      return { userId: data[i][idx['User ID']], token };
    }
  }
  return null;
}
function requireAuth(token, fn){
  const sess = validateToken(token);
  if(!sess) return { ok:false, error:'unauthorized' };
  const users = getAllUsers();
  const user = users.find(u => u.userId === sess.userId);
  if(!user) return { ok:false, error:'user_not_found' };
  try{ return fn(user); } catch(err){ return { ok:false, error: String(err) }; }
}

/* ---------- Users & Folders helpers ---------- */
function getAllUsers(){
  const sh = ss().getSheetByName(CONFIG.SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  const header = data.shift(); const idx = indexMap(header);
  return data.map(r => ({
    userId: r[idx['User ID']],
    password: r[idx['Password']],
    displayName: r[idx['Display Name']],
    photoUrl: r[idx['Photo URL']],
    isActive: String(r[idx['Is Active']]),
    isAdmin: String(r[idx['Is Admin']]),
    selectionLimit: Number(r[idx['Selection Limit']]) || 25
  }));
}

function findFolderByUser(userId){
  const sh = ss().getSheetByName(CONFIG.SHEETS.FOLDERS);
  const data = sh.getDataRange().getValues();
  const header = data.shift(); const idx = indexMap(header);
  for(let i=0;i<data.length;i++){
    const r = data[i];
    if(String(r[idx['User ID']]) === userId) {
      return { folderName: r[idx['Folder Name']], folderId: r[idx['Folder ID']], folderUrl: r[idx['Folder URL']] };
    }
  }
  return null;
}

/* ---------- Admin: Clients CRUD ---------- */
function handleGetClients(p){
  const sh = ss().getSheetByName(CONFIG.SHEETS.USERS);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  const out = data.map(r => ({ userId: r[idx['User ID']], displayName: r[idx['Display Name']], photoUrl: r[idx['Photo URL']], isActive: r[idx['Is Active']], isAdmin: r[idx['Is Admin']], selectionLimit: Number(r[idx['Selection Limit']])||25 }));
  return { ok:true, count: out.length, clients: out };
}
function handleAssignFolder(params){
  const userId = params.userId || (params.data && params.data.userId);
  const folderId = params.folderId || (params.data && params.data.folderId);
  if(!userId || !folderId) return { ok:false, error:'missing_userId_or_folderId' };
  const sh = ss().getSheetByName(CONFIG.SHEETS.FOLDERS);
  const data = sh.getDataRange().getValues(); const header=data.shift(); const idx=indexMap(header);
  for(let i=0;i<data.length;i++){
    if(String(data[i][idx['User ID']])===userId){
      const row=i+2;
      sh.getRange(row, idx['Folder ID']+1).setValue(folderId);
      const f=DriveApp.getFolderById(folderId);
      sh.getRange(row, idx['Folder Name']+1).setValue(f.getName());
      sh.getRange(row, idx['Folder URL']+1).setValue(f.getUrl());
      audit('admin','assign_folder',userId,JSON.stringify({folderId}));
      return { ok:true };
    }
  }
  // if not found, create new mapping
  const f=DriveApp.getFolderById(folderId);
  sh.appendRow([ts(), userId, f.getName(), folderId, f.getUrl(), 'false']);
  audit('admin','assign_folder',userId,JSON.stringify({folderId}));
  return { ok:true };
}

function handleCreateClient(params){
  const payload = params.data || {};
  if(!payload.userId || !payload.password) return { ok:false, error:'missing_userId_or_password' };
  const sh = ss().getSheetByName(CONFIG.SHEETS.USERS);
  const selectionLimit = Number(payload.selectionLimit) || 25;
  sh.appendRow([ts(), payload.userId, payload.password, payload.displayName||'', payload.photoUrl||'', payload.isActive === false ? 'false' : 'true', payload.isAdmin ? 'true' : 'false', selectionLimit]);
  audit('admin','create_client', payload.userId, JSON.stringify(payload).slice(0,2000));
  return { ok:true };
}

function handleUpdateClient(params){
  const payload = params.data || {};
  if(!payload.userId) return { ok:false, error:'missing_userId' };
  const sh = ss().getSheetByName(CONFIG.SHEETS.USERS);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  for(let i=0;i<data.length;i++){
    const r = data[i];
    if(String(r[idx['User ID']]) === payload.userId){
      const row = i+2;
      if(payload.password !== undefined) sh.getRange(row, idx['Password']+1).setValue(payload.password);
      if(payload.displayName !== undefined) sh.getRange(row, idx['Display Name']+1).setValue(payload.displayName);
      if(payload.photoUrl !== undefined) sh.getRange(row, idx['Photo URL']+1).setValue(payload.photoUrl);
      if(payload.isActive !== undefined) sh.getRange(row, idx['Is Active']+1).setValue(payload.isActive ? 'true' : 'false');
      if(payload.isAdmin !== undefined) sh.getRange(row, idx['Is Admin']+1).setValue(payload.isAdmin ? 'true' : 'false');
      if(payload.selectionLimit !== undefined) sh.getRange(row, idx['Selection Limit']+1).setValue(payload.selectionLimit);
      audit('admin','update_client', payload.userId, JSON.stringify(payload));
      return { ok:true };
    }
  }
  return { ok:false, error:'user_not_found' };
}

function handleDeleteClient(params){
  const userId = params.userId || (params.data && params.data.userId);
  if(!userId) return { ok:false, error:'missing_userId' };
  const sh = ss().getSheetByName(CONFIG.SHEETS.USERS);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  for(let i=0;i<data.length;i++){
    if(String(data[i][idx['User ID']]) === userId){
      sh.deleteRow(i+2);
      audit('admin','delete_client', userId, '');
      return { ok:true };
    }
  }
  return { ok:false, error:'user_not_found' };
}

/* ---------- Admin: create folder for user (will create Drive folder and write to Folders sheet) ---------- */
function handleCreateFolder(params){
  const payload = params.data || {};
  // allow creating a folder even if no userId provided (master / admin-created folders)
  const userId = payload.userId || '';
  const folderName = payload.folderName || (userId ? `${userId}_gallery` : `new_folder_${Utilities.getUuid()}`);
  const parentId = payload.parentId || CONFIG.MASTER_FOLDER_ID; // default to master
  try{
    let folder;
    if(parentId){
      const parent = DriveApp.getFolderById(parentId);
      folder = parent.createFolder(folderName);
    } else {
      const root = DriveApp.getRootFolder();
      folder = root.createFolder(folderName);
    }
    try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e){}
    const sh = ss().getSheetByName(CONFIG.SHEETS.FOLDERS);
    sh.appendRow([ts(), userId, folderName, folder.getId(), folder.getUrl(), payload.submit === true ? 'true' : 'false']);
    audit('admin','create_folder', folder.getId(), JSON.stringify(payload));
    return { ok:true, folderId: folder.getId(), url: folder.getUrl() };
  }catch(err){ return { ok:false, error: String(err) }; }
}

/* ---------- Admin: List files in folder ---------- */
function handleGetFiles(p){
  const folderId = ((p && p.folderId) ? String(p.folderId).trim() : '') || CONFIG.MASTER_FOLDER_ID;
  try{
    const folder = DriveApp.getFolderById(folderId);
    const folders = [];
    const files = [];

    const fIter = folder.getFolders();
    while(fIter.hasNext()){
      const f = fIter.next();
      folders.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), thumbnail: 'https://drive.google.com/thumbnail?sz=w320&id='+f.getId(), type:'folder' });
    }

    const fileIter = folder.getFiles();
    while(fileIter.hasNext()){
      const file = fileIter.next();
      const id = file.getId(); const mime = file.getMimeType();
      const isVideo = mime && mime.indexOf('video/')===0;
      files.push({
        id,
        name: file.getName(),
        mimeType: mime,
        sizeBytes: file.getSize(),
        createdAt: file.getDateCreated()?file.getDateCreated().toISOString():'',
        modifiedAt: file.getLastUpdated()?file.getLastUpdated().toISOString():'',
        previewUrl: isVideo?('https://drive.google.com/thumbnail?sz=w1280&id='+id):('https://lh3.googleusercontent.com/d/'+id+'=s2048'),
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id,
        thumbnail: 'https://drive.google.com/thumbnail?sz=w512&id=' + id,
        type: "file"
      });
    }

    // Return breadcrumb to help frontend show path
    const breadcrumb = buildBreadcrumb(folder, CONFIG.MASTER_FOLDER_ID);

    return {
      ok: true,
      folderId,
      breadcrumb,
      folders,
      files,
      items: folders.concat(files)
    };
  }catch(err){ return { ok:false, error: String(err) }; }
}

function handleSearch(p){
  const query = (p.query || "").toString().toLowerCase();
  const folderId = ((p.folderId || "").trim()) || CONFIG.MASTER_FOLDER_ID;
  if(!query) return { ok:false, error:"missing_query" };

  try{
    const folder = DriveApp.getFolderById(folderId);
    const folders = [];
    const files = [];

    const fIter = folder.getFolders();
    while(fIter.hasNext()){
      const f = fIter.next();
      if(f.getName().toLowerCase().indexOf(query) !== -1){
        folders.push({
          id: f.getId(),
          name: f.getName(),
          url: f.getUrl(),
          thumbnail: 'https://drive.google.com/thumbnail?sz=w320&id='+f.getId(),
          type: 'folder'
        });
      }
    }

    const fileIter = folder.getFiles();
    while(fileIter.hasNext()){
      const file = fileIter.next();
      const name = file.getName().toLowerCase();
      if(name.indexOf(query) !== -1){
        const id = file.getId();
        const mime = file.getMimeType();
        const isVideo = mime && mime.indexOf('video/')===0;
        files.push({
          id,
          name: file.getName(),
          mimeType: mime,
          sizeBytes: file.getSize(),
          createdAt: file.getDateCreated()?file.getDateCreated().toISOString():'',
          modifiedAt: file.getLastUpdated()?file.getLastUpdated().toISOString():'',
          previewUrl: isVideo?('https://drive.google.com/thumbnail?sz=w1280&id='+id):('https://lh3.googleusercontent.com/d/'+id+'=s2048'),
          downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id,
          thumbnail: 'https://drive.google.com/thumbnail?sz=w512&id=' + id
        });
      }
    }

    return { ok:true, query, folders, files, items: folders.concat(files) };
  }catch(err){
    return { ok:false, error:String(err) };
  }
}

function handleListFolders(p){
  const parentId = (p.parentId||'').toString().trim() || CONFIG.MASTER_FOLDER_ID;
  try{
    const folder = DriveApp.getFolderById(parentId);
    const out = [];
    const iter = folder.getFolders();
    while(iter.hasNext()){
      const f = iter.next();
      out.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), thumbnail: 'https://drive.google.com/thumbnail?sz=w320&id='+f.getId() });
    }
    return { ok:true, parentId, folders: out };
  }catch(err){ return { ok:false, error: String(err) }; }
}

function getCachedFolderStats(folderId){
  try{
    const sh = ss().getSheetByName('FolderStats');
    if(!sh) return null;
    const data = sh.getDataRange().getValues();
    const header = data.shift(); const idx = indexMap(header);
    for(let i=0;i<data.length;i++){
      if(String(data[i][idx['Folder ID']])===folderId){
        return {
          folderId: folderId,
          fileCount: Number(data[i][idx['File Count']]) || 0,
          folderCount: Number(data[i][idx['Folder Count']]) || 0,
          totalSizeBytes: Number(data[i][idx['Total SizeBytes']]) || 0,
          lastComputedISO: data[i][idx['LastComputedISO']] || ''
        };
      }
    }
    return null;
  }catch(e){ return null; }
}

function setCachedFolderStats(stats){
  try{
    const sh = ss().getSheetByName('FolderStats');
    if(!sh) return;
    const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
    for(let i=0;i<data.length;i++){
      if(String(data[i][idx['Folder ID']])===stats.folderId){
        const row = i+2;
        sh.getRange(row, idx['File Count']+1).setValue(stats.fileCount);
        sh.getRange(row, idx['Folder Count']+1).setValue(stats.folderCount);
        sh.getRange(row, idx['Total SizeBytes']+1).setValue(stats.totalSizeBytes);
        sh.getRange(row, idx['LastComputedISO']+1).setValue(stats.lastComputedISO);
        return;
      }
    }
    sh.appendRow([stats.folderId, stats.fileCount, stats.folderCount, stats.totalSizeBytes, stats.lastComputedISO]);
  }catch(e){}
}

function computeRecursiveFolderStats(folderId){
  // returns { fileCount, folderCount, totalSizeBytes }
  try{
    const root = DriveApp.getFolderById(folderId);
    let fileCount = 0; let folderCount = 0; let totalSize = 0;
    function walk(f){
      const files = f.getFiles();
      while(files.hasNext()){
        const file = files.next(); fileCount++; try{ totalSize += Number(file.getSize()) || 0; }catch(e){}
      }
      const kids = f.getFolders();
      while(kids.hasNext()){
        const sub = kids.next(); folderCount++; walk(sub);
      }
    }
    walk(root);
    return { fileCount, folderCount, totalSizeBytes: totalSize };
  }catch(err){ throw err; }
}

function handleGetFolderStats(p){
  const folderId = (p.folderId||'').toString().trim() || CONFIG.MASTER_FOLDER_ID;
  const force = String(p.force||'').toLowerCase() === 'true';
  try{
    // quick immediate stats (non-recursive): number of immediate files + folders
    const folder = DriveApp.getFolderById(folderId);
    const fIter = folder.getFolders(); let folderCount=0; while(fIter.hasNext()){ fIter.next(); folderCount++; }
    const fileIter = folder.getFiles(); let fileCount=0; while(fileIter.hasNext()){ fileIter.next(); fileCount++; }

    // cached recursive stats
    const cached = getCachedFolderStats(folderId);
    if(!cached || force){
      // compute recursive (may be slow) and cache
      const rec = computeRecursiveFolderStats(folderId);
      const now = new Date().toISOString();
      const stats = { folderId, fileCount: rec.fileCount, folderCount: rec.folderCount, totalSizeBytes: rec.totalSizeBytes, lastComputedISO: now };
      setCachedFolderStats(stats);
      return { ok:true, quick:{ fileCount, folderCount }, recursive: stats };
    }

    return { ok:true, quick:{ fileCount, folderCount }, recursive: cached };
  }catch(err){ return { ok:false, error: String(err) }; }
}

/* ---------- Upload / Delete file (admin) ---------- */
function handleUpload(params){
  const p = params || {};
  if(!p.base64 || !p.filename) return { ok:false, error:'missing_base64_or_filename' };
  const folderId = p.folderId || CONFIG.DEFAULT_UPLOAD_FOLDER_ID;
  if(!folderId) return { ok:false, error:'missing_folderId' };
  try{
    const folder = DriveApp.getFolderById(folderId);
    const bytes = Utilities.base64Decode(p.base64);
    const blob = Utilities.newBlob(bytes, p.mimeType || 'application/octet-stream', p.filename);
    const file = folder.createFile(blob);
    try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(e){}
    ss().getSheetByName(CONFIG.SHEETS.UPLOADS).appendRow([ts(), file.getId(), file.getName(), folderId, p.uploader || 'admin', file.getMimeType(), file.getSize(), file.getUrl()]);
    audit('admin','upload', file.getId(), JSON.stringify({ filename: p.filename, folderId }).slice(0,2000));
    return { ok:true, fileId: file.getId(), url: file.getUrl(), size: file.getSize() };
  }catch(err){ return { ok:false, error: String(err) }; }
}

function handleDeleteFile(params){
  const fileId = params.fileId || (params.data && params.data.fileId);
  if(!fileId) return { ok:false, error:'missing_fileId' };
  try{ const f = DriveApp.getFileById(fileId); f.setTrashed(true); audit('admin','delete_file', fileId, ''); return { ok:true }; } catch(err){ return { ok:false, error: String(err) }; }
}

function handleRenameFile(params){
  const fileId = params.fileId;
  const newName = params.newName;
  if(!fileId || !newName) return { ok:false, error:'missing_fileId_or_newName' };
  try{
    const file = DriveApp.getFileById(fileId);
    file.setName(newName);
    audit('admin','rename_file', fileId, JSON.stringify({ newName }));
    return { ok:true };
  }catch(err){ return { ok:false, error:String(err) }; }
}

function handleRenameFolder(params){
  const folderId = params.folderId;
  const newName = params.newName;
  if(!folderId || !newName) return { ok:false, error:'missing_folderId_or_newName' };
  try{
    const folder = DriveApp.getFolderById(folderId);
    folder.setName(newName);
    audit('admin','rename_folder', folderId, JSON.stringify({ newName }));
    return { ok:true };
  }catch(err){ return { ok:false, error:String(err) }; }
}

function handleMoveFile(params){
  const fileId = params.fileId;
  const parentId = params.parentId;
  if(!fileId || !parentId) return { ok:false, error:'missing_fileId_or_parentId' };
  try{
    const file = DriveApp.getFileById(fileId);
    const oldParents = file.getParents();
    const newParent = DriveApp.getFolderById(parentId);
    newParent.addFile(file);
    while(oldParents.hasNext()){
      const p = oldParents.next();
      p.removeFile(file);
    }
    audit('admin','move_file', fileId, JSON.stringify({ parentId }));
    return { ok:true };
  }catch(err){ return { ok:false, error:String(err) }; }
}

/* ---------- Likes / Comments / Presets / Submit (client actions) ---------- */
function handleLike(user, p){
  const folderId = (p.folderId||'').toString().trim();
  const fileId = (p.fileId||'').toString().trim();
  const liked = String(p.liked||'').toLowerCase() === 'true';
  if(!folderId || !fileId) return { ok:false, error:'missing' };
  upsertFolderState(folderId, fileId, user.userId, row => { row['Liked'] = liked; return row; });
  const likeCount = recomputeLikeCount(folderId, fileId);
  writeLikeCountToAllRows(folderId, fileId, likeCount);
  audit(user.userId, liked ? 'like' : 'unlike', fileId, JSON.stringify({ folderId }));
  return { ok:true, fileId, folderId, liked, likeCount };
}

function handleComment(user, p){
  const folderId = (p.folderId||'').toString().trim();
  const fileId = (p.fileId||'').toString().trim();
  const text = (p.text||'').toString().trim();
  if(!folderId||!fileId||!text) return { ok:false, error:'missing' };
  ss().getSheetByName(CONFIG.SHEETS.COMMENTS).appendRow([ts(), user.userId, folderId, fileId, text]);
  const total = recomputeCommentCount(folderId, fileId);
  upsertFolderState(folderId, fileId, user.userId, row => { row['Comments'] = total; return row; });
  audit(user.userId, 'comment', fileId, JSON.stringify({ folderId }));
  return { ok:true, fileId, folderId, totalComments: total };
}

function handleSetPreset(user, p){
  const folderId = (p.folderId||'').toString().trim();
  const fileId = (p.fileId||'').toString().trim();
  const preset = (p.preset||'').toString().trim();
  if(!folderId||!fileId) return { ok:false, error:'missing' };
  upsertFolderState(folderId, fileId, user.userId, row => { row['Preset'] = preset; return row; });
  audit(user.userId, 'set_preset', fileId, JSON.stringify({ folderId, preset }));
  return { ok:true, fileId, folderId, preset };
}

function handleSubmitSelected(user, p){
  const folderId = (p.folderId||'').toString().trim();
  const fileIds = ((p.fileIds||'').toString()).split(',').map(s=>s.trim()).filter(Boolean);
  const submit = String(p.submit||'').toLowerCase() === 'true';
  if(!folderId) return { ok:false, error:'missing_folder' };
  if(!submit) return { ok:false, error:'submit must be true' };
  if(fileIds.length === 0) return { ok:false, error:'no files' };
  closeOpenBatchIfAny(user.userId, folderId);
  const batchId = Utilities.getUuid();
  ss().getSheetByName(CONFIG.SHEETS.SUBMISSION_BATCHES).appendRow([batchId, ts(), user.userId, folderId, fileIds.length, 'OPEN']);
  const sh = ss().getSheetByName(CONFIG.SHEETS.SUBMISSION_ITEMS);
  const rows = fileIds.map(fid => [batchId, user.userId, folderId, fid, ts()]);
  sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
  clearSelectionsFor(user.userId, folderId);
  audit(user.userId, 'submit_selected_batch', batchId, JSON.stringify({ folderId, count: fileIds.length }));
  return { ok:true, batchId, folderId, count: fileIds.length };
}

/* ---------- Folder state utilities ---------- */
function upsertFolderState(folderId, fileId, userId, mutateFn){
  const sh = ss().getSheetByName(CONFIG.SHEETS.FOLDER_STATE);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  let targetRow = -1;
  let rowObj = { "Folder ID": folderId, "Media ID": fileId, "User ID": userId, "Liked": false, "Like Count": 0, "Comments": 0, "Preset": "", "Timestamp": ts() };
  for(let i=0;i<data.length;i++){
    const r = data[i];
    if(String(r[idx['Folder ID']])==folderId && String(r[idx['Media ID']])==fileId && String(r[idx['User ID']])==userId){
      targetRow = i+2;
      header.forEach((h,ci)=> rowObj[h] = data[i][ci]);
      break;
    }
  }
  rowObj = (mutateFn(rowObj) || rowObj);
  rowObj['Timestamp'] = ts();
  if(targetRow>0){
    header.forEach((h,ci)=> ss().getSheetByName(CONFIG.SHEETS.FOLDER_STATE).getRange(targetRow,ci+1).setValue(rowObj[h]));
  } else {
    const values = header.map(h => rowObj[h]);
    ss().getSheetByName(CONFIG.SHEETS.FOLDER_STATE).getRange(ss().getSheetByName(CONFIG.SHEETS.FOLDER_STATE).getLastRow()+1,1,1,values.length).setValues([values]);
  }
  return rowObj;
}

function recomputeLikeCount(folderId, fileId){
  const sh = ss().getSheetByName(CONFIG.SHEETS.FOLDER_STATE);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  let c=0; data.forEach(r => { if(r[idx['Folder ID']]==folderId && r[idx['Media ID']]==fileId){ const liked = r[idx['Liked']] === true || String(r[idx['Liked']]).toLowerCase()==='true'; if(liked) c++; }});
  return c;
}
function writeLikeCountToAllRows(folderId, fileId, likeCount){
  const sh = ss().getSheetByName(CONFIG.SHEETS.FOLDER_STATE);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  for(let i=0;i<data.length;i++){
    if(String(data[i][idx['Folder ID']])==folderId && String(data[i][idx['Media ID']])==fileId){
      sh.getRange(i+2, idx['Like Count']+1).setValue(likeCount);
      sh.getRange(i+2, idx['Timestamp']+1).setValue(ts());
    }
  }
}


/* ---------- Misc utilities ---------- */
function closeOpenBatchIfAny(userId, folderId){
  const sh = ss().getSheetByName(CONFIG.SHEETS.SUBMISSION_BATCHES);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  for(let i=data.length-1;i>=0;i--){
    const r = data[i];
    if(r[idx['User ID']]==userId && r[idx['Folder ID']]==folderId && r[idx['Status']]==='OPEN'){
      sh.getRange(i+2, idx['Status']+1).setValue('CLOSED');
      sh.getRange(i+2, idx['Timestamp']+1).setValue(ts());
      break;
    }
  }
}
function clearSelectionsFor(userId, folderId){
  const sh = ss().getSheetByName(CONFIG.SHEETS.SELECTIONS);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  for(let i=data.length-1;i>=0;i--){
    if(String(data[i][idx['User ID']])==userId && String(data[i][idx['Folder ID']])==folderId){
      sh.deleteRow(i+2);
    }
  }
}

/* ---------- Branding / Stats / Activities ---------- */
function handleGetBranding(p){
  const sh = ss().getSheetByName(CONFIG.SHEETS.BRANDING);
  const data = sh.getDataRange().getValues();
  const obj = {};
  data.forEach(r => { if(r[0]) obj[r[0]] = r[1]; });
  return { ok:true, branding: obj };
}
function handleUpdateBranding(params){
  const payload = params.data || {};
  const sh = ss().getSheetByName(CONFIG.SHEETS.BRANDING);
  Object.keys(payload).forEach(k => {
    const values = sh.getDataRange().getValues();
    let found = false;
    for(let i=0;i<values.length;i++){
      if(values[i][0] === k){ sh.getRange(i+1,2).setValue(payload[k]); found = true; break; }
    }
    if(!found) sh.appendRow([k, payload[k]]);
  });
  audit('admin','update_branding','', JSON.stringify(payload).slice(0,2000));
  return { ok:true };
}
function handleGetStats(p){
  const s = ss();
  const users = s.getSheetByName(CONFIG.SHEETS.USERS).getDataRange().getValues().slice(1);
  const uploads = s.getSheetByName(CONFIG.SHEETS.UPLOADS).getDataRange().getValues().slice(1);
  const folderstate = s.getSheetByName(CONFIG.SHEETS.FOLDER_STATE).getDataRange().getValues().slice(1);
  const totalClients = users.length;
  const activeClients = users.filter(r => String(r[5]).toLowerCase()!=='false').length;
  const totalPhotos = uploads.length;
  const totalLikes = folderstate.reduce((acc,r) => acc + (Number(r[4])||0), 0);
  return { ok:true, totalClients, activeClients, totalPhotos, totalLikes };
}
function handleGetActivities(p){
  const sh = ss().getSheetByName(CONFIG.SHEETS.AUDIT);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  const out = data.map(r => ({ timestamp: r[idx['Timestamp']], userId: r[idx['User ID']], action: r[idx['Action']], target: r[idx['Target ID']], payload: r[idx['Payload JSON']] }));
  return { ok:true, count: out.length, activities: out.reverse() };
}

/* ---------- Simple listing for client (list folder -> files + subfolders) ---------- */
function handleList(p){
  const token = (p.token||'').toString().trim();
  const sess = validateToken(token);
  if(!sess) return { ok:false, error:'unauthorized' };

  const assigned = findFolderByUser(sess.userId);
  const rootId = assigned ? assigned.folderId : "";
  const folderId = (p.folderId||"").toString().trim() || rootId;
  if(!folderId) return { ok:false, error:"missing_folder" };

  try {
    const folder = DriveApp.getFolderById(folderId);

    const breadcrumb = buildBreadcrumb(folder, rootId);

    const folders = [];
    const files = [];

    const fIter = folder.getFolders();
    while (fIter.hasNext()) {
      const f = fIter.next();
      folders.push({
        id: f.getId(),
        name: f.getName(),
        type: "folder",
        thumbnail: `https://drive.google.com/thumbnail?sz=w512&id=${f.getId()}`
      });
    }

    const fileIter = folder.getFiles();
    while (fileIter.hasNext()) {
      const f = fileIter.next();
      const id = f.getId();
      const mime = f.getMimeType() || '';
      // Ensure the file is viewable by link if possible (best-effort). This requires the script to have permission.
      try {
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch(e) { /* ignore */ }
      files.push({
        id,
        name: f.getName(),
        mimeType: mime,
        sizeBytes: f.getSize(),
        createdAt: f.getDateCreated()?f.getDateCreated().toISOString():'',
        modifiedAt: f.getLastUpdated()?f.getLastUpdated().toISOString():'',
        previewUrl: (mime.indexOf('video/') === 0)
          ? `https://drive.google.com/thumbnail?sz=w1280&id=${id}`
          : `https://lh3.googleusercontent.com/d/${id}=s2048`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
        thumbnail: `https://drive.google.com/thumbnail?sz=w512&id=${id}`,
        type: "file"
      });
    }

    const stateMap = getStateMap(folderId, sess.userId);
    const enriched = files.map(f => {
      const st = stateMap[f.id] || {};
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt,
        modifiedAt: f.modifiedAt,
        previewUrl: (f.mimeType && f.mimeType.indexOf('video/') === 0)
          ? `https://drive.google.com/thumbnail?sz=w1280&id=${f.id}`
          : `https://lh3.googleusercontent.com/d/${f.id}=s2048`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
        thumbnail: `https://drive.google.com/thumbnail?sz=w512&id=${f.id}`,
        likedByMe: !!st.liked,
        likeCount: st.likeCount || 0,
        commentCount: st.comments || 0,
        preset: st.preset || '',
        type: "file"
      };
    });

    return {
      ok: true,
      folderId,
      breadcrumb,
      folders,
      items: enriched,
      counts: getFolderAggregateCountsFromState(folderId)
    };

  } catch (err) {
    return { ok:false, error:String(err) };
  }
}

function handleCounts(user, p){
  const folderId = (p.folderId||'').toString().trim();
  if(!folderId) return { ok:false, error:'missing_folder' };
  return { ok:true, counts: getFolderAggregateCountsFromState(folderId) };
}

/* ---------- Breadcrumb helper ---------- */
function buildBreadcrumb(folder, userRootFolderId){
  try{
    const chain = [];
    if(!folder) return chain;
    const targetId = (userRootFolderId || '').toString().trim();
    let current = folder;
    let depth = 0;
    const maxDepth = 30;

    // Walk up parents until we reach the requested userRootFolderId (if provided)
    while(current && depth < maxDepth){
      try{ chain.unshift({ id: current.getId(), name: current.getName() }); } catch(e){ break; }
      if(targetId && current.getId() === targetId) break;
      const parents = current.getParents();
      if(!parents.hasNext()) break;
      current = parents.next();
      depth++;
    }

    return chain;
  } catch(e) {
    // best-effort fallback
    try{ return [{ id: folder.getId(), name: folder.getName() }]; } catch(_){ return []; }
  }
}
function isFolderWithin(folder, userRootFolderId){
  if(!userRootFolderId) return false;
  try{ let curr = folder, depth=0; while(curr && depth<30){ if(curr.getId()===userRootFolderId) return true; const parents = curr.getParents(); if(!parents.hasNext()) break; curr = parents.next(); depth++; } return folder.getId()===userRootFolderId; }catch(e){ return false; }
}

/* ---------- State helpers used earlier ---------- */
function getStateMap(folderId, userId){
  const sh = ss().getSheetByName(CONFIG.SHEETS.FOLDER_STATE);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  const map = {};
  data.forEach(r => {
    if(String(r[idx['Folder ID']]) === folderId && String(r[idx['User ID']]) === userId){
      const mid = r[idx['Media ID']];
      map[mid] = { liked: r[idx['Liked']] === true || String(r[idx['Liked']]).toLowerCase() === 'true', likeCount: Number(r[idx['Like Count']]) || 0, comments: Number(r[idx['Comments']]) || 0, preset: r[idx['Preset']] || '' };
    }
  });
  return map;
}
function getFolderAggregateCountsFromState(folderId){
  const sh = ss().getSheetByName(CONFIG.SHEETS.FOLDER_STATE);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  const mediaAgg = {};
  data.forEach(r => {
    if(String(r[idx['Folder ID']]) == folderId){
      const mid = r[idx['Media ID']]; const likeCount = Number(r[idx['Like Count']]) || 0; const comments = Number(r[idx['Comments']]) || 0;
      if(!mediaAgg[mid]) mediaAgg[mid] = { likeCount:0, comments:0 };
      mediaAgg[mid].likeCount = Math.max(mediaAgg[mid].likeCount, likeCount);
      mediaAgg[mid].comments = Math.max(mediaAgg[mid].comments, comments);
    }
  });
  let totalLikes=0, totalComments=0; Object.values(mediaAgg).forEach(v=>{ totalLikes += v.likeCount; totalComments += v.comments; });
  return { totalLikes, totalComments };
}

/* ---------- Comments read/write helpers ---------- */
function recomputeCommentCount(folderId, fileId){
  const sh = ss().getSheetByName(CONFIG.SHEETS.COMMENTS);
  const data = sh.getDataRange().getValues(); const header = data.shift(); const idx = indexMap(header);
  let c=0; data.forEach(r => { if(String(r[idx['Folder ID']])==folderId && String(r[idx['File ID']])==fileId) c++; });
  return c;
}

function handleReadComments(p){
  const folderId = (p.folderId||'').toString().trim();
  const fileId   = (p.fileId||'').toString().trim();

  if(!folderId || !fileId)
    return { ok:false, error:"missing_folderId_or_fileId" };

  const sh = ss().getSheetByName(CONFIG.SHEETS.COMMENTS);
  const data = sh.getDataRange().getValues();
  const header = data.shift();
  const idx = indexMap(header);

  const out = [];

  data.forEach(r => {
    if(String(r[idx['Folder ID']])===folderId &&
       String(r[idx['File ID']])===fileId) {
      out.push({
        timestamp: r[idx['Timestamp']],
        userId:    r[idx['User ID']],
        text:      r[idx['Comment Text']],
      });
    }
  });

  return { ok:true, comments: out };
}

/* ---------- Simple secured JSON helpers ---------- */
function securedReadJSON(user, p){
  const folderId = (p.folderId||'').toString().trim();
  const fileName = (p.fileName||'').toString().trim();
  if(!folderId || !fileName) return { ok:false, error:'missing' };
  const folder = DriveApp.getFolderById(folderId);
  if(!isFolderWithin(folder, user.folderId)) return { ok:false, error:'access_denied' };
  const files = folder.getFilesByName(fileName);
  if(!files.hasNext()) return { ok:true, exists:false, data:{} };
  const f = files.next(); const content = f.getBlob().getDataAsString() || '{}';
  try{ return { ok:true, exists:true, data: JSON.parse(content) }; }catch(e){ return { ok:false, error:'invalid_json' }; }
}
function securedWriteJSON(user, p){
  const folderId = (p.folderId||'').toString().trim();
  const fileName = (p.fileName||'').toString().trim();
  let data = p.data;
  if(!folderId || !fileName || typeof data === 'undefined') return { ok:false, error:'missing' };
  const folder = DriveApp.getFolderById(folderId);
  if(!isFolderWithin(folder, user.folderId)) return { ok:false, error:'access_denied' };
  let jsonStr = '';
  if(typeof data === 'string'){ try{ JSON.parse(data); jsonStr = data; }catch(e){ return { ok:false, error:'invalid_json_string' }; } } else { try{ jsonStr = JSON.stringify(data); }catch(e){ return { ok:false, error:'could_not_stringify' }; } }
  const files = folder.getFilesByName(fileName);
  if(files.hasNext()){ const f = files.next(); f.setTrashed(false); f.setContent(jsonStr); } else { folder.createFile(fileName, jsonStr, MimeType.PLAIN_TEXT); }
  audit(user.userId, 'write_json', fileName, JSON.stringify({ folderId }).slice(0,1000));
  return { ok:true };
}

function doOptions(e) {
  // The Vercel proxy already replies to preflight OPTIONS with CORS headers.
  // Still return an empty successful response from the Apps Script side.
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function testPermission() {
  const f = DriveApp.getFolderById(CONFIG.MASTER_FOLDER_ID);
  Logger.log("Folder name = " + f.getName());
  const it = f.getFolders();
  while (it.hasNext()) Logger.log("Subfolder: " + it.next().getName());
}

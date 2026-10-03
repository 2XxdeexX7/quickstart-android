import { useState } from 'react';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  listAll,
  deleteObject
} from 'firebase/storage';
import { storage, auth } from '../firebase/config';
import { Cloud, Upload, Download, Trash2, FileText, ImageIcon, File as FileIcon } from 'lucide-react';
import { useEffect } from 'react';

interface StorageFile {
  name: string;
  url: string;
  path: string;
}

export default function StorageDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const listRef = ref(storage, `uploads/${auth.currentUser.uid}`);
      const res = await listAll(listRef);
      const filePromises = res.items.map(async (item) => {
        const url = await getDownloadURL(item);
        return {
          name: item.name,
          url,
          path: item.fullPath
        };
      });
      const fileList = await Promise.all(filePromises);
      setFiles(fileList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchFiles();
      } else {
        setFiles([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !auth.currentUser) return;

    setUploading(true);
    const storageRef = ref(storage, `uploads/${auth.currentUser.uid}/${file.name}`);
    
    try {
      await uploadBytes(storageRef, file);
      alert('Upload successful!');
      setFile(null);
      fetchFiles();
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await deleteObject(ref(storage, path));
      fetchFiles();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return <ImageIcon size={24} className="text-blue-500" />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText size={24} className="text-orange-500" />;
    return <FileIcon size={24} className="text-gray-500" />;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Cloud className="text-blue-600" />
          Cloud Storage
        </h2>
        <p className="text-gray-600">Store and retrieve user-generated content</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold mb-4">Upload a File</h3>
        {!auth.currentUser ? (
          <div className="p-4 bg-blue-50 text-blue-700 rounded-lg text-center">
            Please sign in to upload files.
          </div>
        ) : (
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <Upload className="text-gray-400 mb-2" size={32} />
                <p className="text-gray-600">
                  {file ? <span className="font-medium text-blue-600">{file.name}</span> : 'Click or drag and drop to select a file'}
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? 'Uploading...' : 'Start Upload'}
            </button>
          </form>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Your Files</h3>
        {loading ? (
          <div className="text-center py-8">Loading files...</div>
        ) : !auth.currentUser ? (
          <div className="text-center py-8 text-gray-400 italic">Sign in to view your files</div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-500">No files found. Upload something!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f) => (
              <div key={f.path} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 group">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                  {getFileIcon(f.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" title={f.name}>
                    {f.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <a 
                      href={f.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Download size={12} /> View
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(f.path)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

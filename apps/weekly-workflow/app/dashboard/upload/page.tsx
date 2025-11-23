'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileIcon, X, CheckCircle2 } from 'lucide-react';

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles: UploadedFile[] = droppedFiles.map(file => ({
      file,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles: UploadedFile[] = selectedFiles.map(file => ({
        file,
        status: 'pending',
      }));

      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      // Update status to uploading
      setFiles(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'uploading' };
        return updated;
      });

      try {
        const formData = new FormData();
        formData.append('file', files[i].file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        // Update status to success
        setFiles(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'success' };
          return updated;
        });
      } catch (error) {
        // Update status to error
        setFiles(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: 'error',
            error: 'Upload failed',
          };
          return updated;
        });
      }
    }

    setUploading(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const allUploaded = files.length > 0 && files.every(f => f.status === 'success');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Upload Files</h1>
        <p className="text-muted-foreground">
          Upload files to this week's Google Drive folder
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <Upload className={`w-16 h-16 mx-auto mb-4 ${
          isDragging ? 'text-primary' : 'text-muted-foreground'
        }`} />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Drop files here or click to browse
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Supports all file types
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-6 rounded-lg cursor-pointer transition-colors"
        >
          Select Files
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-card-foreground">
              Files ({files.length})
            </h3>
            {!uploading && !allUploaded && (
              <button
                onClick={uploadFiles}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Upload All
              </button>
            )}
            {allUploaded && (
              <button
                onClick={() => {
                  router.push('/dashboard');
                  router.refresh();
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Done
              </button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((fileItem, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {fileItem.file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(fileItem.file.size)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fileItem.status === 'pending' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {fileItem.status === 'uploading' && (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  {fileItem.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {fileItem.status === 'error' && (
                    <div className="text-xs text-destructive">{fileItem.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

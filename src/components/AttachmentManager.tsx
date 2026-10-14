import React, { useState, useRef } from 'react';
import { Attachment as DbAttachment, getAttachmentsByTask, createAttachment, deleteAttachment as deleteAttachmentDb } from '../lib/db/attachments';
import { storeFile, deleteFile, downloadFile, formatFileSize } from '../lib/db/fileStorage';
import { Attachment as ApiAttachment, getAttachmentDownloadUrl, useDeleteAttachment, useTaskAttachments, useUploadAttachment } from '@/lib/hooks/useAttachments';
import { PaperclipIcon } from './PaperclipIcon';

interface AttachmentManagerProps {
  taskId: string;
}

export function AttachmentManager({ taskId }: AttachmentManagerProps): React.ReactElement {
  const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
  const [localAttachments, setLocalAttachments] = useState<DbAttachment[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: apiAttachments = [], isLoading: apiLoading, refetch } = useTaskAttachments(USE_BACKEND ? taskId : undefined);
  const uploadAttachmentMutation = useUploadAttachment();
  const deleteAttachmentMutation = useDeleteAttachment();

  const attachments: Array<DbAttachment | ApiAttachment> = USE_BACKEND ? apiAttachments : localAttachments;
  const loading = USE_BACKEND ? apiLoading : localLoading;

  React.useEffect(() => {
    if (!USE_BACKEND) {
      loadAttachments();
    }
  }, [taskId]);

  const loadAttachments = async () => {
    setLocalLoading(true);
    try {
      const atts = await getAttachmentsByTask(taskId);
      setLocalAttachments(atts);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      if (USE_BACKEND) {
        for (const file of Array.from(files)) {
          await uploadAttachmentMutation.mutateAsync({ taskId, file });
        }
        await refetch();
      } else {
        for (const file of Array.from(files)) {
          const storedId = await storeFile(file);
          await createAttachment(
            taskId,
            file.name,
            file.size,
            file.type,
            storedId
          );
        }
        await loadAttachments();
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (attachment: DbAttachment | ApiAttachment) => {
    try {
      if (USE_BACKEND) {
        const url = getAttachmentDownloadUrl(taskId, attachment.id);
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      await downloadFile((attachment as DbAttachment).storedPath);
    } catch (err) {
      console.error('Failed to download file:', err);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (attachment: DbAttachment | ApiAttachment) => {
    if (!confirm(`Eliminare "${'originalName' in attachment && attachment.originalName ? attachment.originalName : attachment.filename}"?`)) return;

    try {
      if (USE_BACKEND) {
        await deleteAttachmentMutation.mutateAsync({ taskId, attachmentId: attachment.id });
        await refetch();
      } else {
        await deleteFile((attachment as DbAttachment).storedPath);
        await deleteAttachmentDb(attachment.id);
        await loadAttachments();
      }
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      alert('Failed to delete attachment');
    }
  };

  return (
    <div className="attachment-manager">
      <div className="attachment-header">
        <h4>Allegati ({attachments.length})</h4>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="btn-small" style={{ cursor: 'pointer' }}>
            {uploading ? 'Caricamento...' : '+ Aggiungi File'}
          </label>
        </div>
      </div>

      {loading ? (
        <div className="loading">Caricamento...</div>
      ) : attachments.length === 0 ? (
        <p className="text-muted">Nessun allegato. Aggiungi file per tenere traccia della documentazione.</p>
      ) : (
        <div className="attachment-list">
          {attachments.map(attachment => (
            <div key={attachment.id} className="attachment-item">
              <div className="attachment-icon">
                <PaperclipIcon className="attachment-icon-svg" />
              </div>
              <div className="attachment-info" onClick={() => handleDownload(attachment)}>
                <span className="attachment-name">{'originalName' in attachment && attachment.originalName ? attachment.originalName : attachment.filename}</span>
                <span className="attachment-size">{formatFileSize(attachment.size)}</span>
              </div>
              <button
                className="btn-icon"
                onClick={() => handleDelete(attachment)}
                title="Elimina"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

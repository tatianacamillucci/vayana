import { get, set, del } from 'idb-keyval';

const ATTACHMENT_PREFIX = 'vayana-attachment-';

export async function storeFile(file: File): Promise<string> {
  const id = crypto.randomUUID();
  const key = `${ATTACHMENT_PREFIX}${id}`;
  
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        await set(key, {
          data: reader.result,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        });
        resolve(id);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function getFile(id: string): Promise<{ data: ArrayBuffer; filename: string; mimeType: string; size: number } | null> {
  const key = `${ATTACHMENT_PREFIX}${id}`;
  return await get(key) || null;
}

export async function deleteFile(id: string): Promise<void> {
  const key = `${ATTACHMENT_PREFIX}${id}`;
  await del(key);
}

export async function downloadFile(id: string): Promise<void> {
  const file = await getFile(id);
  if (!file) {
    throw new Error('File not found');
  }

  const blob = new Blob([file.data], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

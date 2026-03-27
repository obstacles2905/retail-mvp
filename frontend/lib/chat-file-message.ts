export interface ChatFilePayload {
  kind: 'file';
  fileKey: string;
  fileName: string;
}

export function serializeChatFileMessage(payload: ChatFilePayload): string {
  return JSON.stringify(payload);
}

export function parseChatFileMessage(content: string): ChatFilePayload | null {
  try {
    const o = JSON.parse(content) as unknown;
    if (
      o &&
      typeof o === 'object' &&
      (o as ChatFilePayload).kind === 'file' &&
      typeof (o as ChatFilePayload).fileKey === 'string'
    ) {
      return {
        kind: 'file',
        fileKey: (o as ChatFilePayload).fileKey,
        fileName:
          typeof (o as ChatFilePayload).fileName === 'string'
            ? (o as ChatFilePayload).fileName
            : 'Файл',
      };
    }
  } catch {
    // not JSON — plain text
  }
  return null;
}

/** Short label for chat list / notifications */
export function chatFilePreviewLabel(content: string): string | null {
  const parsed = parseChatFileMessage(content);
  return parsed ? `📎 ${parsed.fileName}` : null;
}

export type FileAttachmentKind = 'image' | 'pdf' | 'text' | 'other';

export function getAttachmentKind(fileName: string): FileAttachmentKind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'text';
  return 'other';
}

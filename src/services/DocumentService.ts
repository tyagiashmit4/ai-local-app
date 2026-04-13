import * as DocumentPicker from '@react-native-documents/picker';
import { DocumentPickerResponse } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import * as mammoth from 'mammoth';
// @ts-ignore
import * as pdfjs from 'pdfjs-dist/build/pdf';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface ParsedDocument {
  name: string;
  text: string;
  type: string;
}

class DocumentService {
  /**
   * Opens the native document picker to select a file.
   */
  async pickDocument(): Promise<DocumentPickerResponse | null> {
    try {
      const res = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.plainText,
          DocumentPicker.types.docx,
        ],
        allowMultiSelection: false,
      });
      return res[0]; // pick() returns an array, we want the first one
    } catch (err) {
      if (DocumentPicker.isErrorWithCode(err) && err.code === DocumentPicker.errorCodes.OPERATION_CANCELED) {
        return null; // User cancelled
      }
      throw err;
    }
  }

  /**
   * Extracts text from the selected document based on its type.
   */
  async extractText(doc: DocumentPickerResponse): Promise<ParsedDocument> {
    if (!doc.uri) throw new Error('Document URI is missing');

    console.log(`[DocumentService] Extracting text from: ${doc.name} (${doc.type})`);
    
    // For iOS, the URI might be quite raw, but RNFS can usually handle it or it starts with file://
    let fileUri = doc.uri;
    if (fileUri.startsWith('content://')) {
       // Android content URI - RNFS handles this via readFile or stat usually
       // Sometimes you have to copy it to a cache dir first, but let's try reading direct
       // Actually RNFS.readFile('content://...') works for base64.
       const stat = await RNFS.stat(fileUri).catch(() => null);
       if (!stat) {
           // Copy to cache
           const destPath = `${RNFS.CachesDirectoryPath}/${doc.name}`;
           await RNFS.copyFile(fileUri, destPath);
           fileUri = `file://${destPath}`;
       }
    } else if (fileUri.startsWith('file://')) {
       // fine
    }

    const type = doc.type || '';
    const name = doc.name || 'Unknown Document';
    let text = '';

    try {
      if (type.includes('text/plain') || name.endsWith('.txt')) {
        text = await this.parseTxt(fileUri);
      } else if (type.includes('application/pdf') || name.endsWith('.pdf')) {
        text = await this.parsePdf(fileUri);
      } else if (
        type.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || 
        name.endsWith('.docx')
      ) {
        text = await this.parseDocx(fileUri);
      } else {
        throw new Error('Unsupported file type');
      }

      return {
        name,
        text,
        type,
      };
    } catch (error) {
      console.error('[DocumentService] Parse error:', error);
      throw error;
    }
  }

  private async parseTxt(uri: string): Promise<string> {
    return await RNFS.readFile(uri, 'utf8');
  }

  private async parsePdf(uri: string): Promise<string> {
    try {
      const base64 = await RNFS.readFile(uri, 'base64');
      const uint8Array = new Uint8Array(Buffer.from(base64, 'base64'));
      
      const loadingTask = pdfjs.getDocument({
        data: uint8Array,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error: any) {
      console.error('[DocumentService] PDF Parse Error:', error);
      throw new Error('Could not extract text from PDF. It may be scanned or encrypted.');
    }
  }

  private async parseDocx(uri: string): Promise<string> {
    const base64 = await RNFS.readFile(uri, 'base64');
    const buffer = Buffer.from(base64, 'base64');

    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}

export const documentService = new DocumentService();

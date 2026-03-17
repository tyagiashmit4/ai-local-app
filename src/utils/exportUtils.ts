// @ts-ignore
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import XLSX from 'xlsx';

export const exportToPDF = async (text: string) => {
  try {
    // Simple HTML wrapper for the markdown text
    const htmlContent = `
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <pre style="white-space: pre-wrap;">${text}</pre>
        </body>
      </html>
    `;

    const options = {
      html: htmlContent,
      fileName: `AI_Response_${Date.now()}`,
      directory: 'Documents',
    };

    const file = await RNHTMLtoPDF.convert(options);
    
    if (file.filePath) {
      await Share.open({
        url: `file://${file.filePath}`,
        title: 'Share PDF Response',
        type: 'application/pdf',
      });
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
  }
};

export const exportToWord = async (text: string) => {
  try {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: text.split('\n').map(line => 
            new Paragraph({
              children: [new TextRun(line)],
            })
          ),
        },
      ],
    });

    const base64 = await Packer.toBase64String(doc);
    const fileName = `AI_Response_${Date.now()}.docx`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    
    await RNFS.writeFile(filePath, base64, 'base64');
    
    await Share.open({
      url: `file://${filePath}`,
      title: 'Share Word Response',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  } catch (error) {
    console.error('Error exporting to Word:', error);
  }
};

export const exportToExcel = async (text: string) => {
  try {
    // Simple splitting by lines. A more complex CSV could be parsed here.
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const data = lines.map(line => [line]);
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Response");
    
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `AI_Response_${Date.now()}.xlsx`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    
    await RNFS.writeFile(filePath, wbout, 'base64');
    
    await Share.open({
      url: `file://${filePath}`,
      title: 'Share Excel Response',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
  }
};


export interface EditorState {
  originalImage: string | null;
  mimeType: string;
  isProcessing: boolean;
  resultImage: string | null;
  brushSize: number;
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  EDIT = 'EDIT',
  RESULT = 'RESULT'
}

export interface Point {
  x: number;
  y: number;
}

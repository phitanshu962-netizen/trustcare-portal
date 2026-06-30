export interface FieldLayout {
  id: string;
  type: 'text' | 'image' | 'qrcode' | 'checkbox';
  x: number;
  y: number;
  width?: number; 
  height?: number;
  value?: string | Buffer | boolean;
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  fontWeight?: string | number;
}

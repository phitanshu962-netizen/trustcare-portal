'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { storage, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { FieldLayout } from '@/lib/pdfTemplates';
import * as pdfjsLib from 'pdfjs-dist';
import { useRouter } from 'next/navigation';
import { Loader2, Type, Image as ImageIcon, QrCode, CheckSquare, UploadCloud, FileText, Download, Plus, Trash2, ArrowLeft } from 'lucide-react';
// Initialize PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export default function CertificateBuilder() {
  const router = useRouter();
  const [templateBase64, setTemplateBase64] = useState<string | null>(null);
  const [templateBgUrl, setTemplateBgUrl] = useState<string | null>(null); // Visual background for canvas
  const [isPdfTemplate, setIsPdfTemplate] = useState(false);
  const [fields, setFields] = useState<FieldLayout[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 841.89, height: 595.28 });
  const [isSaving, setIsSaving] = useState(false);
  const zoom = 0.8; 

  useEffect(() => {
    const loadSavedTemplate = async () => {
      try {
        const docSnap = await getDoc(doc(db, "receipt_templates", "fee_receipt"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFields(data.fields || []);
          setCanvasDimensions(data.dimensions || { width: 841.89, height: 595.28 });
          setIsPdfTemplate(data.isPdfTemplate || false);
          
          if (data.templateBase64) {
            setTemplateBase64(data.templateBase64);
            if (data.isPdfTemplate) {
              const base64Data = data.templateBase64.split(',')[1];
              const binaryString = window.atob(base64Data);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
              const page = await pdf.getPage(1);
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: ctx, viewport }).promise;
                canvas.toBlob((blob) => {
                  if (blob) setTemplateBgUrl(URL.createObjectURL(blob));
                });
              }
            } else {
              // Convert base64 to blob URL for massive performance boost
              fetch(data.templateBase64)
                .then(res => res.blob())
                .then(blob => setTemplateBgUrl(URL.createObjectURL(blob)));
            }
          }
        }
      } catch (error) {
        console.error("Failed to load saved template:", error);
      }
    };
    loadSavedTemplate();
  }, []);

  const handleSave = async () => {
    if (!templateBase64) {
      alert("Please upload a template first.");
      return;
    }
    setIsSaving(true);
    try {
      // Clean up fields to remove undefined values before saving to Firestore
      const sanitizedFields = JSON.parse(JSON.stringify(fields));

      await setDoc(doc(db, "receipt_templates", "fee_receipt"), {
        templateBase64,
        isPdfTemplate,
        fields: sanitizedFields,
        dimensions: canvasDimensions,
        updatedAt: new Date().toISOString()
      });
      alert("Receipt template saved successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error saving template: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    const isPdf = file.type === 'application/pdf';
    setIsPdfTemplate(isPdf);

    // If it's a PDF, render first page as a data URL for the canvas background
    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;
        canvas.toBlob((blob) => {
          if (blob) setTemplateBgUrl(URL.createObjectURL(blob));
        });
        
        // Use PDF viewport dimensions as base canvas dimensions (at scale 1.0)
        const baseViewport = page.getViewport({ scale: 1.0 });
        setCanvasDimensions({ width: baseViewport.width, height: baseViewport.height });
      }
    } else {
      // For images, we can just use object URL for immediate feedback
      setTemplateBgUrl(URL.createObjectURL(file));
      // Estimate A4 size for images, or could load Image() to get exact
      setCanvasDimensions({ width: 841.89, height: 595.28 });
    }

    // Save base64 instead of uploading
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTemplateBase64(ev.target?.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const addField = (type: FieldLayout['type'], defaultValue?: string) => {
    // Calculate a slight offset based on existing fields to prevent perfect overlap
    const offset = (fields.length % 10) * 20;
    
    const newField: FieldLayout = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 100 + offset,
      y: 100 + offset,
      value: defaultValue || (type === 'text' ? '{{studentName}}' : type === 'checkbox' ? 'true' : 'https://via.placeholder.com/100'),
      width: type === 'checkbox' ? 20 : 200,
      height: type === 'image' || type === 'qrcode' ? 100 : type === 'checkbox' ? 20 : undefined,
      fontSize: 14,
      color: '#000000',
      align: 'left',
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FieldLayout>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handlePreview = async () => {
    if (!templateBase64) {
      alert("Please upload a template first.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          templateBase64,
          isPdfTemplate,
          fields,
          dimensions: canvasDimensions,
          // Mock data to show placeholder replacement in preview
          data: {
            studentName: "John Doe",
            receiptNo: "REC-2026-001",
            totalAmount: "15,000",
            paidAmount: "5,000",
            balanceAmount: "10,000",
            courseName: "B.Sc Nursing"
          }
        }),
      });
      
      if (!response.ok) throw new Error("Failed to generate PDF");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error(error);
      alert("Error generating preview");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  // Memoize canvas style to prevent React from diffing massive style objects
  const canvasStyle = React.useMemo(() => ({
    width: canvasDimensions.width, 
    height: canvasDimensions.height,
    transform: `scale(${zoom})`,
    backgroundImage: templateBgUrl ? `url(${templateBgUrl})` : 'none',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat' as const
  }), [canvasDimensions, zoom, templateBgUrl]);

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar Controls (Shadcn-like styling) */}
      <div className="w-80 bg-white border-r border-zinc-200 shadow-sm flex flex-col z-10">
        <div className="p-5 border-b border-zinc-200 flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Template Builder</h2>
            <p className="text-xs text-zinc-500">Design receipts & certificates</p>
          </div>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Template File (PDF/Image)</label>
            <div className="relative group">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-zinc-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                  )}
                  <p className="text-xs text-zinc-500 font-medium">{uploading ? 'Uploading...' : 'Click to upload'}</p>
                </div>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            {templateBase64 && !uploading && (
              <p className="text-xs text-green-600 flex items-center gap-1 font-medium mt-1">
                <CheckSquare size={14} /> Ready
              </p>
            )}
          </div>

          {/* Add Fields */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Add Elements</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addField('text')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-zinc-200 rounded-md shadow-sm hover:bg-zinc-50 hover:text-indigo-600 transition-colors">
                <Type size={14} /> Text Var
              </button>
              <button onClick={() => addField('checkbox')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-zinc-200 rounded-md shadow-sm hover:bg-zinc-50 hover:text-indigo-600 transition-colors">
                <CheckSquare size={14} /> Checkbox
              </button>
              <button onClick={() => addField('image')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-zinc-200 rounded-md shadow-sm hover:bg-zinc-50 hover:text-indigo-600 transition-colors">
                <ImageIcon size={14} /> Image
              </button>
              <button onClick={() => addField('qrcode')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-zinc-200 rounded-md shadow-sm hover:bg-zinc-50 hover:text-indigo-600 transition-colors">
                <QrCode size={14} /> QR Code
              </button>
            </div>
          </div>

          {/* Field Settings */}
          {selectedField && (
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  Edit {selectedField.type}
                </h3>
                <button onClick={() => removeField(selectedField.id)} className="p-1 text-zinc-400 hover:text-red-500 transition-colors" title="Delete Field">
                  <Trash2 size={16} />
                </button>
              </div>
              
              {selectedField.type === 'text' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-500">Value / Variable (e.g., {'{{receiptNo}}'})</label>
                    <input 
                      type="text" 
                      value={selectedField.value as string} 
                      onChange={e => updateField(selectedField.id, { value: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">Font Size</label>
                      <input 
                        type="number" 
                        value={selectedField.fontSize} 
                        onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">Weight</label>
                      <select 
                        value={selectedField.fontWeight} 
                        onChange={e => updateField(selectedField.id, { fontWeight: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {selectedField.type === 'checkbox' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Variable Condition</label>
                  <input 
                    type="text" 
                    value={selectedField.value as string} 
                    onChange={e => updateField(selectedField.id, { value: e.target.value })}
                    placeholder="{{isCash}}"
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <p className="text-[10px] text-zinc-500">Enter a variable like {'{{isCash}}'} or literal 'true' to always check.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase">X Pos</label>
                  <input type="number" value={Math.round(selectedField.x)} readOnly className="w-full px-2 py-1.5 text-xs bg-zinc-100 border border-zinc-200 rounded text-zinc-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase">Y Pos</label>
                  <input type="number" value={Math.round(selectedField.y)} readOnly className="w-full px-2 py-1.5 text-xs bg-zinc-100 border border-zinc-200 rounded text-zinc-600" />
                </div>
                {selectedField.type !== 'text' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase">Width</label>
                      <input type="number" value={Math.round(selectedField.width || 0)} readOnly className="w-full px-2 py-1.5 text-xs bg-zinc-100 border border-zinc-200 rounded text-zinc-600" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase">Height</label>
                      <input type="number" value={Math.round(selectedField.height || 0)} readOnly className="w-full px-2 py-1.5 text-xs bg-zinc-100 border border-zinc-200 rounded text-zinc-600" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-8 border-t border-zinc-200 pt-6">
            <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">Available Variables (Click to Add)</h4>
            <div className="flex flex-wrap gap-1.5">
              {['{{receiptNo}}', '{{studentName}}', '{{courseName}}', '{{totalAmount}}', '{{paidAmount}}', '{{balanceAmount}}', '{{date}}', '{{receivedBy}}'].map(v => (
                 <button 
                   key={v} 
                   onClick={() => addField('text', v)}
                   className="px-2 py-1 text-[10px] bg-zinc-100 border border-zinc-200 rounded text-zinc-600 font-mono hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer"
                 >
                   {v}
                 </button>
              ))}
            </div>
            <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mt-4 mb-2">Checkbox Variables (Click to Add)</h4>
            <div className="flex flex-wrap gap-1.5">
              {['{{isAdmissionFee}}', '{{isCourseFee}}', '{{isExamFee}}', '{{isCash}}', '{{isOnline}}', '{{isCheque}}'].map(v => (
                 <button 
                   key={v} 
                   onClick={() => addField('checkbox', v)}
                   className="px-2 py-1 text-[10px] bg-indigo-50 border border-indigo-200 rounded text-indigo-600 font-mono hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-300 transition-colors cursor-pointer"
                 >
                   {v}
                 </button>
              ))}
            </div>
            
            <button 
              onClick={() => {
                const textVars = ['{{receiptNo}}', '{{studentName}}', '{{courseName}}', '{{totalAmount}}', '{{paidAmount}}', '{{balanceAmount}}', '{{date}}', '{{receivedBy}}'];
                const checkboxVars = ['{{isAdmissionFee}}', '{{isCourseFee}}', '{{isExamFee}}', '{{isCash}}', '{{isOnline}}', '{{isCheque}}'];
                
                const newFields: FieldLayout[] = [];
                textVars.forEach((v, i) => {
                  newFields.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'text',
                    x: 100 + (i * 15),
                    y: 100 + (i * 25),
                    value: v,
                    width: 200,
                    fontSize: 14,
                    color: '#000000',
                    align: 'left',
                  });
                });
                
                checkboxVars.forEach((v, i) => {
                  newFields.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'checkbox',
                    x: 350 + (i * 15),
                    y: 100 + (i * 25),
                    value: v,
                    width: 20,
                    height: 20,
                  });
                });
                
                setFields([...fields, ...newFields]);
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors"
            >
              <Plus size={14} /> Add All Variables to Canvas
            </button>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-200 bg-zinc-50 space-y-2">
           <button 
             onClick={handlePreview} 
             disabled={isGenerating || !templateBase64}
             className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md font-medium shadow-sm disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer"
           >
             {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             {isGenerating ? 'Generating...' : 'Preview Output'}
           </button>
           <button 
             onClick={handleSave} 
             disabled={isSaving || !templateBase64}
             className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm rounded-md font-medium shadow-sm disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer"
           >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : <CheckSquare className="w-4 h-4 text-emerald-500" />}
             {isSaving ? 'Saving...' : 'Save Template'}
           </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-12 flex flex-col items-center bg-zinc-200">
        <div 
          className="relative bg-white shadow-xl border border-zinc-200 shrink-0"
          style={canvasStyle}
          onClick={() => setSelectedFieldId(null)}
        >
          {!templateBgUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 font-medium gap-3">
              <UploadCloud size={32} className="text-zinc-300" />
              Upload a PDF or Image template to begin
            </div>
          )}

          {fields.map(field => (
            <Rnd
              key={field.id}
              scale={zoom}
              position={{ x: field.x, y: field.y }}
              size={{ 
                width: field.width || 200, 
                height: field.height || (field.type === 'text' ? 'auto' : 20) 
              }}
              onDragStop={(e, d) => {
                updateField(field.id, { x: d.x, y: d.y });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                updateField(field.id, { 
                  width: parseInt(ref.style.width),
                  height: field.type !== 'text' ? parseInt(ref.style.height) : undefined,
                  x: position.x,
                  y: position.y
                });
              }}
              bounds="parent"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setSelectedFieldId(field.id);
              }}
              className={`group hover:ring-2 hover:ring-indigo-400/50 transition-shadow ${selectedFieldId === field.id ? 'ring-2 ring-indigo-500 shadow-md bg-indigo-500/10' : 'border-transparent'}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                cursor: 'grab'
              }}
            >
              {field.type === 'text' ? (
                <div 
                  style={{
                    fontSize: field.fontSize,
                    color: field.color,
                    textAlign: field.align,
                    fontWeight: field.fontWeight === 'bold' ? 700 : 400,
                    width: '100%',
                    fontFamily: 'Helvetica, Arial, sans-serif'
                  }}
                  className="px-1"
                >
                  {field.value as string}
                </div>
              ) : field.type === 'checkbox' ? (
                 <div className="w-full h-full border-2 border-indigo-600 flex items-center justify-center text-indigo-600">
                   {field.value === 'true' || field.value === true ? (
                      <svg width="80%" height="80%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                   ) : null}
                 </div>
              ) : field.type === 'qrcode' ? (
                 <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-xs text-zinc-500 border border-zinc-300">
                   [QR]
                 </div>
              ) : (
                 <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-xs text-zinc-500 overflow-hidden border border-zinc-300">
                   {field.value && field.value !== 'https://via.placeholder.com/100' ? <img src={field.value as string} className="w-full h-full object-cover" alt="img" /> : <ImageIcon size={24} className="text-zinc-400" />}
                 </div>
              )}
            </Rnd>
          ))}
        </div>
      </div>
    </div>
  );
}

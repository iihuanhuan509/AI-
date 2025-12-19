
import React, { useState, useCallback } from 'react';
import { EditorState, AppStep } from './types';
import { removeWatermark } from './services/geminiService';
import ImageEditor from './components/ImageEditor';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [state, setState] = useState<EditorState>({
    originalImage: null,
    mimeType: 'image/png',
    isProcessing: false,
    resultImage: null,
    brushSize: 40,
  });
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setState(prev => ({
          ...prev,
          originalImage: event.target?.result as string,
          mimeType: file.type,
          resultImage: null
        }));
        setStep(AppStep.EDIT);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async (compositeBase64: string) => {
    setState(prev => ({ ...prev, isProcessing: true }));
    setError(null);
    try {
      const result = await removeWatermark(compositeBase64, state.mimeType);
      setState(prev => ({
        ...prev,
        resultImage: result,
        isProcessing: false
      }));
      setStep(AppStep.RESULT);
    } catch (err) {
      setState(prev => ({ ...prev, isProcessing: false }));
      setError('处理失败，请稍后重试。' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleDownload = () => {
    if (state.resultImage) {
      const link = document.createElement('a');
      link.href = state.resultImage;
      link.download = `watermark_removed_${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-6 px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              AI 智能去水印
            </h1>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
            <span>智能识别</span>
            <span>无损画质</span>
            <span>极速处理</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col items-center">
        {error && (
          <div className="mb-6 w-full max-w-2xl bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
          </div>
        )}

        {state.isProcessing && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">正在智能处理中...</h2>
              <p className="text-slate-400">AI 正在精准移除选区内容并重构背景，请稍候</p>
            </div>
          </div>
        )}

        {step === AppStep.UPLOAD && (
          <div className="mt-12 w-full max-w-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
              让您的图片重焕新生
            </h2>
            <p className="text-slate-400 text-lg mb-12 max-w-lg mx-auto">
              上传图片，随手涂抹，剩下的交给 AI。无论是水印、Logo 还是多余的杂物，一键即可消失。
            </p>
            
            <label className="group relative block cursor-pointer">
              <div className="border-2 border-dashed border-slate-700 group-hover:border-blue-500 rounded-3xl p-12 transition-all bg-slate-900/50 hover:bg-slate-800/50">
                <div className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 group-hover:bg-blue-600/20 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-400 group-hover:text-blue-500 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                </div>
                <h3 className="text-xl font-bold mb-2">点击或拖拽上传图片</h3>
                <p className="text-slate-500">支持 JPG, PNG, WEBP</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {step === AppStep.EDIT && state.originalImage && (
          <div className="w-full flex flex-col items-center">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">涂抹需要去除的区域</h2>
              <div className="flex items-center justify-center gap-4 mt-4">
                <span className="text-sm text-slate-400">画笔大小:</span>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  value={state.brushSize} 
                  onChange={(e) => setState(prev => ({ ...prev, brushSize: parseInt(e.target.value) }))}
                  className="w-48 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-mono text-blue-400">{state.brushSize}px</span>
              </div>
            </div>
            
            <ImageEditor 
              imageSrc={state.originalImage} 
              brushSize={state.brushSize}
              onConfirm={handleProcess}
              onCancel={() => setStep(AppStep.UPLOAD)}
            />
          </div>
        )}

        {step === AppStep.RESULT && state.resultImage && (
          <div className="w-full max-w-4xl flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-8">处理完成</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-12">
               <div className="flex flex-col gap-3">
                  <span className="text-sm text-slate-400 font-medium">原图参考</span>
                  <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 shadow-xl">
                    <img src={state.originalImage!} alt="Original" className="w-full" />
                  </div>
               </div>
               <div className="flex flex-col gap-3">
                  <span className="text-sm text-blue-400 font-medium">AI 修复结果</span>
                  <div className="rounded-2xl overflow-hidden border-2 border-blue-500 bg-slate-800 shadow-2xl shadow-blue-900/20">
                    <img src={state.resultImage} alt="Result" className="w-full" />
                  </div>
               </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(AppStep.UPLOAD)}
                className="px-8 py-3 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition font-bold"
              >
                处理下一张
              </button>
              <button
                onClick={handleDownload}
                className="px-10 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-bold transition shadow-lg shadow-green-900/20 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                下载保存
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 px-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>© 2024 AI 智能去水印 - 基于 Gemini 高级视觉模型</p>
      </footer>
    </div>
  );
};

export default App;

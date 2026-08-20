import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { jsPDF } from 'jspdf';
import { X, Download, FileText, Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ReportPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  filename: string;
  pdfDocGenerator: () => jsPDF | null;
}

export const ReportPdfPreviewModal: React.FC<ReportPdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  filename,
  pdfDocGenerator,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.4);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pdfRef = useRef<any>(null);
  const docInstanceRef = useRef<jsPDF | null>(null);

  useEffect(() => {
    if (!isOpen) {
      pdfRef.current = null;
      docInstanceRef.current = null;
      return;
    }

    let isMounted = true;
    setLoading(true);
    setRenderError(false);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        const doc = pdfDocGenerator();
        if (!doc) {
          if (isMounted) {
            setRenderError(true);
            setLoading(false);
          }
          return;
        }

        docInstanceRef.current = doc;
        const arrayBuffer = doc.output('arraybuffer');

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        await renderPage(1, pdf, zoomScale);

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF load error:', err);
        if (isMounted) {
          setRenderError(true);
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfDocGenerator]);

  const renderPage = async (pageNum: number, pdfInstance?: any, scaleVal?: number) => {
    const pdf = pdfInstance || pdfRef.current;
    if (!pdf) return;

    try {
      setLoading(true);
      const page = await pdf.getPage(pageNum);
      const scale = scaleVal || zoomScale;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      await page.render(renderContext).promise;
      setLoading(false);
    } catch (err) {
      console.error('Page render error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pdfRef.current && isOpen) {
      renderPage(currentPage, pdfRef.current, zoomScale);
    }
  }, [currentPage, zoomScale]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (docInstanceRef.current) {
      docInstanceRef.current.save(filename);
    } else {
      const doc = pdfDocGenerator();
      if (doc) {
        doc.save(filename);
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 text-white rounded-2xl max-w-6xl w-full h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/90 flex items-center justify-center text-white shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>{title}</span>
                <span className="text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  Preview
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Page Navigation for Multi-page PDFs */}
            {totalPages > 1 && (
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1 space-x-1">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || loading}
                  className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-2 text-slate-300 font-semibold select-none">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || loading}
                  className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1 space-x-1">
              <button
                onClick={() => setZoomScale((prev) => Math.max(0.8, prev - 0.2))}
                disabled={loading}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-300 select-none">
                {Math.round((zoomScale / 1.4) * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((prev) => Math.min(2.6, prev + 0.2))}
                disabled={loading}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Canvas Body */}
        <div className="flex-1 bg-slate-950 p-4 sm:p-6 overflow-auto flex flex-col items-center justify-start relative">
          {loading && (
            <div className="absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-slate-300">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
              <span className="text-xs font-semibold">Generating & Rendering PDF preview...</span>
            </div>
          )}

          {renderError && (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm font-semibold text-rose-400">Failed to render PDF preview</p>
              <p className="text-xs mt-1 text-slate-500">You can still download the generated PDF directly.</p>
              <button
                onClick={handleDownload}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Download PDF File
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`shadow-2xl rounded border border-slate-700 bg-white transition-opacity ${
              loading ? 'opacity-0' : 'opacity-100'
            } ${renderError ? 'hidden' : 'block'}`}
          />
        </div>
      </div>
    </div>
  );
};

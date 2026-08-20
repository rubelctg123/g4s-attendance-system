import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { AttendanceRecord, G4SEmployee, MonthlySummary } from '../types';
import { calculateMonthlySummary } from '../utils/calculations';
import { generateSingleJobCardPdf } from '../utils/exportPdf';
import { X, Download, FileText, Loader2, ZoomIn, ZoomOut } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface JobCardPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: G4SEmployee | null;
  monthName: string;
  year: number;
  records: AttendanceRecord[];
  totalDays: number;
}

export const JobCardPdfModal: React.FC<JobCardPdfModalProps> = ({
  isOpen,
  onClose,
  employee,
  monthName,
  year,
  records,
  totalDays,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.5);

  useEffect(() => {
    if (!isOpen || !employee) return;

    let isMounted = true;
    setLoading(true);
    setRenderError(false);

    const renderPdfToCanvas = async () => {
      try {
        const doc = generateSingleJobCardPdf(employee, monthName, year, records, totalDays, false);
        const arrayBuffer = doc.output('arraybuffer');

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (!isMounted) return;

        const viewport = page.getViewport({ scale: zoomScale });
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

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF Preview render error:', err);
        if (isMounted) {
          setRenderError(true);
          setLoading(false);
        }
      }
    };

    renderPdfToCanvas();

    return () => {
      isMounted = false;
    };
  }, [isOpen, employee, monthName, year, records, totalDays, zoomScale]);

  if (!isOpen || !employee) return null;

  const summary: MonthlySummary = calculateMonthlySummary(records, totalDays, employee.category);

  const handleDownload = () => {
    generateSingleJobCardPdf(employee, monthName, year, records, totalDays, true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 text-white rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Job Card PDF Preview — {employee.name} ({employee.employee_id})
              </h3>
              <p className="text-xs text-slate-400">
                {monthName} {year} • Vancot Limited. (KEPZ)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom controls */}
            <div className="hidden sm:flex items-center space-x-1 bg-slate-800 border border-slate-700 rounded-lg p-1 mr-2">
              <button
                onClick={() => setZoomScale((prev) => Math.max(1.0, prev - 0.25))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-400">
                {Math.round((zoomScale / 1.5) * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((prev) => Math.min(2.5, prev + 0.25))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body with Canvas PDF Renderer */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-950/80 p-4 overflow-auto flex flex-col items-center justify-start relative scrollbar-thin"
        >
          {loading && (
            <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-slate-300">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-semibold">Rendering Job Card PDF preview...</span>
            </div>
          )}

          {/* HTML Canvas where PDF Page is rendered */}
          <canvas
            ref={canvasRef}
            className={`shadow-2xl rounded-sm border border-slate-700 bg-white transition-all ${
              loading ? 'opacity-0' : 'opacity-100'
            } ${renderError ? 'hidden' : 'block'}`}
          />

          {/* Fallback structured view if PDF canvas fails */}
          {renderError && (
            <div className="bg-white text-slate-900 p-8 rounded-lg shadow-xl max-w-3xl w-full border border-slate-200 my-auto">
              <div className="text-center border-b pb-4 mb-4">
                <h2 className="text-xl font-black uppercase text-slate-900">VANCOT LIMITED.</h2>
                <p className="text-xs text-slate-600">Plot No: 18-20, Sector: 3, KEPZ, North Patenga, Chittagong</p>
                <h3 className="text-md font-bold text-blue-900 mt-2">G4S SECURITY JOB CARD PREVIEW</h3>
              </div>

              <div className="bg-slate-50 border p-3 rounded-lg text-xs grid grid-cols-3 gap-2 mb-4">
                <div>
                  <strong>ID:</strong> {employee.employee_id}
                </div>
                <div>
                  <strong>Name:</strong> {employee.name}
                </div>
                <div>
                  <strong>Month:</strong> {monthName} {year}
                </div>
                <div>
                  <strong>Job Title:</strong> {employee.job_title}
                </div>
                <div>
                  <strong>Business Unit:</strong> {employee.business_unit || 'Security (G4S)'}
                </div>
                <div>
                  <strong>Company:</strong> {employee.company_name || 'Vancot Limited.'}
                </div>
              </div>

              <div className="text-center py-4 text-xs font-semibold text-slate-500">
                PDF document generated successfully. Click <strong>Download PDF</strong> above to save the file.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useRef, useState } from 'react';
import { ProcessingConfig, SampleDataset } from './types/spectrum';
import { REFERENCE_MATERIALS, SAMPLE_DATASETS } from './data/ramanReferenceData';
import { parseSpectrumText, runRamanPipeline } from './utils/ramanMath';
import {
  exportAnalysisToCSV,
  exportSvgElementToPNG,
  exportSvgElementToSVG
} from './utils/exportUtils';
import { ProcessingSidebar } from './components/ProcessingSidebar';
import { SpectrumViewer } from './components/SpectrumViewer';
import { PeakAnalysisPanel } from './components/PeakAnalysisPanel';
import {
  Activity,
  Download,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

const DEFAULT_CONFIG: ProcessingConfig = {
  baselineMethod: 'polynomial',
  polyDegree: 3,
  rollingRadius: 55,
  smoothMethod: 'savgol',
  smoothWindow: 7,
  normMethod: 'minmax',
  prominence: 0.14,
  minDistance: 25,
  fitShape: 'lorentzian'
};

export function App() {
  const [samples, setSamples] = useState<SampleDataset[]>(SAMPLE_DATASETS);
  const [activeSampleId, setActiveSampleId] = useState<string>(SAMPLE_DATASETS[0].id);
  const [config, setConfig] = useState<ProcessingConfig>(DEFAULT_CONFIG);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string>(
    SAMPLE_DATASETS[0].referenceId
  );
  const [showReferenceOverlay, setShowReferenceOverlay] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const activeSample = useMemo(
    () => samples.find((s) => s.id === activeSampleId) || samples[0],
    [samples, activeSampleId]
  );

  const activeReference = useMemo(
    () => REFERENCE_MATERIALS.find((r) => r.id === selectedReferenceId),
    [selectedReferenceId]
  );

  // Run full signal processing and peak deconvolution pipeline
  const pipelineResult = useMemo(() => {
    return runRamanPipeline(activeSample.x, activeSample.y, config);
  }, [activeSample, config]);

  const handleUpdateConfig = (partial: Partial<ProcessingConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectSample = (sample: SampleDataset) => {
    setActiveSampleId(sample.id);
    setSelectedReferenceId(sample.referenceId);
    setSelectedPeakId(null);
    setErrorBanner(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const { x, y } = parseSpectrumText(text);
        const cleanName = file.name.replace(/\.(csv|txt|dat|tsv)$/i, '');
        const customSample: SampleDataset = {
          id: `custom-${Date.now()}`,
          name: cleanName,
          subtitle: `Imported (${x.length} pts)`,
          laserWavelength: 'Custom',
          referenceId: selectedReferenceId,
          x,
          y
        };
        setSamples((prev) => [customSample, ...prev.slice(0, 5)]);
        setActiveSampleId(customSample.id);
        setSelectedPeakId(null);
        setErrorBanner(null);
      } catch (err) {
        setErrorBanner(
          err instanceof Error ? err.message : 'Unable to parse CSV/TXT file.'
        );
      }
    };
    reader.readAsText(file);
  };

  const wavenumberSpan: [number, number] =
    activeSample.x.length > 0
      ? [
          Math.round(activeSample.x[0]),
          Math.round(activeSample.x[activeSample.x.length - 1])
        ]
      : [0, 0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Minimal White & Teal Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-slate-900">
                  SaA
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Spectra Analysis Agent
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Vibrational Mode Identification • Deconvolution • Reference Matching
              </p>
            </div>
          </div>

          {/* Active Sample & Export Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-medium text-slate-700">{activeSample.name}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-teal-700 font-semibold">
                {pipelineResult.peaks.length} peaks
              </span>
            </div>

            <button
              type="button"
              onClick={() => exportSvgElementToPNG(svgRef.current, activeSample.name)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-200 text-xs font-medium text-slate-700 hover:text-teal-700 transition"
              title="Export Spectrum as PNG Image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
              <span>PNG</span>
            </button>

            <button
              type="button"
              onClick={() => exportSvgElementToSVG(svgRef.current, activeSample.name)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-200 text-xs font-medium text-slate-700 hover:text-teal-700 transition"
              title="Export Spectrum as Vector SVG"
            >
              <FileCode className="w-3.5 h-3.5 text-teal-600" />
              <span>SVG</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportAnalysisToCSV(
                  activeSample.name,
                  activeSample.x,
                  activeSample.y,
                  pipelineResult.baseline,
                  pipelineResult.processedY,
                  pipelineResult.compositeFit,
                  pipelineResult.peaks
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition shadow-sm"
              title="Export Processed Data & Peak Table as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Optional Parse Error Banner */}
      {errorBanner && (
        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-3">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-2 rounded-lg text-xs flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {errorBanner}
            </span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-amber-700 hover:underline font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row gap-4">
        {/* Left Control Sidebar */}
        <ProcessingSidebar
          config={config}
          onChangeConfig={handleUpdateConfig}
          onResetConfig={() => setConfig(DEFAULT_CONFIG)}
          samples={samples}
          activeSampleId={activeSample.id}
          onSelectSample={handleSelectSample}
          onFileUpload={handleFileUpload}
          pointCount={activeSample.x.length}
          wavenumberSpan={wavenumberSpan}
        />

        {/* Right Spectrum Viewer + Peak Parameter Table / Characterization Tabs */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <SpectrumViewer
            x={activeSample.x}
            rawY={activeSample.y}
            baseline={pipelineResult.baseline}
            processedY={pipelineResult.processedY}
            compositeFit={pipelineResult.compositeFit}
            peaks={pipelineResult.peaks}
            selectedPeakId={selectedPeakId}
            onSelectPeak={setSelectedPeakId}
            referenceMaterial={activeReference}
            showReferenceOverlay={showReferenceOverlay}
            onToggleReferenceOverlay={() => setShowReferenceOverlay((v) => !v)}
            svgRef={svgRef}
          />

          <PeakAnalysisPanel
            sampleName={activeSample.name}
            peaks={pipelineResult.peaks}
            selectedPeakId={selectedPeakId}
            onSelectPeak={setSelectedPeakId}
            references={REFERENCE_MATERIALS}
            selectedReferenceId={selectedReferenceId}
            onSelectReferenceId={setSelectedReferenceId}
          />
        </div>
      </main>
    </div>
  );
}

export default App;

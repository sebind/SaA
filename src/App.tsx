import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProcessingConfig, ReferenceMaterial, SampleDataset } from './types/spectrum';
import {
  REFERENCE_MATERIALS,
  SAMPLE_DATASETS,
  VIBRATIONAL_MODES_DB,
  VibrationalEntry
} from './data/ramanReferenceData';
import { parseSpectrumText, runRamanPipeline } from './utils/ramanMath';
import { parseReferenceExcelBuffer } from './utils/excelReference';
import { parseOuluRamanDbYaml } from './utils/ouluRamanDb';
import {
  extractElementsFromMetadata,
  parseRamanLabDatabaseBuffer,
  RamanLabEntry
} from './utils/ramanLabDatabase';
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

function buildSeedRamanLabEntries(): RamanLabEntry[] {
  return REFERENCE_MATERIALS.map((ref) => {
    const sample = SAMPLE_DATASETS.find((s) => s.referenceId === ref.id);
    const wavenumbers = sample
      ? sample.x
      : Array.from({ length: 400 }, (_, i) => 100 + i * 7.5);
    const intensities = sample
      ? sample.y
      : wavenumbers.map((wn) => {
          let val = 0;
          for (const p of ref.peaks) {
            val +=
              p.relativeIntensity *
              1000 *
              (1 / (1 + Math.pow((wn - p.wavenumber) / 9, 2)));
          }
          return val;
        });
    const metadata: Record<string, string> = {
      'MINERAL NAME': ref.name,
      FORMULA: ref.formula,
      'CHEMICAL FAMILY': ref.category
    };
    const { elements, formula, chemicalFamily, heyClassification } =
      extractElementsFromMetadata(metadata, ref.name);

    return {
      name: ref.name,
      wavenumbers,
      intensities,
      peaks: ref.peaks.map((p) => p.wavenumber),
      metadata,
      elements,
      formula,
      chemicalFamily,
      heyClassification
    };
  });
}

export function App() {
  const [samples, setSamples] = useState<SampleDataset[]>(SAMPLE_DATASETS);
  const [activeSampleId, setActiveSampleId] = useState<string>(SAMPLE_DATASETS[0].id);
  const [config, setConfig] = useState<ProcessingConfig>(DEFAULT_CONFIG);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);
  const [references, setReferences] = useState<ReferenceMaterial[]>(REFERENCE_MATERIALS);
  const [modesDb, setModesDb] = useState<VibrationalEntry[]>(VIBRATIONAL_MODES_DB);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string>(
    SAMPLE_DATASETS[0].referenceId
  );
  const [showReferenceOverlay, setShowReferenceOverlay] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [ramanLabDb, setRamanLabDb] = useState<RamanLabEntry[]>(() =>
    buildSeedRamanLabEntries()
  );
  const [dbSourcePath, setDbSourcePath] = useState<string>(
    './RamanLab_Database_20250602.pkl'
  );
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Automatically load ./reference_data.xlsx and ./RamanLab_Database_20250602.pkl if present
  useEffect(() => {
    fetch('./reference_data.xlsx')
      .then((res) => {
        if (!res.ok) throw new Error('No external Excel reference found');
        return res.arrayBuffer();
      })
      .then((buffer) => {
        const parsed = parseReferenceExcelBuffer(buffer);
        if (parsed.references.length > 0) {
          setReferences(parsed.references);
          setModesDb(parsed.modesDb);
        }
      })
      .catch(() => {
        // Fallback to built-in REFERENCE_MATERIALS if offline
      });

    fetch('./RamanLab_Database_20250602.pkl')
      .then((res) => {
        if (
          !res.ok ||
          (res.headers.get('content-type') || '').includes('text/html')
        ) {
          throw new Error('No local RamanLab_Database_20250602.pkl found');
        }
        return res.arrayBuffer();
      })
      .then((buffer) => {
        const entries = parseRamanLabDatabaseBuffer(
          buffer,
          'RamanLab_Database_20250602.pkl'
        );
        if (entries.length > 0) {
          setRamanLabDb(entries);
        }
      })
      .catch(() => {
        // Keep seed entries until user selects local .pkl or path
      });
  }, []);

  const activeSample = useMemo(
    () => samples.find((s) => s.id === activeSampleId) || samples[0],
    [samples, activeSampleId]
  );

  const activeReference = useMemo(
    () =>
      references.find((r) => r.id === selectedReferenceId) ||
      references.find((r) =>
        r.name.toLowerCase().includes(selectedReferenceId.split('-')[0])
      ) ||
      references[0],
    [references, selectedReferenceId]
  );

  const pipelineResult = useMemo(() => {
    return runRamanPipeline(activeSample.x, activeSample.y, config, modesDb);
  }, [activeSample, config, modesDb]);

  const handleUpdateConfig = (partial: Partial<ProcessingConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectSample = (sample: SampleDataset) => {
    setActiveSampleId(sample.id);
    const matchingRef =
      references.find((r) => r.id === sample.referenceId) ||
      references.find((r) =>
        r.name.toLowerCase().includes(sample.referenceId.split('-')[0])
      );
    if (matchingRef) {
      setSelectedReferenceId(matchingRef.id);
    }
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
          subtitle: `${x.length} pts`,
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

  const handleExcelReferenceUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parseReferenceExcelBuffer(buffer);
        if (parsed.references.length === 0) {
          throw new Error(
            'No valid rows found. Ensure columns: Compound, Formula, Peak_Position, Vibrational_Mode.'
          );
        }
        setReferences(parsed.references);
        setModesDb(parsed.modesDb);
        setSelectedReferenceId(parsed.references[0].id);
        setErrorBanner(null);
      } catch (err) {
        setErrorBanner(
          err instanceof Error ? err.message : 'Unable to parse Excel reference sheet.'
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleOuluYamlUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const { reference, modes } = parseOuluRamanDbYaml(text, file.name);
        setReferences((prev) => [
          reference,
          ...prev.filter((r) => r.id !== reference.id)
        ]);
        setModesDb((prev) => [...modes, ...prev]);
        setSelectedReferenceId(reference.id);
        setShowReferenceOverlay(true);
        setErrorBanner(null);
      } catch (err) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : 'Unable to parse Oulu RamanDB tensor file.'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleLoadRamanLabFromFile = (file: File) => {
    setIsLoadingDb(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const entries = parseRamanLabDatabaseBuffer(buffer, file.name);
        if (entries.length === 0) {
          throw new Error('No valid Raman spectra found in database file.');
        }
        setRamanLabDb(entries);
        setDbSourcePath(file.name);
        setErrorBanner(null);
      } catch (err) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : 'Failed to parse RamanLab database (.pkl / .json).'
        );
      } finally {
        setIsLoadingDb(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLoadRamanLabFromPath = (pathOrUrl: string) => {
    const clean = pathOrUrl.trim();
    if (!clean) return;
    setIsLoadingDb(true);
    setDbSourcePath(clean);
    fetch(clean)
      .then((res) => {
        if (
          !res.ok ||
          (res.headers.get('content-type') || '').includes('text/html')
        ) {
          throw new Error(
            'Browser cannot directly read OS paths without file selection. Use "Browse Local .pkl" or place RamanLab_Database_20250602.pkl in public/.'
          );
        }
        return res.arrayBuffer();
      })
      .then((buffer) => {
        const entries = parseRamanLabDatabaseBuffer(buffer, clean);
        if (entries.length === 0) {
          throw new Error('No valid spectra found at specified path.');
        }
        setRamanLabDb(entries);
        setErrorBanner(null);
      })
      .catch((err) => {
        setErrorBanner(
          err instanceof Error ? err.message : 'Unable to load database path.'
        );
      })
      .finally(() => {
        setIsLoadingDb(false);
      });
  };

  const handleApplyRamanLabMatch = (ref: ReferenceMaterial) => {
    setReferences((prev) => [ref, ...prev.filter((r) => r.id !== ref.id)]);
    setSelectedReferenceId(ref.id);
    setShowReferenceOverlay(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-900 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="font-gibed-title text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-violet-900 bg-clip-text text-transparent">
                aiSA
              </h1>
              <span className="text-xs font-medium text-violet-900/75 hidden sm:inline">
                agentic intelligence for spectra analysis
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportSvgElementToPNG(svgRef.current, activeSample.name, 300)}
              title="Download Publication-Grade 300 DPI PNG"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 text-xs font-medium text-slate-700 hover:text-violet-800 transition"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>PNG (300 DPI)</span>
            </button>

            <button
              type="button"
              onClick={() => exportSvgElementToSVG(svgRef.current, activeSample.name)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 text-xs font-medium text-slate-700 hover:text-violet-800 transition"
            >
              <FileCode className="w-3.5 h-3.5 text-purple-600" />
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-800 hover:from-purple-700 hover:to-violet-900 text-white text-xs font-semibold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </header>

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

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row gap-4">
        <ProcessingSidebar
          config={config}
          onChangeConfig={handleUpdateConfig}
          onResetConfig={() => setConfig(DEFAULT_CONFIG)}
          samples={samples}
          activeSampleId={activeSample.id}
          onSelectSample={handleSelectSample}
          onFileUpload={handleFileUpload}
          onExcelReferenceUpload={handleExcelReferenceUpload}
          onOuluYamlUpload={handleOuluYamlUpload}
          referenceCompoundCount={references.length}
        />

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <SpectrumViewer
            sampleName={activeSample.name}
            laserWavelength={activeSample.laserWavelength}
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
            queryX={activeSample.x}
            queryY={pipelineResult.processedY}
            peaks={pipelineResult.peaks}
            selectedPeakId={selectedPeakId}
            onSelectPeak={setSelectedPeakId}
            references={references}
            selectedReferenceId={activeReference?.id || ''}
            onSelectReferenceId={setSelectedReferenceId}
            ramanLabDb={ramanLabDb}
            dbSourcePath={dbSourcePath}
            isLoadingDb={isLoadingDb}
            onLoadDbFromFile={handleLoadRamanLabFromFile}
            onLoadDbFromPath={handleLoadRamanLabFromPath}
            onApplyMatchAsReference={handleApplyRamanLabMatch}
          />
        </div>
      </main>
    </div>
  );
}

export default App;

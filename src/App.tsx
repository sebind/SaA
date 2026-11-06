import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProcessingConfig, ReferenceMaterial, SampleDataset } from './types/spectrum';
import { UVVisConfig, UVVisSampleDataset } from './types/uvvis';
import {
  REFERENCE_MATERIALS,
  SAMPLE_DATASETS,
  VIBRATIONAL_MODES_DB,
  VibrationalEntry
} from './data/ramanReferenceData';
import { UVVIS_SAMPLE_DATASETS } from './data/uvvisReferenceData';
import { parseSpectrumText, runRamanPipeline } from './utils/ramanMath';
import {
  exportUVVisAnalysisToCSV,
  parseUVVisSpectrumText,
  runUVVisPipeline
} from './utils/uvvisMath';
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
import { UVVisSidebar } from './components/UVVisSidebar';
import { UVVisViewer } from './components/UVVisViewer';
import { UVVisAnalysisPanel } from './components/UVVisAnalysisPanel';
import {
  Activity,
  Download,
  FileCode,
  Image as ImageIcon,
  AlertTriangle,
  Sun,
  Atom,
  Sparkles
} from 'lucide-react';

export type SpectroscopyModule = 'raman' | 'uvvis' | 'xps' | 'pl';

const DEFAULT_RAMAN_CONFIG: ProcessingConfig = {
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

const DEFAULT_UVVIS_CONFIG: UVVisConfig = {
  measurementMode: 'thin-film',
  inputSignalType: 'absorbance',
  thicknessValue: 250,
  thicknessUnit: 'nm',
  transitionType: 'direct-allowed',
  smoothWindow: 5,
  useBaselineOffset: false,
  autoFit: true,
  manualEnergyRange: null
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
  const [activeModule, setActiveModule] = useState<SpectroscopyModule>('raman');

  // --- Raman State ---
  const [samples, setSamples] = useState<SampleDataset[]>(SAMPLE_DATASETS);
  const [activeSampleId, setActiveSampleId] = useState<string>(SAMPLE_DATASETS[0].id);
  const [config, setConfig] = useState<ProcessingConfig>(DEFAULT_RAMAN_CONFIG);
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

  // --- UV-Vis-NIR State ---
  const [uvSamples, setUvSamples] = useState<UVVisSampleDataset[]>(UVVIS_SAMPLE_DATASETS);
  const [activeUvSampleId, setActiveUvSampleId] = useState<string>(
    UVVIS_SAMPLE_DATASETS[0].id
  );
  const [uvConfig, setUvConfig] = useState<UVVisConfig>(DEFAULT_UVVIS_CONFIG);

  const ramanSvgRef = useRef<SVGSVGElement>(null);
  const uvvisSvgRef = useRef<SVGSVGElement>(null);

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

  // --- Raman Memoized Pipeline ---
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

  // --- UV-Vis-NIR Memoized Pipeline ---
  const activeUvSample = useMemo(
    () => uvSamples.find((s) => s.id === activeUvSampleId) || uvSamples[0],
    [uvSamples, activeUvSampleId]
  );

  const uvPipelineResult = useMemo(() => {
    return runUVVisPipeline(
      activeUvSample.wavelengthNm,
      activeUvSample.signalY,
      uvConfig
    );
  }, [activeUvSample, uvConfig]);

  const uvEnergyBoundsEv = useMemo<[number, number]>(() => {
    const eArr = uvPipelineResult.photonEnergyEv;
    if (eArr.length === 0) return [1.2, 4.2];
    return [Math.min(...eArr), Math.max(...eArr)];
  }, [uvPipelineResult.photonEnergyEv]);

  // --- Raman Handlers ---
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

  // --- UV-Vis-NIR Handlers ---
  const handleUpdateUvConfig = (partial: Partial<UVVisConfig>) => {
    setUvConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectUvSample = (sample: UVVisSampleDataset) => {
    setActiveUvSampleId(sample.id);
    setUvConfig((prev) => ({
      ...prev,
      measurementMode: sample.measurementMode,
      inputSignalType: sample.inputSignalType,
      thicknessValue: sample.defaultThicknessNm,
      thicknessUnit: 'nm',
      transitionType: sample.defaultTransition,
      autoFit: true,
      manualEnergyRange: null
    }));
    setErrorBanner(null);
  };

  const handleUvFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const { wavelengthNm, signalY, detectedSignalType } =
          parseUVVisSpectrumText(text);
        const cleanName = file.name.replace(/\.(csv|txt|dat|tsv)$/i, '');
        const isDrsGuess =
          uvConfig.measurementMode === 'drs' || detectedSignalType === 'reflectance';

        const customSample: UVVisSampleDataset = {
          id: `uvvis-custom-${Date.now()}`,
          name: cleanName,
          subtitle: `${wavelengthNm.length} pts`,
          materialFormula: cleanName,
          measurementMode: isDrsGuess ? 'drs' : 'thin-film',
          inputSignalType: detectedSignalType,
          defaultThicknessNm: uvConfig.thicknessValue,
          defaultTransition: uvConfig.transitionType,
          referenceEgEv: 3.0,
          notes: `Uploaded UV-Vis-NIR spectrum (${file.name}, ${wavelengthNm.length} points).`,
          wavelengthNm,
          signalY
        };

        setUvSamples((prev) => [customSample, ...prev.slice(0, 5)]);
        setActiveUvSampleId(customSample.id);
        setUvConfig((prev) => ({
          ...prev,
          inputSignalType: detectedSignalType,
          autoFit: true,
          manualEnergyRange: null
        }));
        setErrorBanner(null);
      } catch (err) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : 'Unable to parse UV-Vis-NIR spectrum file.'
        );
      }
    };
    reader.readAsText(file);
  };

  const isUvVisTheme = activeModule === 'uvvis';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Header Bar with Multi-Spectra Toggle Buttons */}
      <header
        className={`bg-white border-b sticky top-0 z-20 transition-colors ${
          isUvVisTheme ? 'border-powder-200' : 'border-slate-200'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 min-h-[3.5rem] py-1.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm transition-colors ${
                isUvVisTheme
                  ? 'bg-gradient-to-br from-powder-500 to-racing-500'
                  : 'bg-gradient-to-br from-purple-600 to-violet-900'
              }`}
            >
              {isUvVisTheme ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
            </div>
            <div className="flex items-baseline gap-2.5">
              <h1
                className={`font-gibed-title text-xl font-extrabold tracking-tight bg-clip-text text-transparent ${
                  isUvVisTheme
                    ? 'bg-gradient-to-r from-powder-700 via-powder-600 to-racing-500'
                    : 'bg-gradient-to-r from-purple-600 to-violet-900'
                }`}
              >
                aiSA
              </h1>
              <span
                className={`text-xs font-medium hidden md:inline ${
                  isUvVisTheme ? 'text-powder-800/85' : 'text-violet-900/75'
                }`}
              >
                agentic intelligence for spectra analysis
              </span>
            </div>
          </div>

          {/* Top Navigation Buttons to Toggle Between Different Spectra Analysis */}
          <nav
            aria-label="Spectroscopy Techniques"
            className={`inline-flex items-center gap-1 p-1 rounded-xl border ${
              isUvVisTheme
                ? 'bg-powder-50 border-powder-200'
                : 'bg-slate-100/90 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveModule('raman');
                setErrorBanner(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'raman'
                  ? 'bg-gradient-to-r from-purple-600 to-violet-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Raman</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('uvvis');
                setErrorBanner(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'uvvis'
                  ? 'bg-gradient-to-r from-racing-500 to-racing-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-racing-600 hover:bg-white/70'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>UV-Vis-NIR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('xps');
                setErrorBanner(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'xps'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Atom className="w-3.5 h-3.5" />
              <span>XPS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('pl');
                setErrorBanner(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'pl'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Photoluminescence</span>
            </button>
          </nav>

          {/* Export Buttons (Context-aware for Raman vs UV-Vis-NIR) */}
          {(activeModule === 'raman' || activeModule === 'uvvis') && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportSvgElementToPNG(
                    activeModule === 'uvvis'
                      ? uvvisSvgRef.current
                      : ramanSvgRef.current,
                    activeModule === 'uvvis'
                      ? activeUvSample.name
                      : activeSample.name,
                    300
                  )
                }
                title="Download Publication-Grade 300 DPI PNG"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white text-xs font-medium transition ${
                  isUvVisTheme
                    ? 'border-powder-300 text-slate-700 hover:bg-powder-50 hover:border-racing-300 hover:text-racing-700'
                    : 'border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200 hover:text-violet-800'
                }`}
              >
                <ImageIcon
                  className={`w-3.5 h-3.5 ${
                    isUvVisTheme ? 'text-racing-500' : 'text-purple-600'
                  }`}
                />
                <span>PNG (300 DPI)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportSvgElementToSVG(
                    activeModule === 'uvvis'
                      ? uvvisSvgRef.current
                      : ramanSvgRef.current,
                    activeModule === 'uvvis'
                      ? activeUvSample.name
                      : activeSample.name
                  )
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white text-xs font-medium transition ${
                  isUvVisTheme
                    ? 'border-powder-300 text-slate-700 hover:bg-powder-50 hover:border-racing-300 hover:text-racing-700'
                    : 'border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200 hover:text-violet-800'
                }`}
              >
                <FileCode
                  className={`w-3.5 h-3.5 ${
                    isUvVisTheme ? 'text-racing-500' : 'text-purple-600'
                  }`}
                />
                <span>SVG</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeModule === 'uvvis') {
                    exportUVVisAnalysisToCSV(
                      activeUvSample.name,
                      uvConfig,
                      uvPipelineResult
                    );
                  } else {
                    exportAnalysisToCSV(
                      activeSample.name,
                      activeSample.x,
                      activeSample.y,
                      pipelineResult.baseline,
                      pipelineResult.processedY,
                      pipelineResult.compositeFit,
                      pipelineResult.peaks
                    );
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition shadow-sm ${
                  isUvVisTheme
                    ? 'bg-gradient-to-r from-racing-500 to-racing-600 hover:from-racing-600 hover:to-racing-700'
                    : 'bg-gradient-to-r from-purple-600 to-violet-800 hover:from-purple-700 hover:to-violet-900'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          )}
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

      {/* Main Content Area */}
      {activeModule === 'raman' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row gap-4">
          <ProcessingSidebar
            config={config}
            onChangeConfig={handleUpdateConfig}
            onResetConfig={() => setConfig(DEFAULT_RAMAN_CONFIG)}
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
              svgRef={ramanSvgRef}
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
      )}

      {activeModule === 'uvvis' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row gap-4">
          <UVVisSidebar
            config={uvConfig}
            onChangeConfig={handleUpdateUvConfig}
            onResetConfig={() =>
              setUvConfig({
                ...DEFAULT_UVVIS_CONFIG,
                measurementMode: activeUvSample.measurementMode,
                inputSignalType: activeUvSample.inputSignalType,
                thicknessValue: activeUvSample.defaultThicknessNm,
                transitionType: activeUvSample.defaultTransition
              })
            }
            samples={uvSamples}
            activeSampleId={activeUvSample.id}
            onSelectSample={handleSelectUvSample}
            onFileUpload={handleUvFileUpload}
            energyBoundsEv={uvEnergyBoundsEv}
            detectedFitRangeEv={[
              uvPipelineResult.fit.fitEnergyMin,
              uvPipelineResult.fit.fitEnergyMax
            ]}
          />

          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <UVVisViewer
              sampleName={activeUvSample.name}
              materialFormula={activeUvSample.materialFormula}
              config={uvConfig}
              result={uvPipelineResult}
              svgRef={uvvisSvgRef}
            />

            <UVVisAnalysisPanel
              sampleName={activeUvSample.name}
              config={uvConfig}
              result={uvPipelineResult}
            />
          </div>
        </main>
      )}

      {(activeModule === 'xps' || activeModule === 'pl') && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-10 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
              {activeModule === 'xps' ? (
                <Atom className="w-6 h-6" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="font-gibed-title text-lg font-bold text-slate-900">
                {activeModule === 'xps'
                  ? 'XPS Core-Level Spectroscopy Module'
                  : 'Photoluminescence (PL) Spectroscopy Module'}
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {activeModule === 'xps'
                  ? 'Ready for integration: Shirley & Tougaard background subtraction, spin-orbit doublet constraints, and chemical state binding energy indexing.'
                  : 'Ready for integration: Steady-state emission peak deconvolution, near-band-edge vs. defect emission ratios, and CIE chromaticity coordinates.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModule('uvvis')}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-racing-500 to-racing-600 text-white text-xs font-semibold shadow-sm hover:from-racing-600 hover:to-racing-700 transition"
              >
                Open UV-Vis-NIR Analysis
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('raman')}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-800 text-white text-xs font-semibold shadow-sm hover:from-purple-700 hover:to-violet-900 transition"
              >
                Open Raman Analysis
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;

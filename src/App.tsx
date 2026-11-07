import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProcessingConfig, ReferenceMaterial, SampleDataset } from './types/spectrum';
import { UVVisConfig, UVVisSampleDataset } from './types/uvvis';
import { XPSConfig, XPSCoreLevelReference, XPSSampleDataset } from './types/xps';
import { PLConfig, PLMaterialReference, PLSampleDataset } from './types/pl';
import {
  REFERENCE_MATERIALS,
  SAMPLE_DATASETS,
  VIBRATIONAL_MODES_DB,
  VibrationalEntry
} from './data/ramanReferenceData';
import { UVVIS_SAMPLE_DATASETS } from './data/uvvisReferenceData';
import {
  XPS_CORE_LEVEL_REFERENCES,
  XPS_SAMPLE_DATASETS
} from './data/xpsReferenceData';
import {
  PL_MATERIAL_REFERENCES,
  PL_SAMPLE_DATASETS
} from './data/plReferenceData';
import { parseSpectrumText, runRamanPipeline } from './utils/ramanMath';
import {
  exportUVVisAnalysisToCSV,
  parseUVVisSpectrumText,
  runUVVisPipeline
} from './utils/uvvisMath';
import {
  exportXPSAnalysisToCSV,
  parseXPSSpectrumText,
  runXPSPipeline
} from './utils/xpsMath';
import {
  exportPLAnalysisToCSV,
  parsePLSpectrumText,
  runPLPipeline
} from './utils/plMath';
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
import { XPSSidebar } from './components/XPSSidebar';
import { XPSViewer } from './components/XPSViewer';
import { XPSAnalysisPanel } from './components/XPSAnalysisPanel';
import { PLSidebar } from './components/PLSidebar';
import { PLViewer } from './components/PLViewer';
import { PLAnalysisPanel } from './components/PLAnalysisPanel';
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

const DEFAULT_XPS_CONFIG: XPSConfig = {
  xraySource: 'Al-Ka',
  chargeShiftEv: 0.0,
  reversedAxis: true,
  backgroundMethod: 'shirley',
  tougaardB: 2866,
  smoothMethod: 'savgol',
  smoothWindow: 5,
  normMethod: 'none',
  autoFit: true,
  fitShape: 'pseudo-voigt',
  glMixRatio: 30,
  prominence: 0.06,
  minDistanceEv: 0.95,
  maxComponents: 6,
  enableShoulderDetection: true,
  customPeakSeeds: []
};

const DEFAULT_PL_CONFIG: PLConfig = {
  xAxisMode: 'wavelength',
  applyJacobianInEnergy: true,
  laserWavelengthNm: 325,
  referenceBandgapEv: 3.37,
  temperatureK: 300,
  baselineMethod: 'dark-offset',
  polyDegree: 2,
  smoothMethod: 'savgol',
  smoothWindow: 5,
  normMethod: 'none',
  autoFit: true,
  fitShape: 'pseudo-voigt',
  voigtMixRatio: 25,
  prominence: 0.06,
  minDistanceNm: 10,
  maxComponents: 5,
  enableShoulderDetection: true,
  customPeakSeeds: []
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

  // --- XPS State ---
  const [xpsSamples, setXpsSamples] = useState<XPSSampleDataset[]>(XPS_SAMPLE_DATASETS);
  const [activeXpsSampleId, setActiveXpsSampleId] = useState<string>(
    XPS_SAMPLE_DATASETS[0].id
  );
  const [xpsConfig, setXpsConfig] = useState<XPSConfig>(DEFAULT_XPS_CONFIG);
  const [selectedXpsPeakId, setSelectedXpsPeakId] = useState<string | null>(null);
  const [xpsReferences] = useState<XPSCoreLevelReference[]>(XPS_CORE_LEVEL_REFERENCES);
  const [selectedXpsRefId, setSelectedXpsRefId] = useState<string>(
    XPS_SAMPLE_DATASETS[0].referenceId
  );
  const [showXpsRefOverlay, setShowXpsRefOverlay] = useState<boolean>(true);

  // --- Photoluminescence (PL) State ---
  const [plSamples, setPlSamples] = useState<PLSampleDataset[]>(PL_SAMPLE_DATASETS);
  const [activePlSampleId, setActivePlSampleId] = useState<string>(
    PL_SAMPLE_DATASETS[0].id
  );
  const [plConfig, setPlConfig] = useState<PLConfig>(DEFAULT_PL_CONFIG);
  const [selectedPlPeakId, setSelectedPlPeakId] = useState<string | null>(null);
  const [plReferences] = useState<PLMaterialReference[]>(PL_MATERIAL_REFERENCES);
  const [selectedPlRefId, setSelectedPlRefId] = useState<string>(
    PL_SAMPLE_DATASETS[0].referenceId
  );
  const [showPlRefOverlay, setShowPlRefOverlay] = useState<boolean>(true);

  const ramanSvgRef = useRef<SVGSVGElement>(null);
  const uvvisSvgRef = useRef<SVGSVGElement>(null);
  const xpsSvgRef = useRef<SVGSVGElement>(null);
  const plSvgRef = useRef<SVGSVGElement>(null);

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

  // --- XPS Memoized Pipeline ---
  const activeXpsSample = useMemo(
    () => xpsSamples.find((s) => s.id === activeXpsSampleId) || xpsSamples[0],
    [xpsSamples, activeXpsSampleId]
  );

  const activeXpsReference = useMemo(
    () =>
      xpsReferences.find((r) => r.id === selectedXpsRefId) ||
      xpsReferences.find(
        (r) =>
          r.coreLevel.toLowerCase() === activeXpsSample.coreLevel.toLowerCase()
      ) ||
      xpsReferences[0],
    [xpsReferences, selectedXpsRefId, activeXpsSample.coreLevel]
  );

  const xpsPipelineResult = useMemo(() => {
    return runXPSPipeline(
      activeXpsSample.bindingEnergyEv,
      activeXpsSample.intensityCps,
      xpsConfig,
      activeXpsSample.coreLevel
    );
  }, [activeXpsSample, xpsConfig]);

  const xpsBeBoundsEv = useMemo<[number, number]>(() => {
    const arr = xpsPipelineResult.shiftedBeEv;
    if (arr.length === 0) return [280, 294];
    return [Math.min(...arr), Math.max(...arr)];
  }, [xpsPipelineResult.shiftedBeEv]);

  const dominantXpsPeakBeEv = useMemo<number | null>(() => {
    if (xpsPipelineResult.peaks.length === 0) return null;
    const sorted = [...xpsPipelineResult.peaks].sort(
      (a, b) => b.atomicPercent - a.atomicPercent
    );
    return sorted[0].centerEv;
  }, [xpsPipelineResult.peaks]);

  // --- Photoluminescence (PL) Memoized Pipeline ---
  const activePlSample = useMemo(
    () => plSamples.find((s) => s.id === activePlSampleId) || plSamples[0],
    [plSamples, activePlSampleId]
  );

  const activePlReference = useMemo(
    () =>
      plReferences.find((r) => r.id === selectedPlRefId) ||
      plReferences.find(
        (r) =>
          r.formula.toLowerCase() === activePlSample.materialFormula.toLowerCase()
      ) ||
      plReferences[0],
    [plReferences, selectedPlRefId, activePlSample.materialFormula]
  );

  const plPipelineResult = useMemo(() => {
    return runPLPipeline(
      activePlSample.wavelengthNm,
      activePlSample.intensity,
      plConfig,
      activePlSample.materialFormula
    );
  }, [activePlSample, plConfig]);

  const plWavelengthBoundsNm = useMemo<[number, number]>(() => {
    const arr = plPipelineResult.wavelengthNm;
    if (arr.length === 0) return [340, 800];
    return [Math.min(...arr), Math.max(...arr)];
  }, [plPipelineResult.wavelengthNm]);

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
  const isXpsTheme = activeModule === 'xps';
  const isPlTheme = activeModule === 'pl';

  // --- XPS Handlers ---
  const handleUpdateXpsConfig = (partial: Partial<XPSConfig>) => {
    setXpsConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectXpsSample = (sample: XPSSampleDataset) => {
    setActiveXpsSampleId(sample.id);
    setSelectedXpsRefId(sample.referenceId);
    setSelectedXpsPeakId(null);
    setXpsConfig((prev) => ({
      ...prev,
      xraySource: sample.xraySource,
      chargeShiftEv: sample.defaultChargeShiftEv,
      prominence: sample.defaultProminence,
      minDistanceEv: sample.defaultMinDistanceEv,
      glMixRatio: sample.defaultGlMix,
      autoFit: true,
      customPeakSeeds: []
    }));
    setErrorBanner(null);
  };

  const handleXpsFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const { bindingEnergyEv, intensityCps } = parseXPSSpectrumText(text);
        const cleanName = file.name.replace(/\.(csv|txt|dat|tsv)$/i, '');

        // Infer core level from Binding Energy range
        const midBe =
          (bindingEnergyEv[0] + bindingEnergyEv[bindingEnergyEv.length - 1]) / 2;
        let guessedCore = 'Core Level';
        let guessedRefId = selectedXpsRefId;
        if (midBe >= 278 && midBe <= 296) {
          guessedCore = 'C 1s';
          guessedRefId = 'c1s-go-ref';
        } else if (midBe >= 524 && midBe <= 538) {
          guessedCore = 'O 1s';
          guessedRefId = 'o1s-oxide-ref';
        } else if (midBe >= 450 && midBe <= 470) {
          guessedCore = 'Ti 2p';
          guessedRefId = 'ti2p-tio2-ref';
        } else if (midBe >= 222 && midBe <= 242) {
          guessedCore = 'Mo 3d';
          guessedRefId = 'mo3d-mos2-ref';
        } else if (midBe >= 95 && midBe <= 108) {
          guessedCore = 'Si 2p';
          guessedRefId = 'si2p-sio2-ref';
        } else if (midBe >= 394 && midBe <= 407) {
          guessedCore = 'N 1s';
          guessedRefId = 'n1s-ndoped-ref';
        }

        const customSample: XPSSampleDataset = {
          id: `xps-custom-${Date.now()}`,
          name: cleanName,
          subtitle: `${bindingEnergyEv.length} pts`,
          coreLevel: guessedCore,
          materialFormula: cleanName,
          xraySource: xpsConfig.xraySource,
          passEnergyEv: 20,
          referenceId: guessedRefId,
          defaultChargeShiftEv: 0,
          defaultProminence: 0.07,
          defaultMinDistanceEv: 0.95,
          defaultGlMix: 30,
          notes: `Uploaded XPS spectrum (${file.name}, ${bindingEnergyEv.length} points).`,
          bindingEnergyEv,
          intensityCps
        };

        setXpsSamples((prev) => [customSample, ...prev.slice(0, 5)]);
        setActiveXpsSampleId(customSample.id);
        setSelectedXpsRefId(guessedRefId);
        setSelectedXpsPeakId(null);
        setXpsConfig((prev) => ({
          ...prev,
          chargeShiftEv: 0,
          autoFit: true,
          customPeakSeeds: []
        }));
        setErrorBanner(null);
      } catch (err) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : 'Unable to parse XPS spectrum file.'
        );
      }
    };
    reader.readAsText(file);
  };

  // --- Photoluminescence (PL) Handlers ---
  const handleUpdatePlConfig = (partial: Partial<PLConfig>) => {
    setPlConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectPlSample = (sample: PLSampleDataset) => {
    setActivePlSampleId(sample.id);
    setSelectedPlRefId(sample.referenceId);
    setSelectedPlPeakId(null);
    setPlConfig((prev) => ({
      ...prev,
      laserWavelengthNm: sample.laserWavelengthNm,
      referenceBandgapEv: sample.referenceBandgapEv,
      temperatureK: sample.temperatureK,
      prominence: sample.defaultProminence,
      minDistanceNm: sample.defaultMinDistanceNm,
      voigtMixRatio: sample.defaultVoigtMix,
      autoFit: true,
      customPeakSeeds: []
    }));
    setErrorBanner(null);
  };

  const handlePlFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const { wavelengthNm, intensity, detectedAxisUnit } =
          parsePLSpectrumText(text);
        const cleanName = file.name.replace(/\.(csv|txt|dat|tsv)$/i, '');

        // Find peak maximum wavelength to infer semiconductor system & bandgap
        let maxIdx = 0;
        for (let i = 1; i < intensity.length; i++) {
          if (intensity[i] > intensity[maxIdx]) maxIdx = i;
        }
        const peakNm = wavelengthNm[maxIdx] || 520;
        const estBandgapEv = Number(
          Math.max(1.1, Math.min(4.0, 1239.84 / peakNm + 0.04)).toFixed(2)
        );
        const estLaserNm = peakNm < 420 ? 325 : peakNm < 560 ? 405 : 532;

        const customSample: PLSampleDataset = {
          id: `pl-custom-${Date.now()}`,
          name: cleanName,
          subtitle: `${wavelengthNm.length} pts (${detectedAxisUnit})`,
          materialFormula: cleanName,
          laserWavelengthNm: estLaserNm,
          referenceBandgapEv: estBandgapEv,
          temperatureK: 300,
          referenceId: selectedPlRefId,
          defaultProminence: 0.06,
          defaultMinDistanceNm: 12,
          defaultVoigtMix: 25,
          notes: `Uploaded steady-state PL spectrum (${file.name}, ${wavelengthNm.length} points).`,
          wavelengthNm,
          intensity
        };

        setPlSamples((prev) => [customSample, ...prev.slice(0, 5)]);
        setActivePlSampleId(customSample.id);
        setSelectedPlPeakId(null);
        setPlConfig((prev) => ({
          ...prev,
          xAxisMode: detectedAxisUnit === 'eV' ? 'energy' : 'wavelength',
          laserWavelengthNm: estLaserNm,
          referenceBandgapEv: estBandgapEv,
          autoFit: true,
          customPeakSeeds: []
        }));
        setErrorBanner(null);
      } catch (err) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : 'Unable to parse PL spectrum file.'
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Header Bar with Multi-Spectra Toggle Buttons */}
      <header
        className={`bg-white border-b sticky top-0 z-20 transition-colors ${
          isUvVisTheme
            ? 'border-powder-200'
            : isXpsTheme
            ? 'border-deepblue-200'
            : isPlTheme
            ? 'border-sage-200'
            : 'border-slate-200'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 min-h-[3.5rem] py-1.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm transition-colors ${
                isUvVisTheme
                  ? 'bg-gradient-to-br from-powder-500 to-racing-500'
                  : isXpsTheme
                  ? 'bg-gradient-to-br from-deepblue-800 via-deepblue-700 to-bubblegum-500'
                  : isPlTheme
                  ? 'bg-gradient-to-br from-maroon-800 via-maroon-700 to-sage-500'
                  : 'bg-gradient-to-br from-purple-600 to-violet-900'
              }`}
            >
              {isUvVisTheme ? (
                <Sun className="w-4 h-4" />
              ) : isXpsTheme ? (
                <Atom className="w-4 h-4" />
              ) : isPlTheme ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
            </div>
            <div className="flex items-baseline gap-2.5">
              <h1
                className={`font-gibed-title text-xl font-extrabold tracking-tight bg-clip-text text-transparent ${
                  isUvVisTheme
                    ? 'bg-gradient-to-r from-powder-700 via-powder-600 to-racing-500'
                    : isXpsTheme
                    ? 'bg-gradient-to-r from-deepblue-900 via-deepblue-700 to-bubblegum-500'
                    : isPlTheme
                    ? 'bg-gradient-to-r from-maroon-900 via-maroon-700 to-sage-600'
                    : 'bg-gradient-to-r from-purple-600 to-violet-900'
                }`}
              >
                aiSA
              </h1>
              <span
                className={`text-xs font-medium hidden md:inline ${
                  isUvVisTheme
                    ? 'text-powder-800/85'
                    : isXpsTheme
                    ? 'text-deepblue-800/85'
                    : isPlTheme
                    ? 'text-maroon-800/85'
                    : 'text-violet-900/75'
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
                : isXpsTheme
                ? 'bg-deepblue-50/80 border-deepblue-200'
                : isPlTheme
                ? 'bg-sage-50/90 border-sage-200'
                : 'bg-slate-100/90 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveModule('raman');
                setErrorBanner(null);
              }}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'raman'
                  ? 'bg-gradient-to-r from-purple-600 to-violet-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>Raman</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('uvvis');
                setErrorBanner(null);
              }}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'uvvis'
                  ? 'bg-gradient-to-r from-racing-500 to-racing-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-racing-600 hover:bg-white/70'
              }`}
            >
              <Sun className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">UVVis</span>
              <span className="hidden sm:inline">UV-Vis-NIR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('xps');
                setErrorBanner(null);
              }}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'xps'
                  ? 'bg-gradient-to-r from-deepblue-800 to-bubblegum-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-bubblegum-600 hover:bg-white/70'
              }`}
            >
              <Atom className="w-3.5 h-3.5 shrink-0" />
              <span>XPS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('pl');
                setErrorBanner(null);
              }}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'pl'
                  ? 'bg-gradient-to-r from-maroon-800 to-sage-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-maroon-800 hover:bg-white/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">PL</span>
              <span className="hidden sm:inline">Photoluminescence</span>
            </button>
          </nav>

          {/* Export Buttons (Context-aware for Raman, UV-Vis-NIR, XPS, and PL) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportSvgElementToPNG(
                  activeModule === 'uvvis'
                    ? uvvisSvgRef.current
                    : activeModule === 'xps'
                    ? xpsSvgRef.current
                    : activeModule === 'pl'
                    ? plSvgRef.current
                    : ramanSvgRef.current,
                  activeModule === 'uvvis'
                    ? activeUvSample.name
                    : activeModule === 'xps'
                    ? activeXpsSample.name
                    : activeModule === 'pl'
                    ? activePlSample.name
                    : activeSample.name,
                  300
                )
              }
              title="Download Publication-Grade 300 DPI PNG"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white text-xs font-medium transition ${
                isUvVisTheme
                  ? 'border-powder-300 text-slate-700 hover:bg-powder-50 hover:border-racing-300 hover:text-racing-700'
                  : isXpsTheme
                  ? 'border-deepblue-200 text-deepblue-900 hover:bg-bubblegum-50 hover:border-bubblegum-300 hover:text-bubblegum-700'
                  : isPlTheme
                  ? 'border-sage-300 text-maroon-900 hover:bg-sage-50 hover:border-maroon-400 hover:text-maroon-800'
                  : 'border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200 hover:text-violet-800'
              }`}
            >
              <ImageIcon
                className={`w-3.5 h-3.5 ${
                  isUvVisTheme
                    ? 'text-racing-500'
                    : isXpsTheme
                    ? 'text-bubblegum-500'
                    : isPlTheme
                    ? 'text-maroon-700'
                    : 'text-purple-600'
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
                    : activeModule === 'xps'
                    ? xpsSvgRef.current
                    : activeModule === 'pl'
                    ? plSvgRef.current
                    : ramanSvgRef.current,
                  activeModule === 'uvvis'
                    ? activeUvSample.name
                    : activeModule === 'xps'
                    ? activeXpsSample.name
                    : activeModule === 'pl'
                    ? activePlSample.name
                    : activeSample.name
                )
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white text-xs font-medium transition ${
                isUvVisTheme
                  ? 'border-powder-300 text-slate-700 hover:bg-powder-50 hover:border-racing-300 hover:text-racing-700'
                  : isXpsTheme
                  ? 'border-deepblue-200 text-deepblue-900 hover:bg-bubblegum-50 hover:border-bubblegum-300 hover:text-bubblegum-700'
                  : isPlTheme
                  ? 'border-sage-300 text-maroon-900 hover:bg-sage-50 hover:border-maroon-400 hover:text-maroon-800'
                  : 'border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200 hover:text-violet-800'
              }`}
            >
              <FileCode
                className={`w-3.5 h-3.5 ${
                  isUvVisTheme
                    ? 'text-racing-500'
                    : isXpsTheme
                    ? 'text-bubblegum-500'
                    : isPlTheme
                    ? 'text-maroon-700'
                    : 'text-purple-600'
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
                } else if (activeModule === 'xps') {
                  exportXPSAnalysisToCSV(
                    activeXpsSample.name,
                    activeXpsSample.coreLevel,
                    xpsConfig,
                    xpsPipelineResult
                  );
                } else if (activeModule === 'pl') {
                  exportPLAnalysisToCSV(
                    activePlSample.name,
                    activePlSample.materialFormula,
                    plConfig,
                    plPipelineResult
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
                  : isXpsTheme
                  ? 'bg-gradient-to-r from-deepblue-800 to-bubblegum-500 hover:from-deepblue-900 hover:to-bubblegum-600'
                  : isPlTheme
                  ? 'bg-gradient-to-r from-maroon-800 to-sage-600 hover:from-maroon-900 hover:to-sage-700'
                  : 'bg-gradient-to-r from-purple-600 to-violet-800 hover:from-purple-700 hover:to-violet-900'
              }`}
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

      {activeModule === 'xps' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row gap-4">
          <XPSSidebar
            config={xpsConfig}
            onChangeConfig={handleUpdateXpsConfig}
            onResetConfig={() =>
              setXpsConfig({
                ...DEFAULT_XPS_CONFIG,
                xraySource: activeXpsSample.xraySource,
                chargeShiftEv: activeXpsSample.defaultChargeShiftEv,
                prominence: activeXpsSample.defaultProminence,
                minDistanceEv: activeXpsSample.defaultMinDistanceEv,
                glMixRatio: activeXpsSample.defaultGlMix
              })
            }
            samples={xpsSamples}
            activeSampleId={activeXpsSample.id}
            onSelectSample={handleSelectXpsSample}
            onFileUpload={handleXpsFileUpload}
            beBoundsEv={xpsBeBoundsEv}
            dominantPeakBeEv={dominantXpsPeakBeEv}
          />

          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <XPSViewer
              sampleName={activeXpsSample.name}
              coreLevel={activeXpsSample.coreLevel}
              materialFormula={activeXpsSample.materialFormula}
              config={xpsConfig}
              result={xpsPipelineResult}
              selectedPeakId={selectedXpsPeakId}
              onSelectPeak={setSelectedXpsPeakId}
              referenceMaterial={activeXpsReference}
              showReferenceOverlay={showXpsRefOverlay}
              onToggleReferenceOverlay={() => setShowXpsRefOverlay((v) => !v)}
              svgRef={xpsSvgRef}
            />

            <XPSAnalysisPanel
              sampleName={activeXpsSample.name}
              coreLevel={activeXpsSample.coreLevel}
              config={xpsConfig}
              result={xpsPipelineResult}
              selectedPeakId={selectedXpsPeakId}
              onSelectPeak={setSelectedXpsPeakId}
              references={xpsReferences}
              selectedReferenceId={activeXpsReference?.id || ''}
              onSelectReferenceId={setSelectedXpsRefId}
            />
          </div>
        </main>
      )}

      {activeModule === 'pl' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row gap-4">
          <PLSidebar
            config={plConfig}
            onChangeConfig={handleUpdatePlConfig}
            onResetConfig={() =>
              setPlConfig({
                ...DEFAULT_PL_CONFIG,
                laserWavelengthNm: activePlSample.laserWavelengthNm,
                referenceBandgapEv: activePlSample.referenceBandgapEv,
                temperatureK: activePlSample.temperatureK,
                prominence: activePlSample.defaultProminence,
                minDistanceNm: activePlSample.defaultMinDistanceNm,
                voigtMixRatio: activePlSample.defaultVoigtMix
              })
            }
            samples={plSamples}
            activeSampleId={activePlSample.id}
            onSelectSample={handleSelectPlSample}
            onFileUpload={handlePlFileUpload}
            wavelengthBoundsNm={plWavelengthBoundsNm}
          />

          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <PLViewer
              sampleName={activePlSample.name}
              materialFormula={activePlSample.materialFormula}
              config={plConfig}
              result={plPipelineResult}
              selectedPeakId={selectedPlPeakId}
              onSelectPeak={setSelectedPlPeakId}
              referenceMaterial={activePlReference}
              showReferenceOverlay={showPlRefOverlay}
              onToggleReferenceOverlay={() => setShowPlRefOverlay((v) => !v)}
              svgRef={plSvgRef}
            />

            <PLAnalysisPanel
              sampleName={activePlSample.name}
              materialFormula={activePlSample.materialFormula}
              config={plConfig}
              result={plPipelineResult}
              selectedPeakId={selectedPlPeakId}
              onSelectPeak={setSelectedPlPeakId}
              references={plReferences}
              selectedReferenceId={activePlReference?.id || ''}
              onSelectReferenceId={setSelectedPlRefId}
            />
          </div>
        </main>
      )}
    </div>
  );
}

export default App;

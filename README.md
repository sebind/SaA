# SaA - Spectra Analysis Agent

**SaA (Spectra Analysis Agent)** is a web-based Raman spectroscopy analysis assistant that helps researchers preprocess experimental spectra, deconvolute peaks with Gaussian and Lorentzian profiles, match vibrational modes against reference standards, and generate manuscript-ready characterization summaries.

## Features
- **CSV & TXT Import**: Drag-and-drop 2-column `(Wavenumber, Intensity)` files or explore built-in reference datasets (CVD Graphene, Anatase $\text{TiO}_2$, Paracetamol Form I, Crystalline Silicon).
- **Signal Preprocessing**:
  - Baseline Correction (Iterative Modified Polynomial, Rolling Ball, Linear)
  - Smoothing (Savitzky–Golay, Moving Average)
  - Normalization (0–1 Min-Max, Max Intensity, SNV, Integrated Area)
- **Peak Detection & Deconvolution**: Automatic local-maxima prominence detection and nonlinear least-squares Gaussian & Lorentzian peak fitting.
- **Vibrational Mode Assignment & Reference Comparison**: Automated matching against Raman vibrational modes and reference standards with shift ($\Delta\nu$) analysis.
- **Characterization Summary & Exports**: Publication-ready text summary and one-click **PNG**, **SVG**, and **CSV** exports.

## Development

```bash
npm install
npm run dev
```

## Production Build (GitHub Pages Ready)

```bash
npm run build
```

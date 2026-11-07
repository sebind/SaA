# aiSA — agentic intelligence for spectra analysis

**aiSA** is a multi-spectroscopy analysis web platform supporting:
- **Raman Spectroscopy**: CSV/TXT spectrum import, baseline correction (Linear, ModPoly, Morphological Rolling Ball), Savitzky–Golay smoothing, normalization, multi-color Gaussian & Lorentzian peak deconvolution, publication-ready Raman plots, reference matching via `reference_data.xlsx`, Oulu RamanDB `.yaml` support, and RamanLab `.pkl` database screening.
- **UV-Vis-NIR & DRS (Kubelka-Munk) Spectroscopy**: Thin-film absorption coefficient ($\alpha = 2.303A/t$ vs. wavelength $\lambda$) from user-specified film thickness ($t$ in nm, µm, or mm), Diffuse Reflectance Spectroscopy (DRS) Kubelka-Munk remission transformation ($F(R_\infty) = (1 - R_\infty)^2 / (2R_\infty)$), direct/indirect Tauc plots, and **automatic linear region detection & tangent extrapolation** to determine optical band gaps ($E_g$ in eV and onset $\lambda_g$ in nm).
- **XPS Core-Level Spectroscopy**: Iterative Shirley, universal Tougaard, and linear inelastic background subtraction, charge referencing ($\Delta\text{BE}$ calibration including one-click $\text{C } 1s \rightarrow 284.80\text{ eV}$ alignment), Pseudo-Voigt $\text{GL}(m)$, Gaussian, and Lorentzian multi-peak deconvolution with automatic chemical-state shoulder detection, spin-orbit doublet splitting ($\Delta E_{\text{SO}}$) pairing, Scofield RSF atomic quantification, and NIST chemical state indexing.
- **Top Multi-Spectra Toggle Bar**: Switch seamlessly between **Raman**, **UV-Vis-NIR**, **XPS**, and **Photoluminescence (PL)** modules, with 300 DPI PNG, vector SVG, and CSV exports.

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Updating the Reference Excel Sheet (`reference_data.xlsx`)

Edit `reference_data.xlsx` (and copy to `public/reference_data.xlsx` or upload directly in the app sidebar via **Ref Excel**):

| Column 1 (`Compound`) | Column 2 (`Formula`) | Column 3 (`Peak_Position`) | Column 4 (`Vibrational_Mode`) |
| :--- | :--- | :--- | :--- |
| Anatase Titanium Dioxide | TiO₂ | 144 | Eg (O–Ti–O symmetric bending) |
| Defective Monolayer Graphene | C (sp²) | 1582 | G Band (E2g in-plane C=C stretch) |
| Paracetamol (Form I) | C₈H₉NO₂ | 1610 | ν(C=C) Aromatic Ring Stretch |

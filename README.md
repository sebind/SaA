# aiSA — agentic intelligence for spectra analysis

**aiSA** is a web-based Raman spectroscopy analysis assistant with CSV/TXT import, baseline correction, smoothing, normalization, Gaussian & Lorentzian deconvolution, reference matching via an editable Excel sheet ([`reference_data.xlsx`](file:///e:/SpectraLab/reference_data.xlsx)), and PNG/SVG/CSV exports.

## Updating the Reference Excel Sheet (`reference_data.xlsx`)

Edit [`reference_data.xlsx`](file:///e:/SpectraLab/reference_data.xlsx) (and copy to `public/reference_data.xlsx` or upload directly in the app sidebar via **Ref Excel**):

| Column 1 (`Compound`) | Column 2 (`Formula`) | Column 3 (`Peak_Position`) | Column 4 (`Vibrational_Mode`) |
| :--- | :--- | :--- | :--- |
| Anatase Titanium Dioxide | TiO₂ | 144 | Eg (O–Ti–O symmetric bending) |
| Defective Monolayer Graphene | C (sp²) | 1582 | G Band (E2g in-plane C=C stretch) |
| Paracetamol (Form I) | C₈H₉NO₂ | 1610 | ν(C=C) Aromatic Ring Stretch |

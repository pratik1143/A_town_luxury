export interface LabelCalibration {
  layoutMode: 'roll' | 'sheet';
  labelWidth: number;       // Width of a single label in mm
  labelHeight: number;      // Height of a single label in mm
  columns: number;          // Number of labels per row
  rowsPerSheet: number;     // Number of rows per sheet (1 for roll mode)
  gapX: number;             // Horizontal gap between adjacent labels in mm
  gapY: number;             // Vertical gap between adjacent labels in mm
  marginTop: number;        // Top margin of page/sheet in mm
  marginLeft: number;       // Left margin of page/sheet in mm
  sheetWidth: number;       // Page/sheet width in mm
  sheetHeight: number;      // Page/sheet height in mm
  horizontalOffset: number; // Print horizontal offset shift in mm
  verticalOffset: number;   // Print vertical offset shift in mm
}

// ── DEFAULT = 50mm × 25mm (TSC TE244 2-Column roll sticker) ──────────────────
export const DEFAULT_CALIBRATION: LabelCalibration = {
  layoutMode: 'roll',
  labelWidth: 50,
  labelHeight: 25,
  columns: 2,
  rowsPerSheet: 1,
  gapX: 2,
  gapY: 2,
  marginTop: 0,
  marginLeft: 0,
  sheetWidth: 102, // (50 * 2 + 2)
  sheetHeight: 25,
  horizontalOffset: 0,
  verticalOffset: 0,
};

export const getPresetCalibration = (presetId: string): LabelCalibration => {
  switch (presetId) {
    case '25x15':
      return {
        layoutMode: 'roll',
        labelWidth: 25,
        labelHeight: 15,
        columns: 1,
        rowsPerSheet: 1,
        gapX: 0,
        gapY: 2,
        marginTop: 0,
        marginLeft: 0,
        sheetWidth: 25,
        sheetHeight: 15,
        horizontalOffset: 0,
        verticalOffset: 0,
      };
    case '38x25':
      return {
        layoutMode: 'roll',
        labelWidth: 38,
        labelHeight: 25,
        columns: 2,
        rowsPerSheet: 1,
        gapX: 2,
        gapY: 2,
        marginTop: 0,
        marginLeft: 0,
        sheetWidth: 78,
        sheetHeight: 25,
        horizontalOffset: 0,
        verticalOffset: 0,
      };
    case '50x25':
    default:
      return {
        layoutMode: 'roll',
        labelWidth: 50,
        labelHeight: 25,
        columns: 2,
        rowsPerSheet: 1,
        gapX: 2,
        gapY: 2,
        marginTop: 0,
        marginLeft: 0,
        sheetWidth: 102,
        sheetHeight: 25,
        horizontalOffset: 0,
        verticalOffset: 0,
      };
    case '80x25':
      return {
        layoutMode: 'roll',
        labelWidth: 80,
        labelHeight: 25,
        columns: 1,
        rowsPerSheet: 1,
        gapX: 0,
        gapY: 2,
        marginTop: 0,
        marginLeft: 0,
        sheetWidth: 80,
        sheetHeight: 25,
        horizontalOffset: 0,
        verticalOffset: 0,
      };
    case '60x40':
      return {
        layoutMode: 'roll',
        labelWidth: 60,
        labelHeight: 40,
        columns: 1,
        rowsPerSheet: 1,
        gapX: 0,
        gapY: 2,
        marginTop: 0,
        marginLeft: 0,
        sheetWidth: 60,
        sheetHeight: 40,
        horizontalOffset: 0,
        verticalOffset: 0,
      };
    case '100x50':
      return {
        layoutMode: 'roll',
        labelWidth: 100,
        labelHeight: 50,
        columns: 1,
        rowsPerSheet: 1,
        gapX: 0,
        gapY: 2,
        marginTop: 0,
        marginLeft: 0,
        sheetWidth: 100,
        sheetHeight: 50,
        horizontalOffset: 0,
        verticalOffset: 0,
      };
  }
};

export const getSavedCalibration = (): LabelCalibration => {
  const data = localStorage.getItem('town_label_calibration');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      // Automatically reset if it is set to the old 80x25 calibration
      if (parsed.labelWidth === 80) {
        localStorage.removeItem('town_label_calibration');
        return DEFAULT_CALIBRATION;
      }
      const width = parsed.layoutMode === 'roll'
        ? (parsed.labelWidth * parsed.columns + parsed.gapX * Math.max(0, parsed.columns - 1) + parsed.marginLeft * 2)
        : (parsed.sheetWidth || 210);
      const height = parsed.layoutMode === 'roll'
        ? (parsed.labelHeight + parsed.marginTop * 2)
        : (parsed.sheetHeight || 297);

      return {
        ...DEFAULT_CALIBRATION,
        ...parsed,
        sheetWidth: width,
        sheetHeight: height,
      };
    } catch (e) {
      return DEFAULT_CALIBRATION;
    }
  }
  return DEFAULT_CALIBRATION;
};

export const saveCalibration = (cal: LabelCalibration) => {
  const updated = { ...cal };
  if (updated.layoutMode === 'roll') {
    updated.sheetWidth  = updated.labelWidth * updated.columns + updated.gapX * Math.max(0, updated.columns - 1) + updated.marginLeft * 2;
    updated.sheetHeight = updated.labelHeight + updated.marginTop * 2;
    updated.rowsPerSheet = 1;
  }
  localStorage.setItem('town_label_calibration', JSON.stringify(updated));
};

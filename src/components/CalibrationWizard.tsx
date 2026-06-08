import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Printer, Layout, Move, Sliders, Check } from 'lucide-react';
import type { LabelCalibration } from '../utils/calibration';

interface CalibrationWizardProps {
  calibration: LabelCalibration;
  onSave: (updated: LabelCalibration) => void;
  onClose: () => void;
  onPrintTest: () => void;
}

const PRESETS = [
  {
    name: 'TSC TE244 2-Column Roll (50x25mm) [Standard]',
    calibration: {
      layoutMode: 'roll' as const,
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
    }
  },
  {
    name: 'TSC TE244 2-Column Roll (38x25mm)',
    calibration: {
      layoutMode: 'roll' as const,
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
    }
  },
  {
    name: 'TSC TE244 1-Column Roll (50x25mm)',
    calibration: {
      layoutMode: 'roll' as const,
      labelWidth: 50,
      labelHeight: 25,
      columns: 1,
      rowsPerSheet: 1,
      gapX: 0,
      gapY: 2,
      marginTop: 0,
      marginLeft: 0,
      sheetWidth: 50,
      sheetHeight: 25,
      horizontalOffset: 0,
      verticalOffset: 0,
    }
  },
  {
    name: 'A4 Grid Sheet (3 Columns × 8 Rows - 24 Labels)',
    calibration: {
      layoutMode: 'sheet' as const,
      labelWidth: 66,
      labelHeight: 34,
      columns: 3,
      rowsPerSheet: 8,
      gapX: 2.5,
      gapY: 2.0,
      marginTop: 8,
      marginLeft: 6,
      sheetWidth: 210,
      sheetHeight: 297,
      horizontalOffset: 0,
      verticalOffset: 0,
    }
  },
  {
    name: 'A4 Grid Sheet (2 Columns × 8 Rows - 16 Labels)',
    calibration: {
      layoutMode: 'sheet' as const,
      labelWidth: 99,
      labelHeight: 34,
      columns: 2,
      rowsPerSheet: 8,
      gapX: 4,
      gapY: 2,
      marginTop: 8,
      marginLeft: 6,
      sheetWidth: 210,
      sheetHeight: 297,
      horizontalOffset: 0,
      verticalOffset: 0,
    }
  }
];

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({
  calibration: initialCalibration,
  onSave,
  onClose,
  onPrintTest,
}) => {
  const [step, setStep] = useState(1);
  const [cal, setCal] = useState<LabelCalibration>({ ...initialCalibration });

  const handleChange = (field: keyof LabelCalibration, value: any) => {
    setCal((prev) => {
      const next = { ...prev, [field]: value };
      
      // Auto-calculate sheet width and height for Roll mode
      if (next.layoutMode === 'roll') {
        next.sheetWidth = Number(next.labelWidth) * Number(next.columns) + Number(next.gapX) * (Number(next.columns) - 1) + Number(next.marginLeft) * 2;
        next.sheetHeight = Number(next.labelHeight) + Number(next.marginTop) * 2;
        next.rowsPerSheet = 1;
      }
      return next;
    });
  };

  const applyPreset = (presetCal: any) => {
    setCal({ ...presetCal });
  };

  // Generate mockup label elements for dynamic SVG representation
  const renderSVGVisualizer = () => {
    const isRoll = cal.layoutMode === 'roll';
    const svgW = 220;
    const svgH = 220;
    
    // Scale factor to map mm coordinates into SVG coordinates
    const scale = isRoll 
      ? Math.min(200 / cal.sheetWidth, 200 / cal.sheetHeight) 
      : Math.min(200 / cal.sheetWidth, 200 / cal.sheetHeight);

    const sheetW_px = cal.sheetWidth * scale;
    const sheetH_px = cal.sheetHeight * scale;

    const lblW_px = cal.labelWidth * scale;
    const lblH_px = cal.labelHeight * scale;
    
    const gapX_px = cal.gapX * scale;
    const gapY_px = cal.gapY * scale;

    const mL_px = cal.marginLeft * scale;
    const mT_px = cal.marginTop * scale;

    const labels: React.ReactElement[] = [];

    // Rows to render in SVG preview
    const totalRows = isRoll ? 2 : cal.rowsPerSheet; // For roll, mock 2 rows to show vertical flow
    const totalCols = cal.columns;

    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        const x = mL_px + c * (lblW_px + gapX_px);
        const y = mT_px + r * (lblH_px + gapY_px);
        labels.push(
          <rect
            key={`${r}-${c}`}
            x={x}
            y={y}
            width={lblW_px}
            height={lblH_px}
            fill="#5D5FEF"
            fillOpacity={0.08}
            stroke="#5D5FEF"
            strokeWidth="0.8"
            strokeDasharray="2,2"
            rx="1"
          />
        );
      }
    }

    return (
      <div className="flex flex-col items-center justify-center bg-zinc-950 p-6 rounded-3xl border border-zinc-800 w-full select-none">
        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-3 block">Dynamic Grid Blueprint</span>
        <div className="w-[220px] h-[220px] flex items-center justify-center relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
          {isRoll && (
            <div className="absolute inset-y-0 w-12 border-x border-dashed border-zinc-700/40 bg-zinc-800/10 pointer-events-none" />
          )}
          <svg width={svgW} height={svgH} className="overflow-visible">
            {/* Draw backing paper sheet */}
            <rect
              x={(svgW - sheetW_px) / 2}
              y={(svgH - (isRoll ? sheetH_px * 2 + gapY_px : sheetH_px)) / 2}
              width={sheetW_px}
              height={isRoll ? sheetH_px * 2 + gapY_px : sheetH_px}
              fill="#ffffff"
              stroke="#e4e4e7"
              strokeWidth="1.5"
              rx="2"
            />
            {/* Draw nested labels grid */}
            <g transform={`translate(${(svgW - sheetW_px) / 2}, ${(svgH - (isRoll ? sheetH_px * 2 + gapY_px : sheetH_px)) / 2})`}>
              {labels}
            </g>
          </svg>
        </div>
        <div className="mt-4 text-[9px] text-zinc-500 font-medium text-center space-y-1">
          <p>Sheet size: {Math.round(cal.sheetWidth)} × {Math.round(isRoll ? cal.sheetHeight * 2 : cal.sheetHeight)}mm</p>
          <p>Label size: {cal.labelWidth} × {cal.labelHeight}mm | Columns: {cal.columns}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto">
        
        {/* Left Visual Blueprint Column */}
        <div className="md:w-5/12 bg-zinc-900 p-6 flex flex-col justify-between border-r border-zinc-800 text-white">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[#5D5FEF] font-black uppercase text-[10px] tracking-widest font-mono">TSC TE244 Setup</span>
              <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 transition-colors">
                <X size={14} />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wide">Label Calibration</h2>
              <p className="text-xs text-zinc-400 mt-1">Configure layout, size, and print shifts to align physical thermal labels perfectly.</p>
            </div>
            
            {/* Steps indicator */}
            <div className="flex items-center space-x-2 pt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    s === step ? 'w-8 bg-[#5D5FEF]' : s < step ? 'w-3 bg-[#5D5FEF]/40' : 'w-3 bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="my-6 flex-1 flex items-center justify-center">
            {renderSVGVisualizer()}
          </div>

          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-center">
            A Town Luxuries Labeling Engine v2
          </div>
        </div>

        {/* Right Parameters Column */}
        <div className="md:w-7/12 p-8 flex flex-col justify-between overflow-y-auto h-full max-h-[90vh] md:max-h-[600px]">
          
          <div className="space-y-6">
            {/* Step 1: Layout Selection & Quick Presets */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-zinc-800 font-black uppercase text-xs tracking-wider">
                  <Layout size={15} className="text-[#5D5FEF]" /> Layout Style & Presets
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleChange('layoutMode', 'roll')}
                    className={`p-4 border text-left rounded-2xl transition-all ${
                      cal.layoutMode === 'roll'
                        ? 'border-[#5D5FEF] bg-[#5D5FEF]/5 text-black font-extrabold shadow-sm'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-500'
                    }`}
                  >
                    <span className="block text-xs uppercase font-black">Roll-Fed (Continuous)</span>
                    <span className="text-[10px] font-medium text-zinc-400 block mt-1">Single continuous roll of labels side-by-side (TSC standard).</span>
                  </button>
                  <button
                    onClick={() => handleChange('layoutMode', 'sheet')}
                    className={`p-4 border text-left rounded-2xl transition-all ${
                      cal.layoutMode === 'sheet'
                        ? 'border-[#5D5FEF] bg-[#5D5FEF]/5 text-black font-extrabold shadow-sm'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-500'
                    }`}
                  >
                    <span className="block text-xs uppercase font-black">Sheet-Fed (Grid Page)</span>
                    <span className="text-[10px] font-medium text-zinc-400 block mt-1">Pre-cut label grids on stationary sheets (e.g. A4 pages).</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">Quick Starter Presets</label>
                  <div className="grid grid-cols-1 gap-2">
                    {PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyPreset(p.calibration)}
                        className="w-full text-left px-4 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-all text-xs font-bold text-zinc-700 flex justify-between items-center"
                      >
                        <span>{p.name}</span>
                        <ChevronRight size={13} className="text-zinc-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Dimensions */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-800 font-black uppercase text-xs tracking-wider">
                  <Move size={15} className="text-[#5D5FEF]" /> Label Dimensions
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Label Width (mm)</label>
                    <input
                      type="number"
                      value={cal.labelWidth || ''}
                      onChange={(e) => handleChange('labelWidth', Math.max(5, Number(e.target.value)))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                      min="5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Label Height (mm)</label>
                    <input
                      type="number"
                      value={cal.labelHeight || ''}
                      onChange={(e) => handleChange('labelHeight', Math.max(5, Number(e.target.value)))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                      min="5"
                    />
                  </div>
                </div>

                {cal.layoutMode === 'sheet' && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Sheet Width (mm)</label>
                      <input
                        type="number"
                        value={cal.sheetWidth || ''}
                        onChange={(e) => handleChange('sheetWidth', Math.max(10, Number(e.target.value)))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                        min="10"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Sheet Height (mm)</label>
                      <input
                        type="number"
                        value={cal.sheetHeight || ''}
                        onChange={(e) => handleChange('sheetHeight', Math.max(10, Number(e.target.value)))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                        min="10"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Grid Configuration */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-800 font-black uppercase text-xs tracking-wider">
                  <Layout size={15} className="text-[#5D5FEF]" /> Layout Grid & Columns
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Columns (Labels Across)</label>
                    <input
                      type="number"
                      value={cal.columns || ''}
                      onChange={(e) => handleChange('columns', Math.max(1, Number(e.target.value)))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Rows per sheet/page</label>
                    <input
                      type="number"
                      disabled={cal.layoutMode === 'roll'}
                      value={cal.layoutMode === 'roll' ? 1 : cal.rowsPerSheet || ''}
                      onChange={(e) => handleChange('rowsPerSheet', Math.max(1, Number(e.target.value)))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Column Gap (gapX) (mm)</label>
                    <input
                      type="number"
                      value={cal.gapX || 0}
                      onChange={(e) => handleChange('gapX', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                      step="0.5"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Row Gap (gapY) (mm)</label>
                    <input
                      type="number"
                      value={cal.gapY || 0}
                      onChange={(e) => handleChange('gapY', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                      step="0.5"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Margins & Alignments */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-800 font-black uppercase text-xs tracking-wider">
                  <Sliders size={15} className="text-[#5D5FEF]" /> Sheet Margins & Offsets
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Left Margin (mm)</label>
                    <input
                      type="number"
                      value={cal.marginLeft || 0}
                      onChange={(e) => handleChange('marginLeft', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                      step="0.5"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Top Margin (mm)</label>
                    <input
                      type="number"
                      value={cal.marginTop || 0}
                      onChange={(e) => handleChange('marginTop', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-[#f9fafb] border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold font-mono focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                      step="0.5"
                      min="0"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-4 space-y-4">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-800 font-black block">Thermal Printer Fine Tuning</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                          Horizontal Shift Offset
                        </label>
                        <span className="text-xs font-bold font-mono text-[#5D5FEF]">{cal.horizontalOffset}mm</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.2"
                        value={cal.horizontalOffset}
                        onChange={(e) => handleChange('horizontalOffset', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#5D5FEF]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                          Vertical Shift Offset
                        </label>
                        <span className="text-xs font-bold font-mono text-[#5D5FEF]">{cal.verticalOffset}mm</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.2"
                        value={cal.verticalOffset}
                        onChange={(e) => handleChange('verticalOffset', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#5D5FEF]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Test Print */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-800 font-black uppercase text-xs tracking-wider">
                  <Printer size={15} className="text-[#5D5FEF]" /> Print Alignment Verification
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  Before printing on expensive barcode stock, we highly recommend spooling a **Calibration Test Sheet**.
                </p>
                <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-xl p-3.5 leading-relaxed">
                  The test sheet prints red boxes corresponding to the outer margins, gaps, and dimensions of each label, along with center crosshair targets. Line it up with your physical roll to verify accuracy.
                </p>

                <button
                  onClick={onPrintTest}
                  className="px-5 py-3.5 bg-zinc-950 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer w-full shadow-md"
                >
                  <Printer size={14} /> Print Alignment Test Sheet
                </button>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="flex justify-between items-center pt-6 border-t border-zinc-100 mt-8">
            <button
              disabled={step === 1}
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} /> Back
            </button>

            {step < 5 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5"
              >
                Next <ChevronRight size={13} />
              </button>
            ) : (
              <button
                onClick={() => onSave(cal)}
                className="px-6 py-2.5 bg-[#5D5FEF] text-white hover:bg-[#4c4ddc] rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-md"
              >
                Apply & Save <Check size={14} />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

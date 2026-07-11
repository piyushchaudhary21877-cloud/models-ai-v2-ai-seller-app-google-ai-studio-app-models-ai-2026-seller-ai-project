/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sliders, RotateCw, Maximize2, Layers, HelpCircle, AlignCenter, Target, Move, Zap, Type, RefreshCw, Sparkles, FlipHorizontal, FlipVertical, Eye, EyeOff, Lock, ChevronUp, ChevronDown, GripVertical, Grid, BookOpen, ArrowRight, ArrowLeft, Check, X, Lightbulb, CheckCircle2 } from "lucide-react";
import { LogoTransform, BackgroundRemovalSettings, MockupScene, PunchlineSettings } from "../types";
import { ProductPreset } from "../data/templates";

interface ControlPanelProps {
  transform: LogoTransform;
  onTransformChange: (transform: LogoTransform) => void;
  bgRemoval: BackgroundRemovalSettings;
  onBgRemovalChange: (bgRemoval: BackgroundRemovalSettings) => void;
  logoSelected: boolean;
  product?: ProductPreset;
  customScene?: MockupScene | null;
  isQuickPreview: boolean;
  setIsQuickPreview: (val: boolean) => void;
  isAdjusting: boolean;
  setIsAdjusting: (val: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (val: boolean) => void;
  punchline: PunchlineSettings;
  onPunchlineChange: (settings: PunchlineSettings) => void;
}

export default function ControlPanel({
  transform,
  onTransformChange,
  bgRemoval,
  onBgRemovalChange,
  logoSelected,
  product,
  customScene,
  isQuickPreview,
  setIsQuickPreview,
  isAdjusting,
  setIsAdjusting,
  snapToGrid,
  setSnapToGrid,
  punchline,
  onPunchlineChange,
}: ControlPanelProps) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [showBgRemovalGuide, setShowBgRemovalGuide] = React.useState(false);
  const [guideStep, setGuideStep] = React.useState(1);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (id === "background") {
      e.preventDefault();
      return;
    }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (targetId === "background") return;
    if (draggedId && draggedId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (targetId === "background") return;
    if (draggedId && draggedId !== targetId) {
      if (draggedId === "slogan" && targetId === "logo") {
        handlePunchlineChange("layerIndex", "below");
        notify("Moved Slogan below Graphic Logo", "info");
      } else if (draggedId === "logo" && targetId === "slogan") {
        handlePunchlineChange("layerIndex", "above");
        notify("Moved Slogan above Graphic Logo", "info");
      }
    }
    setDraggedId(null);
  };

  const handleMoveLayer = (id: string, direction: "up" | "down") => {
    if (id === "slogan") {
      if (direction === "down" && punchline.layerIndex !== "below") {
        handlePunchlineChange("layerIndex", "below");
        notify("Moved Slogan below Graphic Logo", "info");
      } else if (direction === "up" && punchline.layerIndex === "below") {
        handlePunchlineChange("layerIndex", "above");
        notify("Moved Slogan above Graphic Logo", "info");
      }
    } else if (id === "logo") {
      if (direction === "up" && punchline.layerIndex !== "below") {
        handlePunchlineChange("layerIndex", "below");
        notify("Moved Graphic Logo above Slogan", "info");
      } else if (direction === "down" && punchline.layerIndex === "below") {
        handlePunchlineChange("layerIndex", "above");
        notify("Moved Graphic Logo below Slogan", "info");
      }
    }
  };

  const handleToggleVisibility = (id: string, currentOpacity: number) => {
    if (id === "slogan") {
      const targetOpacity = currentOpacity > 0 ? 0 : 1.0;
      handlePunchlineChange("opacity", targetOpacity);
      notify(targetOpacity === 0 ? "Hidden Slogan Layer" : "Restored Slogan Layer", "info");
    } else if (id === "logo") {
      const targetOpacity = currentOpacity > 0 ? 0 : 1.0;
      handleTransformFieldChange("opacity", targetOpacity);
      notify(targetOpacity === 0 ? "Hidden Graphic Artwork Layer" : "Restored Graphic Artwork Layer", "info");
    }
  };
  
  const handleTransformFieldChange = <K extends keyof LogoTransform>(
    field: K,
    value: LogoTransform[K]
  ) => {
    let finalValue = value;
    if (snapToGrid) {
      if (field === "x" || field === "y") {
        finalValue = (Math.round((value as number) / 5) * 5) as any;
      } else if (field === "rotation") {
        finalValue = (Math.round((value as number) / 15) * 15) as any;
      }
    }
    
    onTransformChange({
      ...transform,
      [field]: finalValue,
    });
  };

  const handleBgRemovalFieldChange = <K extends keyof BackgroundRemovalSettings>(
    field: K,
    value: BackgroundRemovalSettings[K]
  ) => {
    onBgRemovalChange({
      ...bgRemoval,
      [field]: value,
    });
  };

  const handlePunchlineChange = <K extends keyof PunchlineSettings>(
    field: K,
    value: PunchlineSettings[K]
  ) => {
    onPunchlineChange({
      ...punchline,
      [field]: value,
    });
  };

  const notify = (text: string, type: "undo" | "redo" | "save" | "info") => {
    const event = new CustomEvent("merch-mockup-notification", {
      detail: { text, type },
    });
    window.dispatchEvent(event);
  };

  const handleAlignToGarment = () => {
    const printArea = customScene
      ? { x: 20, y: 20, width: 60, height: 60 }
      : product
      ? product.printArea
      : { x: 30, y: 25, width: 40, height: 45 };

    const printAreaCenterX = printArea.x + printArea.width / 2;
    const printAreaCenterY = printArea.y + printArea.height / 2;

    const targetX = ((50 - printAreaCenterX) * 100) / printArea.width;
    const targetY = ((50 - printAreaCenterY) * 100) / printArea.height;

    onTransformChange({
      ...transform,
      x: Math.round(targetX * 100) / 100,
      y: Math.round(targetY * 100) / 100,
    });
    notify("Aligned Logo to Garment Center", "info");
  };

  const handleAlignToPrintArea = () => {
    onTransformChange({
      ...transform,
      x: 0,
      y: 0,
    });
    notify("Centered Logo in Print Box", "info");
  };

  const blendModes: { value: GlobalCompositeOperation; label: string }[] = [
    { value: "source-over", label: "Normal (Solid overlay)" },
    { value: "multiply", label: "Multiply (Blends with fabric fibers)" },
    { value: "screen", label: "Screen (Best for white prints on dark)" },
    { value: "overlay", label: "Overlay (Contrast blend)" },
  ];

  const activeLayers: any[] = [];
  
  if (punchline.text && punchline.text.trim().length > 0) {
    activeLayers.push({
      id: "slogan",
      name: `Slogan: "${punchline.text.length > 15 ? punchline.text.substring(0, 15) + "..." : punchline.text}"`,
      type: "text",
      icon: <Type className="h-3.5 w-3.5 text-amber-500" />,
      opacity: punchline.opacity,
      depth: punchline.layerIndex === "below" ? 1 : 2,
    });
  }
  
  if (logoSelected) {
    activeLayers.push({
      id: "logo",
      name: "Graphic Artwork",
      type: "image",
      icon: <Sparkles className="h-3.5 w-3.5 text-blue-400" />,
      opacity: transform.opacity,
      depth: punchline.layerIndex === "below" ? 2 : 1,
    });
  }

  activeLayers.push({
    id: "background",
    name: customScene ? "AI Custom Backdrop" : `${product?.name || "Garment"} Base`,
    type: "background",
    icon: <Grid className="h-3.5 w-3.5 text-zinc-500" />,
    opacity: 1,
    depth: 0,
    isLocked: true,
  });

  activeLayers.sort((a, b) => b.depth - a.depth);

  return (
    <div className="space-y-6 animate-fadeIn" id="controls-panel">
      {/* Quick Preview Toggle Card */}
      <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1.5">
            <Zap className={`h-3.5 w-3.5 ${isQuickPreview ? "text-amber-400 fill-amber-400 animate-pulse" : "text-zinc-500"}`} />
            <p className="text-xs font-semibold text-zinc-200">Quick Preview (Fast Render)</p>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Disables expensive composite blend modes and custom image backdrops temporarily for lag-free adjustments.
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0 ml-2">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isQuickPreview}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsQuickPreview(checked);
                notify(
                  `Quick Preview: ${checked ? "ENABLED (Fast Render)" : "DISABLED (High Quality)"}`,
                  "info"
                );
              }}
              className="sr-only peer"
              id="quick-preview-toggle"
            />
            <div className="w-9 h-5 bg-zinc-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-850 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-white"></div>
          </label>
          <span className="text-[8px] font-mono text-zinc-600 mt-1 uppercase tracking-wider">[Ctrl+K]</span>
        </div>
      </div>

      {/* Visual Layer Depth & Arrangement Manager */}
      <div className="border border-white/5 bg-zinc-950/40 rounded-xl p-4 space-y-3.5" id="design-layers-manager">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center space-x-2">
            <Layers className="h-4 w-4 text-emerald-500" />
            <h3 className="text-[11px] uppercase tracking-widest text-zinc-300 font-extrabold">Active Design Layers</h3>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-widest font-bold">
            Arrangement
          </span>
        </div>

        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Drag & drop layers to reorder depth, toggle visibility (eye), or view lock states. Top-most items render in front.
        </p>

        <div className="space-y-1.5">
          {activeLayers.map((layer) => {
            const isSlogan = layer.id === "slogan";
            const isLogo = layer.id === "logo";
            const isBackground = layer.id === "background";
            const isDragOver = dragOverId === layer.id;
            
            return (
              <div
                key={layer.id}
                draggable={!isBackground}
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={(e) => handleDragOver(e, layer.id)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, layer.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all select-none ${
                  isBackground
                    ? "bg-zinc-900/30 border-white/5 opacity-60"
                    : draggedId === layer.id
                    ? "bg-zinc-800/80 border-emerald-500/40 opacity-50 scale-[0.98]"
                    : isDragOver
                    ? "bg-zinc-800 border-emerald-400/60 scale-[1.01]"
                    : "bg-zinc-900/60 border-white/5 hover:border-zinc-850 hover:bg-zinc-850/40"
                }`}
                id={`layer-item-${layer.id}`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  {/* Drag Handle */}
                  {!isBackground ? (
                    <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors">
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="w-3.5" />
                  )}

                  {/* Icon */}
                  <div className="shrink-0 p-1 bg-zinc-900 border border-white/5 rounded">
                    {layer.icon}
                  </div>

                  {/* Name */}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide truncate">
                      {layer.name}
                    </p>
                    <p className="text-[8px] font-mono text-zinc-500">
                      {isBackground ? "BASE DEPTH" : isSlogan && layer.depth === 2 ? "DEPTH: FRONT (Z-INDEX: 2)" : isLogo && layer.depth === 2 ? "DEPTH: FRONT (Z-INDEX: 2)" : "DEPTH: BACK (Z-INDEX: 1)"}
                    </p>
                  </div>
                </div>

                {/* Layer Actions */}
                <div className="flex items-center space-x-1 shrink-0">
                  {!isBackground ? (
                    <>
                      {/* Move Up Button */}
                      <button
                        type="button"
                        onClick={() => handleMoveLayer(layer.id, "up")}
                        disabled={(isSlogan && punchline.layerIndex !== "below") || (isLogo && punchline.layerIndex === "below")}
                        className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition-colors cursor-pointer border-0"
                        title="Move Up"
                        id={`layer-${layer.id}-move-up`}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>

                      {/* Move Down Button */}
                      <button
                        type="button"
                        onClick={() => handleMoveLayer(layer.id, "down")}
                        disabled={(isSlogan && punchline.layerIndex === "below") || (isLogo && punchline.layerIndex !== "below")}
                        className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition-colors cursor-pointer border-0"
                        title="Move Down"
                        id={`layer-${layer.id}-move-down`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(layer.id, layer.opacity)}
                        className={`p-1 rounded transition-colors cursor-pointer border-0 ${
                          layer.opacity === 0
                            ? "text-red-400 hover:bg-red-500/10"
                            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                        title={layer.opacity === 0 ? "Show Layer" : "Hide Layer"}
                        id={`layer-${layer.id}-toggle-visibility`}
                      >
                        {layer.opacity === 0 ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </>
                  ) : (
                    <div className="p-1 text-zinc-600" title="Locked Base Layer" id="layer-background-locked">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Brand Slogan / Punchline Message Toolkit */}
      <div className="border border-white/5 bg-zinc-950/40 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center space-x-2">
            <Type className="h-4 w-4 text-amber-500" />
            <h3 className="text-[11px] uppercase tracking-widest text-zinc-300 font-extrabold">Brand Slogan / Slogan</h3>
          </div>
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-widest font-bold">
            Typography
          </span>
        </div>

        {/* Text Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Custom Punchline Message</label>
          <div className="relative">
            <input
              type="text"
              value={punchline.text}
              onChange={(e) => handlePunchlineChange("text", e.target.value)}
              placeholder="e.g. BORN TO ADVENTURE"
              className="w-full text-xs border border-white/10 rounded-lg p-2.5 bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500 text-white placeholder-zinc-600 font-medium"
            />
            {punchline.text && (
              <button
                type="button"
                onClick={() => handlePunchlineChange("text", "")}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-850 px-1.5 py-0.5 rounded cursor-pointer border-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {punchline.text && (
          <div className="space-y-4 animate-fadeIn">
            {/* Font Family Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Aesthetic Typeface</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: "sans", label: "Inter (Bold)", style: "font-sans font-bold" },
                  { value: "serif", label: "Playfair (Retro)", style: "font-serif italic" },
                  { value: "mono", label: "JetBrains (Tech)", style: "font-mono" },
                  { value: "grotesk", label: "Grotesk (Impact)", style: "font-sans font-black tracking-tight" },
                  { value: "handwritten", label: "Cursive (Warm)", style: "italic" }
                ].map((font) => {
                  const isSelected = punchline.fontFamily === font.value;
                  return (
                    <button
                      key={font.value}
                      type="button"
                      onClick={() => handlePunchlineChange("fontFamily", font.value as any)}
                      className={`flex items-center justify-between py-2 px-2.5 rounded-lg text-[9px] uppercase tracking-wider text-left border cursor-pointer select-none focus:outline-none transition-all ${
                        isSelected
                          ? "bg-amber-600/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/5"
                          : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-850"
                      }`}
                    >
                      <span className={font.style}>{font.label}</span>
                      <span className={`text-lg ${font.style} ${isSelected ? 'text-amber-400' : 'text-zinc-500'} normal-case tracking-normal`}>Ag</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layout Options: Uppercase & Color preset */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Uppercase Toggle */}
              <div className="flex items-center justify-between bg-zinc-900/60 border border-white/5 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Uppercase</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={punchline.uppercase}
                    onChange={(e) => handlePunchlineChange("uppercase", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-zinc-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-850 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-white"></div>
                </label>
              </div>

              {/* Text Color Selection */}
              <div className="flex flex-col justify-center bg-zinc-900/60 border border-white/5 rounded-xl p-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center mb-1">Color palette</span>
                <div className="flex items-center justify-center space-x-1">
                  {[
                    "#ffffff",
                    "#121212",
                    "#3b82f6",
                    "#f97316",
                    "#ef4444",
                    "#eab308"
                  ].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => handlePunchlineChange("color", hex)}
                      className={`h-4.5 w-4.5 rounded-full border border-black/50 cursor-pointer transition-transform ${
                        punchline.color.toLowerCase() === hex.toLowerCase() ? "scale-125 ring-1 ring-amber-500" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                  <input
                    type="color"
                    value={punchline.color}
                    onChange={(e) => handlePunchlineChange("color", e.target.value)}
                    className="w-4.5 h-4.5 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                    title="Custom Color Picker"
                  />
                </div>
              </div>
            </div>

            {/* Layer Index */}
            <div className="flex items-center justify-between bg-zinc-900/60 border border-white/5 rounded-xl p-2.5">
              <div className="flex items-center space-x-1.5">
                <Layers className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Placement Layer</span>
              </div>
              <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                <button
                  type="button"
                  onClick={() => handlePunchlineChange("layerIndex", "above")}
                  className={`px-3 py-1 text-[9px] uppercase font-bold tracking-wider rounded-md transition-colors ${
                    punchline.layerIndex !== "below"
                      ? "bg-amber-500/20 text-amber-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Top
                </button>
                <button
                  type="button"
                  onClick={() => handlePunchlineChange("layerIndex", "below")}
                  className={`px-3 py-1 text-[9px] uppercase font-bold tracking-wider rounded-md transition-colors ${
                    punchline.layerIndex === "below"
                      ? "bg-blue-500/20 text-blue-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Behind
                </button>
              </div>
            </div>

            {/* Arch Curvature strength (Circular Text) */}
            <div className="space-y-1.5 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <span className="flex items-center">
                  <RefreshCw className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Arch Curvature
                </span>
                <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
                  {punchline.arcStrength === 0
                    ? "Straight"
                    : punchline.arcStrength < 0
                    ? `Arch Up (${Math.abs(punchline.arcStrength)}%)`
                    : `Arch Down (${punchline.arcStrength}%)`}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={punchline.arcStrength}
                onChange={(e) => handlePunchlineChange("arcStrength", parseInt(e.target.value))}
                onMouseDown={() => setIsAdjusting(true)}
                onMouseUp={() => setIsAdjusting(false)}
                onTouchStart={() => setIsAdjusting(true)}
                onTouchEnd={() => setIsAdjusting(false)}
                className="w-full slider-input cursor-pointer"
              />
              <p className="text-[8px] text-zinc-500 leading-normal">
                Curvatures create iconic college jacket or vintage badge styles easily!
              </p>
            </div>

            {/* Typography Sizing & Tracking */}
            <div className="grid grid-cols-2 gap-3.5 border-t border-white/5 pt-3">
              {/* Font Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Size</span>
                  <span className="font-mono text-[9px] text-zinc-300">{punchline.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="70"
                  step="1"
                  value={punchline.fontSize}
                  onChange={(e) => handlePunchlineChange("fontSize", parseInt(e.target.value))}
                  onMouseDown={() => setIsAdjusting(true)}
                  onMouseUp={() => setIsAdjusting(false)}
                  onTouchStart={() => setIsAdjusting(true)}
                  onTouchEnd={() => setIsAdjusting(false)}
                  className="w-full slider-input cursor-pointer"
                />
              </div>

              {/* Letter Spacing */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Letter Spacing</span>
                  <span className="font-mono text-[9px] text-zinc-300">+{punchline.tracking}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="1"
                  value={punchline.tracking}
                  onChange={(e) => handlePunchlineChange("tracking", parseInt(e.target.value))}
                  onMouseDown={() => setIsAdjusting(true)}
                  onMouseUp={() => setIsAdjusting(false)}
                  onTouchStart={() => setIsAdjusting(true)}
                  onTouchEnd={() => setIsAdjusting(false)}
                  className="w-full slider-input cursor-pointer"
                />
              </div>
            </div>

            {/* Position Offsets (X / Y) */}
            <div className="grid grid-cols-2 gap-3.5 border-t border-white/5 pt-3">
              {/* Horizontal Position X */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Horizontal (X)</span>
                  <span className="font-mono text-[9px] text-zinc-300">{punchline.offsetX > 0 ? `+${punchline.offsetX}%` : `${punchline.offsetX}%`}</span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="2"
                  value={punchline.offsetX}
                  onChange={(e) => handlePunchlineChange("offsetX", parseInt(e.target.value))}
                  onMouseDown={() => setIsAdjusting(true)}
                  onMouseUp={() => setIsAdjusting(false)}
                  onTouchStart={() => setIsAdjusting(true)}
                  onTouchEnd={() => setIsAdjusting(false)}
                  className="w-full slider-input cursor-pointer"
                />
              </div>

              {/* Vertical Position Y */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Vertical (Y)</span>
                  <span className="font-mono text-[9px] text-zinc-300">{punchline.offsetY > 0 ? `+${punchline.offsetY}%` : `${punchline.offsetY}%`}</span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="2"
                  value={punchline.offsetY}
                  onChange={(e) => handlePunchlineChange("offsetY", parseInt(e.target.value))}
                  onMouseDown={() => setIsAdjusting(true)}
                  onMouseUp={() => setIsAdjusting(false)}
                  onTouchStart={() => setIsAdjusting(true)}
                  onTouchEnd={() => setIsAdjusting(false)}
                  className="w-full slider-input cursor-pointer"
                />
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-1.5 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Text Opacity</span>
                <span className="font-mono text-[9px] text-zinc-300">{Math.round(punchline.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={punchline.opacity}
                onChange={(e) => handlePunchlineChange("opacity", parseFloat(e.target.value))}
                onMouseDown={() => setIsAdjusting(true)}
                onMouseUp={() => setIsAdjusting(false)}
                onTouchStart={() => setIsAdjusting(true)}
                onTouchEnd={() => setIsAdjusting(false)}
                className="w-full slider-input cursor-pointer"
              />
            </div>

            {/* Quick Slogan Reset button */}
            <button
              type="button"
              onClick={() => {
                onPunchlineChange({
                  text: punchline.text,
                  fontFamily: "sans",
                  fontSize: 24,
                  color: "#ffffff",
                  offsetX: 0,
                  offsetY: 40,
                  tracking: 4,
                  opacity: 1,
                  rotation: 0,
                  arcStrength: 0,
                  uppercase: true,
                });
                notify("Reset slogan styles to default values", "info");
              }}
              className="w-full py-2 bg-zinc-900 border border-white/5 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all select-none focus:outline-none cursor-pointer text-center"
            >
              Reset Slogan Formatting
            </button>
          </div>
        )}
      </div>

      {/* Logo Section */}
      {logoSelected ? (
        <div className="space-y-6">
          {/* Transformation Sliders */}
          <div className="space-y-5 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Sliders className="h-4 w-4 text-zinc-500" />
                <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Logo Placement Controls</h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Snap Grid</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                  />
                  <motion.div 
                    layout
                    initial={false}
                    animate={{
                      backgroundColor: snapToGrid ? "rgba(245, 158, 11, 0.2)" : "#18181b",
                      borderColor: snapToGrid ? "rgba(245, 158, 11, 0.5)" : "rgba(255, 255, 255, 0.1)",
                      scale: snapToGrid ? 1.05 : 1
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-7 h-4 rounded-full border flex items-center px-[1px]"
                  >
                    <motion.div 
                      layout
                      animate={{
                        x: snapToGrid ? 12 : 0,
                        backgroundColor: snapToGrid ? "#f59e0b" : "#a1a1aa",
                        borderColor: snapToGrid ? "#f59e0b" : "#d1d5db"
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="h-3 w-3 rounded-full border"
                    />
                  </motion.div>
                </label>
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span className="flex items-center"><Maximize2 className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Print Size</span>
            <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
              {Math.round(transform.scale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={transform.scale}
            onChange={(e) => handleTransformFieldChange("scale", parseFloat(e.target.value))}
            onMouseDown={() => setIsAdjusting(true)}
            onMouseUp={() => setIsAdjusting(false)}
            onTouchStart={() => setIsAdjusting(true)}
            onTouchEnd={() => setIsAdjusting(false)}
            className="w-full slider-input cursor-pointer"
          />
        </div>

        {/* Rotation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span className="flex items-center"><RotateCw className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Rotate Angle</span>
            <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
              {transform.rotation}°
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={transform.rotation}
            onChange={(e) => handleTransformFieldChange("rotation", parseInt(e.target.value))}
            onMouseDown={() => setIsAdjusting(true)}
            onMouseUp={() => setIsAdjusting(false)}
            onTouchStart={() => setIsAdjusting(true)}
            onTouchEnd={() => setIsAdjusting(false)}
            className="w-full slider-input cursor-pointer"
          />
        </div>

        {/* Skew X */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold tracking-wide">
            <span className="flex items-center">Skew X (Wrap)</span>
            <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
              {transform.skewX || 0}°
            </span>
          </div>
          <input
            type="range"
            min="-45"
            max="45"
            step="1"
            value={transform.skewX || 0}
            onChange={(e) => handleTransformFieldChange("skewX", parseInt(e.target.value))}
            onMouseDown={() => setIsAdjusting(true)}
            onMouseUp={() => setIsAdjusting(false)}
            onTouchStart={() => setIsAdjusting(true)}
            onTouchEnd={() => setIsAdjusting(false)}
            className="w-full slider-input cursor-pointer"
          />
        </div>

        {/* Skew Y */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold tracking-wide">
            <span className="flex items-center">Skew Y (Perspective)</span>
            <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
              {transform.skewY || 0}°
            </span>
          </div>
          <input
            type="range"
            min="-45"
            max="45"
            step="1"
            value={transform.skewY || 0}
            onChange={(e) => handleTransformFieldChange("skewY", parseInt(e.target.value))}
            onMouseDown={() => setIsAdjusting(true)}
            onMouseUp={() => setIsAdjusting(false)}
            onTouchStart={() => setIsAdjusting(true)}
            onTouchEnd={() => setIsAdjusting(false)}
            className="w-full slider-input cursor-pointer"
          />
        </div>

        {/* Opacity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>Ink Density (Opacity)</span>
            <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
              {Math.round(transform.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={transform.opacity}
            onChange={(e) => handleTransformFieldChange("opacity", parseFloat(e.target.value))}
            onMouseDown={() => setIsAdjusting(true)}
            onMouseUp={() => setIsAdjusting(false)}
            onTouchStart={() => setIsAdjusting(true)}
            onTouchEnd={() => setIsAdjusting(false)}
            className="w-full slider-input cursor-pointer"
          />
        </div>

        {/* Horizontal Offset (X) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span className="flex items-center"><Move className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Horizontal Offset (X)</span>
            <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
              {transform.x > 0 ? `+${Math.round(transform.x)}%` : `${Math.round(transform.x)}%`}
            </span>
          </div>
          <input
            type="range"
            min="-120"
            max="120"
            step="1"
            value={transform.x}
            onChange={(e) => handleTransformFieldChange("x", parseInt(e.target.value))}
            onMouseDown={() => setIsAdjusting(true)}
            onMouseUp={() => setIsAdjusting(false)}
            onTouchStart={() => setIsAdjusting(true)}
            onTouchEnd={() => setIsAdjusting(false)}
            className="w-full slider-input cursor-pointer"
          />
        </div>

        {/* Vertical Offset (Y) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span className="flex items-center"><Move className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Vertical Offset (Y)</span>
            <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
              {transform.y > 0 ? `+${Math.round(transform.y)}%` : `${Math.round(transform.y)}%`}
            </span>
          </div>
          <input
            type="range"
            min="-120"
            max="120"
            step="1"
            value={transform.y}
            onChange={(e) => handleTransformFieldChange("y", parseInt(e.target.value))}
            onMouseDown={() => setIsAdjusting(true)}
            onMouseUp={() => setIsAdjusting(false)}
            onTouchStart={() => setIsAdjusting(true)}
            onTouchEnd={() => setIsAdjusting(false)}
            className="w-full slider-input cursor-pointer"
          />
        </div>

        {/* Orientation Mirroring */}
        <div className="space-y-2.5 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Orientation Mirroring</span>
            <span className="text-[8px] text-zinc-400 bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">Flip Logo</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                handleTransformFieldChange("flipX", !transform.flipX);
                notify(!transform.flipX ? "Flipped logo horizontally" : "Reset horizontal flip", "info");
              }}
              className={`py-2 px-3 text-[10px] font-bold border rounded-lg uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-md focus:outline-none cursor-pointer select-none ${
                transform.flipX
                  ? "bg-amber-500/15 border-amber-500/60 text-amber-400 shadow-md shadow-amber-500/5"
                  : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-850 hover:border-zinc-700"
              }`}
              title="Flip logo horizontally (mirror image)"
              id="flip-horizontal-btn"
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
              <span>Flip X</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleTransformFieldChange("flipY", !transform.flipY);
                notify(!transform.flipY ? "Flipped logo vertically" : "Reset vertical flip", "info");
              }}
              className={`py-2 px-3 text-[10px] font-bold border rounded-lg uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-md focus:outline-none cursor-pointer select-none ${
                transform.flipY
                  ? "bg-amber-500/15 border-amber-500/60 text-amber-400 shadow-md shadow-amber-500/5"
                  : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-850 hover:border-zinc-700"
              }`}
              title="Flip logo vertically (upside down)"
              id="flip-vertical-btn"
            >
              <FlipVertical className="h-3.5 w-3.5" />
              <span>Flip Y</span>
            </button>
          </div>
        </div>

        {/* Quick Position Anchors */}
        <div className="space-y-2.5 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Quick Position Anchors</span>
            <span className="text-[8px] text-zinc-400 bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">Layout Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Pocket Left", x: -45, y: -40, scale: 0.45, rotation: 0, opacity: transform.opacity, blendMode: transform.blendMode, smartCrop: false, skewX: 0, skewY: 0 },
              { label: "Center Chest", x: 0, y: -20, scale: 1.0, rotation: 0, opacity: transform.opacity, blendMode: transform.blendMode, smartCrop: false, skewX: 0, skewY: 0 },
              { label: "Full Oversized", x: 0, y: 0, scale: 1.5, rotation: 0, opacity: transform.opacity, blendMode: transform.blendMode, smartCrop: false, skewX: 0, skewY: 0 },
              { label: "Lower Right", x: 45, y: 55, scale: 0.5, rotation: 0, opacity: transform.opacity, blendMode: transform.blendMode, smartCrop: false, skewX: 0, skewY: 0 },
              { label: "Sleeve Print", x: -85, y: 15, scale: 0.4, rotation: 0, opacity: transform.opacity, blendMode: transform.blendMode, smartCrop: false, skewX: 0, skewY: 0 },
              { label: "Reset Standard", x: 0, y: 0, scale: 0.85, rotation: 0, opacity: transform.opacity, blendMode: transform.blendMode, smartCrop: false, skewX: 0, skewY: 0 }
            ].map((preset) => {
              const isSelected = 
                transform.x === preset.x &&
                transform.y === preset.y &&
                transform.scale === preset.scale;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onTransformChange({
                      ...transform,
                      ...preset,
                      flipX: preset.label === "Reset Standard" ? false : (transform.flipX || false),
                      flipY: preset.label === "Reset Standard" ? false : (transform.flipY || false),
                    });
                    notify(`Snapped layout to ${preset.label}`, "info");
                  }}
                  className={`py-2 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-center border cursor-pointer select-none focus:outline-none transition-all ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500/80 text-blue-400 shadow-md shadow-blue-500/5"
                      : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-850 hover:border-zinc-700"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto-Align & Snapping */}
        <div className="space-y-2.5 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Auto-Align & Snapping</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAlignToGarment}
              className="py-2.5 px-3 text-[10px] font-bold border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white rounded-lg uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-md focus:outline-none cursor-pointer"
              title="Snap logo center to the absolute center of the garment / product image (50%, 50%)"
              id="align-garment-btn"
            >
              <AlignCenter className="h-3.5 w-3.5" />
              <span>Center Garment</span>
            </button>
            <button
              onClick={handleAlignToPrintArea}
              className="py-2.5 px-3 text-[10px] font-bold border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded-lg uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-md focus:outline-none cursor-pointer"
              title="Snap logo center to the center of the print area (0, 0)"
              id="align-print-btn"
            >
              <Target className="h-3.5 w-3.5" />
              <span>Center Print Box</span>
            </button>
          </div>
        </div>

        {/* Smart Crop & Clipping */}
        <div className="space-y-2.5 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Smart Crop & Clipping</span>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[8px] font-extrabold px-1 rounded uppercase tracking-wider">SMART</span>
            </div>
          </div>
          <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-zinc-200">Clip to Print Area</p>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Centers and clips the logo boundary strictly within the product's printable area.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none ml-2 shrink-0">
              <input
                type="checkbox"
                checked={transform.smartCrop || false}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  if (isChecked) {
                    onTransformChange({
                      ...transform,
                      smartCrop: true,
                      x: 0,
                      y: 0,
                    });
                    notify("Smart Crop Enabled: Logo Centered & Clipped", "info");
                  } else {
                    onTransformChange({
                      ...transform,
                      smartCrop: false,
                    });
                    notify("Smart Crop Disabled", "info");
                  }
                }}
                className="sr-only peer"
                id="smart-crop-toggle"
              />
              <div className="w-9 h-5 bg-zinc-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-850 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
            </label>
          </div>
        </div>

        {/* Blend Modes */}
        <div className="space-y-2 border-t border-white/5 pt-4">
          <div className="flex items-center space-x-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
            <span>Fabric Blending & Shading</span>
          </div>
          <select
            value={transform.blendMode}
            onChange={(e) => handleTransformFieldChange("blendMode", e.target.value as GlobalCompositeOperation)}
            className="w-full text-xs border border-white/10 rounded-lg p-2.5 bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
          >
            {blendModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Texture Overlays */}
        <div className="space-y-3.5 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <Grid className="h-3.5 w-3.5 text-zinc-500" />
              <span>Print Texture Overlay</span>
            </div>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
              Realistic
            </span>
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Apply physical fabric finishes or distressed cracked paint textures to give printed graphics an authentic apparel feel.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "none", label: "Clean / Solid", desc: "No texture" },
              { id: "grain", label: "Fine Grain", desc: "Canvas fiber" },
              { id: "heather", label: "Heather", desc: "Horizontal streak" },
              { id: "distressed", label: "Distressed", desc: "Vintage crackle" }
            ].map((tex) => {
              const isSelected = (transform.textureType || "none") === tex.id;
              return (
                <button
                  key={tex.id}
                  type="button"
                  onClick={() => {
                    handleTransformFieldChange("textureType", tex.id as any);
                    notify(
                      tex.id === "none"
                        ? "Removed design texture overlay"
                        : `Applied ${tex.label} texture overlay`,
                      "info"
                    );
                  }}
                  className={`p-2 rounded-xl text-left border cursor-pointer select-none focus:outline-none transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/60 text-amber-400 shadow-md shadow-amber-500/5"
                      : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-850 hover:border-zinc-700"
                  }`}
                  title={`${tex.label}: ${tex.desc}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">{tex.label}</span>
                  <span className="text-[8px] text-zinc-500 font-medium lowercase truncate mt-0.5">{tex.desc}</span>
                </button>
              );
            })}
          </div>

          {transform.textureType && transform.textureType !== "none" && (
            <div className="space-y-1.5 pt-1 animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Texture Intensity</span>
                <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
                  {Math.round((transform.textureIntensity || 0.35) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={transform.textureIntensity || 0.35}
                onChange={(e) => handleTransformFieldChange("textureIntensity", parseFloat(e.target.value))}
                onMouseDown={() => setIsAdjusting(true)}
                onMouseUp={() => setIsAdjusting(false)}
                onTouchStart={() => setIsAdjusting(true)}
                onTouchEnd={() => setIsAdjusting(false)}
                className="w-full slider-input cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Background Removal Toolkit */}
      <div className="border border-white/5 bg-zinc-950/40 rounded-xl p-4 space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-blue-500/10 rounded border border-blue-500/15 text-blue-400">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide uppercase">AI Magic Background Remover</span>
            <div className="group relative">
              <HelpCircle className="h-3.5 w-3.5 text-zinc-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-52 p-2.5 bg-zinc-900 border border-white/5 text-zinc-300 text-[10px] rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 leading-relaxed">
                Uses advanced color keying and feathering thresholds to automatically strip off solid background backdrops from your vector designs.
              </div>
            </div>
            <button
              onClick={() => {
                setShowBgRemovalGuide(true);
                setGuideStep(1);
              }}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/25 hover:border-blue-500/40 transition-all text-[9px] font-bold tracking-wider uppercase cursor-pointer shrink-0"
              title="Open Interactive Guide"
            >
              <BookOpen className="h-2.5 w-2.5 animate-pulse" />
              <span>How to use</span>
            </button>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bgRemoval.enabled}
              onChange={(e) => handleBgRemovalFieldChange("enabled", e.target.checked)}
              className="sr-only peer"
              id="bg-removal-toggle"
            />
            <div className="w-9 h-5 bg-zinc-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-850 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
          </label>
        </div>

        {bgRemoval.enabled && (
          <div className="space-y-4 animate-fadeIn">
            {/* Target Color Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                Target Color to Erase
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["white", "black", "custom"] as const).map((colorOption) => (
                  <button
                    key={colorOption}
                    onClick={() => handleBgRemovalFieldChange("colorToKey", colorOption)}
                    className={`py-1.5 px-2 text-[10px] font-semibold border rounded-lg uppercase tracking-wider transition-all focus:outline-none ${
                      bgRemoval.colorToKey === colorOption
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {colorOption}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Key Picker */}
            {bgRemoval.colorToKey === "custom" && (
              <div className="flex items-center space-x-3 bg-zinc-900 p-2 border border-white/5 rounded-lg">
                <input
                  type="color"
                  value={bgRemoval.customColorHex}
                  onChange={(e) => handleBgRemovalFieldChange("customColorHex", e.target.value)}
                  className="w-8 h-8 rounded border border-white/10 p-0.5 cursor-pointer bg-transparent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-zinc-300">Custom Key Color</p>
                  <p className="font-mono text-[9px] text-zinc-500">{bgRemoval.customColorHex.toUpperCase()}</p>
                </div>
              </div>
            )}

            {/* Tolerance Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Erase Tolerance</span>
                <span className="font-mono bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
                  {bgRemoval.tolerance}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={bgRemoval.tolerance}
                onChange={(e) => handleBgRemovalFieldChange("tolerance", parseInt(e.target.value))}
                className="w-full slider-input cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
    ) : (
      <div className="border border-dashed border-white/10 bg-zinc-950/25 rounded-xl p-6 text-center text-zinc-500 space-y-2 mt-4">
        <Sliders className="h-6 w-6 mx-auto mb-1 text-zinc-600" />
        <p className="text-xs font-semibold text-zinc-300 font-bold">No Graphic Logo Selected</p>
        <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
          You can design and render custom brand slogans above independently, or select/upload a graphic logo from the "Logo" tab to unlock placement controls.
        </p>
      </div>
    )}

    {/* Background Removal Academy - Interactive Guide Modal */}
    {showBgRemovalGuide && (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn">
        <div className="relative bg-zinc-950 border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[95vh] text-zinc-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-zinc-900/40">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Background Removal Academy</h3>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Interactive Masterclass</p>
              </div>
            </div>
            <button
              onClick={() => setShowBgRemovalGuide(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 p-1.5 rounded-lg transition-all border-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper progress */}
          <div className="px-6 py-3 bg-zinc-900/10 border-b border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  onClick={() => setGuideStep(step)}
                  className={`h-5 w-5 rounded-full flex items-center justify-center font-bold transition-all border-0 cursor-pointer text-[10px] ${
                    guideStep === step
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : guideStep > step
                      ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/5"
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
            <span className="uppercase tracking-wider font-semibold text-zinc-400">
              {guideStep === 1 && "1. The Basics"}
              {guideStep === 2 && "2. Choosing Key Color"}
              {guideStep === 3 && "3. Erase Tolerance"}
              {guideStep === 4 && "4. Pro Preset Workflows"}
            </span>
          </div>

          {/* Step Content */}
          <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
            {guideStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-start space-x-3.5 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                  <Sparkles className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Strip Off Backdrop Frames</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      When you upload or select logo graphics, they often have solid, non-transparent background backdrops (such as white or black squares). This tool uses real-time canvas keying to automatically erase those backdrops, blending your design seamlessly into the garment texture!
                    </p>
                  </div>
                </div>

                {/* SVG Illustration of transparency */}
                <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-4 flex items-center justify-around">
                  <div className="text-center space-y-2">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Uploaded Image</p>
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center border border-white/10 shadow-inner relative overflow-hidden">
                      {/* Logo representation */}
                      <div className="text-zinc-950 font-black text-xs tracking-tighter uppercase font-sans border-2 border-zinc-950 p-1">LOGO</div>
                    </div>
                    <p className="text-[8px] text-zinc-600 uppercase font-mono">Solid background</p>
                  </div>

                  <div className="text-zinc-650 animate-pulse text-[10px] font-bold flex flex-col items-center">
                    <span>Remover</span>
                    <ArrowRight className="h-5 w-5 text-blue-500" />
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">On Fabric Backdrop</p>
                    {/* Checkered pattern indicating transparency, over red fabric background */}
                    <div className="w-20 h-20 bg-red-600 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:10px_10px]" />
                      <div className="text-white font-black text-xs tracking-tighter uppercase font-sans border-2 border-white p-1 z-10">LOGO</div>
                    </div>
                    <p className="text-[8px] text-emerald-400 font-bold uppercase font-mono">Perfectly blended</p>
                  </div>
                </div>
              </div>
            )}

            {guideStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-start space-x-3.5 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                  <Layers className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Keying Color Strategy</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      To successfully erase the background, choose the target key color that matches your design's solid backdrop:
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 bg-white border border-zinc-700 rounded" />
                      <span className="text-[10px] font-bold uppercase text-zinc-200 tracking-wider">White Keying (Default)</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed pl-5">
                      Best for pencil sketches, mockups exported with basic canvases, and standard light-mode designs.
                    </p>
                  </div>

                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 bg-black border border-zinc-700 rounded" />
                      <span className="text-[10px] font-bold uppercase text-zinc-200 tracking-wider">Black Keying</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed pl-5">
                      Best for dark-mode templates, neon graphics, nighttime illustrations, or glowing outlines on black backdrops.
                    </p>
                  </div>

                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 bg-gradient-to-tr from-pink-500 to-blue-500 rounded" />
                      <span className="text-[10px] font-bold uppercase text-zinc-200 tracking-wider">Custom Keying</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed pl-5">
                      Unlocks a color picker. Use this to erase custom shades (like neon green green-screens or pastel blue backgrounds).
                    </p>
                  </div>
                </div>

                {/* Quick interactive test controls */}
                <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-white/5 space-y-3">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Live Interactive Preview Sandbox</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-300">Current Key Color:</span>
                    <div className="flex items-center space-x-1.5">
                      {(["white", "black", "custom"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            onBgRemovalChange({
                              ...bgRemoval,
                              enabled: true,
                              colorToKey: opt,
                            });
                            notify(`Switched key color to ${opt}`, "info");
                          }}
                          className={`px-2.5 py-1 text-[9px] font-bold border rounded uppercase transition-all cursor-pointer ${
                            bgRemoval.colorToKey === opt
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10"
                              : "bg-zinc-950 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {guideStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-start space-x-3.5 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                  <Sliders className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Erase Tolerance Tuning</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Tolerance adjusts the range of colors erased near your key target. Low is tight, high is wide.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-zinc-900/40 p-3 rounded-lg border border-white/5 text-center space-y-1.5">
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest font-mono block">5% - 20%</span>
                    <p className="text-[10px] font-bold text-zinc-300 uppercase">TIGHT ACCURACY</p>
                    <p className="text-[9px] text-zinc-500 leading-relaxed">
                      Best for high-contrast digital graphics. Keeps artwork crisp.
                    </p>
                  </div>

                  <div className="bg-zinc-900/40 p-3 rounded-lg border border-white/5 text-center space-y-1.5">
                    <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest font-mono block">25% - 40%</span>
                    <p className="text-[10px] font-bold text-zinc-300 uppercase">BALANCED SHADES</p>
                    <p className="text-[9px] text-zinc-500 leading-relaxed">
                      Great for standard PNG files with fuzzy anti-aliased outlines.
                    </p>
                  </div>

                  <div className="bg-zinc-900/40 p-3 rounded-lg border border-white/5 text-center space-y-1.5">
                    <span className="text-[9px] font-bold text-pink-400 uppercase tracking-widest font-mono block">45% - 80%</span>
                    <p className="text-[10px] font-bold text-zinc-300 uppercase">AGGRESSIVE ERASE</p>
                    <p className="text-[9px] text-zinc-500 leading-relaxed">
                      Best for scanned doodles or photos. Caution: can eat into design!
                    </p>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3.5 flex items-start space-x-2.5">
                  <Lightbulb className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-200 uppercase tracking-wide">The "Goldilocks" Golden Rule</p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      If tolerance is too low, you'll see ugly halos/borders. If too high, matching parts of your design will go transparent. Always start at <strong className="text-amber-400">15%</strong> and step upward incrementally!
                    </p>
                  </div>
                </div>

                {/* Interactive Tolerance Slider sandbox */}
                <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-300">
                    <span>Adjust Tolerance Live:</span>
                    <span className="font-mono bg-zinc-950 px-2 py-0.5 rounded text-pink-400 text-[10px]">
                      {bgRemoval.tolerance}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="1"
                    value={bgRemoval.tolerance}
                    onChange={(e) => {
                      onBgRemovalChange({
                        ...bgRemoval,
                        enabled: true,
                        tolerance: parseInt(e.target.value),
                      });
                    }}
                    className="w-full slider-input cursor-pointer"
                  />
                </div>
              </div>
            )}

            {guideStep === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-start space-x-3.5 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                  <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Instant Smart Workflows</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Skip manual slider guessing! Match your graphic's logo type and click to configure the workspace setup instantly.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      title: "1. Pristine Digital Vector (White BG)",
                      desc: "Best for high-quality SVG/PNG layouts exported with standard white canvas backgrounds.",
                      keyColor: "white",
                      toleranceVal: 15,
                      badge: "Tight Accuracy (15%)",
                      badgeStyle: "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    },
                    {
                      title: "2. Dark-mode Graphic Logo (Black BG)",
                      desc: "Best for glow styles, modern outline drawings, or dark illustrations on black.",
                      keyColor: "black",
                      toleranceVal: 15,
                      badge: "Tight Accuracy (15%)",
                      badgeStyle: "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    },
                    {
                      title: "3. Hand-drawn Paper Notebook Sketch",
                      desc: "Formulated to erase soft camera shadows, greyish paper hues, and scanned ink outlines.",
                      keyColor: "white",
                      toleranceVal: 38,
                      badge: "High Tolerance (38%)",
                      badgeStyle: "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    },
                    {
                      title: "4. Web Compressed Asset (Fuzzy JPEG)",
                      desc: "Blasts off annoying compression halo artifacts, pixelated borders, and gray noise.",
                      keyColor: "white",
                      toleranceVal: 48,
                      badge: "Aggressive Erase (48%)",
                      badgeStyle: "bg-pink-500/10 text-pink-400 border-pink-500/20"
                    }
                  ].map((preset, idx) => {
                    const isMatching = bgRemoval.enabled && bgRemoval.colorToKey === preset.keyColor && bgRemoval.tolerance === preset.toleranceVal;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                          isMatching
                            ? "bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/10"
                            : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-zinc-800"
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wide truncate">{preset.title}</span>
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold tracking-widest shrink-0 ${preset.badgeStyle}`}>
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-relaxed max-w-sm">
                            {preset.desc}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onBgRemovalChange({
                              enabled: true,
                              colorToKey: preset.keyColor as any,
                              customColorHex: bgRemoval.customColorHex,
                              tolerance: preset.toleranceVal
                            });
                            notify(`Applied Preset: ${preset.title.split(".")[1].trim()}`, "info");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest shrink-0 transition-all cursor-pointer border-0 ${
                            isMatching
                              ? "bg-emerald-600 text-white flex items-center gap-1 cursor-default shadow-md shadow-emerald-600/10"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/15"
                          }`}
                        >
                          {isMatching ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Applied</span>
                            </>
                          ) : (
                            "Apply"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-white/5 px-6 py-4 bg-zinc-900/40 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setGuideStep((prev) => Math.max(1, prev - 1))}
              disabled={guideStep === 1}
              className="flex items-center space-x-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 disabled:opacity-25 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-all border-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] font-mono text-zinc-600 uppercase">Step {guideStep} of 4</span>
            </div>

            {guideStep < 4 ? (
              <button
                type="button"
                onClick={() => setGuideStep((prev) => Math.min(4, prev + 1))}
                className="flex items-center space-x-1 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/15 transition-all border-0 cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // Turn on background remover if not already enabled when dismissing guide
                  if (!bgRemoval.enabled) {
                    onBgRemovalChange({
                      ...bgRemoval,
                      enabled: true
                    });
                    notify("AI Magic Background Remover enabled!", "info");
                  }
                  setShowBgRemovalGuide(false);
                }}
                className="flex items-center space-x-1 px-5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/15 transition-all border-0 cursor-pointer animate-pulse"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Start Erasing</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
}

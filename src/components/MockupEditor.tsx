/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { Move, Info, ZoomIn, ZoomOut, Maximize, Hand, MousePointer, Grid, Ruler, AlertTriangle } from "lucide-react";
import { ProductPreset } from "../data/templates";
import { LogoTransform, LogoData, MockupScene, PunchlineSettings } from "../types";
import { loadImage } from "../utils/imageUtils";

interface MockupEditorProps {
  product: ProductPreset;
  color: string;
  logo: LogoData | null;
  transform: LogoTransform;
  onTransformChange: (transform: LogoTransform) => void;
  customScene: MockupScene | null;
  isQuickPreview?: boolean;
  isAdjusting?: boolean;
  punchline?: PunchlineSettings;
  snapToGrid?: boolean;
}

// Helper to generate a procedural texture pattern canvas
function createTexturePattern(type: "grain" | "heather" | "distressed", intensity: number): HTMLCanvasElement {
  const pCanvas = document.createElement("canvas");
  
  if (type === "grain") {
    pCanvas.width = 128;
    pCanvas.height = 128;
    const pCtx = pCanvas.getContext("2d");
    if (pCtx) {
      pCtx.clearRect(0, 0, 128, 128);
      // Draw fine grainy speckles
      for (let i = 0; i < 2500; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const size = 0.5 + Math.random() * 1.2;
        const colorVal = Math.random() > 0.5 ? 255 : 0;
        const alpha = Math.random() * intensity * 0.35;
        pCtx.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, ${alpha})`;
        pCtx.fillRect(x, y, size, size);
      }
    }
  } else if (type === "heather") {
    pCanvas.width = 128;
    pCanvas.height = 128;
    const pCtx = pCanvas.getContext("2d");
    if (pCtx) {
      pCtx.clearRect(0, 0, 128, 128);
      // Draw horizontal heather fiber streaks
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const len = 4 + Math.random() * 20;
        const thick = 0.5 + Math.random() * 1.0;
        const colorVal = Math.random() > 0.4 ? 255 : 30; // blend light & dark fibers
        const alpha = Math.random() * intensity * 0.3;
        pCtx.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, ${alpha})`;
        pCtx.fillRect(x, y, len, thick);
      }
    }
  } else if (type === "distressed") {
    pCanvas.width = 256;
    pCanvas.height = 256;
    const pCtx = pCanvas.getContext("2d");
    if (pCtx) {
      pCtx.clearRect(0, 0, 256, 256);
      
      // 1. Dark eroding paint speckles (simulates cracked erosion)
      pCtx.fillStyle = `rgba(0, 0, 0, ${intensity * 0.65})`;
      for (let i = 0; i < 250; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 0.6 + Math.random() * 2.2;
        pCtx.beginPath();
        pCtx.arc(x, y, r, 0, Math.PI * 2);
        pCtx.fill();
      }
      
      // 2. Dark distressed lines / crack paths
      pCtx.strokeStyle = `rgba(0, 0, 0, ${intensity * 0.55})`;
      for (let i = 0; i < 6; i++) {
        pCtx.beginPath();
        let cx = Math.random() * 256;
        let cy = Math.random() * 256;
        pCtx.moveTo(cx, cy);
        pCtx.lineWidth = 0.8 + Math.random() * 1.5;
        for (let j = 0; j < 4; j++) {
          cx += (Math.random() - 0.5) * 45;
          cy += (Math.random() - 0.5) * 45;
          pCtx.lineTo(cx, cy);
        }
        pCtx.stroke();
      }
      
      // 3. Highlighted wear lines (simulates lighting on cracked paint edges)
      pCtx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.35})`;
      for (let i = 0; i < 4; i++) {
        pCtx.beginPath();
        let cx = Math.random() * 256;
        let cy = Math.random() * 256;
        pCtx.moveTo(cx, cy);
        pCtx.lineWidth = 0.6 + Math.random() * 0.8;
        for (let j = 0; j < 3; j++) {
          cx += (Math.random() - 0.5) * 35;
          cy += (Math.random() - 0.5) * 35;
          pCtx.lineTo(cx, cy);
        }
        pCtx.stroke();
      }
    }
  }
  
  return pCanvas;
}

export default function MockupEditor({
  product,
  color,
  logo,
  transform,
  onTransformChange,
  customScene,
  isQuickPreview = false,
  isAdjusting = false,
  punchline,
  snapToGrid = false,
}: MockupEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interactive Logo Dragging states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [logoStartPos, setLogoStartPos] = useState({ x: 0, y: 0 });
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [isWireframeMode, setIsWireframeMode] = useState(false);

  // Helper to calculate estimated physical print size based on current logo scale
  const estimatedDimensions = React.useMemo(() => {
    if (!logo || !logo.width || !logo.height || !product) return null;
    
    const physicalBounds: Record<string, { w: number, h: number, unit: string }> = {
      tshirt: { w: 12, h: 16, unit: "in" },
      hoodie: { w: 14, h: 16, unit: "in" },
      totebag: { w: 10, h: 10, unit: "in" },
      mug: { w: 8.5, h: 3.5, unit: "in" },
      bottle: { w: 6, h: 5, unit: "in" },
      phonecase: { w: 2.5, h: 5.5, unit: "in" },
      cap: { w: 4.5, h: 2.5, unit: "in" },
      poster: { w: 18, h: 24, unit: "in" }
    };
    
    const bounds = physicalBounds[product.id] || { w: 12, h: 12, unit: "in" };
    
    const VIEWPORT_SIZE = 600;
    const pW = (product.printArea.width / 100) * VIEWPORT_SIZE;
    const pH = (product.printArea.height / 100) * VIEWPORT_SIZE;

    const logoAspect = logo.width / logo.height || 1;
    let logoW = pW * 0.7;
    let logoH = logoW / logoAspect;
    if (logoH > pH * 0.7) {
      logoH = pH * 0.7;
      logoW = logoH * logoAspect;
    }
    const finalW = logoW * transform.scale;
    const finalH = logoH * transform.scale;
    
    const estW = (finalW / pW) * bounds.w;
    const estH = (finalH / pH) * bounds.h;
    
    const isOutOfBounds = estW > bounds.w || estH > bounds.h;
    
    return {
      w: estW.toFixed(1),
      h: estH.toFixed(1),
      unit: bounds.unit,
      maxW: bounds.w,
      maxH: bounds.h,
      isOutOfBounds
    };
  }, [logo, transform.scale, product]);

  // Drag modes: "idle", "move", "resize", "rotate"
  const [dragMode, setDragMode] = useState<"idle" | "move" | "resize" | "rotate">("idle");
  const [startAngle, setStartAngle] = useState(0);
  const [logoStartRotation, setLogoStartRotation] = useState(0);
  const [logoStartScale, setLogoStartScale] = useState(1);
  const [startDistance, setStartDistance] = useState(1);

  // Advanced Zoom & Pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editorMode, setEditorMode] = useState<"edit" | "pan">("edit");
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  // Hardcoded viewport width/height for coordinate resolution
  const VIEWPORT_SIZE = 800;

  // Wheel Zoom event handler (zooms in on cursor position)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * VIEWPORT_SIZE;
      const mouseY = ((e.clientY - rect.top) / rect.height) * VIEWPORT_SIZE;

      setZoom((prevZoom) => {
        // Zoom factors: deltaY < 0 is scroll up (Zoom In), else scroll down (Zoom Out)
        const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const nextZoom = Math.max(1, Math.min(5, prevZoom * zoomFactor));
        
        if (nextZoom === prevZoom) return prevZoom;
        if (nextZoom === 1) {
          setPan({ x: 0, y: 0 });
          return 1;
        }

        // Adjust pan offset to zoom dynamically towards mouse pointer location
        setPan((currentPan) => {
          const artboardX = (mouseX - currentPan.x) / prevZoom;
          const artboardY = (mouseY - currentPan.y) / prevZoom;

          const newPanX = mouseX - artboardX * nextZoom;
          const newPanY = mouseY - artboardY * nextZoom;

          // Limit panning bounds
          const maxPanLimit = VIEWPORT_SIZE * (nextZoom - 1);
          return {
            x: Math.max(-maxPanLimit, Math.min(0, newPanX)),
            y: Math.max(-maxPanLimit, Math.min(0, newPanY)),
          };
        });

        return nextZoom;
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Keyboard Shortcuts (Space for wireframe overlay, Arrow keys for logo nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is writing in inputs, textareas or editables
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        setIsWireframeMode((prev) => !prev);
        
        // Dispatch Custom Event for a HUD notification toast
        const event = new CustomEvent("merch-mockup-notification", {
          detail: { 
            text: `Wireframe Mode: ${!isWireframeMode ? "ENABLED" : "DISABLED"}`, 
            type: "info" 
          },
        });
        window.dispatchEvent(event);
      }

      if (logo) {
        let dx = 0;
        let dy = 0;
        const nudgeAmount = e.shiftKey ? 5 : 1; // standard shift modifier for larger increments

        if (e.key === "ArrowUp") {
          dy = -nudgeAmount;
        } else if (e.key === "ArrowDown") {
          dy = nudgeAmount;
        } else if (e.key === "ArrowLeft") {
          dx = -nudgeAmount;
        } else if (e.key === "ArrowRight") {
          dx = nudgeAmount;
        }

        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          onTransformChange({
            ...transform,
            x: parseFloat(Math.max(-120, Math.min(120, transform.x + dx)).toFixed(2)),
            y: parseFloat(Math.max(-120, Math.min(120, transform.y + dy)).toFixed(2)),
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [logo, transform, onTransformChange, isWireframeMode]);

  // Main Canvas Render loop
  useEffect(() => {
    let active = true;

    async function drawCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear the canvas
      ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

      // Save base context state
      ctx.save();
      
      // Apply Zoom and Pan Context Transformation
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      try {
        let sceneImg: HTMLImageElement | null = null;
        if (customScene && customScene.imageUrl && !(isQuickPreview || isAdjusting)) {
          try {
            sceneImg = await loadImage(customScene.imageUrl);
          } catch (e) {
            console.error("Failed to load custom scene image, falling back to base product mockup:", e);
          }
        }

        if (sceneImg) {
          if (isWireframeMode) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.drawImage(sceneImg, 0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
            ctx.restore();

            ctx.save();
            ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
            ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
            ctx.restore();
          } else {
            // 1. Draw AI generated lifestyle scene
            ctx.drawImage(sceneImg, 0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
          }
        } else {
          // 2. Draw Vector dynamic color template SVG
          let svgString = product.getSvg(color);
          if (isWireframeMode) {
            svgString = svgString.replace(new RegExp(`fill="${color}"`, 'g'), 'fill="rgba(15, 23, 42, 0.55)" stroke="rgba(56, 189, 248, 0.95)" stroke-width="2.5"');
            svgString = svgString.replace(/fill="rgba\(0, 0, 0, 0\.08\)"/g, 'fill="none" stroke="rgba(56, 189, 248, 0.45)" stroke-width="1"');
            svgString = svgString.replace(/fill="rgba\(0, 0, 0, 0\.12\)"/g, 'fill="none" stroke="rgba(56, 189, 248, 0.2)" stroke-width="1"');
            svgString = svgString.replace(/fill="rgba\(0, 0, 0, 0\.15\)"/g, 'fill="none" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1"');
            svgString = svgString.replace(/fill="rgba\(0, 0, 0, 0\.25\)"/g, 'fill="none" stroke="rgba(56, 189, 248, 0.5)" stroke-width="1.5"');
            svgString = svgString.replace(/stroke="rgba\(0,0,0,0\.15\)"/g, 'stroke="rgba(56, 189, 248, 0.75)" stroke-width="2"');
            svgString = svgString.replace(/stroke="rgba\(0,0,0,0\.25\)"/g, 'stroke="rgba(56, 189, 248, 0.85)" stroke-width="2"');
            svgString = svgString.replace(/stroke="rgba\(0,0,0,0\.2\)"/g, 'stroke="rgba(56, 189, 248, 0.7)" stroke-width="2"');
            svgString = svgString.replace(/stroke="rgba\(0,0,0,0\.1\)"/g, 'stroke="rgba(56, 189, 248, 0.4)" stroke-width="1.5"');
            svgString = svgString.replace(/stroke="rgba\(0,0,0,0\.04\)"/g, 'stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"');
            svgString = svgString.replace(/stroke="rgba\(0,0,0,0\.06\)"/g, 'stroke="rgba(56, 189, 248, 0.3)" stroke-width="1"');
            svgString = svgString.replace(/stroke="rgba\(0,0,0,0\.12\)"/g, 'stroke="rgba(56, 189, 248, 0.4)" stroke-width="1.5"');
            svgString = svgString.replace(/stroke="rgba\(255,255,255,0\.2\)"/g, 'stroke="rgba(56, 189, 248, 0.5)" stroke-dasharray="3,3"');
            svgString = svgString.replace(/stroke="rgba\(255,255,255,0\.08\)"/g, 'stroke="rgba(56, 189, 248, 0.3)" stroke-dasharray="3,3"');
            svgString = svgString.replace(/fill="#111"/g, 'fill="none" stroke="rgba(56, 189, 248, 0.5)"');
            svgString = svgString.replace(/fill="#3B2314"/g, 'fill="none" stroke="rgba(56, 189, 248, 0.3)"');
          }
          const svgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
          const productImg = await loadImage(svgUrl);
          ctx.drawImage(productImg, 0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
        }

        // Draw guidelines (printable boundary)
        const printArea = customScene
          ? { x: 20, y: 20, width: 60, height: 60 } // Default for custom scene
          : product.printArea;

        const pX = (printArea.x / 100) * VIEWPORT_SIZE;
        const pY = (printArea.y / 100) * VIEWPORT_SIZE;
        const pW = (printArea.width / 100) * VIEWPORT_SIZE;
        const pH = (printArea.height / 100) * VIEWPORT_SIZE;

        const drawPunchline = (targetCtx: CanvasRenderingContext2D = ctx) => {
          if (punchline && punchline.text && active) {
            targetCtx.save();
            
            // Apply opacity
            targetCtx.globalAlpha = punchline.opacity;
            
            // Apply smart crop clip if active
            if (transform.smartCrop) {
              targetCtx.beginPath();
              targetCtx.rect(pX, pY, pW, pH);
              targetCtx.clip();
            }
            
            // Compute target position relative to the print box
            const pCenterX = pX + pW / 2;
            const pCenterY = pY + pH / 2;
            const targetX = pCenterX + (punchline.offsetX / 100) * pW;
            const targetY = pCenterY + (punchline.offsetY / 100) * pH;
            
            targetCtx.translate(targetX, targetY);
            if (punchline.rotation !== 0) {
              targetCtx.rotate((punchline.rotation * Math.PI) / 180);
            }
            
            // Select font family
            let fontStr = "";
            const finalSize = (punchline.fontSize * (pW / 300)); // relative to print box width
            const boldPrefix = punchline.fontFamily === "grotesk" || punchline.fontFamily === "sans" ? "bold " : "";
            const italicPrefix = punchline.fontFamily === "handwritten" ? "italic " : "";
            
            switch (punchline.fontFamily) {
              case "serif":
                fontStr = `${boldPrefix}${italicPrefix}${finalSize}px "Playfair Display", Georgia, serif`;
                break;
              case "mono":
                fontStr = `${boldPrefix}${finalSize}px "JetBrains Mono", monospace`;
                break;
              case "grotesk":
                fontStr = `900 ${finalSize}px "Space Grotesk", sans-serif`;
                break;
              case "handwritten":
                fontStr = `500 ${finalSize}px cursive, sans-serif`;
                break;
              default:
                fontStr = `${boldPrefix}${finalSize}px "Inter", sans-serif`;
            }
            
            targetCtx.font = fontStr;
            targetCtx.fillStyle = punchline.color;
            targetCtx.textAlign = "center";
            targetCtx.textBaseline = "middle";
            
            const textToDraw = punchline.uppercase ? punchline.text.toUpperCase() : punchline.text;
            
            if (punchline.arcStrength !== 0) {
              // Curved text layout on an arc
              const chars = textToDraw.split("");
              const numChars = chars.length;
              
              // Base radius is inversely proportional to arcStrength
              const strength = punchline.arcStrength / 100; // range from -1 to 1
              const absStrength = Math.abs(strength);
              const radius = (pW * 0.95) / (absStrength + 0.05);
              
              // Letter spacing in radians
              const charSpacingAngle = (finalSize * (0.8 + punchline.tracking / 15)) / radius;
              const totalAngle = charSpacingAngle * (numChars - 1);
              
              // Positive strength arches down, negative arches up
              const directionSign = strength < 0 ? -1 : 1;
              const startAngle = -totalAngle / 2;
              
              for (let i = 0; i < numChars; i++) {
                const charAngle = startAngle + i * charSpacingAngle;
                
                targetCtx.save();
                // Offset origin to the circle center, rotate, then translate back
                const radialOffsetY = -directionSign * radius;
                targetCtx.translate(0, radialOffsetY);
                targetCtx.rotate(charAngle * directionSign);
                targetCtx.translate(0, -radialOffsetY);
                
                targetCtx.fillText(chars[i], 0, 0);
                targetCtx.restore();
              }
            } else {
              // Flat text layout
              if (punchline.tracking > 0) {
                const chars = textToDraw.split("");
                const numChars = chars.length;
                
                // Measure characters to center the text precisely
                const charWidths = chars.map(c => targetCtx.measureText(c).width);
                const trackingPx = punchline.tracking * (pW / 300) * 1.5;
                const totalWidth = charWidths.reduce((a, b) => a + b, 0) + trackingPx * (numChars - 1);
                
                let currentX = -totalWidth / 2;
                for (let i = 0; i < numChars; i++) {
                  const charW = charWidths[i];
                  targetCtx.fillText(chars[i], currentX + charW / 2, 0);
                  currentX += charW + trackingPx;
                }
              } else {
                targetCtx.fillText(textToDraw, 0, 0);
              }
            }
            
            targetCtx.restore();
          }
        };

        // Compute shared layout values for Logo (if present)
        let finalW = 0;
        let finalH = 0;
        let targetX = 0;
        let targetY = 0;
        let logoImg: HTMLImageElement | null = null;

        if (logo && logo.processedSrc && active) {
          try {
            logoImg = await loadImage(logo.processedSrc);
            const logoAspect = logo.width / logo.height || 1;
            let logoW = pW * 0.7;
            let logoH = logoW / logoAspect;
            if (logoH > pH * 0.7) {
              logoH = pH * 0.7;
              logoW = logoH * logoAspect;
            }
            finalW = logoW * transform.scale;
            finalH = logoH * transform.scale;
            const centerX = pX + pW / 2;
            const centerY = pY + pH / 2;
            targetX = centerX + (transform.x / 100) * pW;
            targetY = centerY + (transform.y / 100) * pH;
          } catch (e) {
            console.error("Failed to load logo image for metrics:", e);
          }
        }

        // Encapsulate the raw print design drawing (Slogan & Symmetrical Logo Graphic)
        const drawDesign = async (targetCtx: CanvasRenderingContext2D) => {
          // 1. Draw Slogan (if layer is below)
          if (punchline?.layerIndex === "below") {
            drawPunchline(targetCtx);
          }

          // 2. Draw Graphic Logo Artwork
          if (logoImg && active) {
            targetCtx.save();
            targetCtx.globalAlpha = transform.opacity;
            targetCtx.globalCompositeOperation = (targetCtx === ctx)
              ? ((isQuickPreview || isAdjusting) ? "source-over" : transform.blendMode)
              : "source-over";

            if (transform.smartCrop) {
              targetCtx.beginPath();
              targetCtx.rect(pX, pY, pW, pH);
              targetCtx.clip();
            }

            targetCtx.translate(targetX, targetY);
            if (transform.rotation !== 0) {
              targetCtx.rotate((transform.rotation * Math.PI) / 180);
            }
            
            if (transform.skewX || transform.skewY) {
              const sx = Math.tan((transform.skewX || 0) * Math.PI / 180);
              const sy = Math.tan((transform.skewY || 0) * Math.PI / 180);
              targetCtx.transform(1, sy, sx, 1, 0, 0);
            }

            if (transform.flipX || transform.flipY) {
              targetCtx.scale(transform.flipX ? -1 : 1, transform.flipY ? -1 : 1);
            }

            targetCtx.drawImage(logoImg, -finalW / 2, -finalH / 2, finalW, finalH);
            targetCtx.restore();
          }

          // 3. Draw Slogan (if layer is above)
          if (punchline?.layerIndex !== "below") {
            drawPunchline(targetCtx);
          }
        };

        // Render the printed layers (either directly or textured offscreen)
        const hasTexture = transform.textureType && transform.textureType !== "none";
        if (hasTexture) {
          const offCanvas = document.createElement("canvas");
          offCanvas.width = VIEWPORT_SIZE;
          offCanvas.height = VIEWPORT_SIZE;
          const offCtx = offCanvas.getContext("2d");
          if (offCtx) {
            await drawDesign(offCtx);
            
            // Apply the procedural fabric texture pattern overlay
            const texType = transform.textureType as "grain" | "heather" | "distressed";
            const texIntensity = transform.textureIntensity || 0.35;
            const texPatternCanvas = createTexturePattern(texType, texIntensity);
            
            offCtx.save();
            offCtx.globalCompositeOperation = "source-atop";
            const pattern = offCtx.createPattern(texPatternCanvas, "repeat");
            if (pattern) {
              offCtx.fillStyle = pattern;
              offCtx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
            }
            offCtx.restore();
            
            // Draw composite of offCanvas on main canvas
            ctx.save();
            ctx.globalCompositeOperation = (isQuickPreview || isAdjusting) ? "source-over" : transform.blendMode;
            ctx.drawImage(offCanvas, 0, 0);
            ctx.restore();
          }
        } else {
          await drawDesign(ctx);
        }

        // Now draw guidelines and UI widgets directly on the main canvas (ctx) so they stay crisp and clean
        if (logo && active) {
          if (showGuidelines) {
            // Printable Area Bounding Box with rounded corners
            ctx.strokeStyle = "rgba(59, 130, 246, 0.5)"; // blue accent
            ctx.lineWidth = 2 / zoom; 
            ctx.setLineDash([6 / zoom, 4 / zoom]);
            ctx.strokeRect(pX, pY, pW, pH);
            ctx.setLineDash([]);
            
            // Text Label
            ctx.fillStyle = "rgba(59, 130, 246, 0.75)";
            ctx.font = `bold ${Math.max(8, 12 / zoom)}px sans-serif`;
            ctx.fillText("PRINT AREA", pX + 8 / zoom, pY + 18 / zoom);
          }

          if (logoImg) {
            if (showGuidelines) {
              ctx.save();
              ctx.translate(targetX, targetY);
              if (transform.rotation !== 0) {
                ctx.rotate((transform.rotation * Math.PI) / 180);
              }
              if (transform.skewX || transform.skewY) {
                const sx = Math.tan((transform.skewX || 0) * Math.PI / 180);
                const sy = Math.tan((transform.skewY || 0) * Math.PI / 180);
                ctx.transform(1, sy, sx, 1, 0, 0);
              }
              ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
              ctx.lineWidth = 1.5 / zoom; 
              ctx.strokeRect(-finalW / 2 - 4 / zoom, -finalH / 2 - 4 / zoom, finalW + 8 / zoom, finalH + 8 / zoom);
              
              // Handles
              const size = 6 / zoom;
              const offset = size / 2;
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(-finalW / 2 - 4 / zoom - offset, -finalH / 2 - 4 / zoom - offset, size, size);
              ctx.strokeRect(-finalW / 2 - 4 / zoom - offset, -finalH / 2 - 4 / zoom - offset, size, size);
              ctx.fillRect(finalW / 2 + 4 / zoom - offset, -finalH / 2 - 4 / zoom - offset, size, size);
              ctx.strokeRect(finalW / 2 + 4 / zoom - offset, -finalH / 2 - 4 / zoom - offset, size, size);
              ctx.fillRect(-finalW / 2 - 4 / zoom - offset, finalH / 2 + 4 / zoom - offset, size, size);
              ctx.strokeRect(-finalW / 2 - 4 / zoom - offset, finalH / 2 + 4 / zoom - offset, size, size);
              ctx.fillRect(finalW / 2 + 4 / zoom - offset, finalH / 2 + 4 / zoom - offset, size, size);
              ctx.strokeRect(finalW / 2 + 4 / zoom - offset, finalH / 2 + 4 / zoom - offset, size, size);

              // Rotate Stick & Handle
              ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
              ctx.lineWidth = 1.5 / zoom;
              ctx.beginPath();
              ctx.moveTo(0, -finalH / 2 - 4 / zoom);
              ctx.lineTo(0, -finalH / 2 - 24 / zoom);
              ctx.stroke();

              ctx.fillStyle = "#3b82f6";
              ctx.beginPath();
              ctx.arc(0, -finalH / 2 - 24 / zoom, 5 / zoom, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#FFFFFF";
              ctx.stroke();

              ctx.restore();
            }

            // --- DYNAMIC VISUAL ALIGNMENT GUIDES ---
            if (isDragging) {
              const halfW_pct = (finalW / pW) * 50;
              const halfH_pct = (finalH / pH) * 50;

              const eps = 0.15; // small tolerance for detecting alignment state in floating points

              const isCenterX = Math.abs(transform.x) < eps;
              const isLeftEdge = Math.abs(transform.x - (-50 + halfW_pct)) < eps;
              const isRightEdge = Math.abs(transform.x - (50 - halfW_pct)) < eps;

              const isCenterY = Math.abs(transform.y) < eps;
              const isTopEdge = Math.abs(transform.y - (-50 + halfH_pct)) < eps;
              const isBottomEdge = Math.abs(transform.y - (50 - halfH_pct)) < eps;

              if (isCenterX || isLeftEdge || isRightEdge || isCenterY || isTopEdge || isBottomEdge) {
                ctx.save();
                ctx.strokeStyle = "rgba(236, 72, 153, 0.9)"; // Figma magenta pink
                ctx.lineWidth = 1.5 / zoom;
                ctx.setLineDash([4 / zoom, 3 / zoom]);

                const centerX = pX + pW / 2;
                const centerY = pY + pH / 2;

                // 1. Center Vertical Alignment Line
                if (isCenterX) {
                  ctx.beginPath();
                  ctx.moveTo(centerX, pY - 15 / zoom);
                  ctx.lineTo(centerX, pY + pH + 15 / zoom);
                  ctx.stroke();

                  ctx.save();
                  ctx.setLineDash([]);
                  ctx.fillStyle = "rgba(236, 72, 153, 1)";
                  ctx.font = `bold ${Math.max(7, 9 / zoom)}px sans-serif`;
                  ctx.fillText("CENTER X", centerX + 5 / zoom, pY + 12 / zoom);
                  ctx.restore();
                }

                // 2. Left Edge Alignment Line
                if (isLeftEdge) {
                  ctx.beginPath();
                  ctx.moveTo(pX, pY - 10 / zoom);
                  ctx.lineTo(pX, pY + pH + 10 / zoom);
                  ctx.stroke();

                  ctx.save();
                  ctx.setLineDash([]);
                  ctx.fillStyle = "rgba(236, 72, 153, 1)";
                  ctx.font = `bold ${Math.max(7, 9 / zoom)}px sans-serif`;
                  ctx.fillText("LEFT BORDER", pX + 5 / zoom, pY + 30 / zoom);
                  ctx.restore();
                }

                // 3. Right Edge Alignment Line
                if (isRightEdge) {
                  const rightEdge = pX + pW;
                  ctx.beginPath();
                  ctx.moveTo(rightEdge, pY - 10 / zoom);
                  ctx.lineTo(rightEdge, pY + pH + 10 / zoom);
                  ctx.stroke();

                  ctx.save();
                  ctx.setLineDash([]);
                  ctx.fillStyle = "rgba(236, 72, 153, 1)";
                  ctx.font = `bold ${Math.max(7, 9 / zoom)}px sans-serif`;
                  ctx.fillText("RIGHT BORDER", rightEdge - 72 / zoom, pY + 30 / zoom);
                  ctx.restore();
                }

                // 4. Center Horizontal Alignment Line
                if (isCenterY) {
                  ctx.beginPath();
                  ctx.moveTo(pX - 15 / zoom, centerY);
                  ctx.lineTo(pX + pW + 15 / zoom, centerY);
                  ctx.stroke();

                  ctx.save();
                  ctx.setLineDash([]);
                  ctx.fillStyle = "rgba(236, 72, 153, 1)";
                  ctx.font = `bold ${Math.max(7, 9 / zoom)}px sans-serif`;
                  ctx.fillText("CENTER Y", pX + 5 / zoom, centerY - 4 / zoom);
                  ctx.restore();
                }

                // 5. Top Edge Alignment Line
                if (isTopEdge) {
                  ctx.beginPath();
                  ctx.moveTo(pX - 10 / zoom, pY);
                  ctx.lineTo(pX + pW + 10 / zoom, pY);
                  ctx.stroke();

                  ctx.save();
                  ctx.setLineDash([]);
                  ctx.fillStyle = "rgba(236, 72, 153, 1)";
                  ctx.font = `bold ${Math.max(7, 9 / zoom)}px sans-serif`;
                  ctx.fillText("TOP BORDER", pX + 5 / zoom, pY + 12 / zoom);
                  ctx.restore();
                }

                // 6. Bottom Edge Alignment Line
                if (isBottomEdge) {
                  const bottomEdge = pY + pH;
                  ctx.beginPath();
                  ctx.moveTo(pX - 10 / zoom, bottomEdge);
                  ctx.lineTo(pX + pW + 10 / zoom, bottomEdge);
                  ctx.stroke();

                  ctx.save();
                  ctx.setLineDash([]);
                  ctx.fillStyle = "rgba(236, 72, 153, 1)";
                  ctx.font = `bold ${Math.max(7, 9 / zoom)}px sans-serif`;
                  ctx.fillText("BOTTOM BORDER", pX + 5 / zoom, bottomEdge - 6 / zoom);
                  ctx.restore();
                }

                // HUD Snap alert
                ctx.save();
                ctx.setLineDash([]);
                ctx.fillStyle = "rgba(236, 72, 153, 0.12)";
                ctx.strokeStyle = "rgba(236, 72, 153, 0.5)";
                ctx.lineWidth = 1.5;
                
                const hudX = 20;
                const hudY = VIEWPORT_SIZE - 45;
                const hudW = 155;
                const hudH = 24;
                
                ctx.beginPath();
                if (ctx.roundRect) {
                  ctx.roundRect(hudX, hudY, hudW, hudH, 6);
                } else {
                  ctx.rect(hudX, hudY, hudW, hudH);
                }
                ctx.fill();
                ctx.stroke();
                
                ctx.fillStyle = "#ec4899";
                ctx.font = "bold 9px sans-serif";
                ctx.fillText("🎯 ALIGNMENT SNAP ACTIVE", hudX + 12, hudY + 15);
                ctx.restore();

                ctx.restore();
              }
            }
          }
        }
      } catch (err) {
        console.error("Error drawing mockup scene:", err);
      }

      // Draw technical wireframe / CAD grid on top if wireframe mode is active
      if (isWireframeMode) {
        ctx.save();
        
        // Draw grid
        ctx.strokeStyle = "rgba(56, 189, 248, 0.12)"; // neon sky-400
        ctx.lineWidth = 1 / zoom;
        const gridSize = 40;
        
        // Vertical lines
        for (let x = 0; x <= VIEWPORT_SIZE; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, VIEWPORT_SIZE);
          ctx.stroke();
        }
        // Horizontal lines
        for (let y = 0; y <= VIEWPORT_SIZE; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(VIEWPORT_SIZE, y);
          ctx.stroke();
        }
        
        // Draw some concentric radar/CAD lines for tech styling
        ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
        ctx.beginPath();
        ctx.arc(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, 80, 0, Math.PI * 2);
        ctx.arc(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, 160, 0, Math.PI * 2);
        ctx.arc(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, 240, 0, Math.PI * 2);
        ctx.stroke();

        // Draw HUD overlay in the corner of the canvas
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 13px monospace";
        ctx.fillText("WIREFRAME VIEW (CAD)", 20, 35);
        
        // Add a pulsing cyan dot
        ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
        ctx.beginPath();
        ctx.arc(195, 31, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(195, 31, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Quick Preview HUD badge if active
      if (isQuickPreview || isAdjusting) {
        ctx.save();
        ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 1.5;
        
        const badgeX = VIEWPORT_SIZE - 170;
        const badgeY = 20;
        const badgeW = 150;
        const badgeH = 26;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();
        ctx.stroke();
        
        // Pulse amber indicator
        const pulse = Math.abs(Math.sin(Date.now() / 200)) * 0.4 + 0.6;
        ctx.fillStyle = `rgba(245, 158, 11, ${pulse})`;
        ctx.beginPath();
        ctx.arc(badgeX + 15, badgeY + 13, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 10px monospace";
        ctx.fillText(isAdjusting ? "FAST ADJUSTMENT" : "QUICK PREVIEW", badgeX + 26, badgeY + 16);
        ctx.restore();
      }

      // Restore base context state
      ctx.restore();
    }

    drawCanvas();

    return () => {
      active = false;
    };
  }, [product, color, logo, transform, customScene, showGuidelines, zoom, pan, isWireframeMode, isQuickPreview, isAdjusting, punchline, isDragging]);

  // Helper to resolve client coordinates on raw canvas viewport dimensions
  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale back to 800x800 raw coordinate resolution
    const x = ((clientX - rect.left) / rect.width) * VIEWPORT_SIZE;
    const y = ((clientY - rect.top) / rect.height) * VIEWPORT_SIZE;

    return { x, y };
  };

  // Helper to map raw viewport coords back into transformed artboard space
  const getArtboardCoordinates = (canvasCoords: { x: number; y: number }) => {
    return {
      x: (canvasCoords.x - pan.x) / zoom,
      y: (canvasCoords.y - pan.y) / zoom,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const rawCoords = getCanvasCoordinates(e);
    if (!rawCoords) return;

    let clickedLogo = false;

    if (logo) {
      // Map clicked point into zoom/panned artboard coordinates
      const coords = getArtboardCoordinates(rawCoords);
      const printArea = customScene ? { x: 20, y: 20, width: 60, height: 60 } : product.printArea;
      const pX = (printArea.x / 100) * VIEWPORT_SIZE;
      const pY = (printArea.y / 100) * VIEWPORT_SIZE;
      const pW = (printArea.width / 100) * VIEWPORT_SIZE;
      const pH = (printArea.height / 100) * VIEWPORT_SIZE;

      const centerX = pX + pW / 2;
      const centerY = pY + pH / 2;
      
      const targetX = centerX + (transform.x / 100) * pW;
      const targetY = centerY + (transform.y / 100) * pH;

      const logoAspect = logo.width / logo.height || 1;
      let logoW = pW * 0.7 * transform.scale;
      let logoH = logoW / logoAspect;

      const finalW = logoW;
      const finalH = logoH;

      // Translate clicked coordinates relative to logo's center
      const relX = coords.x - targetX;
      const relY = coords.y - targetY;
      
      // Unrotate the click coordinate to logo's local unrotated system
      const rad = (-transform.rotation * Math.PI) / 180;
      const localX = relX * Math.cos(rad) - relY * Math.sin(rad);
      const localY = relX * Math.sin(rad) + relY * Math.cos(rad);

      if (showGuidelines) {
        const handleRadius = 16 / zoom; // generous touch target radius

        // 1. Check Rotate Handle
        const rotateHandleCenter = { x: 0, y: -finalH / 2 - 24 / zoom };
        const distToRotate = Math.hypot(localX - rotateHandleCenter.x, localY - rotateHandleCenter.y);
        if (distToRotate < handleRadius) {
          setIsDragging(true);
          setDragMode("rotate");
          setDragStart(coords);
          const startAngleRad = Math.atan2(relY, relX);
          setStartAngle(startAngleRad);
          setLogoStartRotation(transform.rotation);
          return;
        }

        // 2. Check Corner Resize Handles
        const corners = [
          { name: "tl", x: -finalW / 2 - 4 / zoom, y: -finalH / 2 - 4 / zoom },
          { name: "tr", x: finalW / 2 + 4 / zoom, y: -finalH / 2 - 4 / zoom },
          { name: "bl", x: -finalW / 2 - 4 / zoom, y: finalH / 2 + 4 / zoom },
          { name: "br", x: finalW / 2 + 4 / zoom, y: finalH / 2 + 4 / zoom }
        ];

        for (const corner of corners) {
          const dist = Math.hypot(localX - corner.x, localY - corner.y);
          if (dist < handleRadius) {
            setIsDragging(true);
            setDragMode("resize");
            setDragStart(coords);
            setLogoStartScale(transform.scale);
            const startDist = Math.hypot(relX, relY);
            setStartDistance(startDist);
            return;
          }
        }
      }

      // 3. Check Logo Body Move click
      clickedLogo = 
        localX >= -finalW / 2 - 10 &&
        localX <= finalW / 2 + 10 &&
        localY >= -finalH / 2 - 10 &&
        localY <= finalH / 2 + 10;
    }

    // Determine whether to handle panning or logo dragging
    if (editorMode === "pan" || (zoom > 1 && !clickedLogo)) {
      setIsPanning(true);
      setPanStart(rawCoords);
      setPanStartOffset({ x: pan.x, y: pan.y });
    } else if (clickedLogo && logo) {
      const coords = getArtboardCoordinates(rawCoords);
      setIsDragging(true);
      setDragMode("move");
      setDragStart(coords);
      setLogoStartPos({ x: transform.x, y: transform.y });
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rawCoords = getCanvasCoordinates(e);
    if (!rawCoords) return;

    if (isPanning) {
      const dx = rawCoords.x - panStart.x;
      const dy = rawCoords.y - panStart.y;

      const maxPanLimit = VIEWPORT_SIZE * (zoom - 1);
      const boundedX = Math.max(-maxPanLimit, Math.min(0, panStartOffset.x + dx));
      const boundedY = Math.max(-maxPanLimit, Math.min(0, panStartOffset.y + dy));

      setPan({ x: boundedX, y: boundedY });
      return;
    }

    if (!isDragging || !logo) return;
    const coords = getArtboardCoordinates(rawCoords);

    const printArea = customScene ? { x: 20, y: 20, width: 60, height: 60 } : product.printArea;
    const pW = (printArea.width / 100) * VIEWPORT_SIZE;
    const pH = (printArea.height / 100) * VIEWPORT_SIZE;

    if (dragMode === "move") {
      // Delta movement inside artboard space
      const dx = coords.x - dragStart.x;
      const dy = coords.y - dragStart.y;

      const pctDx = (dx / pW) * 100;
      const pctDy = (dy / pH) * 100;

      let newX = Math.max(-120, Math.min(120, logoStartPos.x + pctDx));
      let newY = Math.max(-120, Math.min(120, logoStartPos.y + pctDy));

      // Calculate dynamic logo dimensions for alignment snapping
      const logoAspect = logo.width / logo.height || 1;
      let logoW = pW * 0.7;
      let logoH = logoW / logoAspect;
      if (logoH > pH * 0.7) {
        logoH = pH * 0.7;
        logoW = logoH * logoAspect;
      }
      const finalW = logoW * transform.scale;
      const finalH = logoH * transform.scale;

      const halfW_pct = (finalW / pW) * 50;
      const halfH_pct = (finalH / pH) * 50;

      const SNAP_THRESHOLD = 3.0; // percentage points threshold for alignment snapping

      let snappedX = false;
      let snappedY = false;

      // X-Axis alignments: Center (0), Left border (-50 + halfW_pct), Right border (50 - halfW_pct)
      if (Math.abs(newX) < SNAP_THRESHOLD) {
        newX = 0;
        snappedX = true;
      } else if (Math.abs(newX - (-50 + halfW_pct)) < SNAP_THRESHOLD) {
        newX = -50 + halfW_pct;
        snappedX = true;
      } else if (Math.abs(newX - (50 - halfW_pct)) < SNAP_THRESHOLD) {
        newX = 50 - halfW_pct;
        snappedX = true;
      }

      // Y-Axis alignments: Center (0), Top border (-50 + halfH_pct), Bottom border (50 - halfH_pct)
      if (Math.abs(newY) < SNAP_THRESHOLD) {
        newY = 0;
        snappedY = true;
      } else if (Math.abs(newY - (-50 + halfH_pct)) < SNAP_THRESHOLD) {
        newY = -50 + halfH_pct;
        snappedY = true;
      } else if (Math.abs(newY - (50 - halfH_pct)) < SNAP_THRESHOLD) {
        newY = 50 - halfH_pct;
        snappedY = true;
      }

      // If we didn't snap to center/edge alignment guidelines, fallback to standard snapToGrid
      if (!snappedX && snapToGrid) {
        newX = Math.round(newX / 5) * 5;
      }
      if (!snappedY && snapToGrid) {
        newY = Math.round(newY / 5) * 5;
      }

      onTransformChange({
        ...transform,
        x: parseFloat(newX.toFixed(2)),
        y: parseFloat(newY.toFixed(2)),
      });
    } else if (dragMode === "rotate") {
      const pX = (printArea.x / 100) * VIEWPORT_SIZE;
      const pY = (printArea.y / 100) * VIEWPORT_SIZE;
      const centerX = pX + pW / 2;
      const centerY = pY + pH / 2;
      
      const targetX = centerX + (transform.x / 100) * pW;
      const targetY = centerY + (transform.y / 100) * pH;

      const currentAngleRad = Math.atan2(coords.y - targetY, coords.x - targetX);
      const angleDiffRad = currentAngleRad - startAngle;
      let angleDiffDeg = (angleDiffRad * 180) / Math.PI;

      let newRot = logoStartRotation + angleDiffDeg;
      
      const nativeEvent = (e as any).nativeEvent || e;
      if (nativeEvent.shiftKey || snapToGrid) {
        newRot = Math.round(newRot / 15) * 15;
      } else {
        newRot = Math.round(newRot);
      }

      onTransformChange({
        ...transform,
        rotation: newRot,
      });
    } else if (dragMode === "resize") {
      const pX = (printArea.x / 100) * VIEWPORT_SIZE;
      const pY = (printArea.y / 100) * VIEWPORT_SIZE;
      const centerX = pX + pW / 2;
      const centerY = pY + pH / 2;
      
      const targetX = centerX + (transform.x / 100) * pW;
      const targetY = centerY + (transform.y / 100) * pH;

      const relX = coords.x - targetX;
      const relY = coords.y - targetY;
      const currentDistance = Math.hypot(relX, relY);

      let newScale = logoStartScale * (currentDistance / startDistance);
      newScale = Math.max(0.1, Math.min(4.0, newScale));
      newScale = parseFloat(newScale.toFixed(2));

      onTransformChange({
        ...transform,
        scale: newScale,
      });
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    setIsPanning(false);
    setDragMode("idle");
  };

  // Dedicated Button Actions
  const handleZoomIn = () => {
    setZoom((prev) => {
      const next = Math.min(5, prev + 0.5);
      if (next === prev) return prev;
      
      // Zoom keeping current viewport center as anchor
      const center = VIEWPORT_SIZE / 2;
      setPan((currentPan) => {
        const artboardCenterX = (center - currentPan.x) / prev;
        const artboardCenterY = (center - currentPan.y) / prev;
        
        const newPanX = center - artboardCenterX * next;
        const newPanY = center - artboardCenterY * next;
        
        const maxPanLimit = VIEWPORT_SIZE * (next - 1);
        return {
          x: Math.max(-maxPanLimit, Math.min(0, newPanX)),
          y: Math.max(-maxPanLimit, Math.min(0, newPanY)),
        };
      });
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1, prev - 0.5);
      if (next === prev) return prev;
      if (next === 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }

      // Zoom keeping current viewport center as anchor
      const center = VIEWPORT_SIZE / 2;
      setPan((currentPan) => {
        const artboardCenterX = (center - currentPan.x) / prev;
        const artboardCenterY = (center - currentPan.y) / prev;
        
        const newPanX = center - artboardCenterX * next;
        const newPanY = center - artboardCenterY * next;
        
        const maxPanLimit = VIEWPORT_SIZE * (next - 1);
        return {
          x: Math.max(-maxPanLimit, Math.min(0, newPanX)),
          y: Math.max(-maxPanLimit, Math.min(0, newPanY)),
        };
      });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-[#121217] rounded-2xl border border-white/5 overflow-hidden relative shadow-2xl">
      {/* Editor Header Toolbar */}
      <div className="bg-zinc-950/40 border-b border-white/5 px-5 py-3 flex items-center justify-between z-10">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {customScene ? "Lifestyle Scene Editor" : "Flat Mockup Canvas"}
          </h2>
          <p className="text-[10px] text-zinc-500 font-medium">
            {customScene ? "Custom AI Generated Scene" : `3D-feel Vector template • Base ${color}`}
          </p>
        </div>
        
        {logo && (
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => {
                setIsWireframeMode(!isWireframeMode);
                const event = new CustomEvent("merch-mockup-notification", {
                  detail: { 
                    text: `Wireframe Mode: ${!isWireframeMode ? "ENABLED" : "DISABLED"}`, 
                    type: "info" 
                  },
                });
                window.dispatchEvent(event);
              }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all border cursor-pointer focus:outline-none select-none ${
                isWireframeMode
                  ? "bg-sky-600/20 text-sky-400 border-sky-500/30"
                  : "bg-zinc-900 text-zinc-400 border-white/5 hover:text-zinc-200"
              }`}
              title="Toggle Wireframe Overlay Mode [Spacebar]"
              id="toggle-wireframe-btn"
            >
              <Grid className="h-3 w-3" />
              <span>Wireframe (Space)</span>
            </button>

            <label className="flex items-center space-x-1.5 text-xs text-zinc-400 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGuidelines}
                onChange={(e) => setShowGuidelines(e.target.checked)}
                className="rounded border-white/10 bg-zinc-900 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span>Overlay Guidelines</span>
            </label>

            <label className="flex items-center space-x-1.5 text-xs text-zinc-400 font-medium cursor-pointer select-none" id="layer-mask-toggle-label">
              <input
                type="checkbox"
                checked={transform.smartCrop || false}
                onChange={(e) => {
                  onTransformChange({
                    ...transform,
                    smartCrop: e.target.checked
                  });
                  const event = new CustomEvent("merch-mockup-notification", {
                    detail: { 
                      text: `Layer Mask: ${e.target.checked ? "RESTRICTED TO PRINT AREA" : "UNRESTRICTED"}`, 
                      type: "info" 
                    },
                  });
                  window.dispatchEvent(event);
                }}
                className="rounded border-white/10 bg-zinc-900 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5"
                id="layer-mask-checkbox"
              />
              <span>Apply Layer Mask</span>
            </label>
          </div>
        )}
      </div>

      {/* Main Stage viewport */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-6 bg-transparent relative min-h-[350px] md:min-h-[450px]"
        id="canvas-stage-wrapper"
      >
        <div className="relative aspect-square w-full max-w-[440px] md:max-w-[480px] rounded-2xl bg-zinc-900 shadow-2xl border border-white/5 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={VIEWPORT_SIZE}
            height={VIEWPORT_SIZE}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className={`w-full h-full block ${
              editorMode === "pan"
                ? "cursor-move"
                : isDragging
                ? "cursor-grabbing"
                : logo
                ? "cursor-grab"
                : "cursor-default"
            }`}
          />

          {/* Print Area Dimensions Overlay */}
          {estimatedDimensions && logo && showGuidelines && (
            <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-lg p-2.5 shadow-xl pointer-events-none z-10 flex items-start space-x-3 transition-opacity">
              <div className={`p-1.5 rounded-md ${estimatedDimensions.isOutOfBounds ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {estimatedDimensions.isOutOfBounds ? <AlertTriangle className="h-4 w-4" /> : <Ruler className="h-4 w-4" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                  Est. Print Size
                </span>
                <div className="flex items-baseline space-x-1">
                  <span className={`text-sm font-mono font-semibold ${estimatedDimensions.isOutOfBounds ? 'text-amber-400' : 'text-zinc-200'}`}>
                    {estimatedDimensions.w} &times; {estimatedDimensions.h}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">{estimatedDimensions.unit}</span>
                </div>
                {estimatedDimensions.isOutOfBounds && (
                  <span className="text-[9px] text-amber-400/80 mt-1 leading-tight max-w-[110px]">
                    Exceeds safe print bounds ({estimatedDimensions.maxW}x{estimatedDimensions.maxH} {estimatedDimensions.unit})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Interactive Zoom and Pan Control Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
            {/* Left side Mode Selector (Active if a logo is present) */}
            {logo && (
              <div className="flex items-center bg-zinc-950/95 border border-white/10 rounded-lg p-0.5 shadow-xl pointer-events-auto">
                <button
                  onClick={() => setEditorMode("edit")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                    editorMode === "edit"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                  title="Logo Placement Mode (🎯)"
                >
                  <MousePointer className="h-3 w-3" />
                  <span>Move Logo</span>
                </button>
                <button
                  onClick={() => setEditorMode("pan")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                    editorMode === "pan"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                  title="Viewport Panning Mode (🔍)"
                >
                  <Hand className="h-3 w-3" />
                  <span>Pan View</span>
                </button>
              </div>
            )}

            <div />

            {/* Right side Zoom Controllers */}
            <div className="flex items-center space-x-1.5 bg-zinc-950/95 border border-white/10 rounded-lg p-1 shadow-xl pointer-events-auto">
              {/* Zoom % Indicator */}
              <span className="text-[10px] font-mono font-bold text-zinc-300 px-2 select-none">
                {Math.round(zoom * 100)}%
              </span>
              
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              {(zoom > 1 || pan.x !== 0 || pan.y !== 0) && (
                <button
                  onClick={handleResetZoom}
                  className="p-1 rounded hover:bg-zinc-900 text-blue-400 hover:text-blue-300 transition-all border border-blue-500/10"
                  title="Reset Zoom & Pan"
                >
                  <Maximize className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Helper visual hints when empty */}
          {!logo && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 text-center pointer-events-none animate-fadeIn">
              <div className="bg-zinc-950 p-3.5 rounded-full shadow-xl border border-white/5 text-blue-400 mb-3 animate-pulse">
                <Move className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-white text-sm">Interactive Artboard</h4>
              <p className="text-xs text-zinc-400 max-w-[240px] mt-1 leading-relaxed">
                Add a logo from the sidebar to start positioning, resizing, and rotating directly on the product!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Footer / Info Tips */}
      <div className="bg-zinc-950/40 border-t border-white/5 px-5 py-2.5 flex items-center space-x-2 text-[11px] text-zinc-500">
        <Info className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        <span>
          {logo
            ? zoom > 1
              ? "Tip: Drag the background or switch to 'Pan View' to explore details. Scroll wheel supported."
              : "Tip: Use the zoom buttons or your mouse wheel to inspect logo details up-close."
            : "Tip: You can change garment colors or generate fully custom lifestyle backgrounds via AI."}
        </span>
      </div>
    </div>
  );
}

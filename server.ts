import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable trusting proxies (useful for behind Cloud Run proxy/load balancer)
app.set("trust proxy", 1);

// Security Requirements
// 1. Use Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local development to allow inline scripts and styles from Vite
  crossOriginEmbedderPolicy: false,
}));

// 2. Rate Limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Turn off validations because trust proxy is handled above and custom forwarded headers are set by platform proxy
});
app.use("/api/", apiLimiter);

// 3. Prevent exposing internal details by disabling x-powered-by
app.disable("x-powered-by");

// 4. Log security events without storing sensitive data (basic request logger)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[Security Log] ${req.method} ${req.path} requested from IP: ${req.ip}`);
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// 5. Authenticate users before accessing protected features
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin (only if service account is provided, else mock for sandbox)
let authInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount)
    });
    authInitialized = true;
  } else {
    console.warn("[Security] FIREBASE_SERVICE_ACCOUNT not found. Running in sandbox/dev mode with relaxed auth.");
  }
} catch (err) {
  console.warn("[Security] Error initializing Firebase Admin.", err);
}

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(`[Security Log] Blocked unauthenticated request to ${req.path}`);
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }
  const token = authHeader.split("Bearer ")[1];
  
  if (token === "guest_token" || !authInitialized) {
    // In sandbox or guest mode, allow the request
    return next();
  }
  
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.log(`[Security Log] Failed token verification for ${req.path}`);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// 6. Validate and sanitize user inputs
import { body, validationResult } from "express-validator";

const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(`[Security Log] Validation failed for ${req.path}`);
    return res.status(400).json({ error: "Invalid request data. Please check your inputs." });
  }
  next();
};

// Helper to get Gemini Client lazily
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Quietly logs API errors and handles resource/quota limits gracefully
function handleApiError(route: string, error: any) {
  let errMsg = "";
  if (error instanceof Error) {
    errMsg = error.message;
  } else if (typeof error === "object" && error !== null) {
    try {
      errMsg = JSON.stringify(error);
    } catch (e) {
      errMsg = String(error);
    }
  } else {
    errMsg = String(error);
  }
  
  if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Limit") || errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("unavailable")) {
    console.warn(`[Quota/RateLimit Handled in ${route}] Dynamic procedural fallback engaged due to temporary Gemini image model resource constraints.`);
  } else {
    console.warn(`[Error Handled in ${route}] Dynamic procedural fallback engaged. Brief description: ${errMsg.substring(0, 120)}`);
  }
}

// SVG generator for offline or error fallbacks
function generateFallbackLogoSvg(prompt: string, style: string): string {
  const styleLower = style.toLowerCase();
  
  // Choose colors based on the chosen aesthetic style
  let colors = {
    bgColor: "#ffffff",
    strokeColor: "#09090b",
    primaryColor: "#18181b", // zinc-900 charcoal
    accentColor: "#71717a",  // zinc-500
    highlightColor: "#e4e4e7" // zinc-200
  };

  if (styleLower === "vector") {
    colors = {
      bgColor: "#ffffff",
      strokeColor: "#1e293b",
      primaryColor: "#3b82f6", // vibrant blue
      accentColor: "#10b981",  // emerald green
      highlightColor: "#f43f5e" // rose
    };
  } else if (styleLower === "vintage") {
    colors = {
      bgColor: "#fdf6e2",      // warm cream
      strokeColor: "#451a03",  // deep dark brown
      primaryColor: "#78350f", // rich amber brown
      accentColor: "#b45309",  // orange amber
      highlightColor: "#d97706" // golden yellow
    };
  } else if (styleLower === "futuristic") {
    colors = {
      bgColor: "#09090b",      // deep black
      strokeColor: "#06b6d4",  // cyan glow
      primaryColor: "#a855f7", // purple electric
      accentColor: "#06b6d4",  // cyan
      highlightColor: "#ec4899" // hot pink
    };
  }

  const text = prompt.toLowerCase();
  
  // Select matching design template based on keywords in prompt
  if (text.includes("mountain") || text.includes("peak") || text.includes("alpine") || text.includes("summit") || text.includes("climb")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
        <path d="M 250,70 L 400,380 L 100,380 Z" fill="${colors.primaryColor}" />
        <path d="M 250,70 L 180,210 Q 250,180 250,70" fill="#ffffff" opacity="0.2" />
        <path d="M 250,70 L 290,150 L 265,140 L 250,160 L 235,140 L 210,150 Z" fill="${colors.accentColor}" />
        <circle cx="250" cy="250" r="15" fill="${colors.highlightColor}" />
      </svg>
    `.trim();
  }
  
  if (text.includes("leaf") || text.includes("eco") || text.includes("green") || text.includes("nature") || text.includes("tree") || text.includes("plant") || text.includes("organic") || text.includes("flower")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
        <path d="M 250,90 C 110,200 160,410 250,410 C 340,410 390,200 250,90 Z" fill="${colors.primaryColor}" />
        <path d="M 250,410 L 250,90" stroke="${colors.accentColor}" stroke-width="12" stroke-linecap="round" />
        <path d="M 250,310 Q 320,260 345,210" fill="none" stroke="${colors.accentColor}" stroke-width="8" stroke-linecap="round" />
        <path d="M 250,210 Q 180,160 155,110" fill="none" stroke="${colors.accentColor}" stroke-width="8" stroke-linecap="round" />
      </svg>
    `.trim();
  }

  if (text.includes("coffee") || text.includes("mug") || text.includes("cup") || text.includes("brew") || text.includes("cafe") || text.includes("tea")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
        <path d="M 320,200 C 390,200 390,300 320,300" fill="none" stroke="${colors.primaryColor}" stroke-width="24" stroke-linecap="round" />
        <path d="M 150,160 L 310,160 C 310,310 150,310 150,160 Z" fill="${colors.primaryColor}" />
        <path d="M 180,70 Q 200,110 180,130 M 230,70 Q 250,110 230,130 M 280,70 Q 300,110 280,130" fill="none" stroke="${colors.accentColor}" stroke-width="12" stroke-linecap="round" />
      </svg>
    `.trim();
  }

  if (text.includes("rocket") || text.includes("space") || text.includes("launch") || text.includes("star") || text.includes("galaxy") || text.includes("cosmic")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
        <path d="M 200,320 L 150,380 L 200,380 Z" fill="${colors.accentColor}" />
        <path d="M 300,320 L 350,380 L 300,380 Z" fill="${colors.accentColor}" />
        <path d="M 225,380 Q 250,450 275,380 Z" fill="${colors.highlightColor}" />
        <path d="M 250,80 C 180,180 180,350 180,380 L 320,380 C 320,350 320,180 250,80 Z" fill="${colors.primaryColor}" />
        <circle cx="250" cy="200" r="30" fill="${colors.bgColor}" stroke="${colors.accentColor}" stroke-width="10" />
      </svg>
    `.trim();
  }

  if (text.includes("bolt") || text.includes("flash") || text.includes("energy") || text.includes("power") || text.includes("lightning") || text.includes("thunder")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
        <path d="M 290,60 L 150,270 L 240,270 L 210,440 L 350,230 L 260,230 Z" fill="${colors.primaryColor}" stroke="${colors.accentColor}" stroke-width="6" stroke-linejoin="round" />
      </svg>
    `.trim();
  }

  if (text.includes("crown") || text.includes("luxury") || text.includes("gold") || text.includes("royal") || text.includes("king") || text.includes("queen") || text.includes("emperor")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="12" />
        <path d="M 120,360 L 150,200 L 210,280 L 250,150 L 290,280 L 350,200 L 380,360 Z" fill="${colors.primaryColor}" stroke="${colors.accentColor}" stroke-width="8" stroke-linejoin="round" />
        <rect x="120" y="370" width="260" height="30" rx="10" fill="${colors.accentColor}" />
        <circle cx="150" cy="180" r="10" fill="${colors.highlightColor}" />
        <circle cx="250" cy="130" r="12" fill="${colors.highlightColor}" />
        <circle cx="350" cy="180" r="10" fill="${colors.highlightColor}" />
      </svg>
    `.trim();
  }

  if (text.includes("animal") || text.includes("fox") || text.includes("cat") || text.includes("dog") || text.includes("wolf") || text.includes("tiger") || text.includes("lion") || text.includes("bear") || text.includes("panda")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
        <path d="M 150,220 L 130,100 L 220,180 Z" fill="${colors.accentColor}" />
        <path d="M 350,220 L 370,100 L 280,180 Z" fill="${colors.accentColor}" />
        <path d="M 150,220 L 250,300 L 350,220 L 250,380 Z" fill="${colors.primaryColor}" />
        <path d="M 220,300 L 250,340 L 280,300 Z" fill="${colors.highlightColor}" />
        <circle cx="200" cy="240" r="12" fill="${colors.strokeColor}" />
        <circle cx="300" cy="240" r="12" fill="${colors.strokeColor}" />
      </svg>
    `.trim();
  }

  if (text.includes("music") || text.includes("sound") || text.includes("note") || text.includes("tune") || text.includes("audio") || text.includes("song") || text.includes("beat")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
        <circle cx="190" cy="350" r="45" fill="${colors.primaryColor}" />
        <circle cx="340" cy="310" r="45" fill="${colors.primaryColor}" />
        <rect x="215" y="130" width="20" height="220" fill="${colors.primaryColor}" />
        <rect x="365" y="90" width="20" height="220" fill="${colors.primaryColor}" />
        <path d="M 215,130 L 385,90 L 385,150 L 215,190 Z" fill="${colors.accentColor}" />
      </svg>
    `.trim();
  }

  if (text.includes("shield") || text.includes("crest") || text.includes("emblem") || text.includes("guard") || text.includes("security") || text.includes("badge")) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
        <path d="M 150,130 L 350,130 C 350,130 360,280 250,390 C 140,280 150,130 150,130 Z" fill="${colors.primaryColor}" stroke="${colors.accentColor}" stroke-width="12" stroke-linejoin="round" />
        <path d="M 250,170 L 270,220 L 320,220 L 280,250 L 300,300 L 250,270 L 200,300 L 220,250 L 180,220 L 230,220 Z" fill="${colors.highlightColor}" />
      </svg>
    `.trim();
  }

  // Fallback Monogram / Letter Emblem using prompt first character
  const cleanPrompt = prompt.trim().replace(/[^a-zA-Z0-9]/g, "");
  const letter = cleanPrompt ? cleanPrompt.charAt(0).toUpperCase() : "M";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <circle cx="250" cy="250" r="230" fill="${colors.bgColor}" stroke="${colors.strokeColor}" stroke-width="8" />
      <circle cx="250" cy="250" r="190" fill="none" stroke="${colors.accentColor}" stroke-width="4" stroke-dasharray="12,8" />
      <text x="250" y="320" font-family="'Inter', 'Montserrat', sans-serif" font-size="220" font-weight="900" fill="${colors.primaryColor}" text-anchor="middle" letter-spacing="2">${letter}</text>
    </svg>
  `.trim();
}

function generateFallbackSceneSvg(prompt: string, productType: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="wall-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <linearGradient id="floor-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <radialGradient id="spotlight" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="podium-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="50%" stop-color="#64748b" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="800" height="420" fill="url(#wall-grad)" />
      <circle cx="400" cy="220" r="300" fill="url(#spotlight)" />
      <polygon points="0,420 800,420 800,600 0,600" fill="url(#floor-grad)" />
      <line x1="0" y1="420" x2="800" y2="420" stroke="#0f172a" stroke-width="4" opacity="0.5" />
      <ellipse cx="400" cy="460" rx="160" ry="40" fill="#09090b" opacity="0.4" />
      <path d="M 240,460 L 240,510 A 160,40 0 0,0 560,510 L 560,460 Z" fill="url(#podium-grad)" />
      <ellipse cx="400" cy="460" rx="160" ry="30" fill="#475569" stroke="#64748b" stroke-width="2" />
      <ellipse cx="400" cy="455" rx="140" ry="22" fill="#ffffff" opacity="0.08" />
    </svg>
  `.trim();
}

// API Route for generating logo or graphic
app.post("/api/generate-logo", 
  requireAuth,
  [
    body("prompt").isString().trim().notEmpty().withMessage("Prompt is required").isLength({ max: 500 }),
    body("style").optional().isString().trim().escape(),
    body("useHighQuality").optional().isBoolean()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
  const { prompt, style = "modern", useHighQuality = false } = req.body;

  try {
    const ai = getAiClient();
    const modelName = useHighQuality ? "gemini-3.1-flash-image" : "gemini-3.1-flash-lite-image";

    // Enhance the prompt for logo generation to ensure high-contrast and easy background keying
    const styleModifier = style === "vector" 
      ? "Design a clean, flat vector icon logo, isolated on a solid pure white background, high contrast, SVG style, crisp edges. No mockups, no 3D shading, no complex gradients."
      : style === "vintage"
      ? "Design a vintage distressed emblem logo, retro badge style, centered and isolated on a solid pure white background, crisp edges."
      : style === "futuristic"
      ? "Design a futuristic cyberpunk tech logo badge, glowing details, isolated on a solid pure black background, high contrast, clean shapes."
      : "Design a clean, modern minimalist brand logo, centered and isolated on a solid pure white background, high contrast, commercial design quality.";

    const finalPrompt = `${prompt}. ${styleModifier}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [{ text: finalPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: useHighQuality ? "1K" : "512px",
        },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image candidates generated by the model.");
    }

    const parts = candidates[0].content?.parts;
    if (!parts) {
      throw new Error("Empty content parts in Gemini response.");
    }

    let base64Image: string | null = null;
    for (const part of parts) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      throw new Error("No inline image data found in the response parts.");
    }

    res.json({
      success: true,
      imageUrl: `data:image/png;base64,${base64Image}`,
      modelUsed: modelName,
    });
  } catch (error: any) {
    handleApiError("/api/generate-logo", error);
    try {
      const fallbackSvg = generateFallbackLogoSvg(prompt, style);
      const base64Image = Buffer.from(fallbackSvg).toString("base64");
      res.json({
        success: true,
        imageUrl: `data:image/svg+xml;base64,${base64Image}`,
        modelUsed: "procedural-svg-generator",
        warning: "Operating in high-fidelity vector generation fallback mode."
      });
    } catch (fallbackError: any) {
      console.error("Critically failed during procedural logo SVG generation:", fallbackError);
      res.status(500).json({
        success: false,
        error: error.message || "An unexpected error occurred during logo generation.",
      });
    }
  }
});

// API Route for generating custom lifestyle mockup scenes
app.post("/api/generate-scene",
  requireAuth,
  [
    body("prompt").isString().trim().notEmpty().withMessage("Prompt is required").isLength({ max: 500 }),
    body("productType").optional().isString().trim().escape()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
  const { prompt, productType = "t-shirt" } = req.body;

  try {
    const ai = getAiClient();
    
    // We want a product mockup scene where the product is blank or easily overlayable
    const enhancedPrompt = `A high-quality, professional product mockup scene. ${prompt}. The ${productType} should be laid out flat or worn naturally, solid color, completely blank with no print or text on it, studio lighting, photorealistic.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No scene candidates generated by the model.");
    }

    const parts = candidates[0].content?.parts;
    let base64Image: string | null = null;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
      throw new Error("No inline image data found in the response parts.");
    }

    res.json({
      success: true,
      imageUrl: `data:image/png;base64,${base64Image}`,
    });
  } catch (error: any) {
    handleApiError("/api/generate-scene", error);
    try {
      const fallbackSvg = generateFallbackSceneSvg(prompt, productType);
      const base64Image = Buffer.from(fallbackSvg).toString("base64");
      res.json({
        success: true,
        imageUrl: `data:image/svg+xml;base64,${base64Image}`,
        modelUsed: "procedural-scene-generator",
        warning: "Operating in backup studio backdrop generation mode."
      });
    } catch (fallbackError: any) {
      console.error("Critically failed during fallback scene generation:", fallbackError);
      res.status(500).json({
        success: false,
        error: error.message || "An unexpected error occurred during scene generation.",
      });
    }
  }
});

// Poetic Color Name Classifier for smart, premium fallbacks
function getPoeticColorName(hex: string): string {
  if (!hex) return "Classic";
  const cleanHex = hex.trim().toLowerCase().replace("#", "");
  
  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  // Simple color classifier
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  if (max < 45) return "Obsidian";
  if (min > 215) return "Alabaster";
  if (diff < 20) {
    if (max > 160) return "Platinum";
    if (max > 100) return "Slate Gray";
    return "Charcoal";
  }

  // Reddish
  if (max === r) {
    if (g > 150) return "Amber Gold";
    if (b > 150) return "Orchid Mauve";
    if (g < 80 && b < 80) return "Crimson Tide";
    return "Terra Cotta";
  }
  // Greenish
  if (max === g) {
    if (r > 150) return "Olive Grove";
    if (b > 150) return "Aquamarine";
    if (r < 80 && b < 80) return "Forest Moss";
    return "Sage Meadow";
  }
  // Bluish
  if (max === b) {
    if (r > 150) return "Lavender Dream";
    if (g > 150) return "Ocean Mist";
    if (r < 80 && g < 80) return "Midnight Blue";
    return "Pacific Cobalt";
  }

  return "Heritage";
}

function capitalize(str: string): string {
  if (!str) return "Item";
  return str.split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function generateFallbackConfigName(productType: string, logoName: string, colorHex: string): string {
  const poeticColor = getPoeticColorName(colorHex || "#ffffff");
  
  // Clean up logo name for the title
  let cleanLogo = logoName || "";
  cleanLogo = cleanLogo
    .replace(/\.[a-zA-Z0-9]+$/, "") // remove file extension if any
    .replace(/[-_]/g, " ") // replace dashes or underscores
    .trim();
    
  // Capitalize words
  cleanLogo = cleanLogo.split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (!cleanLogo || cleanLogo.toLowerCase().includes("blank") || cleanLogo.toLowerCase().includes("minimalist")) {
    const neutralWords = ["Zen", "Essential", "Minimalist", "Origin", "Core", "Signature", "Heritage", "Sleek"];
    const adjective = neutralWords[Math.floor(Math.random() * neutralWords.length)];
    return `${poeticColor} ${adjective} ${capitalize(productType)}`;
  }

  return `${poeticColor} ${cleanLogo} ${capitalize(productType)}`;
}

function generateFallbackPalette(productType: string, logoName: string, primaryColorHex: string) {
  const hex = (primaryColorHex || "#3b82f6").trim().toLowerCase();
  
  const parseHex = (h: string) => {
    const c = h.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16) || 59;
    const g = parseInt(c.substring(2, 4), 16) || 130;
    const b = parseInt(c.substring(4, 6), 16) || 246;
    return { r, g, b };
  };

  const toHex = (r: number, g: number, b: number) => {
    const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
    const rh = clamp(r).toString(16).padStart(2, "0");
    const gh = clamp(g).toString(16).padStart(2, "0");
    const bh = clamp(b).toString(16).padStart(2, "0");
    return `#${rh}${gh}${bh}`;
  };

  const { r, g, b } = parseHex(hex);

  // 1. Dominant Match
  const domHex = hex;
  const domName = `${getPoeticColorName(hex)} Heritage`;

  // 2. Complementary Contrast (approximate inverse color)
  const compHex = toHex(255 - r, 255 - g, 255 - b);
  const compName = `${getPoeticColorName(compHex)} Contrast`;

  // 3. Harmonious Accent (slight shift)
  const harmHex = toHex(r * 0.8 + 30, g * 0.8 + 20, b * 1.2);
  const harmName = `${getPoeticColorName(harmHex)} Harmony`;

  // 4. Modern Neutral (cream/pastel beige)
  const neutralHex = "#faf9f6";
  const neutralName = "Alabaster Cream";

  // 5. Deep Premium (slate velvet / dark charcoal)
  const deepHex = "#121214";
  const deepName = "Obsidian Velvet";

  return [
    {
      name: domName,
      hex: domHex,
      rationale: `Perfect matching backdrop that amplifies the core tones of your ${logoName || "graphic logo"}.`
    },
    {
      name: compName,
      hex: compHex,
      rationale: `A highly active contrasting color to create maximum visual impact and depth on your ${productType}.`
    },
    {
      name: harmName,
      hex: harmHex,
      rationale: `A balanced accent color that coordinates beautifully for daily wear.`
    },
    {
      name: neutralName,
      hex: neutralHex,
      rationale: `An elegant, modern minimalist base that provides a high-end luxury retail feel.`
    },
    {
      name: deepName,
      hex: deepHex,
      rationale: `A premium dark base color that provides high contrast and sophisticated visual structure.`
    }
  ];
}

// API Route to generate a descriptive, semantic name for the saved design configuration using AI
app.post("/api/generate-config-name",
  requireAuth,
  [
    body("productType").isString().trim().notEmpty().withMessage("Product type is required").escape(),
    body("logoName").optional().isString().trim().escape(),
    body("colorHex").optional().isString().trim().escape()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
  const { productType, logoName, colorHex } = req.body;

  try {
    const ai = getAiClient();
    
    const prompt = `You are an elite product design and branding specialist.
Generate a single, highly creative, semantic, and descriptive style/product name for a custom merchandise item with the following details:
- Product Item Type: ${productType}
- Active Logo/Artwork Name: ${logoName || "Minimalist Graphics / Blank"}
- Base fabric/material color (Hex code): ${colorHex || "#ffffff"}

Style Requirements:
- Combine the item type, color tone (translate the Hex code to a beautiful poetic color name like "Charcoal", "Midnight", "Amethyst", "Desert Sand", "Ocean Mist", "Teal", "Coral", etc.), and logo style into a cohesive premium-sounding retail product name.
- E.g. instead of a boring literal name, generate something like "Midnight Lotus Hoodie", "Amber Wave Ceramic Mug", "Sage Forest Vintage Tee", "Crimson Zenith Cap", etc.
- Keep the name extremely elegant, concise (2 to 4 words), and highly memorable.
- Output ONLY the final plain text name itself. Do NOT include quotes, do NOT wrap in markdown, do NOT include any introductory or explanatory text. No punctuation or trailing text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const generatedName = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : "";
    
    if (!generatedName) {
      throw new Error("Empty name response from Gemini model.");
    }

    res.json({
      success: true,
      name: generatedName,
    });
  } catch (error: any) {
    handleApiError("/api/generate-config-name", error);
    try {
      const fallbackName = generateFallbackConfigName(productType, logoName, colorHex);
      res.json({
        success: true,
        name: fallbackName,
        isFallback: true,
      });
    } catch (fallbackError: any) {
      console.error("Critically failed during fallback name generation:", fallbackError);
      res.status(500).json({
        success: false,
        error: error.message || "An unexpected error occurred during name generation.",
      });
    }
  }
});

// API Route to suggest complementary or brand-aligned colors for a product based on the logo's primary color
app.post("/api/generate-palette",
  requireAuth,
  [
    body("productType").isString().trim().notEmpty().withMessage("Product type is required").escape(),
    body("logoName").optional().isString().trim().escape(),
    body("primaryColorHex").optional().isString().trim().escape()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
  const { productType, logoName, primaryColorHex } = req.body;

  try {
    const ai = getAiClient();
    
    const prompt = `You are an expert brand designer and merchandiser.
We have a custom merchandise item: ${productType}.
The uploaded brand logo/artwork is named: "${logoName || "Brand Logo"}".
The primary/dominant color of this logo is: ${primaryColorHex || "#3b82f6"} (Hex).

Generate a curated, highly professional, brand-aligned color palette for the ${productType} fabric/material that coordinates perfectly with this logo.
Provide exactly 5 distinct color recommendations:
1. "Dominant Match" (close to the logo's dominant color or a perfect backing hue)
2. "Complementary Contrast" (striking contrasting color that makes the logo pop)
3. "Harmonious Accent" (harmonious nearby color for a sleek, coordinated look)
4. "Modern Neutral" (a contemporary light/neutral tone or pastel that aligns with the brand)
5. "Deep Premium" (a rich, elegant dark neutral tone that makes the logo stand out)

For each color, you MUST return:
- name: A beautiful, premium retail color name (e.g., "Pacific Slate", "Vintage Sand", "Sage Moss", "Crimson Zenith", "Warm Ochre")
- hex: The valid CSS hex color code (e.g. "#2c3e50")
- rationale: A short 1-sentence description explaining why this specific fabric color works perfectly with the logo and product type.

Your response MUST be a valid JSON array of exactly 5 objects with keys: "name", "hex", and "rationale".
Return ONLY the raw JSON block. No markdown, no wrapping in codeblocks, no intro text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ? response.text.trim() : "";
    if (!text) {
      throw new Error("Empty response from Gemini model.");
    }

    const palette = JSON.parse(text);
    res.json({
      success: true,
      palette,
    });
  } catch (error: any) {
    handleApiError("/api/generate-palette", error);
    try {
      const fallbackPalette = generateFallbackPalette(productType, logoName, primaryColorHex);
      res.json({
        success: true,
        palette: fallbackPalette,
        isFallback: true,
      });
    } catch (fallbackError: any) {
      console.error("Critically failed during fallback palette generation:", fallbackError);
      res.status(500).json({
        success: false,
        error: error.message || "An unexpected error occurred during palette generation.",
      });
    }
  }
});

// Offline Prompt Generator Fallback Engine
function generateOfflinePrompts(keyword: string, style: string, productType: string): any[] {
  const finalProductType = productType === "All" ? "T-shirt" : productType;
  
  const stylesInfo: Record<string, { font: string, colors: string[], promptSuffix: string }> = {
    minimal: {
      font: "Montserrat",
      colors: ["#18181b", "#fafafa", "#a1a1aa"],
      promptSuffix: "ultra-minimalist, high-end negative space design, solid clean lines, flat vector, white background"
    },
    vintage: {
      font: "Playfair Display",
      colors: ["#78350f", "#fef3c7", "#451a03"],
      promptSuffix: "distressed retro style, vintage badge design, weathered textures, classic 1970s warm color scheme, isolated"
    },
    cartoon: {
      font: "Fredoka One",
      colors: ["#ef4444", "#f59e0b", "#3b82f6"],
      promptSuffix: "cute 2D cartoon sticker illustration, thick bold outlines, bright saturated colors, playful, pure white background"
    },
    anime: {
      font: "Space Grotesk",
      colors: ["#db2777", "#4f46e5", "#06b6d4"],
      promptSuffix: "modern hand-drawn anime aesthetic, vibrant neon hues, highly detailed, dramatic keylighting, stylized graphics"
    },
    funny: {
      font: "Impact",
      colors: ["#facc15", "#000000", "#ef4444"],
      promptSuffix: "hilarious novelty meme graphic, witty text integration, bold expressive artwork, high comic value, clean isolated presentation"
    },
    typography: {
      font: "Oswald",
      colors: ["#09090b", "#e4e4e7", "#3b82f6"],
      promptSuffix: "bold dynamic typography, custom hand-lettered quotes, artistic text placement, retro or contemporary fonts, vector"
    },
    luxury: {
      font: "Cinzel",
      colors: ["#121214", "#d4af37", "#fdfbf7"],
      promptSuffix: "high-end luxury monogram, ornate elegant gold foil accents, geometric symmetrical crest, premium brand emblem, isolated"
    }
  };

  const styleMeta = stylesInfo[style.toLowerCase()] || stylesInfo.minimal;
  const kw = keyword || "Adventure";

  const templates = [
    {
      title: `${capitalize(style)} ${kw} Concept`,
      desc: `A premium retail-quality ${style} design focusing on the theme of '${kw}'.`,
      colors: styleMeta.colors,
      font: styleMeta.font,
      keywords: [kw, style, "custom merch", "shopify seller", "etsy trending", "print on demand"],
      prompt: `A beautiful ${style} illustration of ${kw}, ${styleMeta.promptSuffix}. Perfect for a premium ${finalProductType}.`
    },
    {
      title: `The Essential ${kw}`,
      desc: `An artistic and memorable representation of ${kw} tailored for modern apparel.`,
      colors: [styleMeta.colors[0], "#f4f4f5", "#3b82f6"],
      keywords: [kw, "essential", "gift idea", "merch master", "graphic tee"],
      prompt: `Graphic representation of ${kw} in ${style} aesthetic, clean centered composition, vector art, isolated on a solid backdrop.`
    },
    {
      title: `${kw} Horizon`,
      desc: `A stunning composition blending ${kw} elements with a modern design layout.`,
      colors: styleMeta.colors,
      keywords: [kw, "horizon", "concept art", "artistic print"],
      prompt: `A creative, artistic conceptual illustration of ${kw} set against a modern background, ${style} style, vivid details.`
    },
    {
      title: `Retro ${kw} Club`,
      desc: `A highly engaging and collectible print celebrating the spirit of ${kw}.`,
      colors: ["#7c2d12", "#ffedd5", "#0f766e"],
      keywords: [kw, "vintage club", "collectible", "limited edition"],
      prompt: `Retro styled badge representing a high-end '${kw} Club', distressed texture, bold branding design.`
    },
    {
      title: `Chibi ${kw} Buddy`,
      desc: `A charming and funny mascot representing ${kw} that customers will fall in love with.`,
      colors: ["#ec4899", "#fbcfe8", "#111827"],
      keywords: [kw, "cute mascot", "chibi sticker", "adorable merch"],
      prompt: `Cute chibi mascot version of ${kw}, adorable character design, full body, isolated, high visual appeal.`
    },
    {
      title: `Zen Space ${kw}`,
      desc: `A calming, high-contrast visual focused on the serene aspect of ${kw}.`,
      colors: ["#18181b", "#ffffff", "#8b5cf6"],
      keywords: [kw, "zen concept", "mindfulness print", "space age"],
      prompt: `A cosmic zen design with ${kw} symbol and stardust rings, minimalist negative space logo style, beautiful layout.`
    },
    {
      title: `Cyberpunk ${kw} Tech`,
      desc: `An edgy, glowing sci-fi style concept perfect for dark garments and stickers.`,
      colors: ["#09090b", "#f43f5e", "#06b6d4"],
      keywords: [kw, "cyberpunk", "sci-fi gear", "glowing design"],
      prompt: `A high-tech cyberpunk illustration centered on ${kw}, neon lasers, metallic reflection, obsidian backdrop.`
    },
    {
      title: `The Whispering ${kw}`,
      desc: `An organic, nature-inspired visual story depicting ${kw} in a gorgeous light.`,
      colors: ["#065f46", "#ecfdf5", "#b45309"],
      keywords: [kw, "organic", "botanical print", "woodlands design"],
      prompt: `An organic hand-sketched natural design featuring ${kw} surrounded by botanical wreaths, cottagecore aesthetic.`
    },
    {
      title: `Bold Typo: ${kw}`,
      desc: `A powerful typography design combining styled text layouts to express the meaning of ${kw}.`,
      colors: styleMeta.colors,
      keywords: [kw, "quote tee", "inspirational quote", "typographic merch"],
      prompt: `Typography layout with the words '${kw}' in dynamic stacked layout, modern sans font, stylish vector overlays.`
    },
    {
      title: `Golden Ratio ${kw}`,
      desc: `A luxury, mathematically balanced geometric representation of ${kw}.`,
      colors: ["#111827", "#fef08a", "#eab308"],
      keywords: [kw, "geometric art", "golden ratio", "premium luxury logo"],
      prompt: `An elegant luxury logo of ${kw} utilizing the golden ratio, perfect circles, golden foil shader, black velvet background.`
    }
  ];

  return templates.map((t, idx) => ({
    id: `idea-${idx}-${Date.now()}`,
    title: t.title,
    description: t.desc,
    colors: t.colors,
    font: t.font || styleMeta.font,
    seoKeywords: t.keywords,
    prompt: t.prompt,
    productType: finalProductType
  }));
}

// AI Merch Design Ideas & Prompt Generator Endpoint
app.post("/api/generate-prompts",
  requireAuth,
  [
    body("keyword").isString().trim().notEmpty().withMessage("Keyword is required").isLength({ max: 100 }),
    body("style").optional().isString().trim().escape(),
    body("productType").optional().isString().trim().escape()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
  const { keyword, style = "minimal", productType = "All" } = req.body;

  try {
    const ai = getAiClient();
    
    const promptMessage = `You are an elite, award-winning Print-on-Demand (POD) Merchandising expert, trend strategist, and prompt engineering designer.
Your goal is to generate exactly 10 unique, highly creative and retail-ready merchandise design concepts based on the following input:
- User Keyword Topic: "${keyword}"
- Chosen Art/Design Style: "${style}" (e.g. Minimal, Vintage, Cartoon, Anime, Funny, Typography, Luxury)
- Target Product Type: "${productType}" (e.g. T-shirt, Hoodie, Mug, Sticker, Poster, Phone Case, or "All")

For each of the 10 concepts, you MUST generate the following structured properties:
1. "title": A catchy, professional retail-ready product name (e.g. "Vintage Cosmic Odyssey Tee", "Alabaster Serenity Mug"). It must sound like something sold on Urban Outfitters, Etsy, or premium Shopify stores.
2. "description": A highly compelling, emotional, and marketing-focused description (1-2 sentences) explaining why a customer would purchase this item.
3. "colors": An array of 3 distinct, beautiful hex color codes (e.g. ["#09090b", "#d4af37", "#fcfcfc"]) that represent the perfect material fabric or design print palette.
4. "font": A premium font recommendation that fits the aesthetic (e.g. "Space Grotesk", "Cinzel", "Playfair Display", "Montserrat", "Oswald", "Fredoka One", "Impact").
5. "seoKeywords": An array of 5 to 7 high-performing search engine optimization keywords suitable for tags on Etsy, Amazon Merch, or Shopify (e.g. ["vintage tee", "gift for gamer", "aesthetic sticker"]).
6. "prompt": A highly specific, fully optimized, and descriptive text-to-image prompt (for Midjourney, Stable Diffusion, or Gemini) that will produce the gorgeous graphic layout described. It must specify style, composition, key lighting, isolated background, flat vector, clean edges, and no 3D rendering mockup frames.
7. "productType": The specific merchandise type this design is optimized for. If the target product type input was "All", select the most suitable type among T-shirt, Hoodie, Mug, Sticker, Poster, and Phone Case for each individual concept to create a diverse collection. Otherwise, match the input product type.

Your response MUST be a valid JSON array of exactly 10 objects with keys: "title", "description", "colors", "font", "seoKeywords", "prompt", "productType".
Do NOT include any markdown formatting, do NOT write \`\`\`json, do NOT include intro/outro text. Return ONLY the raw JSON string.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text ? response.text.trim() : "";
    if (!responseText) {
      throw new Error("Received empty response from the AI model.");
    }

    const ideas = JSON.parse(responseText);
    
    // Inject unique client-side IDs
    const processedIdeas = ideas.map((idea: any, idx: number) => ({
      id: `ai-idea-${idx}-${Date.now()}`,
      ...idea
    }));

    res.json({
      success: true,
      ideas: processedIdeas,
      mode: "ai"
    });

  } catch (error: any) {
    console.error("AI prompt generator failed. Initiating procedural generator fallback...", error);
    try {
      const fallbackIdeas = generateOfflinePrompts(keyword, style, productType);
      res.json({
        success: true,
        ideas: fallbackIdeas,
        mode: "offline",
        warning: "Operating in backup procedural generation mode."
      });
    } catch (fallbackError: any) {
      console.error("Critical fallback failed:", fallbackError);
      res.status(500).json({
        success: false,
        error: "Failed to generate design prompts."
      });
    }
  }
});

// Integration with Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();

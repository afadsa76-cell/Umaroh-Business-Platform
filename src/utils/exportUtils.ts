import html2canvas from 'html2canvas';

/**
 * Aggressively sanitizes a document clone for html2canvas compatibility.
 * This implements the clean "Blueprint" (Clean BW) look as requested.
 */
export const sanitizeForHtml2Canvas = (clonedDoc: Document, originalElement: HTMLElement) => {
  // 1. Find the target element in the clone
  const clonedTarget = (clonedDoc.getElementById(originalElement.id) || 
                       clonedDoc.body.querySelector('*')) as HTMLElement;
  
  if (clonedTarget) {
    // LOCK the dimensions to match original exactly
    clonedTarget.style.width = `${originalElement.offsetWidth}px`;
    clonedTarget.style.minWidth = `${originalElement.offsetWidth}px`;
    clonedTarget.style.height = `${originalElement.offsetHeight}px`;
    clonedTarget.style.position = 'relative';
    clonedTarget.style.display = 'block';
    clonedTarget.style.backgroundColor = '#ffffff';
    clonedTarget.style.margin = '0 auto';
    clonedTarget.style.left = '0';
    clonedTarget.style.top = '0';
  }

  // 2. Inject "Blueprint" styles that override colors but keep layout
  const styleEl = clonedDoc.createElement('style');
  styleEl.textContent = `
    * {
      color: #000000 !important;
      background-color: #ffffff !important;
      background-image: none !important;
      border-color: #000000 !important;
      box-shadow: none !important;
      text-shadow: none !important;
      -webkit-print-color-adjust: exact !important;
      letter-spacing: 0 !important;
      word-spacing: normal !important;
      line-height: normal !important;
      font-variant-ligatures: none !important;
    }
    
    /* Ensure layout columns and spacing are preserved */
    .flex, .grid {
      display: flex !important;
    }
    
    /* Icons handling */
    svg, svg * {
      stroke: #000000 !important;
      fill: none !important;
    }
    
    [fill="currentColor"], [fill^="#"], [fill^="rgb"] {
      fill: #000000 !important;
      stroke: none !important;
    }

    img {
      filter: grayscale(100%) !important;
      opacity: 0.7 !important;
    }

    /* Keep structural lines from Tailwind */
    [class*="border"] {
      border-style: solid !important;
      border-color: #000000 !important;
    }
    
    /* Elements that had backgrounds get a thin border to keep structure */
    div[class*="bg-"]:not(.bg-white):not(.bg-transparent) {
      border: 1px solid #000000 !important;
    }
  `;
  clonedDoc.head.appendChild(styleEl);

  // 3. Prevent html2canvas from crashing on modern CSS functions
  const modernColorRegex = /(?:oklch|oklab|color-mix)\s*\([^)]+\)/gi;
  clonedDoc.querySelectorAll('*').forEach(node => {
    const el = node as HTMLElement;
    if (el.style && el.style.cssText) {
      el.style.cssText = el.style.cssText.replace(modernColorRegex, '#000000');
    }
  });
};

/**
 * Robust capture utility with locked dimensions and sanitization.
 */
export const captureToDataUrl = async (element: HTMLElement, options: { pixelRatio?: number; backgroundColor?: string; quality?: number } = {}) => {
  try {
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    const canvas = await html2canvas(element, {
      scale: options.pixelRatio || 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // CRITICAL: Force capture area to match original exactly
      width: width,
      height: height,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        sanitizeForHtml2Canvas(clonedDoc, element);
      }
    });

    return canvas.toDataURL('image/jpeg', options.quality || 0.95);
  } catch (error) {
    console.error("Capture UI Error:", error);
    throw error;
  }
};

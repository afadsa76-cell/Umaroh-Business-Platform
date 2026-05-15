import html2canvas from 'html2canvas';

/**
 * Converts any color string (oklch, rgb, etc.) to a hex string using the browser's 
 * native color resolution by drawing to a canvas.
 */
/**
 * Efficiently converts any color value to a standard hex or rgb string.
 * This acts as a circuit breaker for modern CSS functions that crash html2canvas.
 */
const forceStandardColor = (color: string): string => {
  if (!color || color === 'transparent' || color === 'inherit' || color === 'initial' || color === 'none') {
    return color;
  }

  // If it's already a simple color, return it
  if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')) {
    // But check for nested functions like color-mix inside rgb (Tailwind 4 sometimes does this)
    if (!color.includes('(') || color.startsWith('rgb(') || color.startsWith('rgba(')) {
      if (!color.includes('okl') && !color.includes('color-mix')) {
        return color;
      }
    }
  }

  // Use a reliable fallback mapping for our specific emerald/blue/amber theme
  const lower = color.toLowerCase();
  
  // High-fidelity overrides for the Umaroh theme palette
  if (lower.includes('blue')) return '#2563eb';
  if (lower.includes('indigo')) return '#4f46e5';
  if (lower.includes('amber') || lower.includes('yellow')) return '#d97706';
  if (lower.includes('red')) return '#dc2626';
  if (lower.includes('emerald') || lower.includes('green')) return '#059669';
  if (lower.includes('slate') || lower.includes('gray')) return '#4b5563';
  if (lower.includes('white')) return '#ffffff';
  if (lower.includes('black')) return '#000000';

  // If we can't guess the color, try to let the browser resolve it to RGB
  try {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const resolved = window.getComputedStyle(div).color;
    document.body.removeChild(div);
    
    // If it's still oklch/color-mix, the browser failed to resolve to RGB
    if (resolved.includes('okl') || resolved.includes('color-mix')) {
      return '#000000'; // Safety first
    }
    return resolved;
  } catch (e) {
    return '#000000';
  }
};

/**
 * Aggressively sanitizes a document clone by converting all computed styles 
 * to inline HEX/RGB styles and stripping out problematic modern CSS.
 */
export const sanitizeForHtml2Canvas = (clonedDoc: Document, originalElement: HTMLElement) => {
  // Regex to find ANY modern color function
  const colorFnRegex = /(?:oklch|oklab|color-mix|device-cmyk|light-dark|p3|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|lch)\s*\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/gi;

  // 1. Completely nuke ALL styles in the clone to stop the parser from ever seeing them
  const styleElements = Array.from(clonedDoc.querySelectorAll('style, link[rel="stylesheet"]'));
  styleElements.forEach(tag => tag.remove());

  // 2. Mirror styles from the original elements to the clones as absolute values
  const originalNodes = Array.from(originalElement.querySelectorAll('*'));
  const clonedNodes = Array.from(clonedDoc.querySelectorAll('*'));
  
  // Check if root element itself needs sanitization
  const rootOriginal = originalElement;
  const rootCloned = clonedDoc.getElementById(originalElement.id) || clonedDoc.body.querySelector(`#${originalElement.id}`) || clonedNodes[0];

  const sanitizeElement = (orig: HTMLElement, copy: HTMLElement) => {
    if (!orig || !copy || !copy.style) return;
    
    try {
      const computed = window.getComputedStyle(orig);
      
      // Critical visual properties
      const props = [
        'color', 'backgroundColor', 'borderColor', 'fill', 'stroke', 
        'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor',
        'stopColor', 'fontSize', 'fontWeight', 'fontFamily', 'textAlign',
        'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
        'padding', 'margin', 'position', 'top', 'left', 'right', 'bottom',
        'width', 'height', 'opacity', 'borderRadius', 'boxShadow', 'overflow',
        'visibility', 'zIndex', 'lineHeight', 'letterSpacing'
      ];

      props.forEach(prop => {
        const val = (computed as any)[prop];
        if (val) {
          if (val.includes('okl') || val.includes('color-mix') || val.includes('var(')) {
            copy.style.setProperty(prop, forceStandardColor(val), 'important');
          } else {
            copy.style.setProperty(prop, val, 'important');
          }
        }
      });

      // Special handling for SVG attributes which html2canvas parses separately
      if (orig instanceof SVGElement || copy instanceof SVGElement) {
        ['fill', 'stroke', 'stop-color'].forEach(attr => {
          const val = orig.getAttribute(attr);
          if (val && (val.includes('okl') || val.includes('color-mix'))) {
            copy.setAttribute(attr, forceStandardColor(val));
          }
        });
      }
    } catch (e) { /* ignore */ }
  };

  // Sanitize root if possible
  if (rootOriginal && rootCloned) {
    sanitizeElement(rootOriginal as HTMLElement, rootCloned as HTMLElement);
  }

  // Sanitize all descendants
  for (let i = 0; i < originalNodes.length; i++) {
    const original = originalNodes[i] as HTMLElement;
    const cloned = clonedNodes[i] as HTMLElement;
    if (original && cloned) {
       sanitizeElement(original, cloned);
    }
  }

  // 3. Final safety check: regex replace any remaining strings in inline style attributes
  clonedDoc.querySelectorAll('*').forEach(node => {
    const el = node as HTMLElement;
    if (el.style && el.style.cssText && colorFnRegex.test(el.style.cssText)) {
      el.style.cssText = el.style.cssText.replace(colorFnRegex, (m) => forceStandardColor(m));
    }
  });
};

/**
 * Robust capture utility using html2canvas with heavy-duty sanitization.
 */
export const captureToDataUrl = async (element: HTMLElement, options: any = {}) => {
  const canvas = await html2canvas(element, {
    scale: options.pixelRatio || 2,
    useCORS: true,
    logging: false,
    backgroundColor: options.backgroundColor || '#ffffff',
    onclone: (clonedDoc) => {
      sanitizeForHtml2Canvas(clonedDoc, element);
      
      // If there's a specific container that was originally hidden
      const content = clonedDoc.getElementById(element.id);
      if (content) {
        content.style.display = 'block';
        content.style.position = 'relative';
        content.style.left = '0';
        content.style.top = '0';
        content.style.visibility = 'visible';
      }
    }
  });
  
  return canvas.toDataURL('image/jpeg', options.quality || 0.95);
};

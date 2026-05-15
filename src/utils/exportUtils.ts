
/**
 * Sanitizes a cloned document for html2canvas compatibility.
 * Specifically handles modern CSS color functions (oklch, oklab, color-mix) 
 * that Tailwind 4 emits and html2canvas cannot parse.
 */
export const sanitizeForHtml2Canvas = (clonedDoc: Document) => {
  // 1. Fix all <style> tags
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  
  // Regex to catch modern color functions that html2canvas/SVG renderers often fail at
  const colorFnRegex = /(?:oklch|oklab|color-mix|device-cmyk|light-dark|p3|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|lch)\s*\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/gi;
  
  styleTags.forEach(tag => {
    if (tag.textContent && colorFnRegex.test(tag.textContent)) {
      // Replace with a standard hex color
      // Emerald 600 is #059669, Blue 600 is #2563eb
      tag.textContent = tag.textContent.replace(colorFnRegex, (match) => {
        if (match.toLowerCase().includes('blue')) return '#2563eb';
        return '#059669'; // Default to emerald for the umaroh theme
      });
    }
  });

  // 2. Fix all inline styles and attributes
  clonedDoc.querySelectorAll('*').forEach(node => {
    const element = node as HTMLElement;
    
    // Fix inline styles
    if (element.style && element.style.cssText) {
      if (colorFnRegex.test(element.style.cssText)) {
        element.style.cssText = element.style.cssText.replace(colorFnRegex, (match) => {
          if (match.toLowerCase().includes('blue')) return '#2563eb';
          return '#059669';
        });
      }
    }
    
    // Fix common color attributes
    ['fill', 'stroke', 'color', 'background-color'].forEach(attr => {
      if (element.hasAttribute(attr)) {
        const val = element.getAttribute(attr);
        if (val && colorFnRegex.test(val)) {
          element.setAttribute(attr, val.replace(colorFnRegex, '#059669'));
        }
      }
    });

    // Special case for SVGs
    if (element.tagName.toLowerCase() === 'svg') {
      element.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      // Ensure stroke-width is numeric for html2canvas
      const strokeWidth = element.getAttribute('stroke-width');
      if (strokeWidth && strokeWidth.includes('okl')) {
        element.setAttribute('stroke-width', '2');
      }
    }
  });
};

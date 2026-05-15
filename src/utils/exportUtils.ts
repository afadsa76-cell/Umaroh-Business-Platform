
/**
 * Sanitizes a cloned document for html2canvas compatibility.
 * Specifically handles modern CSS color functions (oklch, oklab, color-mix) 
 * that Tailwind 4 emits and html2canvas cannot parse.
 */
export const sanitizeForHtml2Canvas = (clonedDoc: Document) => {
  // 1. Fix all <style> tags
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  
  // Very broad regex to catch anything like colorFn(...)
  // We handle nested parentheses by matching until the final balanced one might be overkill, 
  // but let's at least catch the common ones.
  const colorFnRegex = /(?:oklch|oklab|color-mix|device-cmyk|light-dark|p3|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|lch)\s*\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/gi;
  
  styleTags.forEach(tag => {
    if (tag.textContent) {
      // Replace with a standard hex color
      // We use a slightly different blue to see if it's working
      tag.textContent = tag.textContent.replace(colorFnRegex, '#3b82f6');
    }
  });

  // 2. Fix all inline styles on all elements
  clonedDoc.querySelectorAll('*').forEach(node => {
    const element = node as HTMLElement;
    if (element.style && element.style.cssText) {
      if (/(?:oklch|oklab|color-mix|device-cmyk|light-dark|p3|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|lch)/i.test(element.style.cssText)) {
        element.style.cssText = element.style.cssText.replace(colorFnRegex, '#3b82f6');
      }
    }
    
    // Specifically handle some attributes that might have colors
    if (element.hasAttribute('fill')) {
      const fill = element.getAttribute('fill');
      if (fill && fill.includes('okl')) {
        element.setAttribute('fill', '#3b82f6');
      }
    }
    if (element.hasAttribute('stroke')) {
      const stroke = element.getAttribute('stroke');
      if (stroke && stroke.includes('okl')) {
        element.setAttribute('stroke', '#3b82f6');
      }
    }
  });
};

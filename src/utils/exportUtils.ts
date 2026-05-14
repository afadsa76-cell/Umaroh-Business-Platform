
/**
 * Sanitizes a cloned document for html2canvas compatibility.
 * Specifically handles modern CSS color functions (oklch, oklab, color-mix) 
 * that Tailwind 4 emits and html2canvas cannot parse.
 */
export const sanitizeForHtml2Canvas = (clonedDoc: Document) => {
  // 1. Fix all <style> tags
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  
  // More robust regex for nested parentheses (up to 3 levels)
  // This is needed for color-mix(in oklab, oklch(...), oklch(...))
  const inner = '(?:[^()]|\\([^()]*\\))*';
  const level2 = `(?:[^()]|\\(${inner}\\))*`;
  const level3 = `(?:[^()]|\\(${level2}\\))*`;
  const colorRegex = new RegExp(`(?:oklch|oklab|color-mix|device-cmyk|light-dark|p3|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|lch)\\s*\\(${level3}\\)`, 'gi');
  
  styleTags.forEach(tag => {
    if (tag.textContent) {
      // Replace with a standard hex color that html2canvas understands
      tag.textContent = tag.textContent.replace(colorRegex, '#3b82f6');
    }
  });

  // 2. Fix all inline styles on all elements
  clonedDoc.querySelectorAll('*').forEach(node => {
    const element = node as HTMLElement;
    if (element.style && element.style.cssText) {
      if (/(?:oklch|oklab|color-mix|device-cmyk|light-dark|p3|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|lch)/i.test(element.style.cssText)) {
        element.style.cssText = element.style.cssText.replace(colorRegex, '#3b82f6');
      }
    }
  });
};

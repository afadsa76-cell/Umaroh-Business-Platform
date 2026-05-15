
/**
 * Sanitizes a cloned document for html2canvas compatibility.
 * Specifically handles modern CSS color functions (oklch, oklab, color-mix) 
 * that Tailwind 4 emits and html2canvas cannot parse.
 */
export const sanitizeForHtml2Canvas = (clonedDoc: Document) => {
  // 1. Regex to catch modern color functions that html2canvas/SVG renderers often fail at
  // Handles nesting up to 3 levels: colorFn(arg1, colorFn(arg2, colorFn(arg3)))
  const inner = '(?:[^()]|\\([^()]*\\))*';
  const level2 = `(?:[^()]|\\(${inner}\\))*`;
  const level3 = `(?:[^()]|\\(${level2}\\))*`;
  const colorFnRegex = new RegExp(`(?:oklch|oklab|color-mix|device-cmyk|light-dark|p3|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|lch)\\s*\\(${level3}\\)`, 'gi');

  const replaceColor = (match: string) => {
    const lowerMatch = match.toLowerCase();
    if (lowerMatch.includes('blue')) return '#2563eb';
    if (lowerMatch.includes('indigo')) return '#4f46e5';
    if (lowerMatch.includes('amber')) return '#d97706';
    if (lowerMatch.includes('red')) return '#dc2626';
    if (lowerMatch.includes('slate') || lowerMatch.includes('gray')) return '#4b5563';
    return '#059669'; // Default to emerald for the umaroh theme
  };

  // 2. Fix all <style> tags (internal styles)
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  styleTags.forEach(tag => {
    if (tag.textContent && colorFnRegex.test(tag.textContent)) {
      tag.textContent = tag.textContent.replace(colorFnRegex, replaceColor);
    }
  });

  // 3. IMPORTANT: Fix external stylesheets (<link rel="stylesheet">)
  // html2canvas will try to parse these. We need to convert them to <style> tags
  // with sanitized content or it will crash trying to parse the modern colors.
  const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
  linkTags.forEach(link => {
    try {
      // In production/Vercel, these are usually same-origin
      // But we can only do this if they are accessible
      const href = link.getAttribute('href');
      if (href && (href.startsWith('/') || href.includes(window.location.host))) {
        // We can't really "fetch" sync here easily without async, 
        // but we can try to find the stylesheet in document.styleSheets
        for (let i = 0; i < document.styleSheets.length; i++) {
          const sheet = document.styleSheets[i];
          if (sheet.href && sheet.href.includes(href)) {
            try {
              let cssText = '';
              const rules = sheet.cssRules;
              for (let j = 0; j < rules.length; j++) {
                cssText += rules[j].cssText + '\n';
              }
              
              if (colorFnRegex.test(cssText)) {
                const newStyle = clonedDoc.createElement('style');
                newStyle.textContent = cssText.replace(colorFnRegex, replaceColor);
                if (link.parentNode) {
                  link.parentNode.replaceChild(newStyle, link);
                }
              }
            } catch (e) {
              console.warn('Could not access cross-origin stylesheet for sanitization:', href);
            }
            break;
          }
        }
      }
    } catch (e) {
      console.error('Error sanitizing link tag:', e);
    }
  });

  // 4. Fix all inline styles and attributes on all elements
  clonedDoc.querySelectorAll('*').forEach(node => {
    const element = node as HTMLElement;
    
    // Fix inline styles via cssText
    if (element.style && element.style.cssText) {
      if (colorFnRegex.test(element.style.cssText)) {
        element.style.cssText = element.style.cssText.replace(colorFnRegex, replaceColor);
      }
    }
    
    // Fix common color attributes
    ['fill', 'stroke', 'color', 'background-color', 'stop-color'].forEach(attr => {
      if (element.hasAttribute(attr)) {
        const val = element.getAttribute(attr);
        if (val && colorFnRegex.test(val)) {
          element.setAttribute(attr, val.replace(colorFnRegex, replaceColor));
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

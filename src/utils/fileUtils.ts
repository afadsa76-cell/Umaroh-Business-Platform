import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const downloadFile = async (dataUrl: string, fileName: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      // For native platform, we save to filesystem and then share/open
      const base64Data = dataUrl.split(',')[1];
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        text: `Buka ${fileName}`,
        url: savedFile.uri,
        dialogTitle: 'Simpan atau Bagikan File',
      });
      
      return true;
    } catch (error) {
      console.error('Error saving/sharing file:', error);
      throw error;
    }
  } else {
    // Standard web download
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
};

function replaceOklchAndOklabInString(str: string): string {
  if (typeof str !== 'string') return str;
  let result = str;

  // 1. Process oklch
  if (result.includes('oklch')) {
    result = result.replace(/oklch\(([^)]+)\)/gi, (match, content) => {
      try {
        const parts = content.trim().split(/[\s,+/]+/);
        if (parts.length < 3) return match;

        const L_val = parts[0];
        const C_val = parts[1];
        const H_val = parts[2];
        const A_val = parts[3];

        const L = L_val.endsWith('%') ? parseFloat(L_val) / 100 : parseFloat(L_val);
        const C = C_val.endsWith('%') ? parseFloat(C_val) / 100 : parseFloat(C_val);
        const H = parseFloat(H_val);
        let alpha = 1;

        if (A_val) {
          alpha = A_val.endsWith('%') ? parseFloat(A_val) / 100 : parseFloat(A_val);
        }

        // Convert OKLCH to OKLab
        const h_rad = (H * Math.PI) / 180;
        const a = C * Math.cos(h_rad);
        const b = C * Math.sin(h_rad);

        // Convert OKLab to LMS
        const L_lms = L + 0.3963377774 * a + 0.2158037573 * b;
        const M_lms = L - 0.1055613458 * a - 0.0638541728 * b;
        const S_lms = L - 0.0894841775 * a - 1.2914855480 * b;

        // Convert LMS to Linear RGB
        const l = Math.pow(Math.max(0, L_lms), 3);
        const m = Math.pow(Math.max(0, M_lms), 3);
        const s = Math.pow(Math.max(0, S_lms), 3);

        // Convert Linear RGB to sRGB
        const r_lin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

        const f = (c: number) => {
          return c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
        };

        const R = Math.max(0, Math.min(255, Math.round(f(r_lin) * 255)));
        const G = Math.max(0, Math.min(255, Math.round(f(g_lin) * 255)));
        const B = Math.max(0, Math.min(255, Math.round(f(b_lin) * 255)));

        if (alpha === 1) {
          return `rgb(${R}, ${G}, ${B})`;
        } else {
          return `rgba(${R}, ${G}, ${B}, ${alpha})`;
        }
      } catch {
        return match;
      }
    });
  }

  // 2. Process oklab
  if (result.includes('oklab')) {
    result = result.replace(/oklab\(([^)]+)\)/gi, (match, content) => {
      try {
        const parts = content.trim().split(/[\s,+/]+/);
        if (parts.length < 3) return match;

        const L_val = parts[0];
        const a_val = parts[1];
        const b_val = parts[2];
        const A_val = parts[3];

        const L = L_val.endsWith('%') ? parseFloat(L_val) / 100 : parseFloat(L_val);
        const a = a_val.endsWith('%') ? parseFloat(a_val) / 100 : parseFloat(a_val);
        const b = b_val.endsWith('%') ? parseFloat(b_val) / 100 : parseFloat(b_val);
        let alpha = 1;

        if (A_val) {
          alpha = A_val.endsWith('%') ? parseFloat(A_val) / 100 : parseFloat(A_val);
        }

        // Convert OKLab to LMS
        const L_lms = L + 0.3963377774 * a + 0.2158037573 * b;
        const M_lms = L - 0.1055613458 * a - 0.0638541728 * b;
        const S_lms = L - 0.0894841775 * a - 1.2914855480 * b;

        // Convert LMS to Linear RGB
        const l = Math.pow(Math.max(0, L_lms), 3);
        const m = Math.pow(Math.max(0, M_lms), 3);
        const s = Math.pow(Math.max(0, S_lms), 3);

        // Convert Linear RGB to sRGB
        const r_lin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

        const f = (c: number) => {
          return c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
        };

        const R = Math.max(0, Math.min(255, Math.round(f(r_lin) * 255)));
        const G = Math.max(0, Math.min(255, Math.round(f(g_lin) * 255)));
        const B = Math.max(0, Math.min(255, Math.round(f(b_lin) * 255)));

        if (alpha === 1) {
          return `rgb(${R}, ${G}, ${B})`;
        } else {
          return `rgba(${R}, ${G}, ${B}, ${alpha})`;
        }
      } catch {
        return match;
      }
    });
  }

  return result;
}

export const runWithOklchFix = async <T>(fn: () => Promise<T>): Promise<T> => {
  const originalGetComputedStyle = window.getComputedStyle;
  const originalStyleSheets = document.styleSheets;

  // 1. Override window.getComputedStyle to translate oklch/oklab to rgb on the fly
  window.getComputedStyle = function(element, pseudoElt) {
    const style = originalGetComputedStyle(element, pseudoElt);
    
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const val = target.getPropertyValue(propertyName);
            if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
              return replaceOklchAndOklabInString(val);
            }
            return val;
          };
        }
        
        const val = Reflect.get(target, prop);
        if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
          return replaceOklchAndOklabInString(val);
        }
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }
    });
  };

  // 2. Override document.styleSheets to proxy cssRules and filter out rules containing 'oklch' or 'oklab'
  let proxiedStyleSheets: unknown[];
  try {
    proxiedStyleSheets = Array.from(originalStyleSheets).map(sheet => {
      try {
        const rules = sheet.cssRules;
        if (!rules) return sheet;

        return new Proxy(sheet, {
          get(target, prop) {
            if (prop === 'cssRules' || prop === 'rules') {
              try {
                const ruleArray = Array.from(target.cssRules);
                const filteredRules = ruleArray.filter(rule => {
                  try {
                    return !rule.cssText.includes('oklch') && !rule.cssText.includes('oklab');
                  } catch {
                    return true;
                  }
                });
                return Object.setPrototypeOf(filteredRules, target.cssRules);
              } catch {
                return target.cssRules;
              }
            }
            return Reflect.get(target, prop);
          }
        });
      } catch {
        return sheet;
      }
    });
  } catch {
    proxiedStyleSheets = Array.from(originalStyleSheets);
  }

  Object.defineProperty(document, 'styleSheets', {
    get() {
      return proxiedStyleSheets;
    },
    configurable: true
  });

  try {
    const result = await fn();
    return result;
  } finally {
    // 3. Restore originals
    window.getComputedStyle = originalGetComputedStyle;
    Object.defineProperty(document, 'styleSheets', {
      get() {
        return originalStyleSheets;
      },
      configurable: true
    });
  }
};


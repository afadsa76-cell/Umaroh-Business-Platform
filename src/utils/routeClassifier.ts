export enum RouteClass {
  STATIC = 'STATIC',
  DEVELOPMENT = 'DEVELOPMENT',
  HEALTH_METRICS = 'HEALTH_METRICS',
  API_PUBLIC = 'API_PUBLIC',
  API_PROTECTED = 'API_PROTECTED'
}

export class RouteClassifier {
  public static classify(url: string): RouteClass {
    const cleanUrl = url.split('?')[0];

    // 1. Development Paths
    if (
      cleanUrl.startsWith('/@') ||
      cleanUrl.startsWith('/src/') ||
      cleanUrl.startsWith('/node_modules/') ||
      cleanUrl.includes('/vite') ||
      cleanUrl.includes('/__vite_ping') ||
      cleanUrl.includes('/@react-refresh')
    ) {
      return RouteClass.DEVELOPMENT;
    }

    // 2. Static Paths
    const staticExtensions = [
      '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.png', '.jpg', '.jpeg',
      '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4',
      '.json', '.map'
    ];
    const isStaticPath =
      cleanUrl.startsWith('/assets/') ||
      cleanUrl.startsWith('/icons/') ||
      cleanUrl.startsWith('/fonts/') ||
      cleanUrl.startsWith('/images/') ||
      cleanUrl.startsWith('/public/') ||
      cleanUrl === '/favicon.ico' ||
      cleanUrl === '/umaroh_logo.mp4' ||
      cleanUrl === '/manifest.json' ||
      cleanUrl === '/service-worker.js' ||
      (staticExtensions.some(ext => cleanUrl.endsWith(ext)) && !cleanUrl.startsWith('/api/'));

    if (isStaticPath) {
      return RouteClass.STATIC;
    }

    // 3. Health & Metrics
    const healthMetricsPaths = [
      '/health',
      '/status',
      '/readiness',
      '/liveness',
      '/metrics',
      '/api/v1/metrics',
      '/api/v1/disaster-recovery/status',
      '/api/v1/security/exposure-audit',
      '/api/v1/security/circuit-breakers',
      '/api/v1/enterprise-dashboard'
    ];
    if (healthMetricsPaths.includes(cleanUrl)) {
      return RouteClass.HEALTH_METRICS;
    }

    // 4. API paths
    if (cleanUrl.startsWith('/api/')) {
      const publicApiPrefixes = [
        '/api/ai/marketing',
        '/api/ai/analytics',
        '/api/ai/jamaah-chat',
        '/api/ai/generate'
      ];
      if (publicApiPrefixes.some(p => cleanUrl.startsWith(p))) {
        return RouteClass.API_PUBLIC;
      }
      return RouteClass.API_PROTECTED;
    }

    // Default to static as it will fallback to frontend index.html
    return RouteClass.STATIC;
  }
}

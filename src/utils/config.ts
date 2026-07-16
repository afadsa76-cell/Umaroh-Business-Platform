export interface AppConfig {
  env: 'development' | 'staging' | 'production';
  port: number;
  firebaseProjectId: string;
  geminiApiKey: string;
  corsWhitelist: string[];
  smtp: {
    host: string;
    user: string;
    pass: string;
  };
  whatsapp: {
    apiUrl: string;
    token: string;
  };
  openai: {
    apiKey: string;
  };
}

const getEnv = (): 'development' | 'staging' | 'production' => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

const getPort = (): number => {
  return 3000;
};

const getCorsWhitelist = (env: 'development' | 'staging' | 'production'): string[] => {
  const rawOrigins = process.env.CORS_ORIGINS;
  if (rawOrigins) {
    return rawOrigins.split(',').map(o => o.trim());
  }

  // Graceful enterprise defaults matching environment topology
  if (env === 'production') {
    return [
      'https://umaroh.com',
      'https://admin.umaroh.com',
      'https://partner.umaroh.com'
    ];
  }
  if (env === 'staging') {
    return [
      'https://staging.umaroh.com',
      'https://staging-admin.umaroh.com'
    ];
  }
  
  // Local Development
  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000'
  ];
};

export const config: AppConfig = {
  env: getEnv(),
  port: getPort(),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0546120404',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
  corsWhitelist: getCorsWhitelist(getEnv()),
  smtp: {
    host: process.env.SMTP_HOST || '',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || '',
    token: process.env.WHATSAPP_TOKEN || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  }
};

/**
 * Enterprise validation of critical configurations before server startup.
 */
export function validateCriticalConfig(): void {
  const missingSecrets: string[] = [];

  if (config.env === 'production') {
    if (!config.geminiApiKey) missingSecrets.push('GEMINI_API_KEY');
    if (config.corsWhitelist.length === 0) missingSecrets.push('CORS_ORIGINS');
  }

  if (missingSecrets.length > 0) {
    console.warn(`[Config Warning] Critical production environment keys are missing: [${missingSecrets.join(', ')}]. Please configure them in Google Secret Manager or your environment config.`);
  }
}

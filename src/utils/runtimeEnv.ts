export class RuntimeEnvironment {
  public static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.VITE_DEV_SERVER === 'true';
  }

  public static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public static isCloudRun(): boolean {
    return !!process.env.K_SERVICE;
  }

  public static isLocal(): boolean {
    return !process.env.K_SERVICE;
  }
}

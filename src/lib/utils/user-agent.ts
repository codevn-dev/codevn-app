export type Browser = 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Opera';
export type OS = 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS';
export type Device = 'Mobile' | 'Tablet' | 'Desktop';

export interface DeviceInfo {
  browser?: Browser;
  os?: OS;
  device: Device | string;
}

export function detectBrowser(userAgent: string): Browser | undefined {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return undefined;
}

export function detectOS(userAgent: string): OS | undefined {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad'))
    return 'iOS';
  return undefined;
}

export function detectDevice(userAgent: string): Device | string {
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone'))
    return 'Mobile';
  if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return 'Tablet';
  return 'Desktop';
}

export function parseUserAgent(userAgent: string, deviceType?: string): DeviceInfo {
  return {
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    device: deviceType ? deviceType : detectDevice(userAgent),
  };
}

/**
 * Country-related types and interfaces
 */

export interface CountryName {
  en: string;
  vi: string;
}

export interface Country {
  name: CountryName;
  dial_code: string;
  code: string;
}

export interface CountryInfo {
  name: CountryName;
  dial_code: string;
}

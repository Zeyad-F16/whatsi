import countryCodes from 'country-codes-list';

export interface Country {
  name: string;
  dialCode: string;
  code: string;
  flag: string;
}

export const countries: Country[] = countryCodes.customArray({
  name: '{countryNameEn}',
  dialCode: '+{countryCallingCode}',
  code: '{countryCode}',
  flag: '{flag}'
}) as Country[];

// Default to Egypt as requested/defaulted
export const defaultCountry = countries.find(c => c.code === 'EG') || countries[0];

const countryCodes = require('country-codes-list');
console.log(countryCodes.customArray({
  name: '{countryNameEn}',
  dialCode: '+{countryCallingCode}',
  code: '{countryCode}',
  flag: '{flag}'
}).slice(0, 3));

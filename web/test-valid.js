const { parsePhoneNumberFromString } = require('libphonenumber-js');

const num1 = parsePhoneNumberFromString('+201033130826');
console.log('+201033130826 is valid?', num1 ? num1.isValid() : false);

const num2 = parsePhoneNumberFromString('+2001033130826');
console.log('+2001033130826 is valid?', num2 ? num2.isValid() : false);

const num3 = parsePhoneNumberFromString('1033130826', 'EG');
console.log('1033130826 (EG) is valid?', num3 ? num3.isValid() : false);

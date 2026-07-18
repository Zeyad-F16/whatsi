const { AsYouType, parsePhoneNumberFromString } = require('libphonenumber-js');

function testEgypt(input) {
  console.log('--- Testing EG input:', input);
  
  // Using parsePhoneNumberFromString with EG
  // Wait, if input is '01033130826', how do we get '1033130826' out of it?
  const parsed = parsePhoneNumberFromString(input, 'EG');
  if (parsed) {
    console.log('nationalNumber:', parsed.nationalNumber);
    console.log('formatNational:', parsed.formatNational());
    console.log('formatInternational:', parsed.formatInternational());
  }

  // Using AsYouType
  const formatter = new AsYouType('EG');
  const formatted = formatter.input(input);
  console.log('AsYouType output:', formatted);
  
  const num = formatter.getNumber();
  if (num) {
    console.log('getNumber.nationalNumber:', num.nationalNumber);
  }
}

testEgypt('01033130826');
testEgypt('0');
testEgypt('10');
testEgypt('1033130826');
testEgypt('0103313082666'); // too long

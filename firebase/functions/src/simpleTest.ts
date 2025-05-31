import * as functions from 'firebase-functions';

export const helloWorld = functions.https.onCall((_data, _context) => {
  console.log('Hello world function called!');
  return {
    message: 'Hello from Firebase Functions!',
    timestamp: new Date().toISOString()
  };
});

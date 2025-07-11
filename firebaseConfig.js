var admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://iot-based-smart-helmet-e49be-default-rtdb.firebaseio.com/"
}); 

// Function to test Firebase connection
const db = admin.database()
module.exports = db ; // export the firestore database


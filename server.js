const express = require("express");
const bodyParser = require('body-parser');
const  db  = require('./firebaseConfig'); // Import db from firebase-config



require('dotenv').config()
const app = express();
const cors = require('cors');
const prefix = '/api'

app.use(cors({
    origin: '*'
}));

app.use(bodyParser.json());
app.use(express.json());

async function testFirebaseConnection() {
    try {
        if (!db) {
            throw new Error('Database object is undefined');
        }
        
        // Simple connection test
        await db.ref('helmets').limitToLast(1).once('value');
        console.log("✅ Firebase Realtime Database Connected successfully");
        
    } catch (error) {
        console.error("❌ Firebase connection error:", error.message);
    }
}

// Test the connection when server starts
testFirebaseConnection();



//---- ROUTER IMPORTS ------
const locations_router = require("./routes/locations_router")
const profile_router = require("./routes/profile_router")
const detection_router = require("./routes/detections_router")
const sensor_router = require("./routes/sensors_routes")

//---- ROUTER APP USE IMPLEMENTATION ------
app.use(`${prefix}/locations`, locations_router);
app.use(`${prefix}/profiles`, profile_router);
app.use(`${prefix}/detections`, detection_router);
app.use(`${prefix}/sensors`, sensor_router);

app.listen(3061, () => {
  console.log("Server is running at port 3061");
});


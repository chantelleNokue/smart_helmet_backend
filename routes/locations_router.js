// const express = require("express");
// require('dotenv').config(); // Load environment variables from .env file
// const router = express.Router();
// const LocationsModel = require("../models/locations_model");
// const axios = require('axios');

// const clerkApiKey = process.env.CLERK_API_KEY;

// // Getting all available locations
// router.get("/getAllLocations", async (req, res) => {
//   try {
//     const locations = await LocationsModel.find();
//     res.json(locations);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// //update the location to the database
// router.post("/create", async (req, res) => {
//   const location = new LocationsModel(req.body);
//   try {
//     const newLocation = await location.save();
//     res.status(201).json(newLocation);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

// //getting location by location id 
// router.post("/path", async (req, res) => {
//   const { locationId } = req.body.locationId;
//   try{
//     const locations = await LocationsModel.find({locationId})
//     res.json(locations)
//   }
//   catch (err){
//     // error handling
//   }
// });

// //get system users 
// router.get('/getUsers', async (req, res) => {
//   try {
//     // Use axios to make a GET request to the Clerk API
//     const clerkApiResponse = await axios.get('https://api.clerk.com/v1/users', {
//       headers: {
//         Authorization: clerkApiKey,
//       },
//     });

//     // Assuming clerkApiResponse.data is an array of user objects
//     const users = clerkApiResponse.data;

//     // Extract all details for each user
//     const usersData = users.map((user) => {
//       const primaryEmail = user.email_addresses.find((email) => email.id === user.primary_email_address_id);
//       const primaryPhoneNumber = user.phone_numbers.find((phoneNumber) => phoneNumber.id === user.primary_phone_number_id);

//       return {
//         id: user.id,
//         object: user.object,
//         username: user.username,
//         first_name: user.first_name,
//         last_name: user.last_name,
//         image_url: user.image_url,
//         has_image: user.has_image,
//         primary_email_address_id: user.primary_email_address_id,
//         primary_phone_number_id: user.primary_phone_number_id,
//         primary_web3_wallet_id: user.primary_web3_wallet_id,
//         password_enabled: user.password_enabled,
//         two_factor_enabled: user.two_factor_enabled,
//         totp_enabled: user.totp_enabled,
//         backup_code_enabled: user.backup_code_enabled,
//         email_addresses: user.email_addresses,
//         phone_numbers: user.phone_numbers,
//         // Add other user-related properties based on your requirements
//         primary_email: primaryEmail ? primaryEmail.email_address : null,
//         primary_phone_number: primaryPhoneNumber ? primaryPhoneNumber.phone_number : null,
//       };
//     });

//     res.json(usersData);
//   } catch (err) {
//     console.error('Error:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


// //creating a user 
// router.post('/createUser', async (req, res) => {
//   try {
//     const { first_name, last_name, email_address, phone_number, username, password } = req.body;

//     // Use axios to make a POST request to create a new user
//     const createUserResponse = await axios.post('https://api.clerk.com/v1/users', {
//       "first_name": first_name,
//       "last_name": last_name,
//       "email_address": email_address,
//       "phone_number": phone_number,
//       "username": username,
//       "password": password,
//       "skip_password_checks": true,
//       "skip_password_requirement": true
//     }, {
//       headers: {
//         Authorization: clerkApiKey,
//         'Content-Type': 'application/json',
//       },
//     });

//     res.json(createUserResponse.data);
//   } catch (err) {
//     console.error('Error:', err.response?.data || err.message);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });



// router.delete('/deleteUser/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // Use axios to make a DELETE request to delete the user
//     const deleteUserResponse = await axios.delete(`https://api.clerk.com/v1/users/${userId}`, {
//       headers: {
//         Authorization: clerkApiKey,
//       },
//     });

//     res.json({ message: 'User deleted successfully', deletedUserId: userId });
//   } catch (err) {
//     console.error('Error:', err);
//     if (err.response && err.response.status === 404) {
//       // Handle the case where the user with the specified ID was not found
//       res.status(404).json({ error: 'User not found' });
//     } else {
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
//   }
// });



// router.post("/recommend", async (req, res) => {
//   try {
//     // Extract query parameters
//     const { size, shading, sunlightIntensity, terrain, province } = req.body;

//     // Construct a filter object
//     const filter = {};
//     if (size) filter.size = Number(size);
//     if (shading) filter.shading = Number(shading);
//     if (sunlightIntensity) filter.sunlightIntensity = Number(sunlightIntensity);
//     if (terrain) filter.terrain = Number(terrain);
//     if (province) filter.province = Number(province);

//     // Find locations based on the filter
//     const locations = await LocationsModel.find(filter);
//     res.json(locations);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });



// module.exports = router;



// // 1. Create USers 
// // 2. Get Users 
// // 3. Get User Details 
// // 4. Delete User 
// // 5. Ban User

const express = require("express");
require('dotenv').config(); // Load environment variables from .env file
const router = express.Router();

// Assuming you still have a separate db connection for Firebase Realtime Database
const db = require('../firebaseConfig'); // Adjust path as needed for your firebaseConfig.js

// Assuming LocationsModel is from a different database (e.g., MongoDB with Mongoose)
const LocationsModel = require("../models/locations_model"); // Keep if still using MongoDB for locations

const axios = require('axios'); // Keep axios for Clerk API calls

const clerkApiKey = process.env.CLERK_API_KEY;

// --- Basic check for Clerk API Key ---
if (!clerkApiKey) {
    console.error("CLERK_API_KEY is not set in your .env file. Clerk user management APIs will not work.");
    // You might want to exit the process or disable related routes if the key is critical
}

// =====================================================
// Locations Management Routes (Assuming MongoDB for these)
// =====================================================

// Getting all available locations
router.get("/getAllLocations", async (req, res) => {
    try {
        const locations = await LocationsModel.find();
        res.json(locations);
    } catch (err) {
        console.error('Error fetching all locations:', err);
        res.status(500).json({ message: err.message });
    }
});

// Create a new location (Assuming this means 'create' new location)
router.post("/create", async (req, res) => {
    const location = new LocationsModel(req.body);
    try {
        const newLocation = await location.save();
        res.status(201).json(newLocation);
    } catch (err) {
        console.error('Error creating location:', err);
        res.status(400).json({ message: err.message });
    }
});

// Getting location by location id
router.post("/path", async (req, res) => {
    const { locationId } = req.body; // Corrected: Assuming locationId is directly in req.body
    try {
        const locations = await LocationsModel.find({ locationId });
        res.json(locations);
    } catch (err) {
        console.error("Error fetching location by ID:", err);
        res.status(500).json({ message: err.message });
    }
});

// Recommend locations based on filters
router.post("/recommend", async (req, res) => {
    try {
        // Extract query parameters
        const { size, shading, sunlightIntensity, terrain, province } = req.body;

        // Construct a filter object
        const filter = {};
        if (size) filter.size = Number(size);
        if (shading) filter.shading = Number(shading);
        if (sunlightIntensity) filter.sunlightIntensity = Number(sunlightIntensity);
        if (terrain) filter.terrain = Number(terrain);
        if (province) filter.province = Number(province);

        // Find locations based on the filter
        const locations = await LocationsModel.find(filter);
        res.json(locations);
    } catch (err) {
        console.error('Error in location recommendation:', err);
        res.status(500).json({ message: err.message });
    }
});


// =====================================================
// User Management Routes (Clerk API + Firebase Realtime DB Sync)
// =====================================================

// 1. Create User (via Clerk API, then sync to Firebase)
router.post('/createUser', async (req, res) => {
    try {
        const { first_name, last_name, email_address, phone_number, username, password, ...otherProfileData } = req.body;

        if (!email_address) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }
        if (!password) {
             return res.status(400).json({ success: false, message: 'Password is required to create a Clerk user.' });
        }


        // --- Step 1: Create user in Clerk ---
        const createUserResponse = await axios.post('https://api.clerk.com/v1/users', {
            "first_name": first_name,
            "last_name": last_name,
            "email_address": [email_address], // Clerk expects array for email_address
            "phone_number": phone_number ? [phone_number] : undefined, // Clerk expects array
            "username": username,
            "password": password,
            "skip_password_checks": true, // Use with caution in production
            "skip_password_requirement": true // Use with caution in production
        }, {
            headers: {
                Authorization: `Bearer ${clerkApiKey}`, // Ensure Bearer token
                'Content-Type': 'application/json',
            },
        });

        const clerkUser = createUserResponse.data;
        const clerkUserId = clerkUser.id; // Get the user ID generated by Clerk

        // --- Step 2: Sync relevant user profile data to Firebase Realtime DB ---
        const userProfileRef = db.ref(`users/${clerkUserId}`);
        const primaryEmail = clerkUser.email_addresses.find(email => email.id === clerkUser.primary_email_address_id)?.email_address || email_address;
        const primaryPhoneNumber = clerkUser.phone_numbers.find(ph => ph.id === clerkUser.primary_phone_number_id)?.phone_number || phone_number;

        const firebaseProfileData = {
            clerkId: clerkUserId, // Store Clerk's ID
            first_name: clerkUser.first_name || first_name,
            last_name: clerkUser.last_name || last_name,
            email_address: primaryEmail,
            phone_number: primaryPhoneNumber,
            username: clerkUser.username || username,
            imageUrl: clerkUser.image_url || null,
            createdAt: clerkUser.created_at || Date.now(), // Use Clerk's timestamp if available
            updatedAt: clerkUser.updated_at || Date.now(),
            status: 'active', // Default status for your application
            ...otherProfileData // Include any other custom data passed in the body
        };

        await userProfileRef.set(firebaseProfileData);

        res.status(201).json({
            success: true,
            message: 'User created in Clerk and profile synced to Firebase successfully.',
            clerkUser: clerkUser, // Return Clerk's response
            firebaseProfile: firebaseProfileData // Return Firebase profile data
        });
    } catch (err) {
        console.error('Error creating user:', err.response?.data || err.message);
        const statusCode = err.response?.status || 500;
        res.status(statusCode).json({
            success: false,
            message: 'Error creating user via Clerk and syncing to Firebase',
            clerkError: err.response?.data || err.message
        });
    }
});


// 2. Get All Users (from Clerk, enriched with Firebase data)
router.get('/getUsers', async (req, res) => {
    try {
        // --- Step 1: Get all users from Clerk API ---
        const clerkApiResponse = await axios.get('https://api.clerk.com/v1/users', {
            headers: {
                Authorization: `Bearer ${clerkApiKey}`,
            },
        });
        const clerkUsers = clerkApiResponse.data;

        // --- Step 2: Get all user profiles from Firebase ---
        const firebaseProfilesSnapshot = await db.ref('users').once('value');
        const firebaseProfiles = firebaseProfilesSnapshot.val() || {};

        // --- Step 3: Merge Clerk data with Firebase profile data ---
        const usersData = clerkUsers.map((clerkUser) => {
            const primaryEmail = clerkUser.email_addresses.find((email) => email.id === clerkUser.primary_email_address_id)?.email_address;
            const primaryPhoneNumber = clerkUser.phone_numbers.find((phoneNumber) => phoneNumber.id === clerkUser.primary_phone_number_id)?.phone_number;

            const firebaseProfile = firebaseProfiles[clerkUser.id] || {}; // Get corresponding Firebase profile

            return {
                id: clerkUser.id, // Clerk's ID
                object: clerkUser.object,
                last_sign_in_at: clerkUser.last_sign_in_at,
                username: clerkUser.username,
                first_name: clerkUser.first_name,
                public_metadata: clerkUser.public_metadata,
                last_name: clerkUser.last_name,
                image_url: clerkUser.image_url,
                primary_email: primaryEmail,
                primary_phone_number: primaryPhoneNumber,
                // Include other relevant Clerk data
                // ...
                // Include Firebase-specific profile data (status, custom roles, etc.)
                appStatus: firebaseProfile.status || 'unknown',
                appRole: firebaseProfile.role || 'user', // Example custom field
                firebaseProfileData: firebaseProfile // Provide full Firebase profile if needed
            };
        });

        res.status(200).json({
            success: true,
            count: usersData.length,
            data: usersData
        });
    } catch (err) {
        console.error('Error fetching users:', err.response?.data || err.message);
        const statusCode = err.response?.status || 500;
        res.status(statusCode).json({
            success: false,
            message: 'Error fetching users from Clerk and Firebase',
            clerkError: err.response?.data || err.message
        });
    }
});

// 3. Get User Details by ID (from Clerk, enriched with Firebase data)
router.get('/getUser/:userId', async (req, res) => {
    try {
        const { userId } = req.params; // This userId is the Clerk user ID

        // --- Step 1: Get user from Clerk API ---
        const clerkApiResponse = await axios.get(`https://api.clerk.com/v1/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${clerkApiKey}`,
            },
        });
        const clerkUser = clerkApiResponse.data;

        // --- Step 2: Get user profile from Firebase ---
        const firebaseProfileSnapshot = await db.ref(`users/${userId}`).once('value');
        const firebaseProfile = firebaseProfileSnapshot.val() || {};

        // --- Step 3: Combine and return data ---
        const primaryEmail = clerkUser.email_addresses.find((email) => email.id === clerkUser.primary_email_address_id)?.email_address;
        const primaryPhoneNumber = clerkUser.phone_numbers.find((phoneNumber) => phoneNumber.id === clerkUser.primary_phone_number_id)?.phone_number;

        const combinedUserData = {
            id: clerkUser.id,
            object: clerkUser.object,
            username: clerkUser.username,
            first_name: clerkUser.first_name,
            last_name: clerkUser.last_name,
            image_url: clerkUser.image_url,
            primary_email: primaryEmail,
            primary_phone_number: primaryPhoneNumber,
            // ... other core Clerk data
            appStatus: firebaseProfile.status || 'unknown',
            appRole: firebaseProfile.role || 'user',
            firebaseProfileData: firebaseProfile // Full Firebase profile data
        };

        res.status(200).json({ success: true, data: combinedUserData });
    } catch (err) {
        console.error('Error fetching user details:', err.response?.data || err.message);
        const statusCode = err.response?.status || 500;
        if (statusCode === 404) {
            res.status(404).json({ success: false, message: 'User not found in Clerk' });
        } else {
            res.status(statusCode).json({
                success: false,
                message: 'Error fetching user details from Clerk and Firebase',
                clerkError: err.response?.data || err.message
            });
        }
    }
});


// 4. Delete User (from Clerk API, then delete from Firebase)
router.delete('/deleteUser/:userId', async (req, res) => {
    try {
        const { userId } = req.params; // This userId is the Clerk user ID

        // --- Step 1: Delete user in Clerk ---
        const deleteUserResponse = await axios.delete(`https://api.clerk.com/v1/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${clerkApiKey}`,
            },
        });

        // --- Step 2: Delete user profile from Firebase Realtime DB ---
        await db.ref(`users/${userId}`).remove();
        // Optional: Also delete their login history from Firebase
        await db.ref(`loginHistory/${userId}`).remove();

        res.status(200).json({
            success: true,
            message: 'User deleted from Clerk and Firebase successfully.',
            deletedUserId: userId,
            clerkResponse: deleteUserResponse.data // Clerk's response
        });
    } catch (err) {
        console.error('Error deleting user:', err.response?.data || err.message);
        const statusCode = err.response?.status || 500;
        if (statusCode === 404) {
            res.status(404).json({ success: false, message: 'User not found in Clerk for deletion.' });
        } else {
            res.status(statusCode).json({
                success: false,
                message: 'Error deleting user from Clerk and Firebase',
                clerkError: err.response?.data || err.message
            });
        }
    }
});


// 5. Ban User (via Clerk API, then sync status to Firebase)
router.post('/banUser/:userId', async (req, res) => {
    try {
        const { userId } = req.params; // This userId is the Clerk user ID
        const { reason = 'Manual ban by admin' } = req.body; // Optional reason for ban

        // --- Step 1: Ban user in Clerk API ---
        const banUserResponse = await axios.patch(`https://api.clerk.com/v1/users/${userId}`, {
            "banned": true // Set user as banned in Clerk
        }, {
            headers: {
                Authorization: `Bearer ${clerkApiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // --- Step 2: Update status in Firebase Realtime DB ---
        const userProfileRef = db.ref(`users/${userId}`);
        const snapshot = await userProfileRef.once('value');

        if (snapshot.exists()) {
            await userProfileRef.update({
                status: 'banned', // Set status for your application's logic
                bannedAt: Date.now(),
                banReason: reason
            });
        } else {
            console.warn(`User profile for ${userId} not found in Firebase. Banned in Clerk only.`);
            // You might want to create a basic profile here if it doesn't exist
            // await userProfileRef.set({ clerkId: userId, status: 'banned', bannedAt: Date.now(), banReason: reason });
        }


        res.status(200).json({
            success: true,
            message: `User ${userId} banned in Clerk and status synced to Firebase.`,
            userId: userId,
            clerkStatus: banUserResponse.data.banned,
            appStatus: 'banned',
            reason: reason
        });
    } catch (err) {
        console.error('Error banning user:', err.response?.data || err.message);
        const statusCode = err.response?.status || 500;
        if (statusCode === 404) {
            res.status(404).json({ success: false, message: 'User not found in Clerk to ban.' });
        } else {
            res.status(statusCode).json({
                success: false,
                message: 'Error banning user via Clerk and syncing to Firebase',
                clerkError: err.response?.data || err.message
            });
        }
    }
});

// Optional: Unban User (via Clerk API, then sync status to Firebase)
router.post('/unbanUser/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason = 'Manual unban by admin' } = req.body;

        // --- Step 1: Unban user in Clerk API ---
        const unbanUserResponse = await axios.patch(`https://api.clerk.com/v1/users/${userId}`, {
            "banned": false // Set user as unbanned in Clerk
        }, {
            headers: {
                Authorization: `Bearer ${clerkApiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // --- Step 2: Update status in Firebase Realtime DB ---
        const userProfileRef = db.ref(`users/${userId}`);
        const snapshot = await userProfileRef.once('value');

        if (snapshot.exists()) {
            await userProfileRef.update({
                status: 'active', // Set status for your application's logic
                unbannedAt: Date.now(),
                unbanReason: reason,
                bannedAt: null, // Clear ban specific fields
                banReason: null
            });
        } else {
            console.warn(`User profile for ${userId} not found in Firebase. Unbanned in Clerk only.`);
        }

        res.status(200).json({
            success: true,
            message: `User ${userId} unbanned in Clerk and status synced to Firebase.`,
            userId: userId,
            clerkStatus: unbanUserResponse.data.banned,
            appStatus: 'active',
            reason: reason
        });
    } catch (err) {
        console.error('Error unbanning user:', err.response?.data || err.message);
        const statusCode = err.response?.status || 500;
        if (statusCode === 404) {
            res.status(404).json({ success: false, message: 'User not found in Clerk to unban.' });
        } else {
            res.status(statusCode).json({
                success: false,
                message: 'Error unbanning user via Clerk and syncing to Firebase',
                clerkError: err.response?.data || err.message
            });
        }
    }
});


// =====================================================
// Login History API (Purely Firebase Realtime Database)
// =====================================================

// Record a new login event
// This would typically be called from your frontend/authentication service AFTER a successful Clerk login.
router.post('/recordLogin', async (req, res) => {
    try {
        const { userId, ipAddress, userAgent, loginMethod, /* other relevant details like device, location */ } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required to record login history.' });
        }

        const timestamp = Date.now();
        const loginRecord = {
            timestamp: timestamp,
            ipAddress: ipAddress || req.ip, // Use req.ip if available, else provided
            userAgent: userAgent || req.headers['user-agent'], // Use req.headers if available, else provided
            loginMethod: loginMethod || 'N/A', // e.g., 'password', 'oauth', 'token'
            // Add other details you want to log
        };

        // Use push() to get a unique key for each login entry under the user's history
        await db.ref(`loginHistory/${userId}`).push(loginRecord);

        res.status(201).json({
            success: true,
            message: 'Login record added successfully.',
            userId: userId,
            loginTimestamp: timestamp
        });
    } catch (err) {
        console.error('Error recording login history:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// Get login history for a specific user
router.get('/getLoginHistory/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 10, startAfter } = req.query; // For pagination

        let query = db.ref(`loginHistory/${userId}`)
            .orderByKey() // Orders by the unique push key (which is timestamp-based)
            .limitToLast(parseInt(limit));

        if (startAfter) {
            // To get older entries for pagination (e.g., if you show latest first)
            query = db.ref(`loginHistory/${userId}`)
                .orderByKey()
                .endBefore(startAfter)
                .limitToLast(parseInt(limit));
        }

        const snapshot = await query.once('value');
        const historyData = snapshot.val();

        if (!historyData) {
            return res.status(200).json({ success: true, data: [], message: 'No login history found for this user.' });
        }

        // Convert the object of login records to a sorted array
        const loginRecords = Object.keys(historyData).map(key => ({
            id: key, // The Firebase push key
            ...historyData[key]
        })).sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending (latest first)

        res.status(200).json({
            success: true,
            count: loginRecords.length,
            data: loginRecords
        });
    } catch (err) {
        console.error('Error fetching login history:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});


module.exports = router;
const express = require("express");
const router = express.Router();
const LocationsModel = require("../models/locations_model");
const axios = require('axios');

// Getting all available locations
router.get("/getAllLocations", async (req, res) => {
  try {
    const locations = await LocationsModel.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//update the location to the database
router.post("/create", async (req, res) => {
  const location = new LocationsModel(req.body);
  try {
    const newLocation = await location.save();
    res.status(201).json(newLocation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//getting location by location id 
router.post("/path", async (req, res) => {
  const { locationId } = req.body.locationId;
  try{
    const locations = await LocationsModel.find({locationId})
    res.json(locations)
  }
  catch (err){
    // error handling
  }
});

//get system users 
router.get('/getUsers', async (req, res) => {
  try {
    // Use axios to make a GET request to the Clerk API
    const clerkApiResponse = await axios.get('https://api.clerk.com/v1/users', {
      headers: {
        Authorization: 'Bearer sk_test_6OvcGEKg14c3RHUUyt5cAGMnguw3FxQaRKVw8suivP',
      },
    });

    // Assuming clerkApiResponse.data is an array of user objects
    const users = clerkApiResponse.data;

    // Extract all details for each user
    const usersData = users.map((user) => {
      const primaryEmail = user.email_addresses.find((email) => email.id === user.primary_email_address_id);
      const primaryPhoneNumber = user.phone_numbers.find((phoneNumber) => phoneNumber.id === user.primary_phone_number_id);

      return {
        id: user.id,
        object: user.object,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        image_url: user.image_url,
        has_image: user.has_image,
        primary_email_address_id: user.primary_email_address_id,
        primary_phone_number_id: user.primary_phone_number_id,
        primary_web3_wallet_id: user.primary_web3_wallet_id,
        password_enabled: user.password_enabled,
        two_factor_enabled: user.two_factor_enabled,
        totp_enabled: user.totp_enabled,
        backup_code_enabled: user.backup_code_enabled,
        email_addresses: user.email_addresses,
        phone_numbers: user.phone_numbers,
        // Add other user-related properties based on your requirements
        primary_email: primaryEmail ? primaryEmail.email_address : null,
        primary_phone_number: primaryPhoneNumber ? primaryPhoneNumber.phone_number : null,
      };
    });

    res.json(usersData);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//creating a user 
router.post('/createUser', async (req, res) => {
  try {
    const { first_name, last_name, email_address, phone_number, username, password } = req.body;

    // Use axios to make a POST request to create a new user
    const createUserResponse = await axios.post('https://api.clerk.com/v1/users', {
      "first_name": first_name,
      "last_name": last_name,
      "email_address": email_address,
      "phone_number": phone_number,
      "username": username,
      "password": password,
      "skip_password_checks": true,
      "skip_password_requirement": true
    }, {
      headers: {
        Authorization: 'Bearer sk_test_6OvcGEKg14c3RHUUyt5cAGMnguw3FxQaRKVw8suivP',
        'Content-Type': 'application/json',
      },
    });

    res.json(createUserResponse.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.delete('/deleteUser/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Use axios to make a DELETE request to delete the user
    const deleteUserResponse = await axios.delete(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: 'Bearer sk_test_6OvcGEKg14c3RHUUyt5cAGMnguw3FxQaRKVw8suivP',
      },
    });

    res.json({ message: 'User deleted successfully', deletedUserId: userId });
  } catch (err) {
    console.error('Error:', err);
    if (err.response && err.response.status === 404) {
      // Handle the case where the user with the specified ID was not found
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});



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
    res.status(500).json({ message: err.message });
  }
});



module.exports = router;



// 1. Create USers 
// 2. Get Users 
// 3. Get User Details 
// 4. Delete User 
// 5. Ban User
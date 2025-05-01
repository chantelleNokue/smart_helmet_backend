const express = require("express");
const router = express.Router();
import Staff from "../models/staff_model";

router.post("/create", async (req, res) => {
  const profile = new Staff(req.body);
  try {
    const newProfile = await profile.save();
    res.status(201).json(newProfile);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
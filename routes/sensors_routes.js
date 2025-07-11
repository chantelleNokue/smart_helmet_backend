// routes/helmetRoutes.js
const express = require('express');
const router = express.Router();
const helmetController = require('../controllers/sensors_controller');



// Sensor Data Routes
router.get('/sensor-data', helmetController.getAllSensorData);
router.get('/helmets/:helmetId', helmetController.getSensorDataByHelmetId);
router.get('/helmets/:helmetId/latest', helmetController.getLatestSensorDataByHelmet);
router.get('/sensor-data/latest', helmetController.getAllLatestSensorData);
router.get('/helmets/:helmetId/history', helmetController.getHistoricalSensorData);
router.post('/helmets/:helmetId/sensor-data', helmetController.addSensorData);
router.get('/helmets/:helmetId/data-range', helmetController.getSensorDataByDateRange);
router.get('/helmets/:helmetId/alerts', helmetController.getAlertsByHelmet);
router.get('/helmets/:helmetId/system-status', helmetController.getSystemStatus);


// Employee Management Routes
router.get('/employees', helmetController.getAllEmployees); // Get all employees
router.post('/employees', helmetController.createEmployee); // NEW: Create a new employee
router.put('/employees/:employeeId', helmetController.updateEmployee); // Renamed: Update an existing employee
router.get('/employees/:employeeId', helmetController.getEmployeeById); // Get single employee by ID
router.delete('/employees/:employeeId', helmetController.deleteEmployee);

// Assignment Management Routes
router.get('/assignments/helmet/:helmetId', helmetController.getHelmetAssignment);
router.post('/assignments/helmet/:helmetId/assign', helmetController.assignHelmetToEmployee);
router.post('/assignments/helmet/:helmetId/unassign', helmetController.unassignHelmet);
router.get('/assignments', helmetController.getAllAssignments);
router.get('/assignments/history/:helmetId', helmetController.getHelmetAssignmentHistory);


// Helmet Configuration Routes (updated for Node.js management)
router.put('/helmets/:helmetId/location', helmetController.updateHelmetLocation);

// ESP32-specific endpoint (can be removed if ESP32 doesn't query this)
router.get('/esp32/assignment/:helmetId', helmetController.getHelmetAssignmentForESP32);

// Analytics and Alerts Routes
router.get('/alerts/history', helmetController.getAllAlertsHistory);
router.get('/analytics/overview', helmetController.getOverviewAnalytics);
router.get('/analytics/safety-trends', helmetController.getSafetyTrends);
router.get('/analytics/miner-performance', helmetController.getMinerPerformance);

// --- NEW ROUTES FOR REAL-TIME ALERTS AND ACKNOWLEDGEMENT ---
// Route to create a new real-time alert (e.g., from a panic button or environmental sensor)
router.post('/alerts/realtime', helmetController.createRealtimeAlert);

// Route to acknowledge an existing alert
router.put('/alerts/:alertId/acknowledge', helmetController.acknowledgeAlert);

router.get('/alerts/latest-alert', helmetController.getLatestAlert);


module.exports = router;
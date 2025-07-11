// controllers/helmetController.js
const db = require('../firebaseConfig');
const moment = require('moment');

// Helper to get ZIM time (CAT) for display, not for storage in DB
const getZimTime = (timestamp) => {
    // const FIREBASE_CUSTOM_EPOCH_OFFSET_SECONDS = 1489617774; // REMOVE OR COMMENT OUT THIS OFFSET IF 'timestamp' IS ALREADY STANDARD UNIX SECONDS

    if (!timestamp) return 'N/A';
    try {
        let date;
        let processedTimestamp = parseFloat(timestamp);

        if (isNaN(processedTimestamp)) {
            // If it's not a number, try to parse it as a date string (fallback)
            date = new Date(timestamp);
        } else {
            // If it's a number, assume it's Unix seconds and convert to milliseconds
            date = new Date(processedTimestamp * 1000); 
            // If you WERE still getting dates like 1970, and your 'timestamp' in Firebase was HUGE (like 3 billion),
            // then you'd need the offset. But if your `timestamp` from the ESP32 is a standard Unix second, 
            // then `processedTimestamp * 1000` is correct.
        }

        return date.toLocaleString('en-US', {
            timeZone: 'Africa/Harare', // Ensure this is correct
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // 24-hour format
        });
    } catch (e) {
        console.error("Error converting timestamp to Zim time:", timestamp, e);
        return 'Invalid Date';
    }
};

// =====================================================
// SENSOR DATA MANAGEMENT FUNCTIONS
// =====================================================

// Get all sensor data for all helmets (consider making this paginated for large datasets)
const getAllSensorData = async (req, res) => {
    try {
        const snapshot = await db.ref('helmets').once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: 'No sensor data found' });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching all sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching all sensor data',
            error: error.message
        });
    }
};

// Get specific helmet's root data (includes latest, sensorData, assignment, location)
const getSensorDataByHelmetId = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const snapshot = await db.ref(`helmets/${helmetId}`).once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: `Helmet data not found for ID: ${helmetId}` });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error(`Error fetching helmet data for ${req.params.helmetId}:`, error);
        res.status(500).json({
            success: false,
            message: 'Error fetching helmet data',
            error: error.message
        });
    }
};

// Get latest sensor data for a specific helmet
const getLatestSensorDataByHelmet = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const snapshot = await db.ref(`helmets/${helmetId}/latest`).once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: 'No latest data found for this helmet' });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching latest sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching latest sensor data',
            error: error.message
        });
    }
};

// Get latest sensor data for all helmets
const getAllLatestSensorData = async (req, res) => {
    try {
        const snapshot = await db.ref('helmets').once('value');
        const helmetsData = snapshot.val();

        if (!helmetsData) {
            return res.status(404).json({ message: 'No helmet data found' });
        }

        const latestData = {};
        Object.keys(helmetsData).forEach(helmetId => {
            const helmetInfo = helmetsData[helmetId]; // Get the full helmet object for this ID

            if (helmetInfo.latest) {
                // Combine the latest sensor data with other top-level helmet properties
                latestData[helmetId] = {
                    ...helmetInfo.latest, // Spread all properties from the 'latest' node
                    helmetId: helmetId,  // Ensure helmetId is explicitly included in the object
                    location: helmetInfo.location // <-- ADD THIS LINE to include location
                    // Add any other top-level helmet properties you need, e.g.,
                    // systemStatus: helmetInfo.system?.status
                };
            }
        });

        if (Object.keys(latestData).length === 0) {
            return res.status(404).json({ message: 'No latest data found' });
        }

        res.status(200).json({
            success: true,
            data: latestData
        });
    } catch (error) {
        console.error('Error fetching all latest sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching all latest sensor data',
            error: error.message
        });
    }
};

// Get historical sensor data for a specific helmet (paginated/limited)
const getHistoricalSensorData = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const { limit = 50, startAfter } = req.query;

        let query = db.ref(`helmets/${helmetId}/sensorData`)
            .orderByKey();

        if (startAfter) {
            query = query.endBefore(startAfter);
        }

        query = query.limitToLast(parseInt(limit));

        const snapshot = await query.once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: 'No historical data found for this helmet' });
        }

        const dataArray = Object.keys(data).map(timestamp => ({
            timestamp: parseInt(timestamp),
            ...data[timestamp]
        })).sort((a, b) => b.timestamp - a.timestamp);

        res.status(200).json({
            success: true,
            data: dataArray,
            count: dataArray.length,
            nextStartAfter: dataArray.length > 0 ? dataArray[dataArray.length - 1].timestamp.toString() : null
        });
    } catch (error) {
        console.error('Error fetching historical sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching historical sensor data',
            error: error.message
        });
    }
};

// Add new sensor data (for manual testing - ESP32 writes directly)
const addSensorData = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const sensorData = req.body;

        const timestamp = sensorData.timestamp ? sensorData.timestamp.toString() : Date.now().toString();

        sensorData.helmetId = helmetId;
        sensorData.timestamp = parseInt(timestamp);

        const sensorDataRef = db.ref(`helmets/${helmetId}/sensorData/${timestamp}`);
        const latestDataRef = db.ref(`helmets/${helmetId}/latest`);
        const systemStatusRef = db.ref(`helmets/${helmetId}/system`);

        await sensorDataRef.set(sensorData);
        await latestDataRef.set(sensorData);

        await systemStatusRef.update({
            lastSeen: parseInt(timestamp),
            online: true
        });


        res.status(201).json({
            success: true,
            message: 'Sensor data added successfully',
            helmetId: helmetId,
            timestamp: timestamp
        });
    } catch (error) {
        console.error('Error adding sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding sensor data',
            error: error.message
        });
    }
};

// Get sensor data within a date range for a specific helmet
const getSensorDataByDateRange = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
        const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);

        if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD or full ISO string.'
            });
        }

        const snapshot = await db.ref(`helmets/${helmetId}/sensorData`)
            .orderByKey()
            .startAt(startTimestamp.toString())
            .endAt(endTimestamp.toString())
            .once('value');

        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({
                message: 'No sensor data found for the specified date range'
            });
        }

        const dataArray = Object.keys(data).map(timestamp => ({
            timestamp: parseInt(timestamp),
            ...data[timestamp]
        })).sort((a, b) => b.timestamp - a.timestamp);

        res.status(200).json({
            success: true,
            data: dataArray,
            count: dataArray.length,
            dateRange: {
                start: new Date(startTimestamp).toISOString(),
                end: new Date(endTimestamp).toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching sensor data by date range:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sensor data by date range',
            error: error.message
        });
    }
};

// Get alerts for a specific helmet (data where any alert is true)
const getAlertsByHelmet = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const { limit = 20 } = req.query;

        const snapshot = await db.ref(`helmets/${helmetId}/sensorData`)
            .orderByKey()
            .limitToLast(parseInt(limit) * 3)
            .once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: 'No data found for this helmet' });
        }

        const alerts = Object.keys(data)
            .map(timestamp => ({
                timestamp: parseInt(timestamp),
                ...data[timestamp]
            }))
            .filter(entry =>
                entry.tempAlert ||
                entry.humidityAlert ||
                entry.gasAlert ||
                entry.panicAlert
            )
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, parseInt(limit));

        res.status(200).json({
            success: true,
            data: alerts,
            count: alerts.length
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching alerts',
            error: error.message
        });
    }
};

// Get system status for a helmet
const getSystemStatus = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const snapshot = await db.ref(`helmets/${helmetId}/system`).once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: 'No system data found for this helmet' });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching system status:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching system status',
            error: error.message
        });
    }
};

// =====================================================
// EMPLOYEE MANAGEMENT FUNCTIONS
// =====================================================

// Get all employees
const getAllEmployees = async (req, res) => {
    try {
        const snapshot = await db.ref('employees').once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: 'No employees found' });
        }

        const employees = Object.keys(data).map(empId => ({
            employeeId: empId,
            ...data[empId]
        }));

        res.status(200).json({
            success: true,
            data: employees,
            count: employees.length
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employees',
            error: error.message
        });
    }
};

// NEW: Create a new employee (ID is generated by Firebase push())
const createEmployee = async (req, res) => {
    try {
        const employeeData = req.body;

        if (!employeeData.first_name || !employeeData.last_name || !employeeData.department) {
            return res.status(400).json({
                success: false,
                message: 'Name and department are required'
            });
        }

        // Generate a new unique key using Firebase's push()
        const newEmployeeRef = db.ref('employees').push();
        const employeeId = newEmployeeRef.key; // Get the generated key

        employeeData.employeeId = employeeId;
        employeeData.createdAt = Date.now(); // Add creation timestamp
        employeeData.updatedAt = Date.now();
        employeeData.status = employeeData.status || 'active';

        await newEmployeeRef.set(employeeData);

        res.status(201).json({ // 201 Created status
            success: true,
            message: 'Employee created successfully',
            employeeId: employeeId,
            data: employeeData
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating employee',
            error: error.message
        });
    }
};


// Renamed: Update an existing employee
const updateEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const employeeData = req.body;

        // --- ADDED VALIDATION: Check if employee exists first ---
        const employeeSnapshot = await db.ref(`employees/${employeeId}`).once('value');
        if (!employeeSnapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Employee not found for update' });
        }
        // --- END ADDED VALIDATION ---

        if  (!employeeData.first_name || !employeeData.last_name || !employeeData.department) {
            return res.status(400).json({
                success: false,
                message: 'Name and department are required'
            });
        }

        // Add metadata - keep existing ID, update timestamp
        employeeData.employeeId = employeeId; // Ensure ID from params is used
        employeeData.updatedAt = Date.now();
        employeeData.status = employeeData.status || employeeSnapshot.val().status || 'active'; // Preserve existing status if not provided

        await db.ref(`employees/${employeeId}`).update(employeeData); // Use .update() for partial updates

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            employeeId: employeeId,
            data: employeeData
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating employee',
            error: error.message
        });
    }
};

const deleteEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params; // Get employeeId from URL parameters

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required for deletion.'
            });
        }

        // Check if the employee exists before attempting to delete
        const employeeSnapshot = await db.ref(`employees/${employeeId}`).once('value');

        if (!employeeSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: `Employee with ID ${employeeId} not found.`
            });
        }

        // Delete the employee record
        await db.ref(`employees/${employeeId}`).remove();

        res.status(200).json({
            success: true,
            message: `Employee with ID ${employeeId} deleted successfully.`
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting employee',
            error: error.message
        });
    }
};
// Get single employee by ID
const getEmployeeById = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const snapshot = await db.ref(`employees/${employeeId}`).once('value');
        const employeeData = snapshot.val();

        if (!employeeData) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({ success: true, data: employeeData });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ success: false, message: 'Error fetching employee', error: error.message });
    }
};

// =====================================================
// ASSIGNMENT MANAGEMENT FUNCTIONS
// =====================================================

// Get helmet assignment information
const getHelmetAssignment = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const assignmentSnapshot = await db.ref(`assignments/${helmetId}`).once('value');
        const assignmentData = assignmentSnapshot.val();

        let responseData = {
            helmetId: helmetId,
            assigned: false,
            message: 'Helmet not assigned to any employee',
            employeeId: null,
            employeeName: null,
            department: null,
            assignedAt: null,
            assignedBy: null,
            shiftStart: null,
            shiftEnd: null,
            status: 'unassigned'
        };

        if (assignmentData && assignmentData.status === 'active') {
            const employeeSnapshot = await db.ref(`employees/${assignmentData.employeeId}`).once('value');
            const employeeData = employeeSnapshot.val();

            responseData = {
                helmetId: helmetId,
                assigned: true,
                employeeId: assignmentData.employeeId,
                employeeName:`${employeeData?.first_name  } ${employeeData?.last_name}` || 'Unknown',
                department: employeeData?.department || 'Unknown',
                assignedAt: assignmentData.assignedAt,
                assignedBy: assignmentData.assignedBy,
                shiftStart: assignmentData.shiftStart,
                shiftEnd: assignmentData.shiftEnd,
                status: assignmentData.status
            };
        }

        res.status(200).json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching helmet assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching helmet assignment',
            error: error.message
        });
    }
};

// Assign helmet to employee
const assignHelmetToEmployee = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const { employeeId, assignedBy, shiftStart, shiftEnd } = req.body;

        if (!employeeId || !assignedBy || !shiftStart || !shiftEnd) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, assigned by, shift start, and shift end are required'
            });
        }

        const parsedShiftStart = new Date(shiftStart).getTime();
        const parsedShiftEnd = new Date(shiftEnd).getTime();

        if (isNaN(parsedShiftStart) || isNaN(parsedShiftEnd)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid shiftStart or shiftEnd date format. Use ISO 8601 string or Unix milliseconds.'
            });
        }

        if (parsedShiftStart >= parsedShiftEnd) {
            return res.status(400).json({
                success: false,
                message: 'Shift start time must be before shift end time.'
            });
        }

        // Check if employee exists (this logic is good and remains)
        const employeeSnapshot = await db.ref(`employees/${employeeId}`).once('value');
        if (!employeeSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }
        const employeeData = employeeSnapshot.val();

        // Check if helmet is currently assigned and active
        const currentAssignmentSnapshot = await db.ref(`assignments/${helmetId}`).once('value');
        if (currentAssignmentSnapshot.exists() && currentAssignmentSnapshot.val().status === 'active') {
            return res.status(400).json({
                success: false,
                message: 'Helmet is already assigned and active.',
                currentAssignment: currentAssignmentSnapshot.val()
            });
        }

        const assignmentTimestamp = Date.now();

        const assignmentData = {
            helmetId: helmetId,
            employeeId: employeeId,
            assignedAt: assignmentTimestamp,
            assignedBy: assignedBy,
            shiftStart: parsedShiftStart,
            shiftEnd: parsedShiftEnd,
            status: 'active'
        };

        await db.ref(`assignments/${helmetId}`).set(assignmentData);

        await db.ref(`helmets/${helmetId}/assignment`).set({
            employeeId: employeeId,
            employeeName: `${employeeData?.first_name  } ${employeeData?.last_name}`,
            department: employeeData.department,
            assignedAt: assignmentTimestamp,
            status: 'active'
        });

        await db.ref(`assignmentHistory/${helmetId}/${assignmentTimestamp}`).set(assignmentData);

        res.status(200).json({
            success: true,
            message: 'Helmet assigned successfully',
            assignment: assignmentData
        });
    } catch (error) {
        console.error('Error assigning helmet:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning helmet',
            error: error.message
        });
    }
};

// Unassign helmet from employee
const unassignHelmet = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const { unassignedBy, reason } = req.body;

        if (!unassignedBy) {
            return res.status(400).json({
                success: false,
                message: 'Unassigned by field is required'
            });
        }

        const assignmentSnapshot = await db.ref(`assignments/${helmetId}`).once('value');
        if (!assignmentSnapshot.exists() || assignmentSnapshot.val().status !== 'active') {
            return res.status(404).json({
                success: false,
                message: 'No active assignment found for this helmet to unassign'
            });
        }

        const currentAssignment = assignmentSnapshot.val();
        const unassignmentTimestamp = Date.now();

        const unassignmentData = {
            ...currentAssignment,
            status: 'inactive',
            unassignedAt: unassignmentTimestamp,
            unassignedBy: unassignedBy,
            reason: reason || 'Manual unassignment'
        };

        await db.ref(`assignments/${helmetId}`).set(unassignmentData);

        await db.ref(`helmets/${helmetId}/assignment`).remove();

        await db.ref(`assignmentHistory/${helmetId}/${unassignmentTimestamp}`).set(unassignmentData);

        res.status(200).json({
            success: true,
            message: 'Helmet unassigned successfully',
            unassignment: unassignmentData
        });
    } catch (error) {
        console.error('Error unassigning helmet:', error);
        res.status(500).json({
            success: false,
            message: 'Error unassigning helmet',
            error: error.message
        });
    }
};

// Get all current active assignments
const getAllAssignments = async (req, res) => {
    try {
        const snapshot = await db.ref('assignments').once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No assignments found'
            });
        }

        const assignments = [];
        for (const helmetId of Object.keys(data)) {
            const assignment = data[helmetId];
            // Remove or modify the condition to include assignments based on your requirements
            // if (assignment.status === 'active') { // Original line
                const employeeSnapshot = await db.ref(`employees/${assignment.employeeId}`).once('value');
                const employeeData = employeeSnapshot.val();

                assignments.push({
                    helmetId: helmetId,
                    employeeId: assignment.employeeId,
                    employeeName: `${employeeData?.first_name || ''} ${employeeData?.last_name || ''}`.trim() || 'Unknown',
                    department: employeeData?.department || 'Unknown',
                    assignedAt: assignment.assignedAt,
                    assignedBy: assignment.assignedBy,
                    shiftStart: assignment.shiftStart,
                    shiftEnd: assignment.shiftEnd,
                    status: assignment.status
                });
            // }
        }

        res.status(200).json({
            success: true,
            data: assignments,
            count: assignments.length
        });
    } catch (error) {
        console.error('Error fetching all assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching all assignments',
            error: error.message
        });
    }
};
// Get assignment history for a helmet
const getHelmetAssignmentHistory = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const { limit = 10 } = req.query;

        const snapshot = await db.ref(`assignmentHistory/${helmetId}`)
            .orderByKey()
            .limitToLast(parseInt(limit))
            .once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No assignment history found for this helmet'
            });
        }

        const history = [];
        // Use a for...of loop with Promise.all for efficient asynchronous operations
        // when fetching employee details for each history entry.
        const historyKeys = Object.keys(data);
        for (const timestamp of historyKeys) {
            const assignmentRecord = data[timestamp];
            let employeeName = 'Unknown';

            // Check if employeeId exists and fetch employee details
            if (assignmentRecord.employeeId) {
                const employeeSnapshot = await db.ref(`employees/${assignmentRecord.employeeId}`).once('value');
                const employeeData = employeeSnapshot.val();
                if (employeeData) {
                    employeeName = `${employeeData.first_name || ''} ${employeeData.last_name || ''}`.trim();
                }
            }

            history.push({
                timestamp: parseInt(timestamp),
                ...assignmentRecord,
                employeeName: employeeName // Add employeeName to the record
            });
        }

        // Sort the history by timestamp in descending order after all data is gathered
        history.sort((a, b) => b.timestamp - a.timestamp);

        res.status(200).json({
            success: true,
            data: history,
            count: history.length
        });
    } catch (error) {
        console.error('Error fetching assignment history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching assignment history',
            error: error.message
        });
    }
};

// =====================================================
// ESP32 SPECIFIC ENDPOINTS
// =====================================================

const getHelmetAssignmentForESP32 = async (req, res) => {
    try {
        const { helmetId } = req.params;

        const assignmentSnapshot = await db.ref(`assignments/${helmetId}`).once('value');
        const assignmentData = assignmentSnapshot.val();

        const locationSnapshot = await db.ref(`helmets/${helmetId}/location`).once('value');
        const helmetLocation = locationSnapshot.val() || 'Unknown Area';

        let response = {
            success: true,
            helmetId: helmetId,
            location: helmetLocation,
            assigned: false,
            employeeId: 'UNASSIGNED',
            employeeName: 'Unassigned Helmet',
            department: 'Unassigned',
            assignedAt: null,
            shiftStart: null,
            shiftEnd: null
        };

        if (assignmentData && assignmentData.status === 'active') {
            const employeeSnapshot = await db.ref(`employees/${assignmentData.employeeId}`).once('value');
            const employeeData = employeeSnapshot.val();

            response = {
                success: true,
                assigned: true,
                helmetId: helmetId,
                employeeId: assignmentData.employeeId,
                employeeName: `${employeeData?.first_name  } ${employeeData?.last_name}` || 'Unknown Employee',
                department: employeeData?.department || 'Unknown Department',
                assignedAt: assignmentData.assignedAt,
                shiftStart: assignmentData.shiftStart,
                shiftEnd: assignmentData.shiftEnd,
                location: helmetLocation
            };
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching assignment for ESP32:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching assignment',
            assigned: false,
            helmetId: req.params.helmetId,
            employeeId: 'ERROR',
            employeeName: 'Assignment Error',
            department: 'System Error',
            location: 'Error',
            assignedAt: null,
            shiftStart: null,
            shiftEnd: null
        });
    }
};

// =====================================================
// HELMET CONFIGURATION FUNCTIONS
// =====================================================

const updateHelmetLocation = async (req, res) => {
    try {
        const { helmetId } = req.params;
        const { location } = req.body;

        if (!location || typeof location !== 'string' || location.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Location (string, non-empty) is required in the request body'
            });
        }

        await db.ref(`helmets/${helmetId}/location`).set(location.trim());

        res.status(200).json({
            success: true,
            message: `Helmet ${helmetId} location updated to '${location}'`,
            helmetId: helmetId,
            newLocation: location
        });

    } catch (error) {
        console.error('Error updating helmet location:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating helmet location',
            error: error.message
        });
    }
};


// =====================================================
// NEW: ANALYTICS AND ALERTS HISTORY FUNCTIONS
// =====================================================

// Function to get all alert history from the /alerts path
// Corresponds to: router.get('/alerts/history', helmetController.getAllAlertsHistory);
const getAllAlertsHistory = async (req, res) => {
    try {
        const alertsRef = db.ref('alerts'); // Reference to your Firebase 'alerts' node
        const snapshot = await alertsRef.once('value');
        const alertsData = snapshot.val(); // This will be an object with timestamp keys

        if (!alertsData) {
            return res.status(200).json({ success: true, data: [] }); // Return empty array if no alerts
        }

        const formattedAlerts = [];
        const assignmentsRef = db.ref('assignments');
        const employeesRef = db.ref('employees');

        const [assignmentsSnapshot, employeesSnapshot] = await Promise.all([
            assignmentsRef.once('value'),
            employeesRef.once('value')
        ]);

        const assignmentsMap = assignmentsSnapshot.val() || {}; // Get all assignments
        const employeesMap = employeesSnapshot.val() || {};     // Get all employees

        // Iterate over the alerts object, converting it to an array
        for (const timestampKey in alertsData) {
            if (alertsData.hasOwnProperty(timestampKey)) {
                const alert = alertsData[timestampKey]; // Individual alert object
                
                let minerName = 'Unknown Miner';
                let helmetId = alert.helmetId || 'N/A'; // Use helmetId from alert
                let location = 'Unknown Location';
                
                // Try to find corresponding assignment and employee for richer details
                if (helmetId && assignmentsMap[helmetId]) {
                    const assignment = assignmentsMap[helmetId]; 
                    if (assignment.employeeId && employeesMap[assignment.employeeId]) {
                        const employee = employeesMap[assignment.employeeId];
                        minerName = `${employee.first_name || ''} ${employee.last_name || ''}`;
                        location = assignment.location || location; // Prefer assignment location
                    }
                }

                // Format the timestamp for display using the helper
                const alertTimestampFormatted = getZimTime(alert.timestamp || parseInt(timestampKey));

                // Construct the alert object, directly using Firebase fields
                const newAlert = {
                    id: timestampKey, // Use timestamp key as a unique ID for React keys
                    // Use alert.alertType directly (e.g., "HUMIDITY", "PANIC")
                    alertType: alert.alertType || 'UNKNOWN', // Default to UNKNOWN if not present
                    message: alert.message || 'Generic Alert',
                    miner: minerName,
                    helmetId: helmetId, // Ensure this matches your frontend's expectation for mapping
                    location: location,
                    
                    // Include specific sensor values if they exist in the alert object
                    ...(alert.humidity !== undefined && { humidity: alert.humidity }),
                    ...(alert.temperature !== undefined && { temperature: alert.temperature }),
                    ...(alert.gasLevel !== undefined && { gasLevel: alert.gasLevel }),

                    // Include timestamp and duration
                    timestamp: parseInt(alert.timestamp || timestampKey), // Keep original numeric timestamp for sorting
                    timestampFormatted: alertTimestampFormatted, // For display
                    duration: alert.duration || 'N/A', // Assuming duration can be stored in alert data
                    resolved: alert.resolved || false,

                    // Only include these if they exist in the Firebase alert object
                    ...(alert.threshold !== undefined && { threshold: alert.threshold }),
                    ...(alert.resolvedBy !== undefined && { resolvedBy: alert.resolvedBy })
                };
                
                formattedAlerts.push(newAlert);
            }
        }
        
        // Sort alerts by timestamp, most recent first
        formattedAlerts.sort((a, b) => b.timestamp - a.timestamp);

        res.status(200).json({
            success: true,
            data: formattedAlerts
        });

    } catch (error) {
        console.error('Error fetching all alerts history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching all alerts history',
            error: error.message
        });
    }
};

// Function for Overview Analytics
// Corresponds to: router.get('/analytics/overview', helmetController.getOverviewAnalytics);
const getOverviewAnalytics = async (req, res) => {
    try {
        const alertsRef = db.ref('alerts');
        const helmetsRef = db.ref('helmets');
        const assignmentsRef = db.ref('assignments');

        const [alertsSnapshot, helmetsSnapshot, assignmentsSnapshot] = await Promise.all([
            alertsRef.once('value'),
            helmetsRef.once('value'),
            assignmentsRef.once('value')
        ]);

        const alertsData = alertsSnapshot.val() || {};
        const helmetsData = helmetsSnapshot.val() || {};
        const assignmentsData = assignmentsSnapshot.val() || {};

        let totalAlerts = 0;
        let criticalAlerts = 0;
        let warningAlerts = 0;
        let infoAlerts = 0;
        let resolvedAlerts = 0;
        let unresolvedAlerts = 0;

        // Calculate alert counts
        Object.values(alertsData).forEach(alert => {
            totalAlerts++;
            if (alert.resolved) {
                resolvedAlerts++;
            } else {
                unresolvedAlerts++;
            }
            switch (alert.type) {
                case 'critical':
                    criticalAlerts++;
                    break;
                case 'warning':
                    warningAlerts++;
                    break;
                case 'info':
                    infoAlerts++;
                    break;
                case 'emergency': // Handle the 'emergency' type from panic button
                    criticalAlerts++; // Often treated as critical
                    break;
                default:
                    infoAlerts++; // Default for any unclassified alerts
            }
        });

        // Calculate active miners (assigned helmets)
        let minersActive = 0;
        Object.values(assignmentsData).forEach(assignment => {
            if (assignment.status === 'active') {
                minersActive++;
            }
        });

        // Calculate average response time for resolved alerts
        let totalResponseTimeMs = 0;
        let resolvedAlertsWithDuration = 0;
        Object.values(alertsData).forEach(alert => {
            if (alert.resolved && alert.timestamp && alert.resolvedAt) {
                const duration = alert.resolvedAt - alert.timestamp; // Duration in milliseconds
                if (duration > 0) {
                    totalResponseTimeMs += duration;
                    resolvedAlertsWithDuration++;
                }
            }
        });
        const avgResponseTime = resolvedAlertsWithDuration > 0 
                                ? (totalResponseTimeMs / (resolvedAlertsWithDuration * 1000 * 60)).toFixed(1) + ' min' 
                                : 'N/A';

        // Calculate safety score and incident rate
        const safetyScore = totalAlerts > 0 ? ((totalAlerts - criticalAlerts) / totalAlerts * 100).toFixed(0) : 100;
        const incidentRate = totalAlerts > 0 && minersActive > 0 ? (totalAlerts / minersActive).toFixed(2) : 0;

        const overviewData = {
            totalAlerts,
            criticalAlerts,
            warningAlerts,
            infoAlerts,
            resolvedAlerts,
            unresolvedAlerts,
            minersActive,
            avgResponseTime,
            safetyScore: parseInt(safetyScore),
            incidentRate: parseFloat(incidentRate),
            totalHelmets: Object.keys(helmetsData).length
        };

        res.status(200).json({ success: true, data: overviewData });
    } catch (error) {
        console.error('Error fetching overview analytics:', error);
        res.status(500).json({ success: false, message: 'Error fetching overview analytics', error: error.message });
    }
};

// Function for Safety Trends
// Corresponds to: router.get('/analytics/safety-trends', helmetController.getSafetyTrends);
const getSafetyTrends = async (req, res) => {
    try {
        const alertsRef = db.ref('alerts');
        const snapshot = await alertsRef.once('value');
        const alertsData = snapshot.val() || {};

        const monthlyData = {};

        // Define a cutoff date (e.g., 6 months ago)
        const sixMonthsAgo = moment().subtract(6, 'months').valueOf(); // ValueOf gets milliseconds timestamp

        Object.values(alertsData).forEach(alert => {
            if (!alert.timestamp) {
                console.warn('Alert object missing "timestamp" property. Skipping:', alert);
                return;
            }

            let timestampInSeconds = parseInt(alert.timestamp);

            if (isNaN(timestampInSeconds)) {
                console.warn('Invalid timestamp value found in alert (not a number). Skipping:', alert, 'Value:', alert.timestamp);
                return;
            }

            const timestampInMs = timestampInSeconds * 1000;

            // --- NEW FILTERING LOGIC ---
            if (timestampInMs < sixMonthsAgo) {
                // console.log(`Skipping old alert: ${moment(timestampInMs).format('YYYY-MM-DD HH:mm:ss')}`);
                return; // Skip alerts older than 6 months
            }
            // --- END NEW FILTERING LOGIC ---

            const date = new Date(timestampInMs);

            if (isNaN(date.getTime())) {
                console.warn('Date object creation failed for timestamp. Skipping:', alert, 'Timestamp (ms):', timestampInMs);
                return;
            }
            
            const monthYear = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });

            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = { 
                    month: monthYear, 
                    incidents: 0, 
                    criticalIncidents: 0, 
                    totalAlertsForScore: 0
                };
            }

            monthlyData[monthYear].incidents++;
            monthlyData[monthYear].totalAlertsForScore++;
            if (alert.alertType === 'CRITICAL' || alert.alertType === 'PANIC') {
                monthlyData[monthYear].criticalIncidents++;
            }
        });

        const trends = Object.values(monthlyData).map(data => {
            const safetyScore = data.totalAlertsForScore > 0 
                                ? ((data.totalAlertsForScore - data.criticalIncidents) / data.totalAlertsForScore * 100).toFixed(0) 
                                : 100;

            return {
                month: data.month,
                incidents: data.incidents,
                safetyScore: parseInt(safetyScore),
            };
        });

        trends.sort((a, b) => {
            const dateA = new Date(a.month.replace(/(\w{3})\s(\d{4})/, '$1 1, $2'));
            const dateB = new Date(b.month.replace(/(\w{3})\s(\d{4})/, '$1 1, $2'));
            return dateA - dateB;
        });

        res.status(200).json({ success: true, data: trends });
    } catch (error) {
        console.error('Error fetching safety trends:', error);
        res.status(500).json({ success: false, message: 'Error fetching safety trends', error: error.message });
    }
};

// Function for Miner Performance
// Corresponds to: router.get('/analytics/miner-performance', helmetController.getMinerPerformance);
const getMinerPerformance = async (req, res) => {
    try {
        const employeesRef = db.ref('employees');
        const assignmentsRef = db.ref('assignments');
        const alertsRef = db.ref('alerts');

        const [employeesSnapshot, assignmentsSnapshot, alertsSnapshot] = await Promise.all([
            employeesRef.once('value'),
            assignmentsRef.once('value'),
            alertsRef.once('value')
        ]);

        const employeesData = employeesSnapshot.val() || {};
        const assignmentsData = assignmentsSnapshot.val() || {};
        const alertsData = alertsSnapshot.val() || {};

        const performanceMap = {};

        // Initialize performance data for all employees
        Object.keys(employeesData).forEach(empId => {
            const employee = employeesData[empId];
            performanceMap[empId] = {
                employeeId: empId,
                name: `${employee.first_name || ''} ${employee.last_name || ''}`,
                department: employee.department || 'N/A',
                safetyScore: 100, // Default to 100
                incidents: 0,
                criticalIncidents: 0,
                totalAlerts: 0, // Used for safety score calculation
                hoursWorked: 0, 
            };
        });

        // Map helmets to current and historical assignments to calculate hours worked and link alerts
        const helmetToEmployeeMap = {}; // Maps active helmetId to employeeId
        const employeeShiftHistory = {}; // For accumulating hoursWorked

        Object.values(assignmentsData).forEach(assignment => {
            if (assignment.status === 'active' && assignment.helmetId && assignment.employeeId) {
                helmetToEmployeeMap[assignment.helmetId] = assignment.employeeId;
            }
            // For hours worked, we need to consider all historical assignments if 'shiftEnd' is present
            // This is a simplified approach, a more robust system would calculate from full shift history
            if (assignment.employeeId && assignment.shiftStart && assignment.shiftEnd) {
                 const start = parseInt(assignment.shiftStart);
                 const end = parseInt(assignment.shiftEnd);
                 if (!isNaN(start) && !isNaN(end) && end > start) {
                    const durationHours = (end - start) / (1000 * 60 * 60);
                    if (!employeeShiftHistory[assignment.employeeId]) {
                        employeeShiftHistory[assignment.employeeId] = 0;
                    }
                    employeeShiftHistory[assignment.employeeId] += durationHours;
                 }
            }
        });

        // Process alerts and link to employees
        Object.values(alertsData).forEach(alert => {
            // Try to find the employee for this alert's helmet at the time of the alert
            // This is simplified: it just uses the *current* assignment map.
            // A more accurate approach would involve querying assignment history for the specific alert timestamp.
            const employeeId = alert.employeeId || helmetToEmployeeMap[alert.helmetId]; 

            if (employeeId && performanceMap[employeeId]) {
                performanceMap[employeeId].incidents++;
                performanceMap[employeeId].totalAlerts++;
                if (alert.type === 'critical' || alert.type === 'emergency') {
                    performanceMap[employeeId].criticalIncidents++;
                }
            }
        });

        // Finalize performance calculations
        const minerPerformance = Object.values(performanceMap).map(miner => {
            // Update hours worked from aggregated shift history
            miner.hoursWorked = (employeeShiftHistory[miner.employeeId] || 0).toFixed(1);

            // Recalculate safety score based on incidents
            if (miner.totalAlerts > 0) {
                miner.safetyScore = ((miner.totalAlerts - miner.criticalIncidents) / miner.totalAlerts * 100).toFixed(0);
            } else {
                miner.safetyScore = 100; // No alerts, perfect score
            }
            miner.safetyScore = parseInt(miner.safetyScore); // Convert to integer

            // Remove temporary calculation fields
            delete miner.criticalIncidents;
            delete miner.totalAlerts;

            return miner;
        });
        
        // Sort by safety score (highest first) or other relevant metric
        minerPerformance.sort((a, b) => b.safetyScore - a.safetyScore);


        res.status(200).json({ success: true, data: minerPerformance });
    } catch (error) {
        console.error('Error fetching miner performance:', error);
        res.status(500).json({ success: false, message: 'Error fetching miner performance', error: error.message });
    }
};


// NEW: Function to create a new real-time alert
const createRealtimeAlert = async (req, res) => {
    try {
        const { id, alertType, message, location, timestamp, minerId, helmetId, severity } = req.body;

        const alertsRef = db.ref('alerts');
        const newAlertRef = alertsRef.child(id.toString()); 

        const alertData = {
            alertType: alertType,
            message: message,
            location: location || 'Unknown Location',
            timestamp: timestamp, // This timestamp from frontend should now be standard Unix seconds
            timestampFormatted: getZimTime(timestamp), // Format for display
            minerId: minerId || null,
            helmetId: helmetId || null,
            resolved: false,
            resolvedBy: null,
            duration: 'N/A',
            acknowledged: false,
            severity: severity || 'INFO',
        };

        await newAlertRef.set(alertData);

        res.status(201).json({
            success: true,
            message: 'Real-time alert created successfully',
            data: { id: id, ...alertData }
        });

    } catch (error) {
        console.error('Error creating real-time alert:', error);
        res.status(500).json({ success: false, message: 'Failed to create real-time alert', error: error.message });
    }
};

// NEW: Function to acknowledge an alert
const acknowledgeAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        const { resolvedBy } = req.body;

        if (!alertId) {
            return res.status(400).json({ success: false, message: 'Alert ID is required.' });
        }

        const alertRef = db.ref(`alerts/${alertId}`);
        const snapshot = await alertRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Alert not found.' });
        }

        const originalAlertData = snapshot.val();
        const originalTimestamp = originalAlertData.timestamp; 

        let duration = 'N/A';
        if (typeof originalTimestamp === 'number') {
            const currentTimeSeconds = Math.floor(Date.now() / 1000);
            const alertDurationSeconds = currentTimeSeconds - originalTimestamp;
            duration = `${alertDurationSeconds} seconds`; 
        }
        
        await alertRef.update({
            resolved: true,
            acknowledged: true,
            resolvedBy: resolvedBy || 'System/User',
            duration: duration,
        });

        res.status(200).json({ success: true, message: `Alert ${alertId} acknowledged successfully.` });

    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ success: false, message: 'Failed to acknowledge alert', error: error.message });
    }
};


const getLatestAlert = async (req, res) => {
  try {
    const alertsRef = db.ref('alerts');

    // Query to get the last child based on the automatically generated push key
    // limitToLast(1) gets only the very last entry
    const snapshot = await alertsRef.orderByKey().limitToLast(1).once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'No alerts found.' });
    }

    let latestAlert = null;
    snapshot.forEach((childSnapshot) => {
      // The forEach loop will run only once for the single item returned by limitToLast(1)
      latestAlert = {
        id: childSnapshot.key, // Get the auto-generated key as the alert ID
        ...childSnapshot.val(),
      };
    });

    res.status(200).json({ success: true, latestAlert });

  } catch (error) {
    console.error('Error fetching latest alert:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch latest alert', error: error.message });
  }
};
module.exports = {
    getAllSensorData,
    getSensorDataByHelmetId,
    getLatestSensorDataByHelmet,
    getAllLatestSensorData,
    getHistoricalSensorData,
    addSensorData,
    getSensorDataByDateRange,
    getAlertsByHelmet,
    getSystemStatus,
    getLatestAlert,

    acknowledgeAlert,
    createRealtimeAlert,

    getAllEmployees,
    createEmployee, // NEWLY EXPORTED
    updateEmployee, // RENAMED AND MODIFIED
    getEmployeeById,
    deleteEmployee,

    getHelmetAssignment,
    assignHelmetToEmployee,
    unassignHelmet,
    getAllAssignments,
    getHelmetAssignmentHistory,

    getHelmetAssignmentForESP32,

    updateHelmetLocation,


    getAllAlertsHistory,
    getOverviewAnalytics,
    getSafetyTrends,
    getMinerPerformance
};
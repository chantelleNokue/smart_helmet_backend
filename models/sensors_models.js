// Sensor data model/schema definition
class SensorData {
    constructor(data) {
        // Based on your Firebase structure, adjust these fields as needed
        this.timestamp = data.timestamp || Date.now();
        this.temperature = data.temperature || null;
        this.humidity = data.humidity || null;
        this.gasLevel = data.gasLevel || null;
        this.location = data.location || null;
        this.alertLevel = data.alertLevel || 'normal';
        
        // Add any other sensor fields you have
        // You can see the actual fields in your Firebase console
    }
    
    // Validation method
    isValid() {
     
        return this.timestamp && 
               (this.temperature !== null || 
                this.humidity !== null || 
                this.gasLevel !== null);
    }
    
    // Convert to JSON for API responses
    toJSON() {
        return {
            timestamp: this.timestamp,
            temperature: this.temperature,
            humidity: this.humidity,
            gasLevel: this.gasLevel,
            location: this.location,
            alertLevel: this.alertLevel,
            // Include formatted date for easier frontend use
            dateFormatted: new Date(this.timestamp).toISOString()
        };
    }
    
    // Static method to create from Firebase data
    static fromFirebaseData(id, data) {
        return {
            id: id,
            ...new SensorData(data).toJSON()
        };
    }
}

module.exports = SensorData;
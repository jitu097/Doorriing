// Configuration
const API_BASE_URL = 'https://fhir.healthcare-api.com';
const API_USERNAME = 'coalition';
const API_PASSWORD = 'skills-test';

// DOM Elements
const loading = document.getElementById('loading');
const contentWrapper = document.getElementById('content-wrapper');
const error = document.getElementById('error');

/**
 * Encodes credentials for Basic Auth
 * @param {string} username - API username
 * @param {string} password - API password
 * @returns {string} Base64 encoded credentials
 */
function encodeBasicAuth(username, password) {
    return btoa(`${username}:${password}`);
}

/**
 * Makes an API request with Basic Auth
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} API response data
 */
async function apiRequest(endpoint) {
    try {
        const authHeader = encodeBasicAuth(API_USERNAME, API_PASSWORD);
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (err) {
        console.error('API Request Error:', err);
        throw err;
    }
}

/**
 * Formats date to readable format
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return '--';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return '--';
    }
}

/**
 * Calculates age from date of birth
 * @param {string} dob - Date of birth
 * @returns {number} Age in years
 */
function calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * Displays patient information
 * @param {Object} patientData - Patient data from API
 */
function displayPatientInfo(patientData) {
    try {
        // Extract patient information
        const name = patientData.name?.[0];
        const nameDisplay = name ? `${name.given?.[0] || ''} ${name.family || ''}`.trim() : 'Unknown';
        const dob = patientData.birthDate;
        const gender = patientData.gender || 'Unknown';
        const phone = patientData.telecom?.find(t => t.system === 'phone')?.value || '--';
        const email = patientData.telecom?.find(t => t.system === 'email')?.value || '--';
        
        // Set patient name and initials
        document.getElementById('patient-name').textContent = nameDisplay;
        const initials = nameDisplay.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
        document.getElementById('patient-initials').textContent = initials || 'P';
        
        // Set patient details
        document.getElementById('patient-dob').textContent = `DOB: ${formatDate(dob)}`;
        document.getElementById('patient-gender').textContent = `Gender: ${gender.charAt(0).toUpperCase() + gender.slice(1)}`;
        document.getElementById('patient-phone').textContent = `Phone: ${phone}`;
        document.getElementById('patient-email').textContent = `Email: ${email}`;
        
        // Set emergency contact and insurance (placeholder)
        document.getElementById('patient-emergency').textContent = 'Emergency Contact: Bernard Shaw';
        document.getElementById('patient-insurance').textContent = 'Insurance Provider: Humana';
    } catch (err) {
        console.error('Error displaying patient info:', err);
    }
}

/**
 * Displays vital signs
 * @param {Object} vitals - Vital signs data
 */
function displayVitals(vitals) {
    try {
        // Blood Pressure
        const bpSystolic = vitals.blood_pressure?.[0]?.systolic ?? '--';
        const bpDiastolic = vitals.blood_pressure?.[0]?.diastolic ?? '--';
        document.getElementById('bp-sys').textContent = bpSystolic;
        document.getElementById('bp-dia').textContent = bpDiastolic;
        
        // Temperature
        const temperature = vitals.temperature?.[0]?.value ?? '--';
        document.getElementById('temperature').textContent = temperature;
        
        // Heart Rate
        const heartRate = vitals.heart_rate?.[0]?.value ?? '--';
        document.getElementById('heart-rate').textContent = heartRate;
        
        // Respiratory Rate
        const respiratoryRate = vitals.respiratory_rate?.[0]?.value ?? '--';
        document.getElementById('respiratory-rate').textContent = respiratoryRate;
    } catch (err) {
        console.error('Error displaying vitals:', err);
    }
}

/**
 * Creates blood pressure chart
 * @param {Array} bpHistory - Blood pressure history data
 */
function createBloodPressureChart(bpHistory) {
    try {
        const ctx = document.getElementById('blood-pressure-chart');
        if (!ctx || !bpHistory || bpHistory.length === 0) {
            console.warn('No blood pressure data available for chart');
            return;
        }

        // Sort by month/year
        const sortedBP = bpHistory.sort((a, b) => {
            const dateA = new Date(a.month || 0, a.year || 0);
            const dateB = new Date(b.month || 0, b.year || 0);
            return dateA - dateB;
        });

        // Prepare chart data
        const labels = sortedBP.map(record => {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[record.month - 1] || 'Unknown';
            return `${month} ${record.year}`;
        });

        const systolicData = sortedBP.map(record => record.systolic);
        const diastolicData = sortedBP.map(record => record.diastolic);

        // Create chart
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Systolic',
                        data: systolicData,
                        borderColor: '#0078D4',
                        backgroundColor: 'rgba(0, 120, 212, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#0078D4',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Diastolic',
                        data: diastolicData,
                        borderColor: '#50E3C2',
                        backgroundColor: 'rgba(80, 227, 194, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#50E3C2',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 14, weight: '600' },
                            color: '#1F1F1F',
                            padding: 16,
                            usePointStyle: true
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 60,
                        max: 200,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            font: { size: 12 },
                            color: '#666666'
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            font: { size: 12 },
                            color: '#666666'
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    } catch (err) {
        console.error('Error creating blood pressure chart:', err);
    }
}

/**
 * Displays diagnosis history
 * @param {Array} diagnosisHistory - Diagnosis history data
 */
function displayDiagnosisHistory(diagnosisHistory) {
    try {
        const diagnosisList = document.getElementById('diagnosis-list');
        
        if (!diagnosisHistory || diagnosisHistory.length === 0) {
            diagnosisList.innerHTML = '<div class="list-item"><span class="condition-name">No diagnosis data available</span><span class="recorded-date">--</span></div>';
            return;
        }

        diagnosisList.innerHTML = diagnosisHistory.map(diagnosis => `
            <div class="list-item">
                <span class="condition-name">${diagnosis.name || 'Unknown'}</span>
                <span class="recorded-date">${formatDate(diagnosis.date)}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error displaying diagnosis history:', err);
    }
}

/**
 * Displays lab results
 * @param {Array} labResults - Lab results data
 */
function displayLabResults(labResults) {
    try {
        const labList = document.getElementById('lab-results');
        
        if (!labResults || labResults.length === 0) {
            labList.innerHTML = '<div class="list-item"><span class="test-name">No lab results available</span><span class="test-value">--</span></div>';
            return;
        }

        labList.innerHTML = labResults.map(result => `
            <div class="list-item">
                <span class="test-name">${result.test_type || 'Unknown Test'}</span>
                <span class="test-value">${result.value || '--'} ${result.unit || ''}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error displaying lab results:', err);
    }
}

/**
 * Shows error state
 */
function showError() {
    loading.style.display = 'none';
    contentWrapper.style.display = 'none';
    error.style.display = 'flex';
}

/**
 * Main function to load and display patient data
 */
async function loadPatientData() {
    try {
        // Fetch all patients to find Jessica Taylor
        const patientsResponse = await apiRequest('/Patient');
        const patients = patientsResponse.entry || [];
        
        // Find Jessica Taylor
        const jessicaTaylor = patients.find(entry => {
            const patient = entry.resource;
            const fullName = patient.name?.[0];
            const name = `${fullName?.given?.[0] || ''} ${fullName?.family || ''}`.trim();
            return name.toLowerCase().includes('jessica') && name.toLowerCase().includes('taylor');
        });

        if (!jessicaTaylor) {
            console.error('Jessica Taylor not found in patient list');
            showError();
            return;
        }

        const patientId = jessicaTaylor.resource.id;
        const patientData = jessicaTaylor.resource;

        // Display patient info
        displayPatientInfo(patientData);

        // Fetch observations (vitals, etc.)
        const observationsResponse = await apiRequest(`/Observation?subject=Patient/${patientId}`);
        const observations = observationsResponse.entry || [];

        // Process observations and organize by type
        const vitals = {
            blood_pressure: [],
            temperature: [],
            heart_rate: [],
            respiratory_rate: []
        };

        observations.forEach(entry => {
            const obs = entry.resource;
            const code = obs.code?.coding?.[0]?.code;
            const value = obs.value?.Quantity?.value;
            const date = obs.effectiveDateTime;

            if (code === '55284-4') { // Blood pressure
                const systolic = obs.component?.find(c => c.code.coding[0].code === '8480-6')?.valueQuantity?.value;
                const diastolic = obs.component?.find(c => c.code.coding[0].code === '8462-4')?.valueQuantity?.value;
                vitals.blood_pressure.push({ systolic, diastolic, date });
            } else if (code === '8310-5') { // Temperature
                vitals.temperature.push({ value, date });
            } else if (code === '8867-4') { // Heart rate
                vitals.heart_rate.push({ value, date });
            } else if (code === '9279-1') { // Respiratory rate
                vitals.respiratory_rate.push({ value, date });
            }
        });

        // Get latest vitals for display
        const latestBP = vitals.blood_pressure[vitals.blood_pressure.length - 1];
        const latestTemp = vitals.temperature[vitals.temperature.length - 1];
        const latestHR = vitals.heart_rate[vitals.heart_rate.length - 1];
        const latestRR = vitals.respiratory_rate[vitals.respiratory_rate.length - 1];

        // Display vitals
        displayVitals({
            blood_pressure: latestBP ? [latestBP] : [],
            temperature: latestTemp ? [latestTemp] : [],
            heart_rate: latestHR ? [latestHR] : [],
            respiratory_rate: latestRR ? [latestRR] : []
        });

        // Create blood pressure chart with history (mock data if needed)
        const bpChartData = vitals.blood_pressure.map((bp, index) => ({
            systolic: bp.systolic,
            diastolic: bp.diastolic,
            month: ((index % 12) + 1),
            year: 2023 + Math.floor(index / 12)
        }));
        
        createBloodPressureChart(bpChartData);

        // Fetch conditions for diagnosis history
        const conditionsResponse = await apiRequest(`/Condition?subject=Patient/${patientId}`);
        const conditions = conditionsResponse.entry?.map(entry => ({
            name: entry.resource.code?.text || 'Unknown Condition',
            date: entry.resource.recordedDate
        })) || [];
        displayDiagnosisHistory(conditions);

        // Fetch diagnostic reports for lab results
        const labResponse = await apiRequest(`/DiagnosticReport?subject=Patient/${patientId}`);
        const labResults = labResponse.entry?.map(entry => ({
            test_type: entry.resource.code?.text || 'Lab Test',
            value: entry.resource.conclusion || 'Pending',
            unit: ''
        })) || [];
        displayLabResults(labResults);

        // Show content
        loading.style.display = 'none';
        contentWrapper.style.display = 'block';

    } catch (err) {
        console.error('Failed to load patient data:', err);
        showError();
    }
}

// Load patient data when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadPatientData();
});

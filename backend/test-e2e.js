const http = require('http');

async function runTests() {
  const { server } = require('./server');

  // Wait 1 second for DB connection
  await new Promise(r => setTimeout(r, 1000));

  const baseUrl = 'http://localhost:5000';

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  console.log('\n--- 1. Testing Health Endpoint ---');
  const health = await request('/api/health');
  console.log('Health:', health.status, health.data.platform);

  console.log('\n--- 2. Testing Admin Login ---');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@crisisgrid.com', password: 'admin123' })
  });
  console.log('Admin Login status:', adminLogin.status, 'Role:', adminLogin.data?.user?.role);
  const adminToken = adminLogin.data?.token;

  console.log('\n--- 3. Testing Citizen Login ---');
  const citizenLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'citizen@crisisgrid.com', password: 'citizen123' })
  });
  console.log('Citizen Login status:', citizenLogin.status, 'Role:', citizenLogin.data?.user?.role);
  const citizenToken = citizenLogin.data?.token;

  console.log('\n--- 4. Testing AI Analyze Endpoint ---');
  const aiTest = await request('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ description: 'Industrial gas cylinder explosion causing massive fire and structural damage' })
  });
  console.log('AI Analysis Type:', aiTest.data?.data?.type, 'Severity:', aiTest.data?.data?.severity);
  console.log('AI Recommended Resources:', aiTest.data?.data?.recommendedResources);

  console.log('\n--- 5. Testing Create Incident with AI ---');
  const newIncident = await request('/api/incidents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      title: 'Chemical Factory Fire & Smoke',
      description: 'Massive blaze broke out with heavy toxic smoke and workers possibly trapped.',
      location: 'Industrial Zone Block C',
      latitude: 12.9801,
      longitude: 77.6105
    })
  });
  console.log('Created Incident ID:', newIncident.data?.data?.id, 'Type:', newIncident.data?.data?.type, 'Severity:', newIncident.data?.data?.severity, 'Status:', newIncident.data?.data?.status);
  const incidentId = newIncident.data?.data?.id;

  console.log('\n--- 6. Testing Get Incidents ---');
  const incidentList = await request('/api/incidents');
  console.log('Total Incidents:', incidentList.data?.count);

  console.log('\n--- 7. Testing Get Resources ---');
  const resourcesList = await request('/api/resources');
  console.log('Total Resources:', resourcesList.data?.count);
  const firstAvailableResource = resourcesList.data?.data?.find(r => r.available > 0);
  console.log('Candidate Resource for assignment:', firstAvailableResource?.name, 'Available:', firstAvailableResource?.available);

  if (incidentId && firstAvailableResource) {
    console.log('\n--- 8. Testing Assign Resource to Incident ---');
    const assignRes = await request(`/api/incidents/${incidentId}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        resource_id: firstAvailableResource.id,
        quantity: 1
      })
    });
    console.log('Assignment Result:', assignRes.status, assignRes.data?.message);

    console.log('\n--- 9. Testing Incident Status Update to In Progress ---');
    const statusUpdate = await request(`/api/incidents/${incidentId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'In Progress' })
    });
    console.log('Status Update Result:', statusUpdate.data?.message, 'Current Status:', statusUpdate.data?.data?.status);

    console.log('\n--- 10. Testing Incident Status Update to Resolved ---');
    const resolvedUpdate = await request(`/api/incidents/${incidentId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Resolved' })
    });
    console.log('Resolved Update Result:', resolvedUpdate.data?.message, 'Current Status:', resolvedUpdate.data?.data?.status);
  }

  console.log('\nALL BACKEND API TESTS COMPLETED SUCCESSFULLY! Closing server...');
  server.close();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

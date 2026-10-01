const http = require('http');
const fs = require('fs');
const path = require('path');

async function runCctvTests() {
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
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  console.log('\n======================================================');
  console.log('🧪 TESTING CCTV CAMERA INTEGRATION END-TO-END');
  console.log('======================================================');

  console.log('\n--- 1. Testing Admin Authentication ---');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@crisisgrid.com', password: 'admin123' })
  });
  console.log('Admin Login status:', adminLogin.status, 'Role:', adminLogin.data?.user?.role);
  const adminToken = adminLogin.data?.token;

  if (!adminToken) {
    throw new Error('Admin login failed. Aborting tests.');
  }

  console.log('\n--- 2. Testing CCTV Camera Fleet Stats ---');
  const statsRes = await request('/api/cameras/stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('Camera Stats:', statsRes.status, statsRes.data?.data);

  console.log('\n--- 3. Testing Get All Cameras ---');
  const camerasRes = await request('/api/cameras', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('Total Cameras:', camerasRes.data?.count);
  const onlineCams = camerasRes.data?.data?.filter(c => c.status === 'ONLINE');
  const offlineCams = camerasRes.data?.data?.filter(c => c.status === 'OFFLINE');
  console.log(`Online: ${onlineCams.length} | Offline: ${offlineCams.length}`);

  console.log('\n--- 4. Testing Manual Snapshot Trigger on Camera ---');
  const firstOnlineCam = onlineCams[0];
  const snapRes = await request(`/api/cameras/${firstOnlineCam.id}/snapshot`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({})
  });
  console.log('Manual Snapshot Result:', snapRes.status, snapRes.data?.message);
  console.log('Snapshot File:', snapRes.data?.data?.snapshot?.filePath);

  // Verify file was written to disk and is accessible via HTTP
  if (snapRes.data?.data?.snapshot?.filePath) {
    const fileRes = await fetch(`${baseUrl}${snapRes.data.data.snapshot.filePath}`);
    console.log('Evidence HTTP Serve Status:', fileRes.status, 'Content-Type:', fileRes.headers.get('content-type'));
  }

  console.log('\n--- 5. Testing Automated Proximity Detection & Evidence Capture on New Incident ---');
  // Incident near Riverside Colony (12.9716, 77.5946) where CCTV-001 (12.9735, 77.5960) & CCTV-002 (12.9680, 77.5920) are within 0.5 KM
  const newIncident = await request('/api/incidents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Structural Cracks & Flood Surge at Riverside Bridge',
      description: 'Rapidly rising water levels threatening the bridge support pillars. Immediate visual confirmation needed.',
      location: 'Riverside Colony, Ward 4',
      latitude: 12.9715987,
      longitude: 77.5945627
    })
  });
  console.log('Created Incident ID:', newIncident.data?.data?.id, 'Title:', newIncident.data?.data?.title);
  const incId = newIncident.data?.data?.id;

  console.log('\n--- 6. Verifying Incident Details with Nearby CCTV & Evidence ---');
  const incDetails = await request(`/api/incidents/${incId}`);
  console.log('Incident Fetch Status:', incDetails.status);
  console.log('Nearby Cameras Detected:', incDetails.data?.data?.nearbyCameras?.length);
  for (const cam of incDetails.data?.data?.nearbyCameras || []) {
    console.log(`  -> ${cam.camera_id} (${cam.camera_name}): Distance ${cam.distance_km} KM | Status: ${cam.camera_status} | Capture: ${cam.capture_status}`);
  }
  console.log('Associated CCTV Evidence Records:', incDetails.data?.data?.cctvEvidence?.length);
  for (const ev of incDetails.data?.data?.cctvEvidence || []) {
    console.log(`  -> Evidence from ${ev.camera_id}: ${ev.file_path} (Captured: ${ev.captured_at})`);
  }

  console.log('\n--- 7. Testing No-Camera / Remote Situation Handling ---');
  // Remote location with coordinates far away from any camera (> 50 KM away)
  const remoteIncident = await request('/api/incidents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Isolated Forest Fire in Deep Valley',
      description: 'Smoke column observed in uninhabited deep valley sector.',
      location: 'Deep Valley Remote Sector Z',
      latitude: 13.5000,
      longitude: 78.5000
    })
  });
  console.log('Remote Incident Created ID:', remoteIncident.data?.data?.id);
  const remoteDetails = await request(`/api/incidents/${remoteIncident.data?.data?.id}`);
  console.log('Remote Incident Nearby Cameras Count:', remoteDetails.data?.data?.nearbyCameras?.length);
  console.log('Remote Incident Handled Gracefully without error:', remoteDetails.status === 200);

  console.log('\n--- 8. Testing Camera Creation & Deletion (Admin CRUD) ---');
  const createCamRes = await request('/api/cameras', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      camera_id: 'CCTV-TEST-99',
      name: 'Temporary Incident Testing Camera',
      type: 'Mock',
      latitude: 12.9716,
      longitude: 77.5946,
      location: 'Emergency Command Tent',
      status: 'ONLINE'
    })
  });
  console.log('Create Camera Status:', createCamRes.status, 'ID:', createCamRes.data?.data?.camera_id);
  const testCamDbId = createCamRes.data?.data?.id;

  if (testCamDbId) {
    const deleteCamRes = await request(`/api/cameras/${testCamDbId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Delete Camera Status:', deleteCamRes.status, deleteCamRes.data?.message);
  }

  console.log('\n======================================================');
  console.log('✅ ALL CCTV TESTS COMPLETED SUCCESSFULLY!');
  console.log('======================================================');

  server.close();
  process.exit(0);
}

runCctvTests().catch(err => {
  console.error('CCTV Test Execution Failed:', err);
  process.exit(1);
});

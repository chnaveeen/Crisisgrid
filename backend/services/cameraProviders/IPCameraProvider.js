const fs = require('fs');
const path = require('path');
const CameraProvider = require('./CameraProvider');
const MockCameraProvider = require('./MockCameraProvider');

class IPCameraProvider extends CameraProvider {
  constructor(storageDir = path.join(__dirname, '../../uploads/cctv')) {
    super();
    this.storageDir = storageDir;
    this.mockFallback = new MockCameraProvider(storageDir);
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async getCameraStatus(camera) {
    if (camera.status === 'OFFLINE') {
      return { online: false, status: 'OFFLINE', latencyMs: 0 };
    }

    if (!camera.snapshot_url || camera.snapshot_url.includes('demo.crisisgrid.internal')) {
      // Demo/internal placeholder URL
      return { online: true, status: 'ONLINE', latencyMs: 25, isSimulationUrl: true };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const start = Date.now();
      const res = await fetch(camera.snapshot_url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      return {
        online: res.ok,
        status: res.ok ? 'ONLINE' : 'UNREACHABLE',
        latencyMs: Date.now() - start
      };
    } catch (err) {
      return { online: false, status: 'UNREACHABLE', error: err.message };
    }
  }

  async captureSnapshot(camera, incidentId = null) {
    if (camera.status === 'OFFLINE') {
      throw new Error(`IP Camera ${camera.camera_id} is currently OFFLINE.`);
    }

    // If camera URL is a real accessible endpoint, attempt HTTP fetch
    if (camera.snapshot_url && !camera.snapshot_url.includes('demo.crisisgrid.internal')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(camera.snapshot_url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          const ext = contentType.includes('png') ? 'png' : 'jpg';
          const buffer = Buffer.from(await res.arrayBuffer());
          const fileName = `cctv_${camera.camera_id}_inc_${incidentId || 'manual'}_${Date.now()}.${ext}`;
          const fullPath = path.join(this.storageDir, fileName);
          fs.writeFileSync(fullPath, buffer);

          return {
            filePath: `/uploads/cctv/${fileName}`,
            fileName,
            fileType: contentType,
            capturedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            simulated: false
          };
        }
      } catch (err) {
        console.warn(`[IPCameraProvider] Direct HTTP snapshot failed for ${camera.camera_id}, using simulated fallback:`, err.message);
      }
    }

    // Use Mock fallback for demo URLs or unreachable lab networks
    return await this.mockFallback.captureSnapshot(camera, incidentId);
  }

  async getStream(camera) {
    return {
      streamUrl: camera.stream_url || camera.snapshot_url,
      protocol: 'HTTP_MJPEG',
      simulated: camera.snapshot_url?.includes('demo.crisisgrid.internal') || false
    };
  }
}

module.exports = IPCameraProvider;

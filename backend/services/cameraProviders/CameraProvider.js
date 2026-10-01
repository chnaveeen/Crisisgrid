/**
 * Abstract Base Class: CameraProvider
 * Standard interface for all CCTV camera adapters (Mock, IP, RTSP, etc.)
 */
class CameraProvider {
  /**
   * Check if camera is currently reachable and online
   * @param {Object} camera 
   * @returns {Promise<{ online: boolean, status: string, latencyMs?: number }>}
   */
  async getCameraStatus(camera) {
    throw new Error('getCameraStatus() must be implemented by subclass');
  }

  /**
   * Capture a single high-resolution image snapshot from the camera
   * @param {Object} camera 
   * @param {number|string} incidentId 
   * @returns {Promise<{ filePath: string, fileType: string, capturedAt: string, simulated: boolean }>}
   */
  async captureSnapshot(camera, incidentId) {
    throw new Error('captureSnapshot() must be implemented by subclass');
  }

  /**
   * Request a short video segment recording (if supported)
   * @param {Object} camera 
   * @param {number|string} incidentId 
   * @param {number} durationSeconds 
   * @returns {Promise<{ filePath: string, fileType: string, capturedAt: string }>}
   */
  async captureVideoSegment(camera, incidentId, durationSeconds = 10) {
    throw new Error('captureVideoSegment() must be implemented by subclass');
  }

  /**
   * Get client-compatible stream metadata (e.g. HLS/WebRTC URL or stream info)
   * @param {Object} camera 
   * @returns {Promise<{ streamUrl: string, protocol: string }>}
   */
  async getStream(camera) {
    throw new Error('getStream() must be implemented by subclass');
  }

  /**
   * Cleanly disconnect or terminate camera socket/stream
   * @param {Object} camera 
   */
  async disconnect(camera) {
    // Default no-op
    return true;
  }
}

module.exports = CameraProvider;

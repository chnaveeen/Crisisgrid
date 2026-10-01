-- CrisisGrid AI Database Schema & Seed Data
-- Database: crisisgrid

DROP DATABASE IF EXISTS `crisisgrid`;
CREATE DATABASE `crisisgrid` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `crisisgrid`;

-- 1. Users Table
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('citizen', 'admin') NOT NULL DEFAULT 'citizen',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Resources Table
CREATE TABLE `resources` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('Ambulance', 'Fire Truck', 'Rescue Team', 'Medical Kit', 'Boat') NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `available` INT NOT NULL DEFAULT 1,
  `location` VARCHAR(255) NOT NULL,
  `status` ENUM('Available', 'Busy', 'Maintenance') NOT NULL DEFAULT 'Available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Incidents Table
CREATE TABLE `incidents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `type` ENUM('Flood', 'Fire', 'Accident', 'Medical', 'Landslide', 'Other') NOT NULL,
  `severity` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `status` ENUM('Reported', 'Assigned', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Reported',
  `ai_summary` TEXT,
  `detection_source` ENUM('Citizen', 'CCTV_AUTO_DETECTION') NOT NULL DEFAULT 'Citizen',
  `detection_camera_id` INT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_incidents_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_incidents_detection_camera` FOREIGN KEY (`detection_camera_id`) REFERENCES `cameras`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Incident Resources Mapping Table
CREATE TABLE `incident_resources` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `incident_id` INT NOT NULL,
  `resource_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ir_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ir_resource` FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. CCTV Cameras Table
CREATE TABLE `cameras` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `camera_id` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('IP', 'RTSP', 'MJPEG', 'Snapshot', 'Mock') NOT NULL DEFAULT 'Mock',
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `status` ENUM('ONLINE', 'OFFLINE', 'MAINTENANCE') NOT NULL DEFAULT 'ONLINE',
  `stream_url` VARCHAR(500) NULL,
  `snapshot_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Incident-Camera Association Table
CREATE TABLE `incident_camera` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `incident_id` INT NOT NULL,
  `camera_id` INT NOT NULL,
  `distance_km` DECIMAL(6, 3) NOT NULL,
  `capture_status` ENUM('PENDING', 'CAPTURED', 'FAILED', 'SKIPPED_OFFLINE') NOT NULL DEFAULT 'PENDING',
  `captured_at` TIMESTAMP NULL,
  CONSTRAINT `fk_ic_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ic_camera` FOREIGN KEY (`camera_id`) REFERENCES `cameras`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. CCTV Evidence Table
CREATE TABLE `cctv_evidence` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `incident_id` INT NOT NULL,
  `camera_id` INT NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL DEFAULT 'image/svg+xml',
  `captured_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `capture_start_time` TIMESTAMP NULL,
  `capture_end_time` TIMESTAMP NULL,
  `stream_reference` VARCHAR(500) NULL,
  `evidence_type` VARCHAR(50) NOT NULL DEFAULT 'snapshot',
  `status` VARCHAR(50) NOT NULL DEFAULT 'captured',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ce_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ce_camera` FOREIGN KEY (`camera_id`) REFERENCES `cameras`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------
-- SEED DATA
-- ----------------------------------------------------

-- Demo Users
-- Admin: admin@crisisgrid.com / admin123
-- Citizen: citizen@crisisgrid.com / citizen123
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`) VALUES
(1, 'Commander Sarah Connor', 'admin@crisisgrid.com', '$2b$10$bjUUVQnD.yyjTyV9eYEtMerwM8lL.2rnDdLThQ68KM5VWdmGcf05q', 'admin'),
(2, 'Alex Mercer', 'citizen@crisisgrid.com', '$2b$10$XDagCjDhe7/mV/.MciHp0.rEJ2ykBgGCY5LcAE6srpZ3eA5Wo94mu', 'citizen');

-- Demo Emergency Resources
INSERT INTO `resources` (`id`, `name`, `type`, `quantity`, `available`, `location`, `status`) VALUES
(1, 'ALS Ambulance Alpha-1', 'Ambulance', 3, 2, 'Central Station Base', 'Available'),
(2, 'Rapid Rescue Fire Engine 4', 'Fire Truck', 2, 1, 'Sector 7 Firehouse', 'Available'),
(3, 'Tactical Flood Rescue Team', 'Rescue Team', 4, 3, 'Riverfront Depot', 'Available'),
(4, 'High-Water Inflatable Boat B-2', 'Boat', 3, 2, 'Harbor Station', 'Available'),
(5, 'Emergency Trauma Medical Kit #12', 'Medical Kit', 10, 8, 'Metro General Hospital', 'Available'),
(6, 'ALS Ambulance Bravo-2', 'Ambulance', 2, 2, 'Northside Clinic', 'Available'),
(7, 'Heavy Ladder Truck Engine 9', 'Fire Truck', 1, 0, 'Downtown Station', 'Busy'),
(8, 'Disaster Search & Dog Squad', 'Rescue Team', 2, 2, 'Civil Defense HQ', 'Available');

-- Demo Incidents (with realistic coordinates)
INSERT INTO `incidents` (`id`, `title`, `description`, `type`, `severity`, `location`, `latitude`, `longitude`, `status`, `ai_summary`, `created_by`, `created_at`) VALUES
(1, 'Flash Flooding at Riverside Colony', 'Water level has increased rapidly following cloudburst. Over 20 houses are flooded and residents are stranded on upper floors.', 'Flood', 'Critical', 'Riverside Colony, Ward 4', 12.9715987, 77.5945627, 'Assigned', 'Flash flood inundated residential buildings; urgent evacuation needed for trapped residents.', 2, NOW() - INTERVAL 45 MINUTE),
(2, 'Commercial Complex Fire Outbreak', 'Thick black smoke and flames coming out from the second floor electronics warehouse. Staff evacuated but fire is spreading to adjacent units.', 'Fire', 'High', 'Techno Park Sector 2', 12.9823410, 77.6082120, 'In Progress', 'Major structural fire in commercial electronics warehouse with active spread risk.', 2, NOW() - INTERVAL 2 HOUR),
(3, 'Multi-Vehicle Collision on Express Highway', 'Three cars and a light truck collided during heavy rain. Two drivers reported injured with glass cuts and whiplash.', 'Accident', 'Medium', 'Express Highway Mile 14', 12.9554320, 77.5812980, 'Reported', 'Multi-car highway collision with 2 non-fatal injuries requiring ambulance dispatch and traffic clearance.', 2, NOW() - INTERVAL 30 MINUTE),
(4, 'Cardiac Emergency at Community Sports Center', 'A 55-year-old athlete collapsed on the badminton court, experiencing acute chest pain and difficulty breathing.', 'Medical', 'High', 'Metro Sports Complex', 12.9612000, 77.6387000, 'Resolved', 'Acute suspected myocardial infarction requiring urgent defibrillation and paramedic transport.', 2, NOW() - INTERVAL 5 HOUR),
(5, 'Hillside Mudslide Blocking Access Road', 'Continuous torrential rain caused soil erosion and mudslide across the mountain bypass road, trapping two vehicles safely inside.', 'Landslide', 'High', 'Pine Hill Ridge Road', 13.0124500, 77.5543200, 'Assigned', 'Mud and debris blocking vital mountain arterial route; rescue clearance team deployed.', 2, NOW() - INTERVAL 3 HOUR);

-- Demo Resource Assignments
INSERT INTO `incident_resources` (`incident_id`, `resource_id`, `quantity`, `assigned_at`) VALUES
(1, 3, 1, NOW() - INTERVAL 35 MINUTE),
(1, 4, 1, NOW() - INTERVAL 35 MINUTE),
(2, 2, 1, NOW() - INTERVAL 100 MINUTE),
(5, 3, 1, NOW() - INTERVAL 150 MINUTE);

-- Demo CCTV Cameras
INSERT INTO `cameras` (`id`, `camera_id`, `name`, `type`, `latitude`, `longitude`, `location`, `status`, `stream_url`, `snapshot_url`) VALUES
(1, 'CCTV-001', 'Riverside Bridge Surveillance', 'Mock', 12.9735000, 77.5960000, 'Riverside Bridge North Pier', 'ONLINE', 'rtsp://demo.crisisgrid.internal/live/cctv001', 'http://demo.crisisgrid.internal/snapshot/cctv001.jpg'),
(2, 'CCTV-002', 'Ward 4 Traffic Junction Cam', 'Mock', 12.9680000, 77.5920000, 'Ward 4 Main Signal Crossroads', 'ONLINE', 'rtsp://demo.crisisgrid.internal/live/cctv002', 'http://demo.crisisgrid.internal/snapshot/cctv002.jpg'),
(3, 'CCTV-003', 'Techno Park Gate 1 Security', 'Mock', 12.9830000, 77.6070000, 'Sector 2 Tech Park Main Gate', 'ONLINE', 'rtsp://demo.crisisgrid.internal/live/cctv003', 'http://demo.crisisgrid.internal/snapshot/cctv003.jpg'),
(4, 'CCTV-004', 'IT Corridor East Flyover', 'Mock', 12.9800000, 77.6110000, 'Techno Corridor Overhead Gantry', 'OFFLINE', 'rtsp://demo.crisisgrid.internal/live/cctv004', 'http://demo.crisisgrid.internal/snapshot/cctv004.jpg'),
(5, 'CCTV-005', 'Express Highway Toll Plaza Cam', 'Snapshot', 12.9560000, 77.5825000, 'Express Highway Mile 14 Toll Booth', 'ONLINE', 'rtsp://demo.crisisgrid.internal/live/cctv005', 'http://demo.crisisgrid.internal/snapshot/cctv005.jpg'),
(6, 'CCTV-006', 'South Highway Overpass Cam', 'IP', 12.9510000, 77.5790000, 'South Ring Bypass Pedestrian Walkway', 'ONLINE', 'rtsp://demo.crisisgrid.internal/live/cctv006', 'http://demo.crisisgrid.internal/snapshot/cctv006.jpg'),
(7, 'CCTV-007', 'Hillside North Forest Watch', 'Mock', 13.0140000, 77.5560000, 'Pine Hill Fire Watchtower #3', 'ONLINE', 'rtsp://demo.crisisgrid.internal/live/cctv007', 'http://demo.crisisgrid.internal/snapshot/cctv007.jpg'),
(8, 'CCTV-008', 'Metro Sports Complex Arena Gate', 'Mock', 12.9620000, 77.6370000, 'Stadium East Parking & Entrance', 'ONLINE', 'rtsp://demo.crisisgrid.internal/live/cctv008', 'http://demo.crisisgrid.internal/snapshot/cctv008.jpg'),
(9, 'CCTV-009', 'Outer Ring Road Perimeter Cam', 'Mock', 12.9200000, 77.6800000, 'Far South Outer Ring Road Sector 12', 'ONLINE', 'rtsp://demo.crisisgrid.internal/live/cctv009', 'http://demo.crisisgrid.internal/snapshot/cctv009.jpg');

-- ==============================================================================
-- DATABASE: Kidney Transplant Management System
-- DESCRIPTION: Final Optimized Schema (MySQL Compatible)
-- ==============================================================================

-- 0. CREATE AND USE THE DATABASE FIRST
CREATE DATABASE IF NOT EXISTS kidney_transplant;
USE kidney_transplant;

-- 1. Drop tables if they exist (to avoid errors on re-running)
DROP TABLE IF EXISTS Billing_Invoice;
DROP TABLE IF EXISTS Post_Op_FollowUp;
DROP TABLE IF EXISTS Legal_Clearance;
DROP TABLE IF EXISTS Transplant;
DROP TABLE IF EXISTS Doc_Assignment;
DROP TABLE IF EXISTS Waiting_List;
DROP TABLE IF EXISTS Grant_Approval;
DROP TABLE IF EXISTS Recipient_HLA_Test;
DROP TABLE IF EXISTS Donor_HLA_Test;
DROP TABLE IF EXISTS Recipient_Organ;
DROP TABLE IF EXISTS Donor_Organ;
DROP TABLE IF EXISTS Bed;
DROP TABLE IF EXISTS Room;
DROP TABLE IF EXISTS Doctor;
DROP TABLE IF EXISTS Recipient;
DROP TABLE IF EXISTS Donor;

-- ==========================================
-- 2. CORE ENTITIES (Parent Tables)
-- ==========================================

CREATE TABLE Donor (
    d_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    donation_date DATE,
    type ENUM('Alive', 'Dead') NOT NULL,
    blood_type ENUM('O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+') NOT NULL
);

CREATE TABLE Recipient (
    r_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    blood_type ENUM('O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+') NOT NULL
);

CREATE TABLE Doctor (
    doc_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    gender ENUM('M', 'F', 'Other')
);

CREATE TABLE Room (
    room_id INT PRIMARY KEY,
    room_name VARCHAR(50),
    type VARCHAR(50),
    status ENUM('Available', 'Full') DEFAULT 'Available'
);

-- ==========================================
-- 3. DEPENDENT ENTITIES (Child Tables)
-- ==========================================

CREATE TABLE Bed (
    bed_id INT PRIMARY KEY,
    room_id INT,
    bed_name VARCHAR(50),
    status ENUM('Available', 'Booked') DEFAULT 'Available',
    FOREIGN KEY (room_id) REFERENCES Room(room_id)
);

CREATE TABLE Donor_Organ (
    od_id INT PRIMARY KEY,
    d_id INT,
    name ENUM('Left Kidney', 'Right Kidney'),
    size VARCHAR(20),
    status ENUM('Available', 'Transplanted', 'Discarded') DEFAULT 'Available',
    FOREIGN KEY (d_id) REFERENCES Donor(d_id)
);

CREATE TABLE Recipient_Organ (
    ro_id INT PRIMARY KEY,
    r_id INT,
    name ENUM('Waiting for Left', 'Waiting for Right', 'Any'),
    size VARCHAR(20),
    FOREIGN KEY (r_id) REFERENCES Recipient(r_id)
);

-- ==========================================
-- 4. 1:1 EXTENSION TABLES (Tests)
-- ==========================================

CREATE TABLE Donor_HLA_Test (
    od_id INT PRIMARY KEY,
    hla_a1 VARCHAR(10),
    hla_a2 VARCHAR(10),
    hla_b1 VARCHAR(10),
    hla_b2 VARCHAR(10),
    hla_dr1 VARCHAR(10),
    hla_dr2 VARCHAR(10),
    FOREIGN KEY (od_id) REFERENCES Donor_Organ(od_id)
);

CREATE TABLE Recipient_HLA_Test (
    ro_id INT PRIMARY KEY,
    hla_a1 VARCHAR(10),
    hla_a2 VARCHAR(10),
    hla_b1 VARCHAR(10),
    hla_b2 VARCHAR(10),
    hla_dr1 VARCHAR(10),
    hla_dr2 VARCHAR(10),
    FOREIGN KEY (ro_id) REFERENCES Recipient_Organ(ro_id)
);

-- ==========================================
-- 5. JUNCTION & TRANSACTION TABLES
-- ==========================================

CREATE TABLE Grant_Approval (
    d_id INT,
    r_id INT,
    grant_date DATE,
    PRIMARY KEY (d_id, r_id),
    FOREIGN KEY (d_id) REFERENCES Donor(d_id),
    FOREIGN KEY (r_id) REFERENCES Recipient(r_id)
);

CREATE TABLE Waiting_List (
    w_id INT PRIMARY KEY,
    r_id INT,
    date_added DATE,
    time_added TIME,
    status ENUM('Active', 'Matched', 'Operated', 'Removed') DEFAULT 'Active',
    FOREIGN KEY (r_id) REFERENCES Recipient(r_id)
);

CREATE TABLE Doc_Assignment (
    assignment_id INT PRIMARY KEY,
    doc_id INT,
    bed_id INT,
    shift ENUM('Morning', 'Evening', 'Night'),
    FOREIGN KEY (doc_id) REFERENCES Doctor(doc_id),
    FOREIGN KEY (bed_id) REFERENCES Bed(bed_id)
);

-- Normalized Transplant Table
CREATE TABLE Transplant (
    transplant_id INT PRIMARY KEY,
    r_id INT,
    d_id INT,
    ro_id INT,
    od_id INT,
    doc_id INT,
    bed_id INT,
    surgery_date DATE,
    time TIME,
    discharge_date DATE,
    FOREIGN KEY (r_id) REFERENCES Recipient(r_id),
    FOREIGN KEY (d_id) REFERENCES Donor(d_id),
    FOREIGN KEY (ro_id) REFERENCES Recipient_Organ(ro_id),
    FOREIGN KEY (od_id) REFERENCES Donor_Organ(od_id),
    FOREIGN KEY (doc_id) REFERENCES Doctor(doc_id),
    FOREIGN KEY (bed_id) REFERENCES Bed(bed_id)
);

-- ==========================================
-- 6. VALUE-ADD TABLES (Wajid's Request)
-- ==========================================

CREATE TABLE Legal_Clearance (
    clearance_id INT PRIMARY KEY,
    d_id INT,
    r_id INT,
    committee_officer VARCHAR(100),
    status ENUM('Pending', 'Approved', 'Rejected'),
    approval_date DATE,
    FOREIGN KEY (d_id) REFERENCES Donor(d_id),
    FOREIGN KEY (r_id) REFERENCES Recipient(r_id)
);

CREATE TABLE Post_Op_FollowUp (
    followup_id INT PRIMARY KEY,
    r_id INT,
    doc_id INT,
    visit_date DATE,
    creatinine_level DECIMAL(4,2),
    status ENUM('Scheduled', 'Completed', 'Missed'),
    FOREIGN KEY (r_id) REFERENCES Recipient(r_id),
    FOREIGN KEY (doc_id) REFERENCES Doctor(doc_id)
);

-- Wajid's Requested Billing Table
CREATE TABLE Billing_Invoice (
    invoice_id INT PRIMARY KEY,
    transplant_id INT,
    r_id INT,
    total_amount DECIMAL(10,2),
    insurance_covered ENUM('Yes', 'No'),
    payment_status ENUM('Paid', 'Pending', 'Partial'),
    invoice_date DATE,
    FOREIGN KEY (transplant_id) REFERENCES Transplant(transplant_id),
    FOREIGN KEY (r_id) REFERENCES Recipient(r_id)
);

-- ==========================================
-- 7. INSERT DUMMY DATA
-- ==========================================

INSERT INTO Donor VALUES
(1, 'Ahmed Ali', '0300-1234567', '2026-04-20', 'Alive', 'O+'),
(2, 'Zainab Bibi', '0333-7654321', '2026-04-25', 'Dead', 'A-'),
(3, 'Salman Qureshi', '0312-2211334', '2026-05-02', 'Alive', 'B+'),
(4, 'Aisha Malik', '0301-7788990', '2026-05-06', 'Alive', 'AB-');

INSERT INTO Recipient VALUES
(101, 'Usman Khan', '0321-1122334', 'A+'),
(102, 'Fatima Noor', '0345-9988776', 'O-'),
(103, 'Hassan Raza', '0307-5566778', 'B+'),
(104, 'Maryam Iqbal', '0336-4455667', 'AB-');

INSERT INTO Doctor VALUES
(501, 'Dr. Raza', 'Nephrology', 'M'),
(502, 'Dr. Ayesha', 'Transplant Surgeon', 'F'),
(503, 'Dr. Kamran', 'Urology', 'M');

INSERT INTO Room VALUES
(10, 'ICU-A', 'Intensive Care', 'Available'),
(11, 'Ward-B', 'General Post-Op', 'Available'),
(12, 'Ward-C', 'General Post-Op', 'Available');

INSERT INTO Bed VALUES
(1001, 10, 'Bed-A1', 'Booked'),
(1002, 10, 'Bed-A2', 'Available'),
(1101, 11, 'Bed-B1', 'Available'),
(1201, 12, 'Bed-C1', 'Available');

INSERT INTO Donor_Organ VALUES
(201, 1, 'Left Kidney', '11cm', 'Transplanted'),
(202, 2, 'Right Kidney', '10.5cm', 'Available'),
(203, 3, 'Left Kidney', '12cm', 'Available'),
(204, 4, 'Right Kidney', '10cm', 'Available');

INSERT INTO Recipient_Organ VALUES
(301, 101, 'Any', 'Standard'),
(302, 102, 'Waiting for Right', 'Standard'),
(303, 103, 'Waiting for Left', 'Standard'),
(304, 104, 'Any', 'Standard');

INSERT INTO Donor_HLA_Test VALUES
(201, '02:01', '24:02', '07:02', '15:01', '04:01', '13:01'),
(202, '01:01', '03:01', '08:01', '44:02', '11:01', '15:01'),
(203, '24:02', '26:01', '15:01', '35:01', '04:01', '07:01'),
(204, '02:01', '11:01', '07:02', '27:05', '13:01', '15:01');

INSERT INTO Recipient_HLA_Test VALUES
(301, '02:01', '24:02', '07:02', '15:01', '04:01', '13:01'),
(302, '01:01', '03:01', '08:01', '44:02', '11:01', '15:01'),
(303, '24:02', '26:01', '15:01', '35:01', '04:01', '07:01'),
(304, '02:01', '11:01', '07:02', '27:05', '13:01', '15:01');

INSERT INTO Grant_Approval VALUES (1, 101, '2026-04-22');
INSERT INTO Grant_Approval VALUES (2, 102, '2026-05-01');
INSERT INTO Grant_Approval VALUES (3, 103, '2026-05-03');
INSERT INTO Grant_Approval VALUES (4, 104, '2026-05-05');

INSERT INTO Legal_Clearance VALUES (901, 1, 101, 'Officer Tariq', 'Approved', '2026-04-23');
INSERT INTO Legal_Clearance VALUES (902, 2, 102, 'Officer Nida', 'Approved', '2026-05-02');
INSERT INTO Legal_Clearance VALUES (903, 3, 103, 'Officer Salman', 'Approved', '2026-05-04');
INSERT INTO Legal_Clearance VALUES (904, 4, 104, 'Officer Hina', 'Approved', '2026-05-06');

INSERT INTO Waiting_List VALUES
(401, 101, '2026-01-15', '09:00:00', 'Operated'),
(402, 102, '2026-02-10', '11:30:00', 'Active'),
(403, 103, '2026-03-01', '10:15:00', 'Active'),
(404, 104, '2026-03-12', '12:45:00', 'Matched');

INSERT INTO Doc_Assignment VALUES (601, 501, 1001, 'Morning');
INSERT INTO Doc_Assignment VALUES (602, 503, 1101, 'Evening');

INSERT INTO Transplant VALUES
(701, 101, 1, 301, 201, 502, 1001, '2026-04-26', '08:00:00', '2026-05-05'),
(702, 102, 2, 302, 202, 503, 1101, '2026-05-07', '09:30:00', '2026-05-16');

INSERT INTO Post_Op_FollowUp VALUES
(801, 101, 501, '2026-05-15', 1.20, 'Scheduled'),
(802, 102, 503, '2026-05-20', 1.10, 'Scheduled');

INSERT INTO Billing_Invoice VALUES
(9001, 701, 101, 1500000.00, 'Yes', 'Pending', '2026-04-28'),
(9002, 702, 102, 1450000.00, 'No', 'Partial', '2026-05-08');

SELECT COUNT(*) AS total_donors FROM Donor;

SELECT COUNT(*) AS total_recipients FROM Recipient;

SELECT status, COUNT(*) AS total_patients
FROM Waiting_List
GROUP BY status;

SELECT r.room_name, r.type AS room_type, b.bed_name, b.status
FROM Room r
JOIN Bed b ON r.room_id = b.room_id
WHERE b.status = 'Available';

SELECT d.name AS Donor, r.name AS Recipient, lc.status AS Clearance_Status, ga.grant_date
FROM Legal_Clearance lc
JOIN Donor d ON lc.d_id = d.d_id
JOIN Recipient r ON lc.r_id = r.r_id
JOIN Grant_Approval ga ON d.d_id = ga.d_id AND r.r_id = ga.r_id;

SELECT doc.name AS Doctor, doc.specialization, b.bed_name, r.room_name, da.shift
FROM Doc_Assignment da
JOIN Doctor doc ON da.doc_id = doc.doc_id
JOIN Bed b ON da.bed_id = b.bed_id
JOIN Room r ON b.room_id = r.room_id;

SELECT d.name AS Donor_Name, do.name AS Organ, ht.hla_a1, ht.hla_b1, ht.hla_dr1
FROM Donor_HLA_Test ht
JOIN Donor_Organ do ON ht.od_id = do.od_id
JOIN Donor d ON do.d_id = d.d_id;

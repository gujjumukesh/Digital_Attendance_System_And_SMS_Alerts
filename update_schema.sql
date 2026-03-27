-- Clean up existing (Optional - use with caution)
DROP TABLE IF EXISTS today_absent;
DROP TABLE IF EXISTS weakly_attendence;
DROP TABLE IF EXISTS today_attendence;
DROP TABLE IF EXISTS students_login;
DROP TABLE IF EXISTS admin_login;
DROP TABLE IF EXISTS total_students;

-- 1. Master Student Table
CREATE TABLE total_students (
    roll_no TEXT NOT NULL,
    college TEXT NOT NULL,
    name TEXT NOT NULL,
    branch TEXT NOT NULL,
    year INT NOT NULL,
    mobile_no TEXT,
    biometric_id TEXT UNIQUE, -- Must be unique across system for scanners
    PRIMARY KEY (roll_no, college) -- Scoped by college
);

-- 2. Admin Login Table
CREATE TABLE admin_login (
    userid TEXT NOT NULL,
    college TEXT NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    PRIMARY KEY (userid, college)
);

-- 3. Daily Attendance Table
CREATE TABLE today_attendence (
    roll_no TEXT NOT NULL,
    college TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    name TEXT,
    branch TEXT,
    year INT,
    status TEXT CHECK (status IN ('Present', 'Absent')),
    verified_by_biometric BOOLEAN DEFAULT false,
    fingerprint_confidence FLOAT,
    verification_timestamp TIMESTAMPTZ,
    PRIMARY KEY (roll_no, date, college),
    FOREIGN KEY (roll_no, college) REFERENCES total_students(roll_no, college)
);

-- Indexes for today_attendence table
CREATE INDEX idx_today_attendence_college_date ON today_attendence (college, date);
CREATE INDEX idx_today_attendence_college_branch ON today_attendence (college, branch);

-- 4. Today's Absent List (Auto-managed)
CREATE TABLE today_absent (
    roll_no TEXT NOT NULL,
    college TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    name TEXT,
    branch TEXT,
    mobile_no TEXT,
    status TEXT DEFAULT 'Absent',
    PRIMARY KEY (roll_no, date, college)
);

-- 5. Weekly/Aggregated Stats
CREATE TABLE weakly_attendence (
    date DATE NOT NULL,
    branch TEXT NOT NULL,
    college TEXT NOT NULL,
    total_present INT DEFAULT 0,
    total_absents INT DEFAULT 0,
    biometric_verified_count INT DEFAULT 0,
    PRIMARY KEY (date, branch, college)
);
-- A. Trigger: Auto-update Weekly Stats per Branch and College
CREATE OR REPLACE FUNCTION sync_attendance_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO weakly_attendence (date, branch, college, total_present, total_absents, biometric_verified_count)
    SELECT 
        NEW.date, NEW.branch, NEW.college,
        COUNT(CASE WHEN status = 'Present' THEN 1 END),
        COUNT(CASE WHEN status = 'Absent' THEN 1 END),
        COUNT(CASE WHEN verified_by_biometric = true THEN 1 END)
    FROM today_attendence
    WHERE date = NEW.date AND branch = NEW.branch AND college = NEW.college
    GROUP BY date, branch, college
    ON CONFLICT (date, branch, college) DO UPDATE SET
        total_present = EXCLUDED.total_present,
        total_absents = EXCLUDED.total_absents,
        biometric_verified_count = EXCLUDED.biometric_verified_count;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_stats
AFTER INSERT OR UPDATE ON today_attendence
FOR EACH ROW EXECUTE FUNCTION sync_attendance_stats();


-- B. Trigger: Manage Absentee List
CREATE OR REPLACE FUNCTION manage_absent_flow()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Absent' THEN
        INSERT INTO today_absent (roll_no, college, date, name, branch, mobile_no)
        SELECT s.roll_no, s.college, NEW.date, s.name, s.branch, s.mobile_no
        FROM total_students s
        WHERE s.roll_no = NEW.roll_no AND s.college = NEW.college
        ON CONFLICT (roll_no, date, college) DO NOTHING;
    ELSE
        DELETE FROM today_absent 
        WHERE roll_no = NEW.roll_no AND date = NEW.date AND college = NEW.college;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manage_absents
AFTER INSERT OR UPDATE ON today_attendence
FOR EACH ROW EXECUTE FUNCTION manage_absent_flow();
-- C. Secured Login (Admin/Staff only sees their own college)
CREATE OR REPLACE FUNCTION authenticate_user_v2(
    p_userid TEXT, 
    p_password TEXT, 
    p_college TEXT
)
RETURNS TABLE (auth_success BOOLEAN, user_name TEXT, user_role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT true, name, role
    FROM admin_login
    WHERE userid = p_userid 
      AND password = p_password 
      AND college = p_college; -- Strict Privacy Filter
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Global Biometric Marking (Finds student and assigns to correct college)
CREATE OR REPLACE FUNCTION mark_attendance_biometric(
    p_bio_id TEXT,
    p_confidence FLOAT
) RETURNS TEXT AS $$
DECLARE
    v_student RECORD;
BEGIN
    -- Look up student across all colleges via unique Biometric ID
    SELECT roll_no, name, branch, year, college INTO v_student
    FROM total_students WHERE biometric_id = p_bio_id;

    IF NOT FOUND THEN
        RETURN 'Student Not Found';
    END IF;

    -- Mark attendance for that specific student's college
    INSERT INTO today_attendence (
        roll_no, college, date, name, branch, year, status, 
        verified_by_biometric, fingerprint_confidence, verification_timestamp
    ) VALUES (
        v_student.roll_no, v_student.college, CURRENT_DATE, v_student.name, 
        v_student.branch, v_student.year, 'Present', true, p_confidence, NOW()
    )
    ON CONFLICT (roll_no, date, college) DO UPDATE SET
        status = 'Present',
        verified_by_biometric = true,
        verification_timestamp = NOW();

    RETURN 'Success: ' || v_student.name || ' (' || v_student.college || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 1. Register an Admin for Artb
INSERT INTO admin_login (userid, college, password, name, role)
VALUES ('admin1', 'Artb', 'securepass', 'Artb Principal', 'admin');

-- 2. Add a Student for Artb
INSERT INTO total_students (roll_no, college, name, branch, year, biometric_id)
VALUES ('101', 'Artb', 'John Doe', 'CSE', 3, 'BIO_001');

-- 3. Login Attempt (From App)
-- SELECT * FROM authenticate_user_v2('admin1', 'securepass', 'Artb');
CREATE TABLE IF NOT EXISTS security_incidents (
    id SERIAL PRIMARY KEY,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    camera_source VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SEGURO', 'INSEGURO', 'SIN_PERSONA')),
    person_detected BOOLEAN NOT NULL DEFAULT FALSE,
    equipment_detected BOOLEAN NOT NULL DEFAULT FALSE,
    block_signal CHAR(1) CHECK (block_signal IS NULL OR block_signal IN ('B', 'L')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_status
    ON security_incidents (status);

CREATE INDEX IF NOT EXISTS idx_security_incidents_detected_at
    ON security_incidents (detected_at DESC);

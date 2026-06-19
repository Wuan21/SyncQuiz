-- ============================================================
-- SyncQuiz - PostgreSQL Database Schema
-- Migration: 001_create_schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE quiz_visibility AS ENUM ('public', 'private');
CREATE TYPE question_type AS ENUM (
    'single_choice',
    'multiple_choice',
    'true_false',
    'fill_blank',
    'image_question'
);
CREATE TYPE classroom_role AS ENUM ('teacher', 'student');
CREATE TYPE session_status AS ENUM ('lobby', 'in_progress', 'paused', 'ended');
CREATE TYPE submission_status AS ENUM ('not_started', 'in_progress', 'submitted');

-- ============================================================
-- DOMAIN: IDENTITY
-- ============================================================

CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    avatar_url      VARCHAR(500),
    role            user_role   NOT NULL DEFAULT 'student',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_active     ON users(deleted_at) WHERE deleted_at IS NULL;

-- ----------------------------------------

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 of raw refresh token
    expires_at  TIMESTAMPTZ NOT NULL,
    is_revoked  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ----------------------------------------

CREATE TABLE password_resets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash    VARCHAR(255) NOT NULL,           -- hashed OTP / reset token
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);

-- ============================================================
-- DOMAIN: QUIZ
-- ============================================================

CREATE TABLE categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------

CREATE TABLE quizzes (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            UUID            NOT NULL REFERENCES users(id),
    category_id         UUID            REFERENCES categories(id) ON DELETE SET NULL,
    title               VARCHAR(255)    NOT NULL,
    description         TEXT,
    cover_image_url     VARCHAR(500),
    visibility          quiz_visibility NOT NULL DEFAULT 'private',
    shuffle_questions   BOOLEAN         NOT NULL DEFAULT FALSE,
    shuffle_answers     BOOLEAN         NOT NULL DEFAULT FALSE,
    default_time_limit  INT             NOT NULL DEFAULT 30
                        CONSTRAINT chk_quiz_time_limit CHECK (default_time_limit BETWEEN 5 AND 120),
    total_plays         INT             NOT NULL DEFAULT 0,
    is_deleted          BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_quizzes_owner_id   ON quizzes(owner_id);
CREATE INDEX idx_quizzes_category   ON quizzes(category_id);
CREATE INDEX idx_quizzes_visibility ON quizzes(visibility) WHERE is_deleted = FALSE;
CREATE INDEX idx_quizzes_title_trgm ON quizzes USING GIN(title gin_trgm_ops);

-- ----------------------------------------

CREATE TABLE questions (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id     UUID          NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    type        question_type NOT NULL,
    content     TEXT          NOT NULL,
    image_url   VARCHAR(500),
    time_limit  INT           NOT NULL DEFAULT 30
                CONSTRAINT chk_question_time_limit CHECK (time_limit BETWEEN 5 AND 120),
    points      INT           NOT NULL DEFAULT 100
                CONSTRAINT chk_question_points CHECK (points BETWEEN 0 AND 1000),
    position    INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_quiz_id  ON questions(quiz_id);
CREATE INDEX idx_questions_position ON questions(quiz_id, position);

-- ----------------------------------------

CREATE TABLE answer_options (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    image_url   VARCHAR(500),
    is_correct  BOOLEAN     NOT NULL DEFAULT FALSE,
    position    INT         NOT NULL DEFAULT 0
);

CREATE INDEX idx_answer_options_question_id ON answer_options(question_id);

-- ============================================================
-- DOMAIN: CLASSROOM
-- ============================================================

CREATE TABLE classrooms (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID        NOT NULL REFERENCES users(id),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    join_code   VARCHAR(10) NOT NULL UNIQUE,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_classrooms_owner_id ON classrooms(owner_id);
CREATE UNIQUE INDEX idx_classrooms_join_code ON classrooms(join_code);

-- ----------------------------------------

CREATE TABLE classroom_members (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id  UUID           NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id       UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role          classroom_role NOT NULL DEFAULT 'student',
    joined_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (classroom_id, user_id)
);

CREATE INDEX idx_classroom_members_classroom ON classroom_members(classroom_id);
CREATE INDEX idx_classroom_members_user      ON classroom_members(user_id);

-- ============================================================
-- DOMAIN: LIVE SESSION
-- ============================================================

CREATE TABLE live_sessions (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id                 UUID           NOT NULL REFERENCES quizzes(id),
    host_id                 UUID           NOT NULL REFERENCES users(id),
    room_code               VARCHAR(10)    NOT NULL UNIQUE,
    status                  session_status NOT NULL DEFAULT 'lobby',
    current_question_index  INT            NOT NULL DEFAULT -1,
    started_at              TIMESTAMPTZ,
    ended_at                TIMESTAMPTZ,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_live_sessions_room_code ON live_sessions(room_code);
CREATE INDEX idx_live_sessions_host      ON live_sessions(host_id);
CREATE INDEX idx_live_sessions_status    ON live_sessions(status);

-- ----------------------------------------

CREATE TABLE session_participants (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID        NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    user_id       UUID        REFERENCES users(id) ON DELETE SET NULL,   -- nullable for guests
    display_name  VARCHAR(50) NOT NULL,
    total_score   INT         NOT NULL DEFAULT 0,
    rank          INT,
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, user_id)
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);

-- ----------------------------------------

CREATE TABLE session_answers (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID        NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    participant_id   UUID        NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    question_id      UUID        NOT NULL REFERENCES questions(id),
    submitted_answer JSONB       NOT NULL,   -- { "option_ids": [...] } or { "text": "..." }
    is_correct       BOOLEAN     NOT NULL DEFAULT FALSE,
    points_earned    INT         NOT NULL DEFAULT 0,
    answer_time_ms   INT         NOT NULL,
    answered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (participant_id, question_id)
);

CREATE INDEX idx_session_answers_session     ON session_answers(session_id);
CREATE INDEX idx_session_answers_participant ON session_answers(participant_id);

-- ============================================================
-- DOMAIN: HOMEWORK
-- ============================================================

CREATE TABLE homework_assignments (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id  UUID        NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    quiz_id       UUID        NOT NULL REFERENCES quizzes(id),
    assigned_by   UUID        NOT NULL REFERENCES users(id),
    deadline      TIMESTAMPTZ,
    allow_late    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hw_assignments_classroom ON homework_assignments(classroom_id);
CREATE INDEX idx_hw_assignments_quiz      ON homework_assignments(quiz_id);

-- ----------------------------------------

CREATE TABLE homework_submissions (
    id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id  UUID              NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
    student_id     UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_score    INT               NOT NULL DEFAULT 0,
    max_score      INT               NOT NULL DEFAULT 0,
    status         submission_status NOT NULL DEFAULT 'not_started',
    started_at     TIMESTAMPTZ,
    submitted_at   TIMESTAMPTZ,
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_hw_submissions_assignment ON homework_submissions(assignment_id);
CREATE INDEX idx_hw_submissions_student    ON homework_submissions(student_id);

-- ----------------------------------------

CREATE TABLE homework_answers (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id    UUID    NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
    question_id      UUID    NOT NULL REFERENCES questions(id),
    submitted_answer JSONB   NOT NULL,   -- { "option_ids": [...] } or { "text": "..." }
    is_correct       BOOLEAN NOT NULL DEFAULT FALSE,
    points_earned    INT     NOT NULL DEFAULT 0,
    answer_time_ms   INT,
    UNIQUE (submission_id, question_id)
);

CREATE INDEX idx_hw_answers_submission ON homework_answers(submission_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_classrooms_updated_at
    BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: Default Categories
-- ============================================================

INSERT INTO categories (name, slug) VALUES
    ('Mathematics',     'mathematics'),
    ('Science',         'science'),
    ('History',         'history'),
    ('Geography',       'geography'),
    ('Literature',      'literature'),
    ('English',         'english'),
    ('Technology',      'technology'),
    ('Arts',            'arts'),
    ('Sports',          'sports'),
    ('General Knowledge', 'general-knowledge');

CREATE TABLE app_user (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL,
    cpf char(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
    password_hash varchar(100) NOT NULL,
    role varchar(20) NOT NULL CHECK (role IN ('ADMIN','COORDINATOR','PROFESSOR')),
    active boolean NOT NULL DEFAULT true
);
CREATE TABLE course (
    id uuid PRIMARY KEY,
    code varchar(12) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    semesters integer NOT NULL CHECK (semesters BETWEEN 1 AND 20)
);
CREATE UNIQUE INDEX course_name_unique ON course (lower(name));
CREATE TABLE user_course (
    user_id uuid NOT NULL REFERENCES app_user(id),
    course_id uuid NOT NULL REFERENCES course(id),
    PRIMARY KEY (user_id, course_id)
);
CREATE TABLE subject (
    id uuid PRIMARY KEY,
    course_id uuid NOT NULL REFERENCES course(id),
    name varchar(100) NOT NULL,
    UNIQUE (id, course_id)
);
CREATE UNIQUE INDEX subject_name_unique ON subject (course_id, lower(name));
CREATE TABLE student_group (
    id uuid PRIMARY KEY,
    course_id uuid NOT NULL REFERENCES course(id),
    code varchar(40) NOT NULL UNIQUE,
    semester integer NOT NULL CHECK (semester BETWEEN 1 AND 20)
);
CREATE TABLE room (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL UNIQUE,
    floor varchar(20) NOT NULL,
    capacity integer NOT NULL CHECK (capacity > 0)
);
CREATE TABLE lesson (
    id uuid PRIMARY KEY,
    series_id uuid NOT NULL,
    course_id uuid NOT NULL REFERENCES course(id),
    subject_id uuid NOT NULL,
    professor_id uuid NOT NULL REFERENCES app_user(id),
    room_id uuid NOT NULL REFERENCES room(id),
    lesson_date date NOT NULL,
    starts_at time NOT NULL,
    ends_at time NOT NULL,
    published boolean NOT NULL DEFAULT false,
    status varchar(12) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','CANCELLED')),
    FOREIGN KEY (subject_id, course_id) REFERENCES subject(id, course_id),
    CHECK (starts_at < ends_at),
    CHECK ((starts_at >= '08:00' AND ends_at <= '11:50') OR (starts_at >= '19:00' AND ends_at <= '22:50'))
);
CREATE INDEX lesson_conflict ON lesson (lesson_date, starts_at, ends_at);
CREATE INDEX lesson_series ON lesson (series_id);
CREATE TABLE lesson_group (
    lesson_id uuid NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
    group_id uuid NOT NULL REFERENCES student_group(id),
    PRIMARY KEY (lesson_id, group_id)
);
CREATE TABLE notification (
    id uuid PRIMARY KEY,
    course_id uuid NOT NULL REFERENCES course(id),
    group_id uuid NOT NULL REFERENCES student_group(id),
    message varchar(500) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE access_token (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
);
CREATE INDEX token_expiry ON access_token(expires_at);

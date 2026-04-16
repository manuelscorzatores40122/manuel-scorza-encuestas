-- ================================================================
-- IE 40122 MANUEL SCORZA TORRES — Schema completo v2
-- Sistema de Encuestas, Biblioteca y Gestión de Alumnos
-- ================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ================================================================
-- ROLES Y USUARIOS DEL SISTEMA
-- ================================================================
CREATE TABLE IF NOT EXISTS system_users (
  id              SERIAL PRIMARY KEY,
  dni             VARCHAR(20)  UNIQUE NOT NULL,
  nombre          VARCHAR(200) NOT NULL,
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  email           VARCHAR(150),
  role            VARCHAR(20)  DEFAULT 'student'
                  CHECK (role IN ('student','admin','director','tutor','docente')),
  estado          VARCHAR(20)  DEFAULT 'activo'
                  CHECK (estado IN ('activo','inactivo','bloqueado')),
  intentos_fallidos INTEGER DEFAULT 0,
  ultimo_acceso   TIMESTAMP,
  password_hash   VARCHAR(255) NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- ALUMNOS
-- ================================================================
CREATE TABLE IF NOT EXISTS students (
  id                    SERIAL PRIMARY KEY,
  -- Identificación
  dni                   VARCHAR(20)  UNIQUE NOT NULL,
  codigo_estudiante     VARCHAR(50),
  nivel                 VARCHAR(15)  DEFAULT 'Primaria'
                        CHECK (nivel IN ('Primaria','Secundaria')),
  grado                 VARCHAR(50),
  seccion               VARCHAR(10),
  -- Datos personales
  apellido_paterno      VARCHAR(100),
  apellido_materno      VARCHAR(100),
  nombres               VARCHAR(200) NOT NULL,
  sexo                  VARCHAR(10),
  fecha_nacimiento      DATE,
  -- Foto y cuenta
  foto_url              TEXT,
  -- Estado
  estado                VARCHAR(20)  DEFAULT 'activo'
                        CHECK (estado IN ('activo','retirado','egresado','bloqueado')),
  -- Contacto alumno
  telefono              VARCHAR(20),
  email                 VARCHAR(150),
  direccion             TEXT,
  -- Padre
  padre_nombre          VARCHAR(250),
  padre_dni             VARCHAR(20),
  padre_telefono        VARCHAR(20),
  padre_email           VARCHAR(150),
  padre_parentesco      VARCHAR(50),
  -- Madre
  madre_nombre          VARCHAR(250),
  madre_dni             VARCHAR(20),
  madre_telefono        VARCHAR(20),
  madre_email           VARCHAR(150),
  madre_parentesco      VARCHAR(50),
  -- Apoderado principal
  apoderado_nombre      VARCHAR(200),
  apoderado_apellidos   VARCHAR(200),
  apoderado_dni         VARCHAR(20),
  apoderado_telefono    VARCHAR(20),
  apoderado_email       VARCHAR(150),
  apoderado_parentesco  VARCHAR(50),
  -- Cuenta de acceso (referencia a system_users)
  user_id               INTEGER REFERENCES system_users(id) ON DELETE SET NULL,
  -- Metadatos
  importado_desde       VARCHAR(20) DEFAULT 'manual',
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_students_dni       ON students(dni);
CREATE INDEX IF NOT EXISTS idx_students_nivel     ON students(nivel);
CREATE INDEX IF NOT EXISTS idx_students_grado     ON students(grado);
CREATE INDEX IF NOT EXISTS idx_students_seccion   ON students(seccion);
CREATE INDEX IF NOT EXISTS idx_students_estado    ON students(estado);
CREATE INDEX IF NOT EXISTS idx_students_nombres   ON students USING gin(
  to_tsvector('spanish', unaccent(COALESCE(apellido_paterno,'') || ' ' || COALESCE(apellido_materno,'') || ' ' || nombres))
);

-- ================================================================
-- ENCUESTAS
-- ================================================================
CREATE TABLE IF NOT EXISTS surveys (
  id              SERIAL PRIMARY KEY,
  titulo          VARCHAR(300) NOT NULL,
  descripcion     TEXT,
  estado          VARCHAR(20)  DEFAULT 'borrador'
                  CHECK (estado IN ('borrador','activa','cerrada','archivada')),
  -- Asignación por grupo
  nivel_asignado  VARCHAR(15), -- Primaria, Secundaria, o NULL=todos
  grado_asignado  VARCHAR(50), -- NULL=todos
  seccion_asignada VARCHAR(10),-- NULL=todas
  -- Programación
  fecha_inicio    TIMESTAMP,
  fecha_fin       TIMESTAMP,
  -- Metadata
  created_by      INTEGER REFERENCES system_users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- PREGUNTAS (tipos extendidos)
-- ================================================================
CREATE TABLE IF NOT EXISTS questions (
  id          SERIAL PRIMARY KEY,
  survey_id   INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
  texto       TEXT    NOT NULL,
  tipo        VARCHAR(30) DEFAULT 'multiple'
              CHECK (tipo IN (
                'multiple',       -- opción única
                'multiple_multi', -- varias respuestas
                'texto',          -- texto libre
                'escala',         -- escala 1-5
                'sino',           -- sí/no
                'desplegable',    -- lista desplegable
                'fecha',          -- selector fecha
                'numero'          -- número
              )),
  opciones    JSONB,   -- para multiple, multiple_multi, desplegable
  orden       INTEGER DEFAULT 0,
  requerida   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- RESPUESTAS
-- ================================================================
CREATE TABLE IF NOT EXISTS responses (
  id                SERIAL PRIMARY KEY,
  survey_id         INTEGER REFERENCES surveys(id),
  student_id        INTEGER REFERENCES students(id),
  completada        BOOLEAN   DEFAULT FALSE,
  fecha_inicio      TIMESTAMP DEFAULT NOW(),
  fecha_completada  TIMESTAMP,
  UNIQUE(survey_id, student_id)
);

CREATE TABLE IF NOT EXISTS answers (
  id                SERIAL PRIMARY KEY,
  response_id       INTEGER REFERENCES responses(id) ON DELETE CASCADE,
  question_id       INTEGER REFERENCES questions(id),
  respuesta_texto   TEXT,
  respuesta_opcion  VARCHAR(200),
  respuesta_opciones JSONB,  -- para multiple_multi
  respuesta_escala  INTEGER,
  respuesta_sino    BOOLEAN,
  respuesta_fecha   DATE,
  respuesta_numero  NUMERIC,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- BIBLIOTECA
-- ================================================================
CREATE TABLE IF NOT EXISTS library_items (
  id              SERIAL PRIMARY KEY,
  titulo          VARCHAR(300) NOT NULL,
  descripcion     TEXT,
  tipo            VARCHAR(30) DEFAULT 'libro'
                  CHECK (tipo IN ('libro','documento','video','enlace','otro')),
  archivo_url     TEXT,
  archivo_nombre  VARCHAR(300),
  archivo_size    INTEGER,
  -- Asignación
  nivel_asignado  VARCHAR(15), -- NULL=todos
  grado_asignado  VARCHAR(50), -- NULL=todos
  seccion_asignada VARCHAR(10),-- NULL=todas
  activo          BOOLEAN DEFAULT TRUE,
  created_by      INTEGER REFERENCES system_users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- LOGS DE IMPORTACIÓN
-- ================================================================
CREATE TABLE IF NOT EXISTS import_logs (
  id            SERIAL PRIMARY KEY,
  archivo_nombre VARCHAR(300),
  nivel         VARCHAR(15),
  total         INTEGER DEFAULT 0,
  nuevos        INTEGER DEFAULT 0,
  duplicados    INTEGER DEFAULT 0,
  errores       INTEGER DEFAULT 0,
  detalles      JSONB,
  created_by    INTEGER REFERENCES system_users(id),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- ADMIN POR DEFECTO (password: Admin2026!)
-- ================================================================
INSERT INTO system_users (dni, nombre, apellido_paterno, role, password_hash)
VALUES (
  'admin', 'Administrador', 'Sistema', 'admin',
  '$2a$10$rOzMJFVBD.E5HI1PdPV8IuaJEFJOyPABXS4Y9bW2N1zN3rCHvNxHi'
) ON CONFLICT (dni) DO NOTHING;

-- ================================================================
-- FUNCIÓN para búsqueda sin tildes
-- ================================================================
CREATE OR REPLACE FUNCTION search_students(q TEXT)
RETURNS SETOF students AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM students
  WHERE to_tsvector('spanish', unaccent(
    COALESCE(apellido_paterno,'') || ' ' ||
    COALESCE(apellido_materno,'') || ' ' ||
    nombres || ' ' ||
    COALESCE(dni,'')
  )) @@ plainto_tsquery('spanish', unaccent(q))
  OR unaccent(LOWER(apellido_paterno || ' ' || apellido_materno || ' ' || nombres)) LIKE '%' || unaccent(LOWER(q)) || '%'
  OR dni LIKE '%' || q || '%';
END;
$$ LANGUAGE plpgsql;

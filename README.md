# Sistema de Encuestas v1 — IE 40122 Manuel Scorza Torres

## Stack
- **React + Tailwind-like CSS** (Frontend)
- **Node.js + Express** (Backend API)
- **Neon PostgreSQL** (Base de datos)
- **Vercel** (Despliegue)
- **JWT** (Autenticación con roles)
- **Chart.js** (Gráficos)
- **XLSX** (Importar/exportar Excel)

---

## Setup

### 1. Variables de entorno
```bash
cp .env.example .env
# Editar .env con:
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
JWT_SECRET=clave_secreta_segura_2026
```

### 2. Crear tablas en Neon
- Ir a neon.tech → SQL Editor
- Ejecutar `scripts/schema.sql`

### 3. Instalar e iniciar
```bash
npm install
cd client && npm install && cd ..
npm run dev          # API en :3001
cd client && npm start  # React en :3000
```

### 4. Deploy en Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
# Agregar variables: DATABASE_URL, JWT_SECRET
```

---

## Roles y accesos

| Rol | Acceso |
|-----|--------|
| `admin` | Todo el sistema |
| `director` | Admin sin gestión de usuarios |
| `tutor` | Ver alumnos y resultados |
| `docente` | Ver alumnos y resultados |
| `student` | Responder encuestas, ver biblioteca, editar perfil |

**Credenciales por defecto:** `admin` / `Admin2026!`

---

##  Importar desde Excel SIAGIE

1. Login como admin → **Alumnos** → ** Importar Excel**
2. Seleccionar archivo `.xlsx` del SIAGIE
3. El sistema detecta automáticamente Primaria o Secundaria
4. Muestra resumen: nuevos / duplicados / errores

---

##  Funcionalidades

### Alumnos
- Búsqueda en tiempo real por nombre, DNI, celular
- Filtros: nivel, grado, sección, sexo, estado, con/sin celular
- Paginación (10/25/50/100 por página)
- Estados: activo, retirado, egresado, bloqueado
- Exportar lista a Excel con filtros aplicados
- Contactos de emergencia con botón de llamada directa
- Foto de perfil del alumno

### Encuestas
- 8 tipos de preguntas: opción múltiple, selección múltiple, texto, escala 1-5, sí/no, desplegable, fecha, número
- Borrador / Activa / Cerrada / Archivada
- Asignación por nivel/grado/sección
- Programar fecha de inicio y cierre
- Duplicar encuestas existentes
- Resultados con gráficos, filtros y lista de pendientes
- Exportar resultados a Excel

### Biblioteca
- Subir materiales por nivel/grado/sección
- Los alumnos ven solo los de su clase

### Dashboard
- Estadísticas generales
- Gráficos de alumnos por nivel y estado de encuestas
- Historial de importaciones

### Seguridad
- Bloqueo tras 5 intentos fallidos
- JWT con expiración de 10 horas
- Roles diferenciados (admin, director, tutor, docente, student)
# manuel-scorza-encuestas

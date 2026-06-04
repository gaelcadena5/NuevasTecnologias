import pg from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const { Pool } = pg;

// Configuración flexible que soporta URL de conexión (muy común en nubes como Neon o Supabase)
// o credenciales individuales tradicionales.
const useSSL = process.env.DB_HOST && (process.env.DB_HOST.includes('amazonaws.com') || process.env.DB_SSL === 'true');

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Requerido para conexiones seguras en bases de datos en la nube
      }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      ssl: useSSL ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(config);

// Evento que se ejecuta al conectar un nuevo cliente al Pool
pool.on('connect', () => {
  console.log('Cliente conectado a la base de datos PostgreSQL.');
});

pool.on('error', (err) => {
  console.error('Error inesperado en la base de datos PostgreSQL:', err);
  process.exit(-1);
});

export default pool;

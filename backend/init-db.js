import pool from './db.js';

async function initializeDatabase() {
  console.log('Iniciando inicialización de la base de datos...');
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL
    );
  `;

  const checkEmptyQuery = `SELECT COUNT(*) FROM usuarios;`;

  const insertSeedDataQuery = `
    INSERT INTO usuarios (nombre, email) VALUES
    ('Juan Pérez', 'juan.perez@example.com'),
    ('María Gómez', 'maria.gomez@example.com'),
    ('Carlos Rodríguez', 'carlos.rodriguez@example.com')
    ON CONFLICT (email) DO NOTHING;
  `;

  try {
    // 1. Crear tabla usuarios
    console.log('Creando tabla "usuarios" (si no existe)...');
    await pool.query(createTableQuery);
    console.log('Tabla "usuarios" lista.');

    // 2. Verificar si está vacía
    const res = await pool.query(checkEmptyQuery);
    const count = parseInt(res.rows[0].count, 10);

    if (count === 0) {
      console.log('La tabla está vacía. Insertando 3 registros de prueba...');
      await pool.query(insertSeedDataQuery);
      console.log('¡Registros de prueba insertados con éxito!');
    } else {
      console.log(`La tabla ya contiene ${count} registros. Se omite la inserción de datos semilla.`);
    }

    console.log('Base de datos inicializada exitosamente.');
  } catch (error) {
    console.error('Error durante la inicialización de la base de datos:', error);
  } finally {
    // Cerrar el pool para terminar el proceso de Node de forma limpia
    await pool.end();
    console.log('Conexión con PostgreSQL cerrada.');
  }
}

initializeDatabase();

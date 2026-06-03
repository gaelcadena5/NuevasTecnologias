import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configurar CORS
// Obtenemos la URL del frontend desde las variables de entorno
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como herramientas de prueba curl/Postman o carga directa local)
    // Pero forzar el origen del Frontend si viene de un navegador web.
    if (!origin || origin === frontendUrl || frontendUrl === '*') {
      callback(null, true);
    } else {
      callback(new Error('No permitido por políticas de CORS del Backend'));
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Logger simple para ver las peticiones entrantes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Endpoint de prueba de salud (Health Check) - Muestra si el backend y la base de datos están conectados
app.get('/api/health', async (req, res) => {
  try {
    // Hacemos una consulta rápida para ver si la base de datos responde
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      message: 'El servidor backend y la base de datos PostgreSQL están funcionando correctamente.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'El servidor funciona, pero no se pudo conectar a la base de datos.',
      error: error.message
    });
  }
});

// Endpoint principal requerido: GET /api/users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email FROM usuarios ORDER BY id ASC');
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al consultar usuarios en la base de datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener la lista de usuarios.',
      error: error.message
    });
  }
});

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Recurso no encontrado' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Servidor Backend escuchando en: http://localhost:${PORT}`);
  console.log(` Configurado para permitir CORS desde: ${frontendUrl}`);
  console.log(`==================================================`);
});

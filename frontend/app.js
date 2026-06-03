import CONFIG from './config.js';

// Estado global de la aplicación
let usersState = [];
let activeView = 'table'; // 'table' o 'grid'

// Elementos del DOM
const elements = {
  statusBackend: document.getElementById('status-backend'),
  statusDatabase: document.getElementById('status-database'),
  searchInput: document.getElementById('search-input'),
  btnViewTable: document.getElementById('btn-view-table'),
  btnViewGrid: document.getElementById('btn-view-grid'),
  btnRefresh: document.getElementById('btn-refresh'),
  refreshIcon: document.getElementById('refresh-icon'),
  btnRetry: document.getElementById('btn-retry'),
  
  // Contenedores de estado
  loadingState: document.getElementById('loading-state'),
  errorState: document.getElementById('error-state'),
  emptyState: document.getElementById('empty-state'),
  
  // Vistas
  tableView: document.getElementById('table-view'),
  gridView: document.getElementById('grid-view'),
  tableBody: document.getElementById('users-table-body'),
  
  // Elementos de error
  errorTitle: document.getElementById('error-title'),
  errorMessage: document.getElementById('error-message'),
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadData();
});

// Configurar los manejadores de eventos
function setupEventListeners() {
  // Cambio de Vista a Tabla
  elements.btnViewTable.addEventListener('click', () => {
    switchView('table');
  });

  // Cambio de Vista a Tarjetas
  elements.btnViewGrid.addEventListener('click', () => {
    switchView('grid');
  });

  // Botón de Actualizar
  elements.btnRefresh.addEventListener('click', () => {
    loadData();
  });

  // Botón de Reintentar en pantalla de error
  elements.btnRetry.addEventListener('click', () => {
    loadData();
  });

  // Búsqueda en tiempo real
  elements.searchInput.addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });
}

// Función para cambiar de vista de forma visual y lógica
function switchView(view) {
  activeView = view;
  
  if (view === 'table') {
    elements.btnViewTable.classList.add('active');
    elements.btnViewGrid.classList.remove('active');
    
    if (usersState.length > 0) {
      elements.tableView.classList.remove('hidden');
      elements.gridView.classList.add('hidden');
    }
  } else {
    elements.btnViewTable.classList.remove('active');
    elements.btnViewGrid.classList.add('active');
    
    if (usersState.length > 0) {
      elements.tableView.classList.add('hidden');
      elements.gridView.classList.remove('hidden');
    }
  }
}

// Actualizar los badges de estado del sistema (Backend y DB)
function updateStatusBadge(badgeEl, status, text) {
  const dot = badgeEl.querySelector('.status-dot');
  const valueText = badgeEl.querySelector('.status-value');
  
  // Limpiar clases previas
  dot.className = 'status-dot';
  
  if (status === 'online') {
    dot.classList.add('online');
    valueText.textContent = text || 'En línea';
    valueText.style.color = 'var(--color-success)';
  } else if (status === 'offline') {
    dot.classList.add('offline');
    valueText.textContent = text || 'Fuera de línea';
    valueText.style.color = 'var(--color-danger)';
  } else {
    dot.classList.add('warning');
    valueText.textContent = text || 'Verificando...';
    valueText.style.color = 'var(--color-warning)';
  }
}

// Cargar datos del Backend
async function loadData() {
  showLoading();
  
  // Agregar animación de rotación al botón de refresh
  elements.refreshIcon.classList.add('fa-spin');
  elements.searchInput.disabled = true;
  elements.btnViewTable.disabled = true;
  elements.btnViewGrid.disabled = true;
  
  // Resetear estados visuales de badges
  updateStatusBadge(elements.statusBackend, 'checking', 'Conectando...');
  updateStatusBadge(elements.statusDatabase, 'checking', 'Verificando...');

  try {
    // 1. Verificar primero la API de salud general (Health Check)
    const healthResponse = await fetch(`${CONFIG.API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok && healthData.status === 'ok') {
      updateStatusBadge(elements.statusBackend, 'online', 'En línea');
      updateStatusBadge(elements.statusDatabase, 'online', 'Conectado');
    } else {
      // Si responde pero con error en DB
      updateStatusBadge(elements.statusBackend, 'online', 'En línea');
      updateStatusBadge(elements.statusDatabase, 'offline', 'Error DB');
    }
  } catch (err) {
    // Si falla completamente el fetch inicial
    console.warn('El Health Check falló de forma directa, procediendo al fetch de usuarios para diagnosticar.');
  }

  try {
    // 2. Consultar el endpoint de usuarios
    const response = await fetch(`${CONFIG.API_BASE_URL}/users`);
    const result = await response.json();

    if (response.ok && result.success) {
      usersState = result.data;
      
      // Aseguramos que los estados estén correctos en los badges
      updateStatusBadge(elements.statusBackend, 'online', 'En línea');
      updateStatusBadge(elements.statusDatabase, 'online', 'Conectado');
      
      // Habilitar controles
      elements.searchInput.disabled = false;
      elements.btnViewTable.disabled = false;
      elements.btnViewGrid.disabled = false;
      
      renderData(usersState);
    } else {
      // El backend respondió pero hubo un error lógico (ej. problema de base de datos)
      updateStatusBadge(elements.statusBackend, 'online', 'En línea');
      updateStatusBadge(elements.statusDatabase, 'offline', 'Error DB');
      
      showError(
        'Error de Base de Datos',
        result.message || 'El servidor backend está en ejecución, pero ocurrió un error al realizar la consulta a la base de datos PostgreSQL. Verifica que las credenciales sean correctas y que la tabla de usuarios exista.'
      );
    }
  } catch (error) {
    // Error al conectar con el backend
    console.error('Error de red al intentar conectar con el backend:', error);
    updateStatusBadge(elements.statusBackend, 'offline', 'Desconectado');
    updateStatusBadge(elements.statusDatabase, 'offline', 'Inalcanzable');
    
    showError(
      'Error de Conexión de Red',
      `No se pudo establecer comunicación con la API del Backend en la dirección: <strong>${CONFIG.API_BASE_URL}</strong>.<br><br>
       <strong>Solución de problemas:</strong><br>
       1. Verifica que hayas iniciado el servidor backend con <code>npm run dev</code>.<br>
       2. Valida que el servidor esté escuchando en el puerto esperado.<br>
       3. Verifica si hay algún bloqueo de red o CORS.`
    );
  } finally {
    // Quitar animación de rotación del botón
    setTimeout(() => {
      elements.refreshIcon.classList.remove('fa-spin');
    }, 600);
  }
}

// Renderizar la información según la vista activa
function renderData(users) {
  if (users.length === 0) {
    showEmpty();
    return;
  }

  // Ocultar estados de carga, error y vacío
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.emptyState.classList.add('hidden');

  // Renderizar la Tabla
  renderTable(users);
  
  // Renderizar las Tarjetas
  renderGrid(users);

  // Mostrar la vista que esté seleccionada
  if (activeView === 'table') {
    elements.tableView.classList.remove('hidden');
    elements.gridView.classList.add('hidden');
  } else {
    elements.tableView.classList.add('hidden');
    elements.gridView.classList.remove('hidden');
  }
}

// Renderizar tabla HTML
function renderTable(users) {
  elements.tableBody.innerHTML = '';
  
  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="user-id-badge">#${user.id}</span></td>
      <td class="font-medium">${escapeHTML(user.nombre)}</td>
      <td class="text-secondary">${escapeHTML(user.email)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-action" title="Detalles" onclick="alert('Usuario: ${escapeHTML(user.nombre)}\\nEmail: ${escapeHTML(user.email)}')">
            <i class="fa-regular fa-eye"></i>
          </button>
          <span class="action-tag">Registrado</span>
        </div>
      </td>
    `;
    elements.tableBody.appendChild(tr);
  });
}

// Renderizar tarjetas en Grid
function renderGrid(users) {
  elements.gridView.innerHTML = '';
  
  users.forEach(user => {
    // Generar iniciales para la imagen del perfil
    const initials = user.nombre
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const card = document.createElement('div');
    card.className = 'user-card';
    card.innerHTML = `
      <div class="card-header">
        <div class="user-avatar">${initials}</div>
        <span class="card-id">ID #${user.id}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHTML(user.nombre)}</h3>
        <p><i class="fa-regular fa-envelope"></i> ${escapeHTML(user.email)}</p>
      </div>
      <div class="card-footer">
        <span class="status-indicator-active">
          <span class="indicator-dot"></span> Activo
        </span>
        <button class="btn btn-secondary btn-sm" onclick="alert('Contacto: ${escapeHTML(user.email)}')">
          <i class="fa-regular fa-comment"></i> Mensaje
        </button>
      </div>
    `;
    elements.gridView.appendChild(card);
  });
}

// Manejar la búsqueda/filtrado
function handleSearch(query) {
  const lowercaseQuery = query.toLowerCase().trim();
  
  if (lowercaseQuery === '') {
    renderData(usersState);
    return;
  }

  const filtered = usersState.filter(user => 
    user.nombre.toLowerCase().includes(lowercaseQuery) || 
    user.email.toLowerCase().includes(lowercaseQuery)
  );

  if (filtered.length === 0) {
    // Mostrar vacío pero sin ocultar la barra de búsquedas
    elements.tableView.classList.add('hidden');
    elements.gridView.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
    elements.emptyMessage.textContent = `No hay ningún usuario que coincida con "${query}"`;
  } else {
    renderData(filtered);
  }
}

// Mostrar pantalla de Carga
function showLoading() {
  elements.loadingState.classList.remove('hidden');
  elements.errorState.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.tableView.classList.add('hidden');
  elements.gridView.classList.add('hidden');
}

// Mostrar pantalla de Error
function showError(title, message) {
  elements.loadingState.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.tableView.classList.add('hidden');
  elements.gridView.classList.add('hidden');
  
  elements.errorState.classList.remove('hidden');
  elements.errorTitle.textContent = title;
  elements.errorMessage.innerHTML = message;
}

// Mostrar pantalla de Lista Vacía
function showEmpty() {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.tableView.classList.add('hidden');
  elements.gridView.classList.add('hidden');
  
  elements.emptyState.classList.remove('hidden');
  elements.emptyMessage.textContent = 'La base de datos se conectó correctamente, pero actualmente la tabla "usuarios" no contiene registros.';
}

// Evitar inyección de HTML en campos renderizados
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

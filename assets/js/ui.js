/**
 * NEXUS PRO - UI Controller
 */

console.log('🔄 Cargando ui.js...');

// Backup function directly on window
window.testUI = function() {
    console.log('✅ testUI funciona!');
    return 'OK';
};

// Expose immediately in case IIFE fails
window.AdminFunctions = window.AdminFunctions || {};

(function() {
    'use strict';

    console.log('✅ ui.js IIFE ejecutándose');

    /**
     * ========================================
     * CONFIGURACIÓN DE SEGURIDAD
     * PIN maestro para acceso al panel
     * ========================================
     */

(function() {
    'use strict';

    /**
     * ========================================
     * CONFIGURACIÓN DE SEGURIDAD
     * PIN maestro para acceso al panel
     * ========================================
     */
    const SECURITY_CONFIG = {
        MASTER_PIN: 'NEXUS2026',
        isAuthenticated: false
    };

    /**
     * ========================================
     * ESTADO DE LA APLICACIÓN
     * Almacena la información global necesaria
     * ========================================
     */
    const AppState = {
        currentSection: 'dashboard',
        clients: [],
        isLoading: false,
        searchQuery: ''
    };

    /**
     * ========================================
     * REFERENCIAS AL DOM
     * Cache de elementos del documento para
     * evitar búsquedas repetitivas
     * ========================================
     */
    const Elements = {
        loginOverlay: document.getElementById('login-overlay'),
        loginForm: document.getElementById('login-form'),
        loginPin: document.getElementById('admin-pin'),
        loginError: document.getElementById('login-error'),
        appContent: document.getElementById('app-content'),
        navItems: document.querySelectorAll('.nav-item[data-section]'),
        views: document.querySelectorAll('.view'),
        pageTitle: document.getElementById('page-title'),
        pageSubtitle: document.getElementById('page-subtitle'),
        searchInput: document.getElementById('search-input'),
        modalOverlay: document.getElementById('modal-overlay'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalMessage: document.getElementById('modal-message'),
        modalContent: document.getElementById('modal-content'),
        modalClose: document.getElementById('modal-close'),
        modalCancel: document.getElementById('modal-cancel'),
        modalConfirm: document.getElementById('modal-confirm'),
        toastContainer: document.getElementById('toast-container'),
        clientsTableBody: document.getElementById('clients-table-body'),
        newClientForm: document.getElementById('new-client-form'),
        btnBackup: document.getElementById('btn-backup'),
        btnKill: document.getElementById('btn-kill'),
        btnGodmode: document.getElementById('btn-godmode'),
        btnRefresh: document.getElementById('btn-refresh'),
        btnNewNotice: document.getElementById('btn-new-notice'),
        statTiendas: document.getElementById('stat-tiendas'),
        statClientes: document.getElementById('stat-clientes'),
        statIngresos: document.getElementById('stat-ingresos'),
        statSuspendidas: document.getElementById('stat-suspendidas'),
        lastBackup: document.getElementById('last-backup'),
        newClientsToday: document.getElementById('new-clients-today')
    };

    /**
     * ========================================
     * CONFIGURACIÓN DE TÍTULOS
     * Define los títulos y subtítulos para
     * cada sección del menú
     * ========================================
     */
    const SectionTitles = {
        dashboard: { 
            title: 'Dashboard', 
            subtitle: 'Resumen de tu infraestructura' 
        },
        clientes: { 
            title: 'Clientes', 
            subtitle: 'Gestión de tiendas registradas' 
        },
        avisos: { 
            title: 'Avisos', 
            subtitle: 'Comunicados del sistema' 
        }
    };

    /**
     * ========================================
     * FUNCIÓN DE INICIALIZACIÓN
     * Se ejecuta cuando el DOM está listo
     * Configura los event listeners y carga
     * los datos iniciales
     * ========================================
     */
    function init() {
        console.log('🔄 Inicializando Nexus Pro PCC...');
        
        setupLoginSystem();
        
        if (SECURITY_CONFIG.isAuthenticated) {
            setupEventListeners();
            setInitialView();
            loadInitialData();
        }
        
        console.log('✅ Nexus Pro PCC Inicializado correctamente');
    }

    /**
     * ========================================
     * SISTEMA DE AUTENTICACIÓN
     * Maneja el login con PIN maestro
     * ========================================
     */
    function setupLoginSystem() {
        console.log('🔐 Configurando sistema de autenticación...');
        
        if (!Elements.loginOverlay || !Elements.loginForm) {
            console.log('⚠️ No se encontró el formulario de login');
            return;
        }
        
        Elements.loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
        
        if (Elements.loginPin) {
            Elements.loginPin.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin();
                }
            });
        }
        
        console.log('✅ Sistema de autenticación configurado');
    }

    /**
     * ========================================
     * MANEJO DEL LOGIN
     * Valida el PIN y muestra/oculta el panel
     * ========================================
     */
    function handleLogin() {
        const enteredPin = Elements.loginPin.value.trim();
        
        console.log('🔐 Intentando autenticación...');
        
        if (enteredPin === SECURITY_CONFIG.MASTER_PIN) {
            console.log('✅ PIN correcto - Iniciando sesión');
            
            SECURITY_CONFIG.isAuthenticated = true;
            
            showAppContent();
            
            showToast('Bienvenido al Panel de Control', 'success');
            
        } else {
            console.log('❌ PIN incorrecto');
            
            showLoginError();
        }
    }

    /**
     * ========================================
     * MOSTRAR CONTENIDO DE LA APP
     * Oculta el overlay y muestra el panel
     * ========================================
     */
    function showAppContent() {
        if (Elements.loginOverlay) {
            Elements.loginOverlay.style.display = 'none';
        }
        
        if (Elements.appContent) {
            Elements.appContent.style.display = 'grid';
        }
        
        setupEventListeners();
        setInitialView();
        loadInitialData();
        
        console.log('✅ Panel de control visible');
    }

    /**
     * ========================================
     * MOSTRAR ERROR DE LOGIN
     * ========================================
     */
    function showLoginError() {
        if (Elements.loginError) {
            Elements.loginError.classList.add('show');
            Elements.loginPin.value = '';
            Elements.loginPin.focus();
            
            setTimeout(function() {
                Elements.loginError.classList.remove('show');
            }, 3000);
        }
    }

/**
     * ========================================
     * CARGA DE DATOS INICIALES (DESDE API)
     * ========================================
     */
    async function loadInitialData() {
        console.log('📊 Cargando datos iniciales desde el backend...');
        
        try {
            const resultado = await realizarPeticion('obtenerEstadisticas', {});
            
            if (resultado) {
                if (Elements.statTiendas) {
                    Elements.statTiendas.textContent = resultado.tiendasActivas || '0';
                }
                if (Elements.statClientes) {
                    Elements.statClientes.textContent = resultado.clientesTotal || '0';
                }
                if (Elements.statIngresos) {
                    var ingresos = resultado.ingresosMensuales || 0;
                    Elements.statIngresos.textContent = '$' + ingresos.toLocaleString();
                }
                if (Elements.statSuspendidas) {
                    Elements.statSuspendidas.textContent = resultado.suspendidas || '0';
                }
                console.log('✅ Estadísticas cargadas:', resultado);
            }
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar estadísticas:', error.message);
            // Usar valores por defecto si falla
            if (Elements.statTiendas) Elements.statTiendas.textContent = '0';
            if (Elements.statClientes) Elements.statClientes.textContent = '0';
            if (Elements.statIngresos) Elements.statIngresos.textContent = '$0';
            if (Elements.statSuspendidas) Elements.statSuspendidas.textContent = '0';
        }
        
        // Cargar clientes
        await loadClients();
        
        console.log('✅ Datos iniciales cargados');
    }

    /**
     * ========================================
     * CERRAR SESIÓN
     * ========================================
     */
    function logout() {
        SECURITY_CONFIG.isAuthenticated = false;
        
        if (Elements.appContent) {
            Elements.appContent.style.display = 'none';
        }
        
        if (Elements.loginPin) {
            Elements.loginPin.value = '';
        }
        
        if (Elements.loginOverlay) {
            Elements.loginOverlay.style.display = 'flex';
        }
        
        showToast('Sesión cerrada', 'info');
    }

    /**
     * ========================================
     * CONFIGURAR ESCUCHADORES DE EVENTOS
     * Asocia todos los eventos necesarios para
     * el funcionamiento de la aplicación
     * ========================================
     */
    function setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // Evitar agregar listeners duplicados
        if (Elements.navItems && Elements.navItems.length > 0) {
            Elements.navItems.forEach(function(item) {
                item.addEventListener('click', function(event) {
                    handleNavigation(event);
                });
            });
        }

        if (Elements.btnBackup) {
            Elements.btnBackup.addEventListener('click', function() {
                console.log('📌 Evento: Clic en Botón Backup');
                handleBackup();
            });
        }

        if (Elements.btnKill) {
            Elements.btnKill.addEventListener('click', function() {
                console.log('📌 Evento: Clic en Botón Kill Switch');
                handleKillSwitch();
            });
        }

        if (Elements.btnGodmode) {
            Elements.btnGodmode.addEventListener('click', function() {
                console.log('📌 Evento: Clic en Botón Modo Dios');
                handleGodMode();
            });
        }

        if (Elements.btnRefresh) {
            Elements.btnRefresh.addEventListener('click', function() {
                console.log('📌 Evento: Clic en Botón Sincronizar');
                handleRefresh();
            });
        }

        if (Elements.btnNewNotice) {
            Elements.btnNewNotice.addEventListener('click', function() {
                console.log('📌 Evento: Clic en Botón Nuevo Aviso');
                handleNewNotice();
            });
        }

        if (Elements.searchInput) {
            Elements.searchInput.addEventListener('input', function(e) {
                handleSearch(e);
            });
        }

        if (Elements.modalClose) {
            Elements.modalClose.addEventListener('click', function() {
                closeModal();
            });
        }

        if (Elements.modalCancel) {
            Elements.modalCancel.addEventListener('click', function() {
                closeModal();
            });
        }

        if (Elements.modalOverlay) {
            Elements.modalOverlay.addEventListener('click', function(e) {
                if (e.target === Elements.modalOverlay) {
                    closeModal();
                }
            });
        }

        if (Elements.newClientForm) {
            Elements.newClientForm.addEventListener('submit', function(e) {
                handleNewClientSubmit(e);
            });
        }

        document.addEventListener('keydown', function(e) {
            handleKeyboard(e);
        });

        console.log('✅ Event listeners configurados');
    }

    /**
     * ========================================
     * NAVEGACIÓN SPA
     * Función principal que maneja el cambio
     * entre secciones del menú
     * @param {Event} event - Evento del clic
     * ========================================
     */
    function handleNavigation(event) {
        const clickedButton = event.currentTarget;
        
        const targetSection = clickedButton.getAttribute('data-section');
        
        console.log(`🧭 Navegando a: ${targetSection}`);
        
        if (AppState.currentSection === targetSection) {
            console.log('⚠️ Ya estamos en esta sección, no hay cambios');
            return;
        }
        
        AppState.currentSection = targetSection;
        
        updateSidebarActiveState(clickedButton);
        
        updateMainContentView(targetSection);
        
        updatePageTitles(targetSection);
        
        executeSectionSpecificActions(targetSection);
        
        showToast(`Navegando a ${SectionTitles[targetSection].title}`, 'success');
    }

    /**
     * ========================================
     * ACTUALIZAR ESTADO ACTIVO DEL SIDEBAR
     * Quita la clase .active del botón anterior
     * y la agrega al botón clickeado
     * @param {HTMLElement} activeButton - Botón que fue clickeado
     * ========================================
     */
    function updateSidebarActiveState(activeButton) {
        Elements.navItems.forEach(function(item) {
            item.classList.remove('active');
        });
        
        activeButton.classList.add('active');
        
        console.log(`✅ Estado activo del sidebar actualizado: ${activeButton.getAttribute('data-section')}`);
    }

    /**
     * ========================================
     * ACTUALIZAR VISTA DEL MAIN CONTENT
     * Oculta todas las secciones y muestra
     * solo la sección correspondiente
     * @param {string} section - Identificador de la sección
     * ========================================
     */
    function updateMainContentView(section) {
        Elements.views.forEach(function(view) {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById('view-' + section);
        
        if (targetView) {
            targetView.classList.add('active');
            console.log(`📄 Vista activada: view-${section}`);
        } else {
            console.error(`❌ No se encontró la vista: view-${section}`);
        }
    }

    /**
     * ========================================
     * ACTUALIZAR TÍTULOS DE LA PÁGINA
     * Cambia el título y subtítulo del header
     * según la sección activa
     * @param {string} section - Sección actual
     * ========================================
     */
    function updatePageTitles(section) {
        const titles = SectionTitles[section];
        
        if (titles) {
            Elements.pageTitle.textContent = titles.title;
            Elements.pageSubtitle.textContent = titles.subtitle;
            console.log(`📝 Títulos actualizados: ${titles.title} - ${titles.subtitle}`);
        }
    }

    /**
     * ========================================
     * ESTABLECER VISTA INICIAL
     * Se llama al cargar la página por primera
     * vez para mostrar el Dashboard
     * ========================================
     */
    function setInitialView() {
        console.log('🎯 Estableciendo vista inicial (Dashboard)...');
        
        const dashboardButton = document.querySelector('.nav-item[data-section="dashboard"]');
        if (dashboardButton) {
            dashboardButton.classList.add('active');
        }
        
        const dashboardView = document.getElementById('view-dashboard');
        if (dashboardView) {
            dashboardView.classList.add('active');
        }
        
        Elements.pageTitle.textContent = SectionTitles.dashboard.title;
        Elements.pageSubtitle.textContent = SectionTitles.dashboard.subtitle;
        
        AppState.currentSection = 'dashboard';
        
        console.log('✅ Vista inicial establecida: Dashboard');
    }

    /**
     * ========================================
     * EJECUTAR ACCIONES ESPECÍFICAS POR SECCIÓN
     * Realiza acciones particulares cuando se
     * cambia a ciertas secciones
     * @param {string} section - Sección activa
     * ========================================
     */
    function executeSectionSpecificActions(section) {
        switch(section) {
            case 'clientes':
                console.log('📋 Ejecutando acciones para sección Clientes...');
                renderClientsTable();
                break;
            case 'onboarding':
                console.log('📋 Ejecutando acciones para sección Onboarding...');
                break;
            case 'avisos':
                console.log('📋 Ejecutando acciones para sección Avisos...');
                break;
            case 'dashboard':
                console.log('📋 Ejecutando acciones para sección Dashboard...');
                break;
            default:
                console.log('⚠️ Sección sin acciones específicas');
        }
    }

    /**
     * ========================================
     * MANEJO DE BÚSQUEDA
     * Filtra los clientes según el texto escrito
     * @param {Event} e - Evento del input
     * ========================================
     */
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        AppState.searchQuery = searchTerm;
        
        if (AppState.currentSection === 'clientes') {
            renderClientsTable();
        }
        
        console.log(`🔍 Búsqueda: ${searchTerm}`);
    }

    /**
     * ========================================
     * MANEJO DE ATAJOS DE TECLADO
     * Ctrl+1-3 para navegación rápida
     * @param {KeyboardEvent} e - Evento de teclado
     * ========================================
     */
    function handleKeyboard(e) {
        if (e.ctrlKey && e.key >= '1' && e.key <= '3') {
            const sections = ['dashboard', 'clientes', 'avisos'];
            const sectionIndex = parseInt(e.key) - 1;
            
            console.log(`⌨️ Atajo de teclado: Ctrl+${e.key} -> ${sections[sectionIndex]}`);
            
            const targetButton = document.querySelector(`.nav-item[data-section="${sections[sectionIndex]}"]`);
            
            if (targetButton) {
                handleNavigation({ currentTarget: targetButton });
            }
        }
    }

    /**
     * ========================================
     * HANDLERS DE BOTONES DE ACCIÓN
     * ========================================
     */
    function handleBackup() {
        console.log('💾 Ejecutando handler de Backup...');
        
        showModal(
            'Confirmar Backup General',
            '¿Estás seguro de ejecutar un backup completo de todas las tiendas? Este proceso puede tomar varios minutos.',
            function() {
                executeGlobalBackup();
            }
        );
    }

    function handleKillSwitch() {
        console.log('⛔ Ejecutando handler de Kill Switch...');
        
        showModal(
            '⚠️ KILL SWITCH',
            'Esta acción suspenderá TODAS las tiendas de forma inmediata. ¿Estás completamente seguro?',
            function() {
                executeKillSwitch();
            },
            true
        );
    }

    function handleGodMode() {
        console.log('👑 Ejecutando handler de Modo Dios...');
        
        showModal(
            '👑 MODO DIOS - Acceso Avanzado',
            'El Modo Dios te permite acceder a cualquier Sheet de cliente sin restricciones. ¿Activar?',
            function() {
                toggleGodMode();
            }
        );
    }

    function handleRefresh() {
        console.log('↻ Ejecutando handler de Refresh...');
        
        loadInitialData();
        showToast('Datos sincronizados', 'success');
    }

    function handleNewNotice() {
        console.log('📢 Ejecutando handler de Nuevo Aviso...');
        
        showModal(
            'Nuevo Aviso',
            'Función de creación de avisos en desarrollo.',
            null
        );
    }

    /**
     * ========================================
     * ENVÍO DEL FORMULARIO DE NUEVO CLIENTE
     * @param {Event} e - Evento del formulario
     * ========================================
     */
    async function handleNewClientSubmit(e) {
        e.preventDefault();
        
        console.log('📝 Enviando formulario de nuevo cliente...');
        
        const formData = {
            name: document.getElementById('client-name').value,
            email: document.getElementById('client-email').value,
            phone: document.getElementById('client-phone').value,
            plan: document.getElementById('client-plan').value,
            sheetUrl: document.getElementById('client-sheet').value
        };
        
        console.log('📋 Datos del formulario:', formData);
        
        showToast('Registrando cliente...', 'warning');

        try {
            if (typeof NexusAPI !== 'undefined' && NexusAPI.registrarCliente) {
                const result = await NexusAPI.registrarCliente(formData);

                if (result.success) {
                    showToast(`Cliente registrado: ${result.shopId}`, 'success');
                    Elements.newClientForm.reset();
                    loadInitialData();
                    
                    const dashboardButton = document.querySelector('.nav-item[data-section="clientes"]');
                    if (dashboardButton) {
                        handleNavigation({ currentTarget: dashboardButton });
                    }
                } else {
                    showToast(result.message || 'Error al registrar cliente', 'error');
                }
            } else {
                console.log('⚠️ NexusAPI no disponible, simulando registro...');
                showToast('Cliente registrado (simulado)', 'success');
                Elements.newClientForm.reset();
            }
        } catch (error) {
            console.error('❌ Error en handleNewClientSubmit:', error);
            showToast('Error de conexión con el servidor', 'error');
        }
    }

    /**
     * ========================================
     * FUNCIONES DE ACCIÓN PRINCIPALES
     * ========================================
     */
    async function executeGlobalBackup() {
        console.log('💾 Ejecutando backup global...');
        
        showToast('Iniciando backup general...', 'warning');

        try {
            if (typeof NexusAPI !== 'undefined' && NexusAPI.ejecutarBackupGlobal) {
                const result = await NexusAPI.ejecutarBackupGlobal();

                if (result.success) {
                    showToast(`Backup completado: ${result.backups} archivos`, 'success');
                } else {
                    showToast(result.message || 'Error en backup', 'error');
                }
            } else {
                console.log('⚠️ Simulando backup global...');
                setTimeout(function() {
                    showToast('Backup completado (simulado)', 'success');
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Error en executeGlobalBackup:', error);
            showToast('Error al ejecutar backup', 'error');
        }

        closeModal();
    }

    async function executeKillSwitch() {
        console.log('⛔ Ejecutando Kill Switch...');
        
        showToast('Ejecutando Kill Switch...', 'error');

        try {
            if (typeof NexusAPI !== 'undefined' && NexusAPI.ejecutarKillSwitch) {
                const result = await NexusAPI.ejecutarKillSwitch();

                if (result.success) {
                    showToast(`${result.suspended} tiendas suspendidas`, 'success');
                    loadInitialData();
                } else {
                    showToast(result.message || 'Error en Kill Switch', 'error');
                }
            } else {
                console.log('⚠️ Simulando Kill Switch...');
                setTimeout(function() {
                    showToast('Kill Switch ejecutado (simulado)', 'success');
                    loadInitialData();
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Error en executeKillSwitch:', error);
            showToast('Error al ejecutar Kill Switch', 'error');
        }

        closeModal();
    }

    function toggleGodMode() {
        console.log('👑 Activando Modo Dios...');
        
        showToast('Modo Dios activado', 'success');
        
        closeModal();
    }

    /**
     * ========================================
     * CARGA DE DATOS INICIALES
     * Simula la carga de datos del dashboard
     * ========================================
     */
    function loadInitialData() {
        console.log('📊 Cargando datos iniciales...');
        
        if (Elements.statTiendas) {
            Elements.statTiendas.textContent = '12';
        }
        if (Elements.statClientes) {
            Elements.statClientes.textContent = '15';
        }
        if (Elements.statIngresos) {
            Elements.statIngresos.textContent = '$8,997';
        }
        if (Elements.statSuspendidas) {
            Elements.statSuspendidas.textContent = '2';
        }
        if (Elements.lastBackup) {
            Elements.lastBackup.textContent = 'Hace 2 horas';
        }
        if (Elements.newClientsToday) {
            Elements.newClientsToday.textContent = '3';
        }
        
        loadClients();
        
        console.log('✅ Datos iniciales cargados');
    }

    /**
     * ========================================
     * CARGA DE CLIENTES DESDE EL BACKEND
     * ========================================
     */
    async function loadClients() {
        console.log('👥 Cargando clientes desde el backend...');
        
        try {
            const resultado = await obtenerListaClientes();
            
            if (resultado.success && resultado.clientes) {
                AppState.clients = resultado.clientes;
                console.log(`✅ ${AppState.clients.length} clientes cargados desde el backend`);
            } else {
                console.warn('⚠️ No se pudieron cargar clientes del backend');
                AppState.clients = [];
            }
        } catch (error) {
            console.error('❌ Error al cargar clientes:', error);
            AppState.clients = [];
        }
        
        renderClientsTable();
    }

    /**
     * ========================================
     * RENDERIZAR TABLA DE CLIENTES
     * Genera el HTML de la tabla con los datos
     * de los clientes, aplicando filtros de
     * búsqueda si existen
     * ========================================
     */
    function renderClientsTable() {
        console.log('📋 Renderizando tabla de clientes...');
        console.log('📊 AppState.clients:', AppState.clients);
        
        if (!Elements.clientsTableBody) {
            console.error('❌ No se encontró el cuerpo de la tabla');
            return;
        }
        
        if (!AppState.clients || AppState.clients.length === 0) {
            console.log('⚠️ No hay clientes en AppState');
            Elements.clientsTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay clientes registrados</td></tr>';
            return;
        }
        
        console.log('✅ Clientes disponibles:', AppState.clients.length);
        
        const filteredClients = AppState.clients.filter(function(client) {
            const searchTerm = AppState.searchQuery.toLowerCase();
            
            if (!searchTerm) {
                return true;
            }
            
            var nombre = (client.nombre || client[1] || client.name || '').toLowerCase();
            var whatsapp = (client.whatsapp || client[2] || '').toLowerCase();
            var id = (client.id || client[0] || '').toLowerCase();
            var sheetId = (client.sheetId || client[3] || '').toLowerCase();
            
            return nombre.includes(searchTerm) || 
                   whatsapp.includes(searchTerm) || 
                   id.includes(searchTerm) ||
                   sheetId.includes(searchTerm);
        });
        
        console.log(`🔍 Clientes filtrados: ${filteredClients.length} de ${AppState.clients.length}`);
        
        if (filteredClients.length === 0) {
            Elements.clientsTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron clientes</td></tr>';
            return;
        }
        
        let tableHTML = '';
        
filteredClients.forEach(function(client) {
            // Usar propiedades del mapeo híbrido
            var nombre = client.nombre || client[1] || client.name || '';
            var whatsapp = client.whatsapp || client[2] || '';
            var estado = client.estado || client[6] || client.status || 'Activo';
            var created = client.created || client[8] || '';
            var lastAccess = client.lastAccess || client.lastAccess || created; // Usar created como fallback
            
            var statusClass = estado === 'Activo' || estado === 'active' ? 'active' : 'suspended';
            var statusText = estado === 'Activo' || estado === 'active' ? 'Activo' : 'Suspendido';
            var statusIcon = estado === 'Activo' || estado === 'active' ? '⏸️' : '▶️';
            
            tableHTML += '<tr>';
            tableHTML += '<td><strong>' + (client.id || client[0] || '') + '</strong></td>';
            tableHTML += '<td>' + nombre + '</td>';
            tableHTML += '<td>' + whatsapp + '</td>';
            tableHTML += '<td>';
            tableHTML += '<span class="status-badge ' + statusClass + '">';
            tableHTML += '<span class="status-dot"></span>';
            tableHTML += statusText;
            tableHTML += '</span>';
            tableHTML += '</td>';
            tableHTML += '<td>' + formatDate(created) + '</td>';
            tableHTML += '<td>' + formatDate(lastAccess) + '</td>';
            tableHTML += '<td>';
            tableHTML += '<div class="action-buttons">';
            
            tableHTML += '<button class="btn-action view" onclick="viewClient(\'' + (client.id || client[0]) + '\')" title="Ver detalles">👁️</button>';
            tableHTML += '<button class="btn-action suspend" onclick="toggleClientStatus(\'' + (client.id || client[0]) + '\')" title="Cambiar estado">' + statusIcon + '</button>';
            tableHTML += '<button class="btn-action reset-pin" onclick="openResetPinModal(\'' + (client.id || client[0]) + '\', \'' + nombre + '\')" title="Reset PIN">🔑</button>';
            tableHTML += '<button class="btn-action delete" onclick="deleteClient(\'' + (client.id || client[0]) + '\')" title="Eliminar">🗑️</button>';
            
            tableHTML += '</div>';
            tableHTML += '</td>';
            tableHTML += '</tr>';
        });
        
        Elements.clientsTableBody.innerHTML = tableHTML;
        
        console.log('✅ Tabla de clientes renderizada');
    }

    /**
     * ========================================
     * FUNCIONES DE ACCIÓN DE LA TABLA
     * Funciones temporales con console.log()
     * para probar la captura de eventos antes
     * de conectar con el backend
     * ========================================
     */
    window.viewClient = function(clientId) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📌 [TABLE ACTION] viewClient()');
        console.log('   Client ID:', clientId);
        console.log('   Timestamp:', new Date().toISOString());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        showToast('Ver detalles de ' + clientId, 'info');
    };

    window.deleteClient = function(clientId) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📌 [TABLE ACTION] deleteClient()');
        console.log('   Client ID:', clientId);
        console.log('   Timestamp:', new Date().toISOString());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        showModal(
            'Eliminar Cliente',
            '¿Estás seguro de eliminar permanentemente el cliente ' + clientId + '? Esta acción no se puede deshacer.',
            function() {
                console.log('📤 Enviando solicitud de eliminación al backend (simulado)...');
                
                const index = AppState.clients.findIndex(function(c) {
                    return c.id === clientId;
                });
                
                if (index > -1) {
                    AppState.clients.splice(index, 1);
                    
                    renderClientsTable();
                    
                    showToast('Cliente ' + clientId + ' eliminado', 'success');
                }
                
                closeModal();
            },
            true
        );
    };

    window.backupClient = function(clientId) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📌 [TABLE ACTION] backupClient()');
        console.log('   Client ID:', clientId);
        console.log('   Timestamp:', new Date().toISOString());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        showToast('Iniciando backup para ' + clientId, 'warning');
        
        console.log('📤 Enviando solicitud de backup al backend (simulado)...');
        
        setTimeout(function() {
            showToast('Backup de ' + clientId + ' completado', 'success');
        }, 1500);
    };

    window.godModeClient = function(clientId) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📌 [TABLE ACTION] godModeClient()');
        console.log('   Client ID:', clientId);
        console.log('   Timestamp:', new Date().toISOString());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        showToast('Modo Dios activado para ' + clientId, 'info');
        
        console.log('📤 Activando Modo Dios en el backend (simulado)...');
    };

    /**
     * ========================================
     * SISTEMA DE MODALES
     * Funciones para mostrar y cerrar modales
     * ========================================
     */
    function showModal(title, message, onConfirm, isDanger) {
        console.log('📄 Mostrando modal:', title);
        
        Elements.modalTitle.textContent = title;
        Elements.modalMessage.textContent = message;
        Elements.modalContent.innerHTML = '';
        
        if (isDanger) {
            Elements.modalConfirm.textContent = 'Ejecutar';
            Elements.modalConfirm.className = 'btn-danger';
        } else {
            Elements.modalConfirm.textContent = 'Confirmar';
            Elements.modalConfirm.className = 'btn-primary';
        }
        
        if (onConfirm) {
            Elements.modalConfirm.onclick = function() {
                onConfirm();
            };
        } else {
            Elements.modalConfirm.onclick = function() {
                closeModal();
            };
        }
        
        Elements.modalOverlay.classList.add('active');
        
        console.log('✅ Modal mostrado');
    }

    function closeModal() {
        console.log('🔒 Cerrando modal...');
        
        Elements.modalOverlay.classList.remove('active');
        
        console.log('✅ Modal cerrado');
    }

    /**
     * ========================================
     * SISTEMA DE NOTIFICACIONES TOAST
     * Muestra mensajes temporales en pantalla
     * ========================================
     */
    function showToast(message, type) {
        type = type || 'info';
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        
        const icon = icons[type] || icons.info;
        
        toast.innerHTML = '' +
            '<span class="toast-icon">' + icon + '</span>' +
            '<span class="toast-message">' + message + '</span>' +
            '<button class="toast-close" onclick="this.parentElement.remove()">×</button>' +
        '';
        
        Elements.toastContainer.appendChild(toast);
        
        console.log(`📢 Toast (${type}): ${message}`);
        
        setTimeout(function() {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 4000);
    }

    /**
     * ========================================
     * FUNCIONES AUXILIARES
     * Funciones de utilidad general
     * ========================================
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function logAppState() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Estado actual de la aplicación:');
        console.log('   Sección actual:', AppState.currentSection);
        console.log('   Total clientes:', AppState.clients.length);
        console.log('   Búsqueda:', AppState.searchQuery || '(vacía)');
        console.log('   Cargando:', AppState.isLoading);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * ========================================
     * INICIO DE LA APLICACIÓN
     * Se ejecuta cuando el DOM está completamente
     * cargado y listo
     * ========================================
     */
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🌐 DOM completamente cargado');
        init();
    });

})();

/**
 * ========================================
 * NOTAS PARA DESARROLLADOR
 * ========================================
 * 
 * Este archivo maneja toda la interactividad del frontend:
 * 
 * 1. NAVEGACIÓN SPA:
 *    - Los botones del sidebar tienen el atributo data-section
 *    - handleNavigation() cambia las clases .active
 *    - updateMainContentView() muestra/oculta las secciones
 * 
 * 2. ESTADO ACTIVO DEL SIDEBAR:
 *    - updateSidebarActiveState() maneja las clases
 *    - El CSS define .active con fondo verde esmeralda
 *    - Borde de píldora (border-radius: 50px)
 * 
 * 3. INICIALIZACIÓN:
 *    - setInitialView() muestra Dashboard por defecto
 *    - loadInitialData() carga datos simulados
 *    - DOMContentLoaded asegura que el HTML existe
 * 
 * 4. INTERACCIONES DE TABLA:
 *    - viewClient(id): Ver detalles
 *    - toggleClientStatus(id): Cambiar estado
 *    - deleteClient(id): Eliminar cliente
 *    - backupClient(id): Backup individual
 *    - godModeClient(id): Modo Dios individual
 * 
 * Para conectar con el backend real:
 * 1. Reemplazar las funciones simuladas con llamadas a NexusAPI
 * 2. Verificar que api.js esté cargado antes de ui.js
 * 3. Actualizar las URLs del GAS en api.js
 */

    /**
     * ========================================
     * MODAL DE RESET PIN (SEGURIDAD)
     * Funciones para resetear el PIN de un cliente
     * desde el Panel de Administración
     * ========================================
     */
    
    let resetPinClientId = null;
    let resetPinClientName = null;
    
    window.openResetPinModal = function(clientId, clientName) {
        console.log('🔑 Abriendo modal de Reset PIN para:', clientId);
        
        resetPinClientId = clientId;
        resetPinClientName = clientName;
        
        document.getElementById('reset-client-name').textContent = clientName;
        document.getElementById('reset-client-id').textContent = clientId;
        document.getElementById('new-temp-pin').value = '';
        
        document.getElementById('reset-pin-modal').classList.add('active');
    };
    
    window.closeResetPinModal = function() {
        document.getElementById('reset-pin-modal').classList.remove('active');
        resetPinClientId = null;
        resetPinClientName = null;
    };
    
    window.confirmResetPin = function() {
        const nuevoPin = document.getElementById('new-temp-pin').value.trim();
        
        if (!nuevoPin || nuevoPin.length < 4) {
            showToast('El PIN debe tener al menos 4 caracteres', 'error');
            return;
        }
        
        console.log('📤 Enviando solicitud de reset PIN:', resetPinClientId, nuevoPin);
        
        showToast('Restableciendo PIN de ' + resetPinClientName + '...', 'warning');
        
        // Simular llamada a la API (aquí va la llamada real cuando esté conectado)
        setTimeout(function() {
            // Simulación de respuesta exitosa
            console.log('✅ PIN restablecido exitosamente');
            
            showToast('PIN de ' + resetPinClientName + ' ha sido restablecido', 'success');
            
            closeResetPinModal();
        }, 1500);
    };
    
    // Agregar event listeners para el modal de Reset PIN
    document.addEventListener('DOMContentLoaded', function() {
        const resetPinModal = document.getElementById('reset-pin-modal');
        if (resetPinModal) {
            resetPinModal.addEventListener('click', function(e) {
                if (e.target === resetPinModal) {
                    closeResetPinModal();
                }
            });
        }
        
        const confirmBtn = document.getElementById('confirm-reset-pin');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmResetPin);
        }
        
        const cancelBtn = document.getElementById('cancel-reset-pin');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeResetPinModal);
        }
    });

    /* ============================================
       PANEL DE ADMINISTRACIÓN - AUTO-INSTALACIÓN
       ============================================ */

    /**
     * Abre el modal de auto-instalación de cliente
     */
    function openNewShopModal() {
        const modal = document.getElementById('new-shop-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Cierra el modal de auto-instalación
     */
    function closeNewShopModal() {
        const modal = document.getElementById('new-shop-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        document.getElementById('new-shop-form').reset();
        
        // Limpiar sugerencias si existen
        const sugerencias = document.getElementById('sugerencias-container');
        if (sugerencias) {
            sugerencias.remove();
        }
    }

/**
      * Registra un nuevo cliente (auto-instalación)
      */
    async function autoInstalarCliente() {
        console.log('🔔 autoInstalarCliente() llamado');
        
        const nombreInput = document.getElementById('new-shop-name');
        const nombre = nombreInput?.value.trim();
        const propietario = document.getElementById('new-shop-owner')?.value.trim();
        const pin = document.getElementById('new-shop-pin')?.value.trim();
        const email = document.getElementById('new-shop-email')?.value.trim();
        const whatsapp = document.getElementById('new-shop-whatsapp')?.value.trim();

        if (!nombre) return showToast('El nombre del negocio es requerido', 'error');
        if (!propietario) return showToast('El nombre del propietario es requerido', 'error');
        if (!pin) return showToast('El PIN es requerido', 'error');
        if (!email) return showToast('El email es requerido', 'error');

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return showToast('Por favor, ingresa un email válido', 'error');
        }

        showToast('🚀 Creando tienda...', 'info');

        try {
            console.log('📤 Llamando a API.autoInstalarCliente con nombre:', nombre);
            
            if (!window.API || !window.API.autoInstalarCliente) {
                throw new Error('API.autoInstalarCliente no está definido');
            }
            
            const resultado = await window.API.autoInstalarCliente({
                nombre: nombre,
                propietario: propietario,
                pin: pin,
                email: email,
                whatsapp: whatsapp
            });
            
            console.log('✅ Respuesta recibida de API:', JSON.stringify(resultado));

            if (resultado.success) {
                showToast('✅ Tienda creada: ' + resultado.shopId, 'success');
                closeNewShopModal();
                setTimeout(() => window.location.reload(), 1500);
            } else {
                console.log('📥 Resultado del registro:', JSON.stringify(resultado));
                console.log('📋 Sugerencias en resultado:', resultado.sugerencias);
                
                // Verificar si hay error de nombre duplicado con sugerencias
                if (resultado.error === 'nombre_duplicado' && resultado.sugerencias) {
                    console.log('✅ Mostrando sugerencias:', resultado.sugerencias);
                    mostrarSugerenciasNombre(resultado.sugerencias);
                } else if (resultado.message && resultado.message.includes('ya está registrado') && resultado.sugerencias) {
                    console.log('✅ Mostrando sugerencias (por message):', resultado.sugerencias);
                    mostrarSugerenciasNombre(resultado.sugerencias);
                } else {
                    console.log('❌ No cumple condiciones. error:', resultado.error, 'sugerencias:', resultado.sugerencias);
                    showToast('❌ Error: ' + (resultado.error || resultado.message || 'Error desconocido'), 'error');
                }
            }
        } catch (e) {
            showToast('❌ Error de conexión: ' + e.message, 'error');
        }
    }

    /**
     * Muestra sugerencias de nombre como botones
     * @param {Array} sugerencias - Array de nombres sugeridos
     */
    function mostrarSugerenciasNombre(sugerencias) {
        console.log('🎯 Llamando mostrarSugerenciasNombre con:', sugerencias);
        
        const container = document.getElementById('sugerencias-container');
        console.log('📦 Contenedor encontrado:', container);
        
        if (!container) {
            console.error('❌ Contenedor de sugerencias no encontrado');
            return;
        }

        container.innerHTML = '';
        container.style.display = 'block';

        const label = document.createElement('p');
        label.textContent = 'El nombre ya existe. ¿Quieres usar uno de estos?';
        container.appendChild(label);

        const buttonsDiv = document.createElement('div');

        sugerencias.forEach(function(sug) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sugerencia-btn';
            btn.textContent = sug;
            btn.onclick = function() {
                const nombreInput = document.getElementById('new-shop-name');
                if (nombreInput) {
                    nombreInput.value = sug;
                }
                container.innerHTML = '';
                container.style.display = 'none';
                showToast('✅ Nombre actualizado. Intenta crear de nuevo.', 'success');
            };
            buttonsDiv.appendChild(btn);
        });

        container.appendChild(buttonsDiv);
    }

    /**
     * Ejecuta backup global de todas las tiendas
     */
    async function ejecutarBackupGlobal() {
        const pin = prompt('Ingrese PIN de administrador para ejecutar backup:');
        if (!pin) return;
        if (pin !== SECURITY_CONFIG.MASTER_PIN) {
            return showToast('❌ PIN incorrecto', 'error');
        }

        showToast('💾 Ejecutando backup global...', 'info');

        try {
            const resultado = await window.API.ejecutarBackupGlobal();

            if (resultado.success) {
                showToast('✅ Backup completado: ' + resultado.exitosos + ' tiendas', 'success');
            } else {
                showToast('❌ Error: ' + resultado.error, 'error');
            }
        } catch (e) {
            showToast('❌ Error: ' + e.message, 'error');
        }
    }

    /**
     * Configura el trigger de backup automático
     */
    async function configurarTriggerBackup() {
        const pin = prompt('Ingrese PIN de administrador:');
        if (!pin) return;
        if (pin !== SECURITY_CONFIG.MASTER_PIN) {
            return showToast('❌ PIN incorrecto', 'error');
        }

        try {
            const resultado = await window.API.configurarTriggerBackup();

            if (resultado.success) {
                showToast('✅ ' + resultado.message, 'success');
            } else {
                showToast('❌ Error: ' + resultado.error, 'error');
            }
        } catch (e) {
            showToast('❌ Error: ' + e.message, 'error');
        }
    }

    /**
     * Restaura una tienda desde su backup
     */
    async function restaurarTienda() {
        const shopId = prompt('Ingrese el ShopID a restaurar:');
        if (!shopId) return;

        const pin = prompt('Ingrese PIN de administrador para confirmar:');
        if (!pin) return;
        if (pin !== SECURITY_CONFIG.MASTER_PIN) {
            return showToast('❌ PIN incorrecto', 'error');
        }

        const confirmar = confirm('⚠️ ¿Restaurar la tienda ' + shopId + '?\nEsto reemplazará la base de datos actual.');
        if (!confirmar) return;

        showToast('♻️ Restaurando tienda...', 'info');

        try {
            const resultado = await window.API.restaurarDesdeBackup(shopId);

            if (resultado.success) {
                showToast('✅ Tienda restaurada correctamente', 'success');
            } else {
                showToast('❌ Error: ' + (resultado.error || resultado.message), 'error');
            }
        } catch (e) {
            showToast('❌ Error: ' + e.message, 'error');
        }
    }

    // Exponer funciones para uso global
    window.AdminFunctions = {
        openNewShopModal: openNewShopModal,
        closeNewShopModal: closeNewShopModal,
        autoInstalarCliente: autoInstalarCliente,
        ejecutarBackupGlobal: ejecutarBackupGlobal,
        configurarTriggerBackup: configurarTriggerBackup,
        restaurarTienda: restaurarTienda,
        viewClient: viewClient,
        toggleClientStatus: toggleClientStatus,
        deleteClient: deleteClient
    };

    // ========================================
    // FUNCIONES DE LA TABLA DE CLIENTES
    // ========================================
    function viewClient(id) {
        const client = AppState.clients.find(c => c.id === id || c[0] === id);
        if (!client) {
            alert('Cliente no encontrado');
            return;
        }
        
        const nombre = client.nombre || client[1] || '';
        const whatsapp = client.whatsapp || client[2] || '';
        const sheetId = client.sheetId || client[3] || '';
        const estado = client.estado || 'Activo';
        const motor = client.motor || client[4] || '';
        
        alert(`📋 DETALLES DEL CLIENTE\n\n🏪 Nombre: ${nombre}\n📱 WhatsApp: ${whatsapp}\n📊 Sheet ID: ${sheetId}\n⚙️ Motor: ${motor}\n📌 Estado: ${estado}\n🔑 ID: ${id}`);
    }

    function toggleClientStatus(id) {
        const client = AppState.clients.find(c => c.id === id || c[0] === id);
        if (!client) {
            alert('Cliente no encontrado');
            return;
        }
        
        const nombre = client.nombre || client[1] || 'esta tienda';
        const nuevoEstado = client.estado === 'Activo' ? 'Suspendido' : 'Activo';
        
        if (confirm(`¿Estás seguro de cambiar el estado de "${nombre}" a ${nuevoEstado}?`)) {
            // Llamar al backend
            cambiarEstadoAPI(id, nuevoEstado, nombre);
        }
    }

    async function cambiarEstadoAPI(shopId, nuevoEstado, nombre) {
        console.log('⏸️ Cambiando estado:', shopId, 'a', nuevoEstado);
        
        try {
            if (!window.API || !window.API.cambiarEstadoAPI) {
                alert('API no disponible');
                return;
            }
            
            const resultado = await window.API.cambiarEstadoAPI(shopId, nuevoEstado);
            
            if (resultado.success || resultado.newStatus) {
                // Actualizar estado local
                const client = AppState.clients.find(c => c.id === shopId || c[0] === shopId);
                if (client) {
                    client.estado = nuevoEstado;
                }
                
                // Actualizar la tabla
                if (typeof renderClientsTable === 'function') {
                    renderClientsTable();
                }
                
                showToast(`✅ "${nombre}" ahora está ${nuevoEstado}`, 'success');
            } else {
                alert('Error al cambiar estado: ' + (resultado.error || resultado.message));
            }
        } catch (error) {
            console.error('❌ Error cambiando estado:', error);
            alert('Error de conexión');
        }
    }

    function deleteClient(id) {
        const client = AppState.clients.find(c => c.id === id || c[0] === id);
        if (!client) {
            alert('Cliente no encontrado');
            return;
        }
        
        const nombre = client.nombre || client[1] || 'esta tienda';
        const sheetId = client.sheetId || client[3] || '';
        
        if (confirm(`⚠️ ¿Estás seguro de eliminar "${nombre}" y todos sus datos? Esta acción no se puede deshacer.`)) {
            // Llamar al backend para eliminar
            eliminarTiendaAPI(id, sheetId, nombre);
        }
    }

    async function eliminarTiendaAPI(shopId, sheetId, nombre) {
        console.log('🗑️ Eliminando tienda:', shopId, 'Sheet:', sheetId);
        
        try {
            if (!window.API || !window.API.eliminarClienteAPI) {
                alert('API no disponible');
                return;
            }
            
            const resultado = await window.API.eliminarClienteAPI(shopId, sheetId);
            
            if (resultado.success) {
                // Eliminar del estado local
                AppState.clients = AppState.clients.filter(c => c.id !== shopId && c[0] !== shopId);
                
                // Actualizar la tabla
                if (typeof renderClientsTable === 'function') {
                    renderClientsTable();
                }
                
                // Actualizar contadores
                actualizarContadores();
                
                showToast(`✅ "${nombre}" eliminada correctamente`, 'success');
            } else {
                alert('Error al eliminar: ' + (resultado.error || resultado.message));
            }
} catch (error) {
            console.error('❌ Error eliminando tienda:', error);
            alert('Error de conexión al eliminar la tienda');
        }
    }

    // Función para cargar estadísticas del dashboard (expuesta globalmente)
    window.cargarEstadisticasDashboard = async function() {
        console.log('📊 Cargando estadísticas del dashboard...');
        
        try {
            if (!window.API || !window.API.obtenerEstadisticasAPI) {
                return { 
                    success: false, 
                    error: 'API no disponible',
                    metricas: { tiendasTotales: 0, tiendasActivas: 0, mrrEstimado: 0 },
                    sistema: { apiStatus: 'Desconectado' }
                };
            }
            
            const resultado = await window.API.obtenerEstadisticasAPI();
            
            if (resultado.success) {
                return {
                    success: true,
                    metricas: {
                        tiendasTotales: resultado.tiendasTotales || 0,
                        tiendasActivas: resultado.tiendasActivas || 0,
                        mrrEstimado: resultado.mrrEstimado || 0
                    },
                    sistema: {
                        apiStatus: 'Conectado'
                    },
                    topPerformers: []
                };
            } else {
                return { 
                    success: false, 
                    error: resultado.error,
                    metricas: { tiendasTotales: 0, tiendasActivas: 0, mrrEstimado: 0 },
                    sistema: { apiStatus: 'Error' }
                };
            }
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            return { 
                success: false, 
                error: error.message,
                metricas: { tiendasTotales: 0, tiendasActivas: 0, mrrEstimado: 0 },
                sistema: { apiStatus: 'Error de conexión' }
            };
        }
    };
    
    function actualizarContadores() {
        const total = AppState.clients.length;
        const activas = AppState.clients.filter(c => (c.estado || c[5] || 'Activo') === 'Activo').length;
        
        const totalEl = document.getElementById('total-clients');
        const activasEl = document.getElementById('active-clients');
        
        if (totalEl) totalEl.textContent = total;
        if (activasEl) activasEl.textContent = activas;
    }

// Exponer funciones para uso global
    window.AdminFunctions = {
        openNewShopModal: openNewShopModal,
        closeNewShopModal: closeNewShopModal,
        autoInstalarCliente: autoInstalarCliente,
        ejecutarBackupGlobal: ejecutarBackupGlobal,
        configurarTriggerBackup: configurarTriggerBackup,
        restaurarTienda: restaurarTienda,
        viewClient: viewClient,
        toggleClientStatus: toggleClientStatus,
deleteClient: deleteClient,
        eliminarTiendaAPI: eliminarTiendaAPI
    };
});

});
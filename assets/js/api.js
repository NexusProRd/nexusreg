/**
 * =============================================================================
 * NEXUS PRO - API Controller
 * Módulo de comunicación con el backend (Google Apps Script)
 * 
 * Este archivo es responsable de:
 * - Enviar y recibir datos del Google Apps Script
 * - Procesar respuestas JSON del servidor
 * - Manejar errores de red y permisos
 * - Validar datos antes de enviarlos
 * 
 * =============================================================================
 */

/**
 * =============================================================================
 * CONFIGURACIÓN GLOBAL
 * =============================================================================
 */

/**
 * URL del Web App desplegado desde Google Apps Script
 * IMPORTANTE: Reemplaza este valor con tu URL de despliegue real
 * La URL debe terminar en /exec
 * 
 * @example
 * const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/exec';
 */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxikMAM8onAKt8mDPS-VXfw5M3myiHMFfUbz3t_QaMWrU9V_qvO2ZoP-RD19N6qplnMwQ/exec";

/**
 * Configuración de tiempo de espera y reintentos
 */
const API_CONFIG = {
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

/**
 * Dominios permitidos para validación de URLs
 * Esto previene inyecciones de URLs maliciosas
 */
const ALLOWED_DOMAINS = [
    'docs.google.com',
    'spreadsheets.google.com',
    'google.com',
    'gmail.com',
    'script.google.com'
];

/**
 * =============================================================================
 * FUNCIONES DE VALIDACIÓN
 * =============================================================================
 */

/**
 * Valida si una URL pertenece a un dominio permitido
 * @param {string} url - URL a validar
 * @returns {boolean} - true si la URL es válida
 */
function validarDominio(url) {
    if (!url || typeof url !== 'string') {
        console.warn('⚠️ URL vacía o inválida');
        return false;
    }

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        const esValido = ALLOWED_DOMAINS.some(function(dominio) {
            return hostname.endsWith(dominio);
        });
        
        if (!esValido) {
            console.warn('⚠️ Dominio no permitido:', hostname);
        }
        
        return esValido;
    } catch (error) {
        console.error('❌ Error al validar URL:', error.message);
        return false;
    }
}

/**
 * Valida el formato de un email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si el email es válido
 */
function validarEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida que el ShopID tenga el formato correcto
 * @param {string} shopId - ID de la tienda
 * @returns {boolean} - true si el formato es válido
 */
function validarShopId(shopId) {
    if (!shopId || typeof shopId !== 'string') {
        return false;
    }
    
    return shopId.match(/^NX-[A-Z0-9]{4,8}$/i) !== null;
}

/**
 * =============================================================================
 * FUNCIONES DE PETICIÓN AL SERVIDOR
 * =============================================================================
 */

/**
 * Función principal para realizar peticiones al Google Apps Script
 * Incluye manejo de reintentos automáticos en caso de fallo
 * 
 * @param {string} action - Nombre de la acción a ejecutar en el backend
 * @param {Object} data - Datos a enviar al backend
 * @returns {Promise<Object>} - Respuesta del servidor
 * @throws {Error} - Si la petición falla después de todos los reintentos
 */
async function realizarPeticion(action, data) {
    if (!APPS_SCRIPT_URL) {
        throw new Error('⚠️ APPS_SCRIPT_URL no está configurada. Por favor, configura la URL del Web App.');
    }

    const payload = {
        action: action,
        timestamp: new Date().toISOString(),
        clientVersion: '1.0.0',
        ...data
    };

    console.log('📤 Enviando petición al backend:', action);
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

    let ultimoError = null;

    for (let intento = 1; intento <= API_CONFIG.RETRY_ATTEMPTS; intento++) {
        try {
            console.log(`🔄 Intento ${intento} de ${API_CONFIG.RETRY_ATTEMPTS}...`);

            // Sin AbortController -Google Apps Script a veces tiene problemas con него
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8'
                },
                body: JSON.stringify(payload),
                redirect: 'follow',
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
            }

            const contenido = await response.text();
            
            if (!contenido || contenido.trim() === '') {
                throw new Error('Respuesta vacía del servidor');
            }

            let result;
            try {
                result = JSON.parse(contenido);
            } catch (parseError) {
                throw new Error('Respuesta inválida del servidor (no es JSON): ' + contenido.substring(0, 100));
            }

            // Si hay error de validación (nombre duplicado), no reintentar ni lanzar excepción
            if (result.error && (result.error === 'nombre_duplicado' || result.error.includes('ya está registrado'))) {
                console.log('⚠️ Error de validación detectado, abortando reintentos');
                return result;
            }

            if (result.error && result.error !== 'nombre_duplicado') {
                throw new Error(result.error);
            }

            console.log('✅ Petición exitosa:', action);
            console.log('📥 Respuesta:', JSON.stringify(result, null, 2));
            
            return result;

        } catch (error) {
            // Si es error de validación, no reintentar
            if (error.message && (error.message.includes('ya está registrado') || error.message.includes('nombre_duplicado'))) {
                console.log('⚠️ Error de validación detectado, abortando reintentos');
                throw error;
            }

            ultimoError = error;
            console.error(`❌ Intento ${intento} fallido:`, error.message);

            if (intento < API_CONFIG.RETRY_ATTEMPTS) {
                const tiempoEspera = API_CONFIG.RETRY_DELAY * intento;
                console.log(`⏳ Esperando ${tiempoEspera}ms antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, tiempoEspera));
            }
        }
    }

    console.error('❌ Todos los intentos fallaron');
    throw ultimoError;
}

/**
 * =============================================================================
 * FUNCIONES DE API PÚBLICAS
 * =============================================================================

/**
 * =============================================================================
 * registrarClienteAPI(datosCliente)
 * =============================================================================
 * Envía los datos del formulario de Onboarding al backend
 * para registrar un nuevo cliente en la base de datos maestra.
 * 
 * @param {Object} datosCliente - Objeto con los datos del cliente
 * @param {string} datosCliente.nombre - Nombre de la tienda o negocio
 * @param {string} datosCliente.whatsapp - Número de WhatsApp (con código de país)
 * @param {string} datosCliente.sheetId - ID del Google Sheet del cliente
 * @param {string} datosCliente.dominio - Dominio del sitio web (opcional)
 * @returns {Promise<Object>} - Resultado de la operación
 * 
 * @example
 * const resultado = await registrarClienteAPI({
 *     nombre: 'Mi Tienda Online',
 *     whatsapp: '+521234567890',
 *     sheetId: '1ABC123...',
 *     dominio: 'mitienda.com'
 * });
 */
async function registrarClienteAPI(datosCliente) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 FUNCION: registrarClienteAPI()');
    console.log('📋 Datos recibidos:', datosCliente);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        if (!datosCliente) {
            throw new Error('No se recibieron datos del cliente');
        }

        const { nombre, whatsapp, sheetId, dominio } = datosCliente;

        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre de la tienda es requerido');
        }

        if (!whatsapp || whatsapp.trim() === '') {
            throw new Error('El número de WhatsApp es requerido');
        }

        if (!sheetId || sheetId.trim() === '') {
            throw new Error('El ID del Sheet es requerido');
        }

        if (dominio && dominio.trim() !== '') {
            if (!validarDominio('https://' + dominio) && !validarDominio(dominio)) {
                alert('⚠️ Advertencia: El dominio proporcionado no es de Google. Solo se permiten dominios de Google.');
                console.warn('⚠️ Dominio no estándar:', dominio);
            }
        }

        const payload = {
            nombre: nombre.trim(),
            whatsapp: whatsapp.trim(),
            sheetId: sheetId.trim(),
            dominio: dominio ? dominio.trim() : '',
            fechaRegistro: new Date().toISOString()
        };

        console.log('📤 Enviando datos al backend...');
        const resultado = await realizarPeticion('registrarNuevoCliente', payload);

        if (resultado.success !== false) {
            console.log('✅ Cliente registrado exitosamente');
            return {
                success: true,
                message: 'Cliente registrado correctamente',
                shopId: resultado.shopId || resultado.shop_id || null,
                token: resultado.token || null,
                data: resultado
            };
        } else {
            throw new Error(resultado.message || 'Error desconocido del servidor');
        }

    } catch (error) {
        console.error('❌ Error en registrarClienteAPI:', error.message);
        
        return {
            success: false,
            message: error.message,
            error: 'No se pudo registrar el cliente. Verifica tu conexión e intenta nuevamente.'
        };
    }
}

/**
 * =============================================================================
 * obtenerListaClientes()
 * =============================================================================
 * Solicita al backend la lista completa de clientes registrados
 * en la base de datos maestra para renderizarlos en la tabla.
 * 
 * @returns {Promise<Object>} - Objeto con la lista de clientes
 * 
 * @example
 * const resultado = await obtenerListaClientes();
 * if (resultado.success) {
 *     console.log('Clientes:', resultado.clientes);
 * }
 */
async function obtenerListaClientes() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 FUNCION: obtenerListaClientes()');
    console.log('   Mapeo a prueba de balas activo');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        console.log('📤 Solicitando lista de clientes al backend...');
        
        const resultado = await realizarPeticion('obtenerClientes', {});
        
        // Obtener el array de clientes del resultado
        const datosCrudos = resultado.clients || resultado.clientes || resultado.datos || [];
        
        console.log('📋 Datos crudos recibidos:', datosCrudos.length);
        
        // Mapeo a prueba de balas: transformar cada fila en objeto híbrido
        const clientesMapeados = datosCrudos.map(function(fila, indice) {
            // Si ya es un objeto (no array), usarlo directamente
            if (!Array.isArray(fila) && typeof fila === 'object') {
                console.log('📋 Fila ' + indice + ' es objeto:', fila.nombre || fila.id);
                
                // Agregar propiedades por índice numérico para compatibilidad
                var cliente = Object.assign({}, fila);
                cliente[0] = fila.id || '';
                cliente[1] = fila.nombre || '';
                cliente[2] = fila.whatsapp || '';
                cliente[3] = fila.sheetId || '';
                cliente[4] = fila.dominio || '';
                cliente[5] = fila.motor || '';
                cliente[6] = fila.estado || 'Activo';
                return cliente;
            }
            
            // Si es array, procesarlo como antes
            if (!Array.isArray(fila)) {
                console.warn('⚠️ Fila ' + indice + ' no es un array ni objeto:', typeof fila);
                return null;
            }
            
            // Determinar el estado (índice 6 o 5, con valor por defecto)
            var estado = fila[6] || fila[5] || 'Activo';
            if (estado === '' || estado === null || estado === undefined) {
                estado = 'Activo';
            }
            
            // Crear objeto híbrido
            var cliente = {
                id: fila[0] || '',
                nombre: fila[1] || '',
                whatsapp: fila[2] || '',
                sheetId: fila[3] || '',
                dominio: fila[4] || '',
                motor: fila[5] || '',
                estado: estado,
                token: fila[7] || '',
                created: fila[8] || '',
                pin: fila[9] || '',
                pregunta1: fila[10] || '',
                respuesta1: fila[11] || '',
                pregunta2: fila[12] || '',
                respuesta2: fila[13] || '',
                0: fila[0] || '',
                1: fila[1] || '',
                2: fila[2] || '',
                3: fila[3] || '',
                4: fila[4] || '',
                5: fila[5] || '',
                6: estado,
                7: fila[7] || '',
                8: fila[8] || '',
                9: fila[9] || '',
                10: fila[10] || '',
                11: fila[11] || '',
                12: fila[12] || '',
                13: fila[13] || ''
            };
            
            return cliente;
        });
        
        // Filtrar clientes nulos
        const clientesFiltrados = clientesMapeados.filter(function(c) {
            return c !== null && c.id !== '';
        });
        
        console.log(`✅ Clientes mapeados correctamente: ${clientesFiltrados.length}`);
        
        // Debug: mostrar primer cliente mapeado
        if (clientesFiltrados.length > 0) {
            console.log('📊 Primer cliente mapeado:', JSON.stringify(clientesFiltrados[0], null, 2));
        }

        return {
            success: true,
            message: 'Lista de clientes obtenida correctamente',
            clientes: clientesFiltrados,
            total: clientesFiltrados.length
        };

    } catch (error) {
        console.error('❌ Error en obtenerListaClientes:', error.message);
        
        return {
            success: false,
            message: error.message,
            clientes: [],
            total: 0
        };
    }
}

/**
 * =============================================================================
 * solicitarBackupAPI(shopId)
 * =============================================================================
 * Envía la orden al backend para ejecutar el backup de la tienda
 * correspondiente. El backend duplicará el archivo y lo guardará
 * en la carpeta de backups configurada.
 * 
 * @param {string} shopId - ID de la tienda a respaldar
 * @returns {Promise<Object>} - Resultado de la operación
 * 
 * @example
 * const resultado = await solicitarBackupAPI('NX-ABC12345');
 * if (resultado.success) {
 *     console.log('Backup URL:', resultado.backupUrl);
 * }
 */
async function solicitarBackupAPI(shopId) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 FUNCION: solicitarBackupAPI()');
    console.log('   ShopID:', shopId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        if (!shopId || shopId.trim() === '') {
            throw new Error('El ShopID es requerido para realizar el backup');
        }

        if (!validarShopId(shopId)) {
            console.warn('⚠️ El formato del ShopID podría ser incorrecto:', shopId);
        }

        const payload = {
            shopId: shopId.trim(),
            tipoBackup: 'manual',
            timestamp: new Date().toISOString()
        };

        console.log('📤 Solicitando backup al backend...');
        
        const resultado = await realizarPeticion('ejecutarBackup', payload);

        console.log('✅ Backup solicitado exitosamente');

        return {
            success: true,
            message: 'Backup completado correctamente',
            backupUrl: resultado.backupUrl || resultado.url || null,
            shopId: shopId,
            data: resultado
        };

    } catch (error) {
        console.error('❌ Error en solicitarBackupAPI:', error.message);
        
        alert('❌ Error de conexión: No se pudo completar el backup. Verifica tu conexión al servidor.');
        
        return {
            success: false,
            message: error.message,
            shopId: shopId
        };
    }
}

/**
 * =============================================================================
 * cambiarEstadoAPI(shopId, nuevoEstado)
 * =============================================================================
 * Envía la instrucción al backend para activar o suspender una tienda.
 * Esta función puede usarse para un cliente individual o como parte
 * del Kill Switch (suspender todas las tiendas).
 * 
 * @param {string} shopId - ID de la tienda
 * @param {string} nuevoEstado - Nuevo estado ('Activo' o 'Suspendido')
 * @returns {Promise<Object>} - Resultado de la operación
 * 
 * @example
 * // Activar una tienda
 * const resultado = await cambiarEstadoAPI('NX-ABC12345', 'Activo');
 * 
 * // O usar para Kill Switch
 * const resultado = await cambiarEstadoAPI('ALL', 'Suspendido');
 */
async function cambiarEstadoAPI(shopId, nuevoEstado) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 FUNCION: cambiarEstadoAPI()');
    console.log('   ShopID:', shopId);
    console.log('   Nuevo Estado:', nuevoEstado);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        if (!shopId || shopId.trim() === '') {
            throw new Error('El ShopID es requerido para cambiar el estado');
        }

        const estadosValidos = ['Activo', 'Suspendido', 'Active', 'Suspended'];
        
        if (!nuevoEstado || !estadosValidos.includes(nuevoEstado)) {
            throw new Error('Estado inválido. Debe ser "Activo" o "Suspendido"');
        }

        const payload = {
            shopId: shopId.trim(),
            nuevoEstado: nuevoEstado,
            action: shopId === 'ALL' ? 'toggleAllStatus' : 'toggleStatus',
            timestamp: new Date().toISOString()
        };

        console.log('📤 Enviando cambio de estado al backend...');
        
        const resultado = await realizarPeticion(payload.action, payload);

        const estadoActualizado = resultado.newStatus || resultado.estado || nuevoEstado;
        
        console.log('✅ Estado cambiado exitosamente a:', estadoActualizado);

        return {
            success: true,
            message: `Estado cambiado a ${estadoActualizado}`,
            shopId: shopId,
            nuevoEstado: estadoActualizado,
            data: resultado
        };

    } catch (error) {
        console.error('❌ Error en cambiarEstadoAPI:', error.message);
        
        if (shopId === 'ALL') {
            alert('❌ Error de conexión: No se pudo ejecutar el Kill Switch. Verifica tu conexión al servidor.');
        } else {
            alert('❌ Error de conexión: No se pudo cambiar el estado de la tienda. Verifica tu conexión al servidor.');
        }
        
        return {
            success: false,
            message: error.message,
            shopId: shopId
        };
    }
}

/**
 * =============================================================================
 * FUNCIONES ADICIONALES DE API
 * =============================================================================

/**
 * Obtiene las estadísticas del dashboard desde el backend
 * @returns {Promise<Object>}
 */
async function obtenerEstadisticasAPI() {
    console.log('📝 FUNCION: obtenerEstadisticasAPI()');

    try {
        const resultado = await realizarPeticion('obtenerEstadisticas', {});
        
        return {
            success: true,
            data: resultado
        };
    } catch (error) {
        console.error('❌ Error:', error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * =============================================================================
 * cargarEstadisticasDashboard()
 * =============================================================================
 * Carga las métricas completas del PCC para el dashboard
 * 
 * @returns {Promise<Object>} - Métricas del dashboard
 * 
 * @example
 * const stats = await cargarEstadisticasDashboard();
 * if (stats.success) {
 *     console.log('Tiendas:', stats.metricas.tiendasTotales);
 *     console.log('MRR:', stats.metricas.mrrEstimado);
 * }
 */
async function cargarEstadisticasDashboard() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 FUNCION: cargarEstadisticasDashboard()');
    console.log('   Obteniendo métricas completas del PCC');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        const resultado = await realizarPeticion('obtenerEstadisticasPCC', {});

        if (resultado.success) {
            console.log('✅ Métricas cargadas correctamente');
            console.log('   Tiendas Totales:', resultado.metricas.tiendasTotales);
            console.log('   Tiendas Activas:', resultado.metricas.tiendasActivas);
            console.log('   MRR Estimado:', resultado.metricas.mrrEstimado);
            console.log('   Top Performers:', resultado.topPerformers.length);

            return {
                success: true,
                metricas: resultado.metricas,
                topPerformers: resultado.topPerformers,
                sistema: resultado.sistema
            };
        } else {
            throw new Error(resultado.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('❌ Error en cargarEstadisticasDashboard:', error.message);
        return {
            success: false,
            message: error.message,
            metricas: null,
            topPerformers: [],
            sistema: null
        };
    }
}

/**
 * Envía un aviso a uno o todos los clientes
 * @param {string} mensaje - Contenido del aviso
 * @param {Array} destinatarios - Array de ShopIDs (vacío = todos)
 * @returns {Promise<Object>}
 */
async function enviarAvisoAPI(mensaje, destinatarios = []) {
    console.log('📝 FUNCION: enviarAvisoAPI()');

    try {
        if (!mensaje || mensaje.trim() === '') {
            throw new Error('El mensaje del aviso es requerido');
        }

        const payload = {
            mensaje: mensaje.trim(),
            destinatarios: destinatarios,
            timestamp: new Date().toISOString()
        };

        const resultado = await realizarPeticion('enviarAviso', payload);

        return {
            success: true,
            message: 'Aviso enviado correctamente',
            enviadoA: resultado.count || destinatarios.length
        };
    } catch (error) {
        console.error('❌ Error:', error.message);
        alert('❌ Error: No se pudo enviar el aviso');
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Elimina un cliente de la base de datos
 * @param {string} shopId - ID del cliente a eliminar
 * @returns {Promise<Object>}
 */
async function eliminarClienteAPI(shopId) {
    console.log('📝 FUNCION: eliminarClienteAPI()');

    try {
        if (!shopId) {
            throw new Error('El ShopID es requerido');
        }

        const resultado = await realizarPeticion('eliminarCliente', { shopId });

        return {
            success: true,
            message: 'Cliente eliminado correctamente'
        };
    } catch (error) {
        console.error('❌ Error:', error.message);
        alert('❌ Error: No se pudo eliminar el cliente');
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * =============================================================================
 * INICIALIZACIÓN Y EXPORTACIÓN
 * =============================================================================

/**
 * Verifica la conexión con el backend al cargar el script
 */
async function verificarConexion() {
    console.log('🔄 Verificando conexión con el backend...');
    
    if (!APPS_SCRIPT_URL) {
        console.warn('⚠️ ADVERTENCIA: APPS_SCRIPT_URL no está configurada');
        console.warn('   El módulo API no puede funcionar sin la URL del Web App');
        return false;
    }

    try {
        // Usar una acción válida para verificar (obtenerClientes)
        const prueba = await realizarPeticion('obtenerClientes', {});
        console.log('✅ Conexión con el backend verificada');
        return true;
    } catch (error) {
        console.warn('⚠️ No se pudo verificar la conexión automáticamente');
        console.warn('   La conexión se verificará al realizar la primera petición');
        return false;
    }
}

/**
 * Inicializar cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 Módulo API cargado');
    // No verificar automáticamente para evitar errores CORS
    // La verificación se hará al enviar la primera petición real
});

/**
 * =============================================================================
 * EXPORTACIÓN DE FUNCIONES AL ESCOPE GLOBAL
 * =============================================================================
 * Las funciones se declaran en el scope global para que ui.js
 * pueda llamarlas directamente sin necesidad de imports.
 * 
 * Funciones principales:
 * - registrarClienteAPI(datosCliente)
 * - obtenerListaClientes()
 * - solicitarBackupAPI(shopId)
 * - cambiarEstadoAPI(shopId, nuevoEstado)
 * 
 * Funciones auxiliares:
 * - validarDominio(url)
 * - validarEmail(email)
 * - obtenerEstadisticasAPI()
 * - enviarAvisoAPI(mensaje, destinatarios)
 * - eliminarClienteAPI(shopId)
 * =============================================================================
 */

window.API = {
    registrarClienteAPI: registrarClienteAPI,
    obtenerListaClientes: obtenerListaClientes,
    solicitarBackupAPI: solicitarBackupAPI,
    cambiarEstadoAPI: cambiarEstadoAPI,
    obtenerEstadisticasAPI: obtenerEstadisticasAPI,
    cargarEstadisticasDashboard: cargarEstadisticasDashboard,
    enviarAvisoAPI: enviarAvisoAPI,
    eliminarClienteAPI: eliminarClienteAPI,
    validarDominio: validarDominio,
    validarEmail: validarEmail,
    config: API_CONFIG,
    // Nuevas funciones SaaS
    autoInstalarCliente: autoInstalarClienteAPI,
    ejecutarBackupGlobal: ejecutarBackupGlobalAPI,
    configurarTriggerBackup: configurarTriggerBackupAPI,
    restaurarDesdeBackup: restaurarDesdeBackupAPI,
    obtenerTienda: obtenerTiendaAPI
};

console.log('✅ API Controller cargado correctamente');
console.log('   Configura APPS_SCRIPT_URL para conectar con tu backend');
console.log('   Accede a window.API para usar las funciones');

/**
 * =============================================================================
 * NOTAS PARA EL DESARROLLADOR
 * =============================================================================
 * 
 * Para conectar este módulo con tu backend:
 * 
 * 1. Deploy tu Google Apps Script como Web App:
 *    - Archivo > Compartir > Desplegar como Web App
 *    - Ejecutar como: "Yo"
 *    - Quién tiene acceso: "Solo yo" (o los usuarios que quieras)
 *    - Copia la URL del Web App (termina en /exec)
 * 
 * 2. Pega la URL en la variable APPS_SCRIPT_URL:
 *    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
 * 
 * 3. Asegúrate de que el GAS tenga la función doPost() que maneje las acciones:
 *    - 'registrarNuevoCliente'
 *    - 'obtenerClientes'
 *    - 'ejecutarBackup'
 *    - 'toggleStatus'
 *    - etc.
 * 
 * 4. Para testing local sin backend, las funciones mostrarán alertas
 *    indicando que el servidor no está disponible.
 * 
 * =============================================================================
 */

/* ============================================
   FUNCIONES SAAS - AUTO-INSTALACIÓN Y BACKUPS
   ============================================ */

/**
 * Auto-Instalación de cliente
 * @param {Object} datos - { nombre, pin, email, whatsapp }
 * @returns {Promise<Object>}
 */
async function autoInstalarClienteAPI(datos) {
    try {
        if (!datos.nombre || !datos.pin) {
            throw new Error('Nombre y PIN son requeridos');
        }

        const payload = {
            nombre: datos.nombre.trim(),
            pin: datos.pin.trim(),
            email: datos.email ? datos.email.trim() : '',
            whatsapp: datos.whatsapp ? datos.whatsapp.trim() : ''
        };

        const resultado = await realizarPeticion('autoInstalarCliente', payload);

        console.log('📥 Resultado completo del registro:', JSON.stringify(resultado));

        return {
            success: resultado.success !== false ? true : false,
            shopId: resultado.shopId,
            token: resultado.token,
            sheetId: resultado.sheetId,
            motorUrl: resultado.motorUrl,
            message: resultado.message,
            error: resultado.error,
            sugerencias: resultado.sugerencias
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Ejecuta backup global de todas las tiendas
 * @returns {Promise<Object>}
 */
async function ejecutarBackupGlobalAPI() {
    try {
        const resultado = await realizarPeticion('ejecutarBackupGlobal', {});
        return {
            success: resultado.success !== false,
            total: resultado.total,
            exitosos: resultado.exitosos,
            fallidos: resultado.fallidos,
            detalles: resultado.detalles
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Configura trigger de backup automático
 * @returns {Promise<Object>}
 */
async function configurarTriggerBackupAPI() {
    try {
        const resultado = await realizarPeticion('configurarTriggerBackup', {});
        return {
            success: resultado.success !== false,
            message: resultado.message
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * @returns {Promise<Object>}
 */
async function eliminarClienteAPI(shopId, sheetId) {
    console.log('📝 FUNCION: eliminarClienteAPI() - ShopID:', shopId, 'SheetID:', sheetId);

    try {
        if (!shopId) {
            throw new Error('El ShopID es requerido');
        }

        const payload = { shopId: shopId };
        
        // Incluir sheetId si está disponible
        if (sheetId) {
            payload.sheetId = sheetId;
        }

        const resultado = await realizarPeticion('eliminarCliente', payload);

        console.log('📥 Resultado eliminarCliente:', resultado);

        if (resultado.success) {
            return {
                success: true,
                message: resultado.message || 'Cliente eliminado correctamente'
            };
        } else {
            return {
                success: false,
                error: resultado.error,
                message: resultado.message || 'Error al eliminar cliente'
            };
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Restaura una tienda desde backup
 */
async function restaurarDesdeBackupAPI(shopId) {
    try {
        if (!shopId) {
            throw new Error('ShopID requerido');
        }

        const resultado = await realizarPeticion('restaurarDesdeBackup', { shopId: shopId.trim() });

        return {
            success: resultado.success !== false,
            shopId: shopId,
            nuevoSheetId: resultado.nuevoSheetId,
            backupUsado: resultado.backupUsado,
            message: resultado.message
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene los datos de una tienda por ShopID
 * @param {string} shopId - ID de la tienda
 * @returns {Promise<Object>}
 */
async function obtenerTiendaAPI(shopId) {
    try {
        if (!shopId) {
            throw new Error('ShopID requerido');
        }

        const resultado = await realizarPeticion('obtenerTienda', { shopId: shopId });

        return {
            success: resultado.success !== false,
            data: resultado
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
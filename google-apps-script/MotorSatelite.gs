/**
 * =============================================================================
 * NEXUS PRO - Motor Satélite
 * Google Apps Script para tiendas cliente
 * 
 * Este script maneja las peticiones de productos y ventas de cada tienda.
 * Se comunica con el PCC (Script Maestro) para validar seguridad antes
 * de realizar cualquier operación.
 * 
 * Instrucciones de uso:
 * 1. Copia este código en un nuevo Google Apps Script
 * 2. Reemplaza URL_PCC_MASTER con la URL de tu Script Maestro
 * 3. Despliega como Web App (Acceso: "Usuario que ejecuta el script")
 * 4. Copia la URL del Web App y configúrala en las tiendas
 * 
 * =============================================================================
 */

/**
 * =============================================================================
 * CONFIGURACIÓN GLOBAL
 * =============================================================================
 */

/**
 * URL del Web App del Script Maestro (PCC)
 * IMPORTANTE: Reemplaza esta URL con la de tu Script Maestro
 * La URL debe terminar en /exec
 * 
 * @example
 * const URL_PCC_MASTER = 'https://script.google.com/macros/s/AKfycbxikMAM8onAKt8mDPS-VXfw5M3myiHMFfUbz3t_QaMWrU9V_qvO2ZoP-RD19N6qplnMwQ/exec';
 */
const URL_PCC_MASTER = "";

/**
 * Configuración adicional
 */
const CONFIG = {
    TIMEOUT: 30000,
    MAX_PRODUCTOS: 1000,
    MAX_VENTAS: 5000
};

/**
 * =============================================================================
 * doPost(e) - HANDLER PRINCIPAL DE PETICIONES POST
 * =============================================================================
 * Esta función recibe todas las peticiones POST de la tienda.
 * Valida la seguridad con el PCC y ejecuta la acción solicitada.
 * 
 * @param {Object} e - Objeto de evento de Google Apps Script
 * @returns {TextOutput} - Respuesta JSON
 */

function doPost(e) {
    try {
        Logger.log('========================================');
        Logger.log('📥 PETICIÓN POST RECIBIDA');
        Logger.log('========================================');

        // Crear respuesta JSON
        const output = ContentService.createTextOutput();
        output.setMimeType(ContentService.MimeType.JSON);

        // Validar que se reciban datos
        if (!e.postData || !e.postData.contents) {
            Logger.log('⚠️ Error: No se recibieron datos');
            return output.setContent(JSON.stringify({
                success: false,
                error: 'No se recibieron datos',
                code: 400
            }));
        }

        // Parsear el payload
        const payload = JSON.parse(e.postData.contents);
        const { shopId, sheetId, action, datos, dominioOrigen } = payload;

        Logger.log('📋 Action:', action);
        Logger.log('📋 ShopID:', shopId);
        Logger.log('📋 SheetID:', sheetId);

        // ========================================
        // VALIDACIÓN DE SEGURIDAD (MIDDLEWARE)
        // ========================================
        
        if (!shopId || !dominioOrigen) {
            Logger.log('⚠️ Error: Faltan parámetros de seguridad');
            return output.setContent(JSON.stringify({
                success: false,
                error: 'Parámetros de seguridad incompletos',
                code: 400
            }));
        }

        Logger.log('🔐 Validando con PCC Maestro...');
        
        const validacion = validarConPCC(shopId, dominioOrigen);
        
        if (!validacion.success) {
            Logger.log('❌ Validación fallida:', validacion.message);
            return output.setContent(JSON.stringify({
                success: false,
                error: validacion.message,
                code: 403,
                tipo: 'SEGURIDAD'
            }));
        }

        Logger.log('✅ Validación exitosa');

        // ========================================
        // EJECUTAR ACCIÓN SOLICITADA
        // ========================================
        
        let result;
        
        switch (action) {
            case 'obtenerProductos':
                Logger.log('🔄 Ejecutando: obtenerProductos');
                result = obtenerProductos(sheetId);
                break;

            case 'registrarVenta':
                Logger.log('🔄 Ejecutando: registrarVenta');
                result = registrarVenta(sheetId, datos);
                break;

            case 'obtenerVentas':
                Logger.log('🔄 Ejecutando: obtenerVentas');
                result = obtenerVentas(sheetId);
                break;

            case 'actualizarProducto':
                Logger.log('🔄 Ejecutando: actualizarProducto');
                result = actualizarProducto(sheetId, datos);
                break;

            case 'eliminarProducto':
                Logger.log('🔄 Ejecutando: eliminarProducto');
                result = eliminarProducto(sheetId, datos.productoId);
                break;

            case 'obtenerInfoTienda':
                Logger.log('🔄 Ejecutando: obtenerInfoTienda');
                result = obtenerInfoTienda(sheetId);
                break;

            case 'healthCheck':
                Logger.log('🔄 Ejecutando: healthCheck');
                result = { 
                    success: true, 
                    status: 'OPERATIVO',
                    timestamp: new Date().toISOString()
                };
                break;

            case 'validarCupon':
                Logger.log('🔄 Ejecutando: validarCupon');
                result = validarCupon(sheetId, datos.codigo, datos.montoTotal);
                break;

            case 'usarCupon':
                Logger.log('🔄 Ejecutando: usarCupon');
                result = usarCupon(sheetId, datos);
                break;

            case 'obtenerHistorialCupones':
                Logger.log('🔄 Ejecutando: obtenerHistorialCupones');
                result = obtenerHistorialCupones(sheetId);
                break;

            default:
                Logger.log('⚠️ Acción desconocida:', action);
                result = {
                    success: false,
                    error: 'Acción desconocida: ' + action,
                    code: 404
                };
        }

        Logger.log('✅ Resultado:', JSON.stringify(result));
        Logger.log('========================================');

        // Devolver resultado
        output.setContent(JSON.stringify(result));
        return output;

    } catch (error) {
        Logger.log('========================================');
        Logger.log('❌ ERROR EN doPost');
        Logger.log('📋 Mensaje:', error.message);
        Logger.log('📋 Stack:', error.stack);
        Logger.log('========================================');

        return ContentService.createTextOutput()
            .setMimeType(ContentService.MimeType.JSON)
            .setContent(JSON.stringify({
                success: false,
                error: error.message,
                code: 500
            }));
    }
}

/**
 * =============================================================================
 * doGet(e) - HANDLER DE PETICIONES GET (Testing)
 * =============================================================================
 * Función de prueba para verificar que el script está funcionando
 * 
 * @param {Object} e - Objeto de evento
 * @returns {HtmlOutput} - Página HTML de prueba
 */

function doGet(e) {
    const html = HtmlService.createHtmlOutput();
    html.setTitle('Nexus Pro - Motor Satélite');
    
    const contenido = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Motor Satélite - Nexus Pro</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #0f0f0f;
                    color: #ffffff;
                    padding: 40px;
                    text-align: center;
                }
                h1 { color: #10b981; }
                .status {
                    background: #1a1a1a;
                    padding: 20px;
                    border-radius: 10px;
                    display: inline-block;
                    margin: 20px;
                }
                .indicator {
                    width: 20px;
                    height: 20px;
                    background: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .info {
                    margin-top: 30px;
                    font-size: 14px;
                    color: #737373;
                }
            </style>
        </head>
        <body>
            <h1>⚡ Nexus Pro</h1>
            <h2>Motor Satélite</h2>
            <div class="status">
                <span class="indicator"></span>
                <p><strong>Estado: OPERATIVO</strong></p>
                <p>Última actividad: ${new Date().toLocaleString()}</p>
            </div>
            <div class="info">
                <p>Este es el Motor Satélite de Nexus Pro</p>
                <p>Usa POST para acceder a las funciones</p>
            </div>
        </body>
        </html>
    `;
    
    html.setContent(contenido);
    return html;
}

/**
 * =============================================================================
 * VALIDACIÓN DE SEGURIDAD (MIDDLEWARE)
 * =============================================================================
 * Función que se comunica con el Script Maestro para validar
 * que la tienda está activa y el dominio es autorizado.
 * 
 * @param {string} shopId - ID de la tienda
 * @param {string} dominioOrigen - Dominio desde donde se hace la petición
 * @returns {Object} - Resultado de la validación
 */

function validarConPCC(shopId, dominioOrigen) {
    try {
        // ========================================
        // VERIFICAR QUE LA URL ESTÉ CONFIGURADA
        // ========================================
        
        if (!URL_PCC_MASTER || URL_PCC_MASTER === '') {
            Logger.log('⚠️ ADVERTENCIA: URL_PCC_MASTER no está configurada');
            Logger.log('   Permite acceso por defecto (modo desarrollo)');
            return {
                success: true,
                modo: 'DESARROLLO_SIN_VALIDACION'
            };
        }

        // ========================================
        // REALIZAR PETICIÓN AL PCC MAESTRO
        // ========================================
        
        const payload = {
            action: 'verificarDominioCliente',
            shopId: shopId,
            dominioOrigen: dominioOrigen
        };

        Logger.log('📤 Enviando validación al PCC...');
        
        const options = {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true,
            timeout: CONFIG.TIMEOUT
        };

        const response = UrlFetchApp.fetch(URL_PCC_MASTER, options);
        
        // ========================================
        // PROCESAR RESPUESTA
        // ========================================
        
        const responseCode = response.getResponseCode();
        
        if (responseCode !== 200) {
            Logger.log('⚠️ Error del PCC (HTTP ' + responseCode + ')');
            return {
                success: false,
                message: 'Error de comunicación con el servidor maestro'
            };
        }

        const result = JSON.parse(response.getContentText());
        
        Logger.log('📥 Respuesta del PCC:', JSON.stringify(result));

        // ========================================
        // EVALUAR RESULTADO
        // ========================================
        
        if (result.status === 'success' || result.success === true) {
            Logger.log('✅ Validación exitosa con PCC');
            return {
                success: true,
                datos: result.datos || null
            };
        } else {
            Logger.log('❌ Validación fallida:', result.mensaje || 'Desconocido');
            return {
                success: false,
                message: result.mensaje || 'Acceso denegado'
            };
        }

    } catch (error) {
        Logger.log('❌ Error en validarConPCC:', error.message);
        
        // En caso de error de red, denegar acceso por seguridad
        return {
            success: false,
            message: 'No se pudo validar con el servidor maestro: ' + error.message
        };
    }
}

/**
 * =============================================================================
 * OBTENER PRODUCTOS
 * =============================================================================
 * Abre el Sheet del cliente y retorna el catálogo de productos
 * 
 * @param {string} sheetId - ID del Spreadsheet del cliente
 * @returns {Object} - Lista de productos
 */

function obtenerProductos(sheetId) {
    try {
        Logger.log('📂 Abriendo Sheet del cliente...');
        
        if (!sheetId) {
            throw new Error('Sheet ID no proporcionado');
        }

        // Abrir el Spreadsheet
        const ss = SpreadsheetApp.openById(sheetId);
        
        // Obtener la hoja de productos
        const productosSheet = ss.getSheetByName('PRODUCTOS');
        
        if (!productosSheet) {
            Logger.log('⚠️ Hoja PRODUCTOS no encontrada');
            return {
                success: false,
                error: 'La hoja PRODUCTOS no existe en este Sheet',
                productos: []
            };
        }

        // Obtener todos los datos (máximo 1000 filas)
        const lastRow = Math.min(productosSheet.getLastRow(), CONFIG.MAX_PRODUCTOS);
        
        if (lastRow < 2) {
            Logger.log('ℹ️ No hay productos registrados');
            return {
                success: true,
                productos: [],
                total: 0
            };
        }

        // Obtener datos (saltar encabezados - fila 1)
        const datos = productosSheet.getRange(2, 1, lastRow - 1, productosSheet.getLastColumn()).getValues();
        
        // Convertir a array de objetos
        const productos = datos.map(function(fila, indice) {
            return {
                id: fila[0] || 'PROD-' + (indice + 1),
                nombre: fila[1] || '',
                descripcion: fila[2] || '',
                precio: parseFloat(fila[3]) || 0,
                costo: parseFloat(fila[4]) || 0,
                stock: parseInt(fila[5]) || 0,
                categoria: fila[6] || '',
                sku: fila[7] || '',
                imagen: fila[8] || '',
                estado: fila[9] || 'Activo',
                fechaCreacion: fila[10] || '',
                fechaActualizacion: fila[11] || ''
            };
        }).filter(function(p) {
            // Filtrar productos vacíos
            return p.nombre !== '';
        });

        Logger.log('✅ Se encontraron ' + productos.length + ' productos');

        return {
            success: true,
            productos: productos,
            total: productos.length
        };

    } catch (error) {
        Logger.log('❌ Error en obtenerProductos:', error.message);
        return {
            success: false,
            error: error.message,
            productos: []
        };
    }
}

/**
 * =============================================================================
 * REGISTRAR VENTA
 * =============================================================================
 * Registra una nueva venta en la hoja VENTAS del cliente
 * 
 * @param {string} sheetId - ID del Spreadsheet del cliente
 * @param {Object} datosVenta - Datos de la venta
 * @returns {Object} - Resultado de la operación
 */

function registrarVenta(sheetId, datosVenta) {
    try {
        Logger.log('📝 Registrando venta...');
        
        if (!sheetId) {
            throw new Error('Sheet ID no proporcionado');
        }

        if (!datosVenta) {
            throw new Error('Datos de venta no proporcionados');
        }

        // Validar datos requeridos
        const { producto, cantidad, total } = datosVenta;
        
        if (!producto || !cantidad || !total) {
            throw new Error('Datos incompletos: producto, cantidad y total son requeridos');
        }

        // Abrir el Spreadsheet
        const ss = SpreadsheetApp.openById(sheetId);
        
        // Obtener la hoja de ventas
        const ventasSheet = ss.getSheetByName('VENTAS');
        
        if (!ventasSheet) {
            throw new Error('La hoja VENTAS no existe en este Sheet');
        }

        // Generar ID de venta único
        const ventaId = 'VNT-' + new Date().getTime();

        // Preparar datos de la fila
        const fecha = new Date().toISOString();
        const rowData = [
            ventaId,                          // ID
            fecha,                            // Fecha
            producto,                         // Producto
            parseInt(cantidad),               // Cantidad
            parseFloat(datosVenta.precioUnitario) || 0,  // Precio Unitario
            parseFloat(total),                // Total
            datosVenta.cliente || '',        // Cliente
            datosVenta.email || '',          // Email
            datosVenta.telefono || '',       // Teléfono
            datosVenta.metodoPago || 'Efectivo',  // Método de Pago
            datosVenta.estado || 'Completado',    // Estado
            datosVenta.notas || ''           // Notas
        ];

        // Agregar la fila
        ventasSheet.appendRow(rowData);
        
        Logger.log('✅ Venta registrada con ID:', ventaId);

        return {
            success: true,
            ventaId: ventaId,
            message: 'Venta registrada correctamente',
            datos: {
                id: ventaId,
                fecha: fecha,
                producto: producto,
                cantidad: cantidad,
                total: total
            }
        };

    } catch (error) {
        Logger.log('❌ Error en registrarVenta:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * =============================================================================
 * OBTENER VENTAS
 * =============================================================================
 * Retorna el historial de ventas del cliente
 * 
 * @param {string} sheetId - ID del Spreadsheet del cliente
 * @returns {Object} - Lista de ventas
 */

function obtenerVentas(sheetId) {
    try {
        Logger.log('📂 Obteniendo ventas...');
        
        if (!sheetId) {
            throw new Error('Sheet ID no proporcionado');
        }

        const ss = SpreadsheetApp.openById(sheetId);
        const ventasSheet = ss.getSheetByName('VENTAS');
        
        if (!ventasSheet) {
            return {
                success: true,
                ventas: [],
                total: 0
            };
        }

        const lastRow = Math.min(ventasSheet.getLastRow(), CONFIG.MAX_VENTAS);
        
        if (lastRow < 2) {
            return {
                success: true,
                ventas: [],
                total: 0
            };
        }

        const datos = ventasSheet.getRange(2, 1, lastRow - 1, ventasSheet.getLastColumn()).getValues();
        
        const ventas = datos.map(function(fila) {
            return {
                id: fila[0],
                fecha: fila[1],
                producto: fila[2],
                cantidad: fila[3],
                precioUnitario: fila[4],
                total: fila[5],
                cliente: fila[6],
                email: fila[7],
                telefono: fila[8],
                metodoPago: fila[9],
                estado: fila[10],
                notas: fila[11]
            };
        }).filter(function(v) {
            return v.id && v.id !== '';
        });

        return {
            success: true,
            ventas: ventas,
            total: ventas.length
        };

    } catch (error) {
        Logger.log('❌ Error en obtenerVentas:', error.message);
        return {
            success: false,
            error: error.message,
            ventas: []
        };
    }
}

/**
 * =============================================================================
 * ACTUALIZAR PRODUCTO
 * =============================================================================
 * Actualiza un producto existente en el Sheet del cliente
 * 
 * @param {string} sheetId - ID del Spreadsheet del cliente
 * @param {Object} datos - Datos del producto a actualizar
 * @returns {Object} - Resultado de la operación
 */

function actualizarProducto(sheetId, datos) {
    try {
        Logger.log('📝 Actualizando producto...');
        
        if (!sheetId || !datos || !datos.id) {
            throw new Error('Sheet ID y datos del producto son requeridos');
        }

        const ss = SpreadsheetApp.openById(sheetId);
        const productosSheet = ss.getSheetByName('PRODUCTOS');
        
        if (!productosSheet) {
            throw new Error('La hoja PRODUCTOS no existe');
        }

        // Buscar el producto por ID
        const lastRow = productosSheet.getLastRow();
        const datosActuales = productosSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        
        let filaEncontrada = -1;
        
        for (let i = 0; i < datosActuales.length; i++) {
            if (datosActuales[i][0] === datos.id) {
                filaEncontrada = i + 2; // +2 porque starts at row 2
                break;
            }
        }

        if (filaEncontrada === -1) {
            throw new Error('Producto no encontrado: ' + datos.id);
        }

        // Actualizar solo los campos proporcionados
        if (datos.nombre) productosSheet.getRange(filaEncontrada, 2).setValue(datos.nombre);
        if (datos.descripcion) productosSheet.getRange(filaEncontrada, 3).setValue(datos.descripcion);
        if (datos.precio !== undefined) productosSheet.getRange(filaEncontrada, 4).setValue(parseFloat(datos.precio));
        if (datos.costo !== undefined) productosSheet.getRange(filaEncontrada, 5).setValue(parseFloat(datos.costo));
        if (datos.stock !== undefined) productosSheet.getRange(filaEncontrada, 6).setValue(parseInt(datos.stock));
        if (datos.categoria) productosSheet.getRange(filaEncontrada, 7).setValue(datos.categoria);
        if (datos.sku) productosSheet.getRange(filaEncontrada, 8).setValue(datos.sku);
        
        // Actualizar fecha de modificación
        productosSheet.getRange(filaEncontrada, 12).setValue(new Date().toISOString());

        Logger.log('✅ Producto actualizado:', datos.id);

        return {
            success: true,
            message: 'Producto actualizado correctamente',
            productoId: datos.id
        };

    } catch (error) {
        Logger.log('❌ Error en actualizarProducto:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * =============================================================================
 * ELIMINAR PRODUCTO
 * =============================================================================
 * Elimina un producto del Sheet del cliente
 * 
 * @param {string} sheetId - ID del Spreadsheet del cliente
 * @param {string} productoId - ID del producto a eliminar
 * @returns {Object} - Resultado de la operación
 */

function eliminarProducto(sheetId, productoId) {
    try {
        Logger.log('🗑️ Eliminando producto:', productoId);
        
        if (!sheetId || !productoId) {
            throw new Error('Sheet ID y producto ID son requeridos');
        }

        const ss = SpreadsheetApp.openById(sheetId);
        const productosSheet = ss.getSheetByName('PRODUCTOS');
        
        if (!productosSheet) {
            throw new Error('La hoja PRODUCTOS no existe');
        }

        const lastRow = productosSheet.getLastRow();
        const datosActuales = productosSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        
        let filaEncontrada = -1;
        
        for (let i = 0; i < datosActuales.length; i++) {
            if (datosActuales[i][0] === productoId) {
                filaEncontrada = i + 2;
                break;
            }
        }

        if (filaEncontrada === -1) {
            throw new Error('Producto no encontrado: ' + productoId);
        }

        // Eliminar la fila
        productosSheet.deleteRow(filaEncontrada);

        Logger.log('✅ Producto eliminado:', productoId);

        return {
            success: true,
            message: 'Producto eliminado correctamente',
            productoId: productoId
        };

    } catch (error) {
        Logger.log('❌ Error en eliminarProducto:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * =============================================================================
 * OBTENER INFO DE LA TIENDA
 * =============================================================================
 * Retorna información básica de la tienda
 * 
 * @param {string} sheetId - ID del Spreadsheet del cliente
 * @returns {Object} - Información de la tienda
 */

function obtenerInfoTienda(sheetId) {
    try {
        Logger.log('📋 Obteniendo información de la tienda...');
        
        if (!sheetId) {
            throw new Error('Sheet ID no proporcionado');
        }

        const ss = SpreadsheetApp.openById(sheetId);
        
        // Contar productos
        const productosSheet = ss.getSheetByName('PRODUCTOS');
        const totalProductos = productosSheet ? Math.max(0, productosSheet.getLastRow() - 1) : 0;
        
        // Contar ventas
        const ventasSheet = ss.getSheetByName('VENTAS');
        const totalVentas = ventasSheet ? Math.max(0, ventasSheet.getLastRow() - 1) : 0;

        return {
            success: true,
            info: {
                nombre: ss.getName(),
                url: ss.getUrl(),
                totalProductos: totalProductos,
                totalVentas: totalVentas,
                ultimaActualizacion: new Date().toISOString()
            }
        };

    } catch (error) {
        Logger.log('❌ Error en obtenerInfoTienda:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * =============================================================================
 * SISTEMA DE CUPONES CON HISTORIAL
 * =============================================================================
 * Funciones para validar, aplicar y registrar historial de cupones
 */

/**
 * Valida un cupón sin actualizar el Sheet
 * Retorna la información del cupón si es válido
 */
function validarCupon(sheetId, codigo, montoTotal) {
    try {
        Logger.log('🔍 Validando cupón:', codigo);

        if (!sheetId || !codigo) {
            throw new Error('Sheet ID y código de cupón son requeridos');
        }

        const ss = SpreadsheetApp.openById(sheetId);
        const cuponesSheet = ss.getSheetByName('CUPONES');

        if (!cuponesSheet) {
            return { success: false, error: 'Hoja de cupones no encontrada' };
        }

        const lastRow = cuponesSheet.getLastRow();
        if (lastRow < 2) {
            return { success: false, error: 'No hay cupones disponibles' };
        }

        const datos = cuponesSheet.getRange(2, 1, lastRow - 1, 10).getValues();

        let cuponEncontrado = null;
        let filaEncontrada = -1;

        for (let i = 0; i < datos.length; i++) {
            const fila = datos[i];
            if (fila[0] && fila[0].toString().toUpperCase() === codigo.toUpperCase()) {
                cuponEncontrado = {
                    codigo: fila[0],
                    tipo: fila[1],
                    descuento: fila[2],
                    montoMinimo: fila[3],
                    fechaExpiracion: fila[4],
                    usosMaximos: fila[5],
                    usosActuales: fila[6] || 0,
                    estado: fila[7],
                    productosAplicables: fila[8],
                    notas: fila[9]
                };
                filaEncontrada = i + 2;
                break;
            }
        }

        if (!cuponEncontrado) {
            return { success: false, error: 'Cupón no encontrado' };
        }

        // Validaciones
        if (cuponEncontrado.estado === 'Usado' || cuponEncontrado.estado === 'Inactivo') {
            return { success: false, error: 'Cupón ya utilizado o inactivo', cupon: cuponEncontrado };
        }

        if (cuponEncontrado.fechaExpiracion) {
            const fechaExp = new Date(cuponEncontrado.fechaExpiracion);
            if (fechaExp < new Date()) {
                return { success: false, error: 'Cupón expirado', cupon: cuponEncontrado };
            }
        }

        if (cuponEncontrado.usosMaximos && cuponEncontrado.usosActuales >= cuponEncontrado.usosMaximos) {
            return { success: false, error: 'Cupón alcanzado límite de usos', cupon: cuponEncontrado };
        }

        if (cuponEncontrado.montoMinimo && montoTotal < cuponEncontrado.montoMinimo) {
            return { 
                success: false, 
                error: `Monto mínimo requerido: $${cuponEncontrado.montoMinimo}`,
                cupon: cuponEncontrado 
            };
        }

        // Calcular descuento
        let descuentoAplicado = 0;
        if (cuponEncontrado.tipo === 'porcentaje') {
            descuentoAplicado = (montoTotal * cuponEncontrado.descuento) / 100;
        } else if (cuponEncontrado.tipo === 'fijo') {
            descuentoAplicado = Math.min(cuponEncontrado.descuento, montoTotal);
        }

        Logger.log('✅ Cupón válido:', cuponEncontrado.codigo);

        return {
            success: true,
            cupon: cuponEncontrado,
            descuentoAplicado: descuentoAplicado,
            mensaje: 'Cupón válido'
        };

    } catch (error) {
        Logger.log('❌ Error en validarCupon:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Usa un cupón y crea historial
 * Actualiza el estado del cupón y registra en historial
 */
function usarCupon(sheetId, datos) {
    try {
        Logger.log('💳 Usando cupón:', datos.codigo);

        if (!sheetId || !datos || !datos.codigo) {
            throw new Error('Datos incompletos para usar cupón');
        }

        const { codigo, montoOriginal, descuento, cliente, email, telefono, ventaId } = datos;

        const ss = SpreadsheetApp.openById(sheetId);
        const cuponesSheet = ss.getSheetByName('CUPONES');

        if (!cuponesSheet) {
            throw new Error('Hoja de cupones no encontrada');
        }

        // Buscar el cupón
        const lastRow = cuponesSheet.getLastRow();
        const datosActuales = cuponesSheet.getRange(2, 1, lastRow - 1, 10).getValues();

        let filaEncontrada = -1;
        let cuponActual = null;

        for (let i = 0; i < datosActuales.length; i++) {
            if (datosActuales[i][0] && datosActuales[i][0].toString().toUpperCase() === codigo.toUpperCase()) {
                filaEncontrada = i + 2;
                cuponActual = {
                    codigo: datosActuales[i][0],
                    tipo: datosActuales[i][1],
                    descuento: datosActuales[i][2],
                    usosActuales: datosActuales[i][6] || 0
                };
                break;
            }
        }

        if (filaEncontrada === -1) {
            throw new Error('Cupón no encontrado');
        }

        // Actualizar contador de usos
        const nuevosUsos = (cuponActual.usosActuales || 0) + 1;
        cuponesSheet.getRange(filaEncontrada, 7).setValue(nuevosUsos);
        cuponesSheet.getRange(filaEncontrada, 8).setValue('Usado');

        Logger.log('✅ Cupón marcado como usado, usos:', nuevosUsos);

        // ========================================
        // REGISTRAR EN HISTORIAL
        // ========================================
        let historialSheet = ss.getSheetByName('HISTORIAL_CUPONES');

        if (!historialSheet) {
            historialSheet = ss.insertSheet('HISTORIAL_CUPONES');
            historialSheet.getRange('A1:H1').setValues([[
                'Código', 'Tipo', 'Descuento', 'Monto Original', 'Descuento Aplicado', 
                'Cliente', 'Fecha Uso', 'Venta ID'
            ]]);
            historialSheet.getRange('A1:H1').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#10b981');
        }

        const fechaUso = new Date().toISOString();
        historialSheet.appendRow([
            codigo,
            cuponActual.tipo,
            cuponActual.descuento,
            montoOriginal,
            descuento,
            cliente || '',
            fechaUso,
            ventaId || ''
        ]);

        Logger.log('✅ Historial de cupón registrado');

        return {
            success: true,
            mensaje: 'Cupón aplicado correctamente',
            historial: {
                codigo: codigo,
                descuentoAplicado: descuento,
                fechaUso: fechaUso,
                ventaId: ventaId || null
            }
        };

    } catch (error) {
        Logger.log('❌ Error en usarCupon:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene el historial de cupones usados
 */
function obtenerHistorialCupones(sheetId) {
    try {
        Logger.log('📋 Obteniendo historial de cupones...');

        if (!sheetId) {
            throw new Error('Sheet ID requerido');
        }

        const ss = SpreadsheetApp.openById(sheetId);
        const historialSheet = ss.getSheetByName('HISTORIAL_CUPONES');

        if (!historialSheet) {
            return { success: true, historial: [], total: 0 };
        }

        const lastRow = historialSheet.getLastRow();
        if (lastRow < 2) {
            return { success: true, historial: [], total: 0 };
        }

        const datos = historialSheet.getRange(2, 1, lastRow - 1, 8).getValues();

        const historial = datos.map(function(fila) {
            return {
                codigo: fila[0],
                tipo: fila[1],
                descuento: fila[2],
                montoOriginal: fila[3],
                descuentoAplicado: fila[4],
                cliente: fila[5],
                fechaUso: fila[6],
                ventaId: fila[7]
            };
        }).filter(function(h) {
            return h.codigo && h.codigo !== '';
        });

        return {
            success: true,
            historial: historial,
            total: historial.length
        };

    } catch (error) {
        Logger.log('❌ Error en obtenerHistorialCupones:', error.message);
        return { success: false, error: error.message, historial: [] };
    }
}

/**
 * =============================================================================
 * FUNCIONES AUXILIARES
 * =============================================================================
 */

/**
 * Genera un ID único para productos
 */
function generarIdProducto() {
    return 'PROD-' + Date.now().toString(36).toUpperCase();
}

/**
 * Genera un ID único para ventas
 */
function generarIdVenta() {
    return 'VNT-' + Date.now().toString(36).toUpperCase();
}

/**
 * Valida que un Sheet ID tenga el formato correcto
 */
function validarSheetId(sheetId) {
    if (!sheetId || typeof sheetId !== 'string') {
        return false;
    }
    // Los IDs de Google Sheets tienen entre 20 y 60 caracteres alfanuméricos
    return sheetId.match(/^[a-zA-Z0-9-_]{20,60}$/) !== null;
}

/**
 * =============================================================================
 * FIN DEL ARCHIVO
 * =============================================================================
 * 
 * Para usar este motor satélite:
 * 
 * 1. CONFIGURACIÓN:
 *    - Copia este código en un nuevo Google Apps Script
 *    - Establece URL_PCC_MASTER con la URL de tu Script Maestro
 * 
 * 2. DESPLIEGUE:
 *    - Archivo > Compartir > Desplegar como Web App
 *    - Ejecutar como: "Yo"
 *    - Quién tiene acceso: "Usuario que ejecuta el script"
 *    - Copia la URL del Web App
 * 
 * 3. INTEGRACIÓN CON LAS TIENDAS:
 *    - Cada tienda usa este script o una copia
 *    - El frontend de la tienda hace peticiones POST aquí
 *    - Este script valida con el PCC antes de procesar
 * 
 * =============================================================================
 */
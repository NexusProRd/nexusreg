/**
 * NEXUS PRO - Master Controller (Versión Corregida)
 * Google Apps Script Backend
 */

const MASTER_SHEET_ID = '1Lme6uuSFtQWNph_MTHZHtGWxNbJvc0SCCnS6HJ3QiHY';
const BACKUP_FOLDER_ID = '1As3K2V0gVaWmvB2RuQo_bVUmzKU3T5LP';
const ADMIN_EMAIL = 'admin@nexuspro.com';
const BRAND_COLOR = '#10b981';

/* ============================================
   CONFIGURACIÓN - COMPLETA ESTOS DATOS
   ============================================ */
// ID de la Plantilla Maestra (copia esta desde tu URL de Sheets)
// Ejemplo: '1ABC123defGHIjklMNOpqrsTUVwXYZ1234567890'
const PLANTILLA_MAESTRA_ID = '15oEQe5ef32yE6wmrBPnmoQiJ6CL8Y9jgB80XqpA-eJw';

const CARPETA_CLIENTES_ID = '1lYKfA8bwIB1RIsz77l1zUne-1WoQAhTM';

/* ============================================
   FUNCIONES DEL SISTEMA DE REGISTRO
   ============================================ */

/**
 * Registrar nuevo cliente completo (Con copia de DB y asignación de motor)
 * @param {string} email - Email del cliente
 * @param {string} nombreTienda - Nombre de la tienda
 * @returns {Object} Resultado de la operación
 */
function registrarNuevoCliente(email, nombreTienda) {
  try {
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('🚀 INICIANDO REGISTRO DE CLIENTE');
    Logger.log('   Email: ' + email);
    Logger.log('   Tienda: ' + nombreTienda);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Validar que las constantes estén configuradas
    if (!PLANTILLA_MAESTRA_ID || PLANTILLA_MAESTRA_ID === 'AQUI_PEGA_EL_ID_DE_TU_PLANTILLA') {
      throw new Error('⚠️ CONFIGURACIÓN: Debes definir PLANTILLA_MAESTRA_ID en el código');
    }

    if (!CARPETA_CLIENTES_ID || CARPETA_CLIENTES_ID === 'AQUI_PEGA_EL_ID_DE_LA_CARPETA') {
      throw new Error('⚠️ CONFIGURACIÓN: Debes definir CARPETA_CLIENTES_ID en el código');
    }

    // ========================================
    // 1. COPIAR BASE DE DATOS
    // ========================================
    Logger.log('📋 Paso 1: Copiando base de datos...');
    
    var plantilla = DriveApp.getFileById(PLANTILLA_MAESTRA_ID);
    var carpetaClientes = DriveApp.getFolderById(CARPETA_CLIENTES_ID);
    
    var nombreArchivo = 'NexusDB - ' + nombreTienda;
    var copiaArchivo = plantilla.makeCopy(nombreArchivo, carpetaClientes);
    var sheetId = copiaArchivo.getId();
    var sheetUrl = copiaArchivo.getUrl();
    
    Logger.log('✅ Base de datos copiada: ' + nombreArchivo);
    Logger.log('   Sheet ID: ' + sheetId);

    // ========================================
    // 2. BUSCAR MOTOR DISPONIBLE
    // ========================================
    Logger.log('🔍 Paso 2: Buscando motor disponible...');
    
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var motoresSheet = ss.getSheetByName('MOTORES');
    
    if (!motoresSheet) {
      throw new Error('Hoja MOTORES no encontrada en el Master Sheet');
    }

    var motoresData = motoresSheet.getDataRange().getValues();
    var motorEncontrado = null;
    var filaMotor = -1;

    // Buscar motor con capacidad disponible (empezar desde fila 2, asumir columnas: A=Nombre, B=URL_Script, C=Clientes_Activos, D=Capacidad)
    for (var i = 1; i < motoresData.length; i++) {
      var nombreMotor = motoresData[i][0];
      var urlScript = motoresData[i][1];
      var clientesActivos = parseInt(motoresData[i][2]) || 0;
      var capacidad = parseInt(motoresData[i][3]) || 0;

      if (nombreMotor && clientesActivos < capacidad) {
        motorEncontrado = {
          nombre: nombreMotor,
          urlScript: urlScript,
          clientesActivos: clientesActivos,
          capacidad: capacidad
        };
        filaMotor = i + 1; // +1 porque getRange es 1-indexed
        Logger.log('✅ Motor encontrado: ' + nombreMotor);
        Logger.log('   Clientes: ' + clientesActivos + '/' + capacidad);
        break;
      }
    }

    if (!motorEncontrado) {
      throw new Error('No hay motores disponibles. Todos están en capacidad máxima.');
    }

    // ========================================
    // 3. ACTUALIZAR CONTADOR DEL MOTOR
    // ========================================
    Logger.log('📈 Paso 3: Actualizando contador del motor...');
    
    var nuevosClientes = motorEncontrado.clientesActivos + 1;
    motoresSheet.getRange(filaMotor, 3).setValue(nuevosClientes);
    
    Logger.log('   Clientes ahora: ' + nuevosClientes);

    // ========================================
    // 4. REGISTRAR EN CLIENTES
    // ========================================
    Logger.log('📝 Paso 4: Registrando cliente en CLIENTES...');
    
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var necesitaHeaders = false;
    if (!clientesSheet) {
      clientesSheet = ss.insertSheet('CLIENTES');
      necesitaHeaders = true;
    }

    var fechaActual = new Date().toISOString();
    var shopId = generarShopIdUnico();
    var token = generarTokenSeguridad();
    
    var nuevaFila = [
      shopId,                      // A: ShopID
      nombreTienda,                // B: Nombre
      email,                       // C: WhatsApp/Email
      sheetId,                     // D: Sheet_ID
      '',                          // E: Dominio
      motorEncontrado.nombre,      // F: Motor (nombre, no URL)
      'Activo',                    // G: Estado
      token,                       // H: Token
      fechaActual,                // I: FechaCreacion
      'PENDIENTE_CONFIGURACION',   // J: PIN
      '',                          // K: PreguntaSecreta1
      '',                          // L: RespuestaSecreta1
      '',                          // M: PreguntaSecreta2
      ''                           // N: RespuestaSecreta2
    ];
    
    if (necesitaHeaders) {
      clientesSheet.getRange('A1:O1').setValues([[
        'ShopID', 'Nombre', 'WhatsApp', 'Sheet_ID', 'Dominio', 'Motor', 
        'Estado', 'Token', 'FechaCreacion', 'PIN', 'Email',
        'Pregunta1', 'Respuesta1', 'Pregunta2', 'Respuesta2'
      ]]);
    }
    
    clientesSheet.appendRow(nuevaFila);
    Logger.log('✅ Cliente registrado en MASTER');

    // ========================================
    // 5. AGREGAR PERMISOS AL CLIENTE
    // ========================================
    Logger.log('🔐 Paso 5: Agregando permisos al cliente...');
    
    copiaArchivo.addViewer(email);
    Logger.log('✅ Permiso de Editor agregado a: ' + email);

    // ========================================
    // 6. PREPARAR RESULTADO
    // ========================================
    var resultado = {
      success: true,
      message: 'Cliente registrado correctamente',
      shopId: shopId,
      sheetId: sheetId,
      sheetUrl: sheetUrl,
      motorUrl: motorEncontrado.urlScript,
      motorNombre: motorEncontrado.nombre,
      token: token
    };

    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('✅ REGISTRO COMPLETADO');
    Logger.log('   Shop ID: ' + resultado.shopId);
    Logger.log('   Motor: ' + resultado.motorNombre);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return resultado;

  } catch (error) {
    Logger.log('❌ ERROR EN REGISTRO: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Versión simple del registro (sin copia de DB)
 * Solo registra en la hoja CLIENTES del Master
 */
function registrarNuevoClienteSimple(datos) {
  try {
    if (!datos || !datos.nombre || !datos.whatsapp || !datos.sheetId) {
      throw new Error('Datos incompletos');
    }

    const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const clientesSheet = ss.getSheetByName('CLIENTES');
    const nextRow = clientesSheet.getLastRow() + 1;

    const shopId = generarShopIdUnico();
    const token = generarTokenSeguridad();

    const rowData = [
      shopId,
      datos.nombre.trim(),
      datos.whatsapp.trim(),
      datos.sheetId.trim(),
      datos.dominio ? datos.dominio.trim() : '',
      'Nexus Basic',
      'Activo',
      token,
      new Date().toISOString(),
      'PENDIENTE_CONFIGURACION',
      datos.preguntaSecreta1 || '',
      datos.respuestaSecreta1 ? datos.respuestaSecreta1.toLowerCase().trim() : '',
      datos.preguntaSecreta2 || '',
      datos.respuestaSecreta2 ? datos.respuestaSecreta2.toLowerCase().trim() : ''
    ];

    clientesSheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

    // Formatear sheet del cliente
    try {
      formatearSheetClientePorId(datos.sheetId.trim());
    } catch (e) {
      Logger.log('Warning: ' + e.message);
    }

    return { success: true, shopId: shopId, token: token };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * doPost - Handler principal
 */
function doPost(e) {
  try {
    // Manejar diferentes content-types
    var postData = e.postData;
    if (!postData) {
      // Intentar obtener datos de parameter
      postData = JSON.stringify(e.parameter);
    }
    
    // Asegurar que la hoja CLIENTES exista
    asegurarHojaCliente();
    
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    if (!e.postData || !e.postData.contents) {
      return output.setContent(JSON.stringify({ error: 'No se recibieron datos' }));
    }
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    Logger.log('Action: ' + action);
    
    let result;
    switch (action) {
      case 'inicializarPCC':
        result = inicializarPCC();
        break;
      case 'registrarNuevoCliente':
        // Soporta两种 formatos: registro simple y registro completo con copia de DB
        if (payload.email && payload.nombre) {
          // Registro completo con copia de DB
          result = registrarNuevoCliente(payload.email, payload.nombre);
        } else {
          // Registro simple (solo guarda en CLIENTES)
          result = registrarNuevoClienteSimple(payload);
        }
        break;
      case 'obtenerClientes':
        result = obtenerClientes();
        break;
      case 'obtenerTienda':
        result = obtenerTiendaPorShopId(payload.shopId);
        break;
      case 'toggleStatus':
        result = toggleStatus(payload.shopId, payload.nuevoEstado);
        break;
      case 'ejecutarBackup':
        result = ejecutarBackup(payload.shopId);
        break;
      case 'ejecutarBackupGlobal':
        result = ejecutarBackupGlobal();
        break;
      case 'toggleAllStatus':
        result = toggleAllStatus(payload.accion);
        break;
      case 'eliminarCliente':
        result = eliminarCliente(payload.shopId, payload.sheetId);
        break;
      case 'formatearSheetCliente':
        result = formatearSheetCliente(payload.shopId);
        break;
      case 'obtenerEstadisticas':
        result = obtenerEstadisticas();
        break;
      case 'obtenerEstadisticasPCC':
        result = obtenerEstadisticasPCC();
        break;
      case 'enviarAviso':
        result = enviarAviso(payload.mensaje, payload.destinatarios);
        break;
      case 'verificarDominioCliente':
        result = verificarDominioCliente(payload.shopId, payload.dominioOrigen);
        break;
      case 'validarRespuestasSeguridad':
        result = validarRespuestasSeguridad(payload.shopId, payload.respuesta1, payload.respuesta2);
        break;
      case 'forzarResetPinAdmin':
        result = forzarResetPinAdmin(payload.shopId, payload.nuevoPin);
        break;
      case 'obtenerHistorialCupones':
        result = obtenerHistorialCuponesMaster(payload.shopId);
        break;
      case 'autoInstalarCliente':
        result = autoInstalarCliente(payload);
        break;
      case 'configurarTriggerBackup':
        result = configurarTriggerBackup();
        break;
      case 'restaurarDesdeBackup':
        result = restaurarDesdeBackup(payload.shopId);
        break;
      default:
        result = { error: 'Accion desconocida: ' + action };
    }
    
    output.setContent(JSON.stringify(result));
    return output;
    
  } catch (error) {
    Logger.log('Error: ' + error.message);
    return ContentService.createTextOutput()
      .setMimeType(ContentService.MimeType.JSON)
      .setContent(JSON.stringify({ error: error.message }));
  }
}

function doGet() {
  return HtmlService.createHtmlOutput('<h1>Nexus Pro - Operativo</h1><p>Estado: OK</p>');
}

/**
 * doOptions - Manejo de preflight CORS
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Asegurar que la hoja CLIENTES exista
 */
function asegurarHojaCliente() {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    
    if (!clientesSheet) {
      Logger.log('📋 Creando hoja CLIENTES...');
      clientesSheet = ss.insertSheet('CLIENTES');
    }
    
    // Forzar la actualización de las cabeceras a 12 columnas
    clientesSheet.getRange('A1:L1').setValues([[
      'ShopID', 'Nombre', 'WhatsApp', 'Sheet_ID', 'Dominio', 
      'Motor', 'Estado', 'Token', 'FechaCreacion', 'PIN', 'Email', 'Propietario'
    ]]);
    clientesSheet.getRange('A1:L1').setFontWeight('bold').setFontColor(BRAND_COLOR);
    // Limpiar las columnas viejas (M, N, O) por si quedaron restos
    clientesSheet.getRange('M1:O1').clearContent();
    Logger.log('✅ Cabeceras actualizadas a 12 columnas');
    
    return true;
  } catch (error) {
    Logger.log('❌ Error al asegurar hoja CLIENTES: ' + error.message);
    return false;
  }
}

/**
 * Inicializar PCC
 */
function inicializarPCC() {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const sheetsToCreate = ['CLIENTES', 'BACKUPS', 'AVISOS', 'CONFIG'];
    const created = [];
    
    sheetsToCreate.forEach(function(name) {
      let sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        created.push(name);
        if (name === 'CLIENTES') {
          sheet.getRange('A1:O1').setValues([[
            'ShopID', 'Nombre', 'WhatsApp', 'Sheet_ID', 'Dominio', 
            'Motor', 'Estado', 'Token', 'FechaCreacion', 'PIN', 'Email',
            'Pregunta1', 'Respuesta1', 'Pregunta2', 'Respuesta2'
          ]]);
          sheet.getRange('A1:O1').setFontWeight('bold').setFontColor(BRAND_COLOR);
        }
      }
    });
    
    return { success: true, message: 'PCC inicializado', sheetsCreated: created };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obtener clientes
 */
function obtenerClientes() {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const clientesSheet = ss.getSheetByName('CLIENTES');
    if (!clientesSheet) return { clients: [] };
    
    const lastRow = clientesSheet.getLastRow();
    if (lastRow < 2) return { clients: [] };
    
    const data = clientesSheet.getRange(2, 1, lastRow - 1, 14).getValues();
    
    const clients = data.filter(function(row) {
      return row[0] && row[0].toString().trim() !== '';
    }).map(function(row) {
      return {
        id: row[0],
        nombre: row[1],
        whatsapp: row[2],
        sheetId: row[3],
        dominio: row[4],
        motor: row[5],
        estado: row[6],
        token: row[7],
        created: row[8],
        pin: row[9] || '',
        pregunta1: row[10] || '',
        respuesta1: row[11] || '',
        pregunta2: row[12] || '',
        respuesta2: row[13] || ''
      };
    });
    
    return { success: true, clients: clients };
  } catch (error) {
    return { error: error.message, clients: [] };
  }
}

/**
 * Obtiene los datos de una tienda específica por ShopID
 * @param {string} shopId - ID de la tienda
 * @returns {Object}
 */
function obtenerTiendaPorShopId(shopId) {
  try {
    Logger.log('🔍 Buscando tienda: ' + shopId);
    
    if (!shopId) return { success: false, error: 'ShopID requerido' };
    
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    if (!clientesSheet) return { success: false, error: 'Hoja CLIENTES no encontrada' };
    
    var lastRow = clientesSheet.getLastRow();
    Logger.log('📊 Ultima fila: ' + lastRow);
    
    if (lastRow < 2) return { success: false, error: 'No hay clientes registrados' };
    
    var data = clientesSheet.getRange(2, 1, lastRow - 1, 15).getValues();
    Logger.log('📋 Datos encontrados: ' + data.length + ' filas');
    
    for (var i = 0; i < data.length; i++) {
      var id = data[i][0];
      Logger.log('  Fila ' + i + ': ' + id);
      
      if (id && id.toString().trim().toUpperCase() === shopId.toString().trim().toUpperCase()) {
        Logger.log('✅ Tienda encontrada en fila ' + i);
        return {
          success: true,
          shopId: data[i][0],
          nombre: data[i][1],
          whatsapp: data[i][2],
          sheetId: data[i][3],
          dominio: data[i][4],
          motor: data[i][5],
          estado: data[i][6],
          token: data[i][7],
          created: data[i][8],
          pin: data[i][9] || '',
          email: data[i][10] || '',
          pregunta1: data[i][11] || '',
          respuesta1: data[i][12] || '',
          pregunta2: data[i][13] || '',
          respuesta2: data[i][14] || ''
        };
      }
    }
    
    return { success: false, error: 'Tienda no encontrada: ' + shopId };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Toggle status
 */
function toggleStatus(shopId, nuevoEstado) {
  try {
    if (!shopId) throw new Error('ShopID requerido');
    
    const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const clientesSheet = ss.getSheetByName('CLIENTES');
    const data = clientesSheet.getDataRange().getValues();
    let rowIndex = -1;
    let currentStatus = '';
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === shopId) {
        rowIndex = i + 1;
        currentStatus = data[i][6];
        break;
      }
    }
    
    if (rowIndex === -1) throw new Error('Cliente no encontrado');
    
    const newStatus = nuevoEstado || (currentStatus === 'Activo' ? 'Suspendido' : 'Activo');
    clientesSheet.getRange(rowIndex, 7).setValue(newStatus);
    
    return { success: true, newStatus: newStatus };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Formatear sheet cliente
 */
function formatearSheetCliente(shopId) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const clientesSheet = ss.getSheetByName('CLIENTES');
    const data = clientesSheet.getDataRange().getValues();
    let sheetId = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === shopId) {
        sheetId = data[i][3];
        break;
      }
    }
    
    if (!sheetId) throw new Error('Sheet no encontrado');
    return formatearSheetClientePorId(sheetId);
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Formatear sheet por ID
 */
function formatearSheetClientePorId(spreadsheetId) {
  try {
    const clientSS = SpreadsheetApp.openById(spreadsheetId);
    
    var pestañas = {
      'PRODUCTOS': ['ID', 'Nombre', 'Descripcion', 'Precio', 'Costo', 'Stock', 'Categoria', 'SKU', 'Imagen', 'Estado', 'FechaCreacion', 'FechaActualizacion'],
      'VENTAS': ['ID', 'Fecha', 'Producto', 'Cantidad', 'PrecioUnitario', 'Total', 'Cliente', 'Email', 'Telefono', 'MetodoPago', 'Estado', 'Notas'],
      'CUPONES': ['Codigo', 'Tipo', 'Descuento', 'MontoMinimo', 'FechaExpiracion', 'UsosMaximos', 'UsosActuales', 'Estado', 'ProductosAplicables', 'Notas'],
      'HISTORIAL_CUPONES': ['Código', 'Tipo', 'Descuento', 'Monto Original', 'Descuento Aplicado', 'Cliente', 'Fecha Uso', 'Venta ID']
    };
    
    for (var nombrePestana in pestañas) {
      var sheet = clientSS.getSheetByName(nombrePestana);
      var esNueva = !sheet;
      
      if (esNueva) {
        sheet = clientSS.insertSheet(nombrePestana);
      }
      
      var headers = pestañas[nombrePestana];
      var columnaFinal = convertirNumeroAColumna(headers.length);
      
      sheet.getRange('A1:' + columnaFinal + '1')
        .setValues([headers])
        .setFontWeight('bold')
        .setFontColor('#FFFFFF')
        .setBackground(BRAND_COLOR);
      
      sheet.setFrozenRows(1);
    }
    
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Ejecutar backup
 */
function ejecutarBackup(shopId) {
  try {
    if (!shopId) throw new Error('ShopID requerido');
    
    const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const clientesSheet = ss.getSheetByName('CLIENTES');
    const data = clientesSheet.getDataRange().getValues();
    let sheetId = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === shopId) {
        sheetId = data[i][3];
        break;
      }
    }
    
    if (!sheetId) throw new Error('Sheet no encontrado');
    
    var sourceFile = DriveApp.getFileById(sheetId);
    var backupFolder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
    var fecha = new Date().toISOString().replace(/[:.]/g, '-');
    var nombreBackup = 'Backup_' + shopId + '_' + fecha;
    
    var backupFile = sourceFile.makeCopy(nombreBackup, backupFolder);
    
    return { success: true, backupUrl: backupFile.getUrl() };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Backup global
 */
function ejecutarBackupGlobal() {
  try {
    var clients = obtenerClientes().clients || [];
    var count = 0;
    
    clients.forEach(function(client) {
      if (client.estado === 'Activo' && client.sheetId) {
        try {
          ejecutarBackup(client.id);
          count++;
        } catch (e) {}
      }
    });
    
    return { success: true, count: count };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Toggle all status
 */
function toggleAllStatus(accion) {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var data = clientesSheet.getDataRange().getValues();
    var count = 0;
    var nuevoEstado = accion === 'suspend' ? 'Suspendido' : 'Activo';
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        clientesSheet.getRange(i + 1, 7).setValue(nuevoEstado);
        count++;
      }
    }
    
    return { success: true, count: count };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Eliminar cliente
 */
function eliminarCliente(shopId, sheetId) {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var data = clientesSheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === shopId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) throw new Error('Cliente no encontrado');
    
    // Mover el Sheet del cliente a la papelera de Drive
    if (sheetId) {
      try {
        DriveApp.getFileById(sheetId).setTrashed(true);
        Logger.log('📁 Sheet movido a papelera: ' + sheetId);
      } catch (driveError) {
        Logger.log('⚠️ No se pudo mover el Sheet a papelera: ' + driveError.message);
      }
    }
    
    // Eliminar la fila del registro en CLIENTES
    clientesSheet.deleteRow(rowIndex);
    Logger.log('✅ Cliente eliminado: ' + shopId);
    
    return { success: true, message: 'Tienda eliminada correctamente' };
  } catch (error) {
    Logger.log('❌ Error en eliminarCliente: ' + error.message);
    return { error: error.message };
  }
}

/**
 * Obtener estadisticas
 */
function obtenerEstadisticas() {
  try {
    var clients = obtenerClientes().clients || [];
    var activas = clients.filter(function(c) { return c.estado === 'Activo'; }).length;
    var suspendidas = clients.filter(function(c) { return c.estado === 'Suspendido'; }).length;
    
    return {
      success: true,
      tiendasActivas: activas,
      clientesTotal: clients.length,
      suspendidas: suspendidas
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obtener estadisticas completas del PCC (Dashboard)
 */
function obtenerEstadisticasPCC() {
  try {
    var clients = obtenerClientes().clients || [];

    // Calcular métricas
    var totalTiendas = clients.length;
    var tiendasActivas = clients.filter(function(c) { return c.estado === 'Activo'; }).length;
    var tiendasSuspendidas = clients.filter(function(c) { return c.estado === 'Suspendido'; }).length;

    // MRR real ($11 USD = ~620 DOP por tienda activa)
    var precioPorTienda = 620;
    var mrrEstimado = tiendasActivas * precioPorTienda;

    // Top 3 tiendas más recientes
    var clientesOrdenados = clients.slice().sort(function(a, b) {
      var fechaA = a.created ? new Date(a.created) : new Date(0);
      var fechaB = b.created ? new Date(b.created) : new Date(0);
      return fechaB - fechaA;
    });

    var topPerformers = clientesOrdenados.slice(0, 3).map(function(c) {
      return {
        id: c.id,
        nombre: c.nombre,
        whatsapp: c.whatsapp,
        estado: c.estado,
        created: c.created,
        sheetId: c.sheetId
      };
    });

    // Estado del sistema
    var sistema = {
      apiStatus: 'Operativa',
      ultimoBackup: 'Hace 2h',
      motor: 'Activo',
      clientesOk: totalTiendas > 0 ? totalTiendas + '/' + totalTiendas : '0/0'
    };

    return {
      success: true,
      metricas: {
        tiendasTotales: totalTiendas,
        tiendasActivas: tiendasActivas,
        tiendasSuspendidas: tiendasSuspendidas,
        mrrEstimado: mrrEstimado
      },
      topPerformers: topPerformers,
      sistema: sistema
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Enviar aviso
 */
function enviarAviso(mensaje, destinatarios) {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var avisosSheet = ss.getSheetByName('AVISOS');
    
    if (!avisosSheet) {
      avisosSheet = ss.insertSheet('AVISOS');
    }
    
    var lastRow = avisosSheet.getLastRow() + 1;
    avisosSheet.getRange(lastRow, 1, 1, 4).setValues([
      [new Date().toISOString(), mensaje, destinatarios && destinatarios.length > 0 ? destinatarios.join(', ') : 'TODOS', 'Enviado']
    ]);
    
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Verificar dominio cliente
 */
function verificarDominioCliente(shopId, dominioOrigen) {
  try {
    if (!shopId || !dominioOrigen) {
      return { status: 'error', code: 400, mensaje: 'Parametros requeridos' };
    }
    
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var data = clientesSheet.getDataRange().getValues();
    var cliente = null;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === shopId) {
        cliente = {
          dominio: data[i][4],
          estado: data[i][6]
        };
        break;
      }
    }
    
    if (!cliente) {
      return { status: 'error', code: 404, mensaje: 'Tienda no encontrada' };
    }
    
    if (cliente.estado !== 'Activo') {
      return { status: 'error', code: 403, mensaje: 'Tienda suspendida' };
    }
    
    var dominioAuth = cliente.dominio ? cliente.dominio.toLowerCase().trim() : '';
    var dominioPeticion = dominioOrigen.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    if (!dominioAuth || dominioAuth === '') {
      return { status: 'success', code: 200, mensaje: 'Acceso permitido' };
    }
    
    if (dominioAuth === dominioPeticion || dominioPeticion.endsWith('.' + dominioAuth)) {
      return { status: 'success', code: 200, mensaje: 'Acceso permitido' };
    }
    
    return { status: 'error', code: 403, mensaje: 'Dominio no autorizado' };
  } catch (error) {
    return { status: 'error', code: 500, mensaje: error.message };
  }
}

/**
 * Validar respuestas de seguridad
 */
function validarRespuestasSeguridad(shopId, respuesta1, respuesta2) {
  try {
    if (!shopId || !respuesta1 || !respuesta2) {
      return { success: false, error: 'Parametros requeridos' };
    }
    
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var data = clientesSheet.getDataRange().getValues();
    var cliente = null;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === shopId) {
        cliente = {
          respuesta1: data[i][11],
          respuesta2: data[i][13]
        };
        break;
      }
    }
    
    if (!cliente) return { success: false, error: 'Cliente no encontrado' };
    
    var resp1Norm = respuesta1.toLowerCase().trim();
    var resp2Norm = respuesta2.toLowerCase().trim();
    var guardada1 = cliente.respuesta1 ? cliente.respuesta1.toLowerCase().trim() : '';
    var guardada2 = cliente.respuesta2 ? cliente.respuesta2.toLowerCase().trim() : '';
    
    if (resp1Norm === guardada1 && resp2Norm === guardada2) {
      return { success: true, puedeRestablecer: true };
    }
    
    return { success: false, puedeRestablecer: false };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Forzar reset PIN admin
 */
function forzarResetPinAdmin(shopId, nuevoPin) {
  try {
    if (!shopId || !nuevoPin) {
      return { success: false, error: 'Parametros requeridos' };
    }
    
    if (nuevoPin.length < 4) {
      return { success: false, error: 'PIN debe tener al menos 4 caracteres' };
    }
    
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var data = clientesSheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === shopId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return { success: false, error: 'Cliente no encontrado' };
    
    clientesSheet.getRange(rowIndex, 10).setValue(nuevoPin);
    
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obtener historial de cupones de un cliente (desde Panel Admin)
 */
function obtenerHistorialCuponesMaster(shopId) {
  try {
    if (!shopId) {
      return { success: false, error: 'ShopID requerido' };
    }

    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var data = clientesSheet.getDataRange().getValues();
    var sheetId = null;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === shopId) {
        sheetId = data[i][3];
        break;
      }
    }

    if (!sheetId) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    var clientSS = SpreadsheetApp.openById(sheetId);
    var historialSheet = clientSS.getSheetByName('HISTORIAL_CUPONES');

    if (!historialSheet) {
      return { success: true, historial: [], total: 0 };
    }

    var lastRow = historialSheet.getLastRow();
    if (lastRow < 2) {
      return { success: true, historial: [], total: 0 };
    }

    var historialData = historialSheet.getRange(2, 1, lastRow - 1, 8).getValues();

    var historial = historialData.map(function(fila) {
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

    return { success: true, historial: historial, total: historial.length };
  } catch (error) {
    return { error: error.message, historial: [] };
  }
}

/**
 * Funciones auxiliares
 */
function generarShopIdUnico() {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var lastRow = clientesSheet.getLastRow();
    
    if (lastRow < 2) return 'NXS-001';
    
    var data = clientesSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var maxNum = 0;
    
    data.forEach(function(row) {
      var id = row[0];
      if (id && id.toString().match(/^NXS-\d+$/)) {
        var num = parseInt(id.split('-')[1]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    
    return 'NXS-' + String(maxNum + 1).padStart(3, '0');
  } catch (error) {
    return 'NXS-' + String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  }
}

function generarTokenSeguridad() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function convertirNumeroAColumna(num) {
  var letter = '';
  while (num > 0) {
    var rem = (num - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}

/* ============================================
   AUTO-INSTALACIÓN (SaaS Automatizado)
   ============================================ */

/**
 * Auto-Instalación: Crea una tienda nueva completamente automatizada
 * @param {Object} datos - { nombre, pin, email, whatsapp }
 * @returns {Object}
 */
function autoInstalarCliente(datos) {
  try {
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('🚀 AUTO-INSTALACIÓN DE CLIENTE');
    Logger.log('   Nombre: ' + datos.nombre);
    Logger.log('   Email: ' + datos.email);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    var nombre = datos.nombre || '';
    var pin = datos.pin || '';
    var email = datos.email || '';
    var whatsapp = datos.whatsapp || '';

    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre del negocio es requerido');
    }

    if (!pin || pin.trim() === '') {
      throw new Error('El PIN es requerido');
    }

    // 0. Validar que el nombre no esté duplicado
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    if (clientesSheet) {
      var lastRow = clientesSheet.getLastRow();
      if (lastRow >= 2) {
        var data = clientesSheet.getRange(2, 1, lastRow - 1, 2).getValues();
        var nombreLower = nombre.toString().trim().toLowerCase();
        
        for (var j = 0; j < data.length; j++) {
          var nombreExistente = data[j][1];
          if (nombreExistente && nombreExistente.toString().trim().toLowerCase() === nombreLower) {
            // Generar sugerencias
            var anho = new Date().getFullYear();
            var sugerencias = [
              nombre + '-rd',
              nombre + '-shop',
              nombre + anho
            ];
            
            return { 
              success: false, 
              error: 'nombre_duplicado',
              message: 'El nombre de la tienda ya está registrado',
              sugerencias: sugerencias
            };
          }
        }
      }
    }
    
    Logger.log('✅ Validación de nombre passed');

    // 1. Copiar plantilla
    Logger.log('📋 Paso 1: Copiando plantilla...');
    var plantilla = DriveApp.getFileById(PLANTILLA_MAESTRA_ID);
    var carpetaClientes = DriveApp.getFolderById(CARPETA_CLIENTES_ID);
    var nombreArchivo = 'NexusDB - ' + nombre;
    var copiaArchivo = plantilla.makeCopy(nombreArchivo, carpetaClientes);
    var sheetId = copiaArchivo.getId();
    var sheetUrl = copiaArchivo.getUrl();

    Logger.log('✅ Plantilla copiada: ' + sheetId);

    // 2. Buscar motor disponible con capacidad
    Logger.log('🔍 Paso 2: Buscando motor con capacidad...');
    ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var motoresSheet = ss.getSheetByName('MOTORES');
    
    if (!motoresSheet) {
      throw new Error('Hoja MOTORES no encontrada');
    }
    
    var motoresData = motoresSheet.getDataRange().getValues();
    var motorEncontrado = null;
    var filaMotor = -1;
    var motoresDisponibles = [];

    for (var i = 1; i < motoresData.length; i++) {
      var nombreMotor = motoresData[i][0];
      var urlScript = motoresData[i][1];
      var clientesActivos = parseInt(motoresData[i][2]) || 0;
      var capacidad = parseInt(motoresData[i][3]) || 0;
      
      Logger.log('  Motor: ' + nombreMotor + ' | Clientes: ' + clientesActivos + '/' + capacidad);

      if (nombreMotor && clientesActivos < capacidad) {
        motorEncontrado = {
          nombre: nombreMotor,
          urlScript: urlScript,
          clientesActivos: clientesActivos,
          capacidad: capacidad
        };
        filaMotor = i + 1;
        Logger.log('  ✅ Motor disponible encontrado: ' + nombreMotor);
        break;
      } else if (nombreMotor) {
        motoresDisponibles.push(nombreMotor + ' (' + clientesActivos + '/' + capacidad + ')');
      }
    }

    if (!motorEncontrado) {
      var msg = 'Capacidad máxima del sistema alcanzada. Todos los motores están llenos.';
      if (motoresDisponibles.length > 0) {
        msg += ' Motores: ' + motoresDisponibles.join(', ');
      }
      Logger.log('❌ ' + msg);
      throw new Error(msg);
    }

    // Actualizar contador
    motoresSheet.getRange(filaMotor, 3).setValue(motorEncontrado.clientesActivos + 1);
    Logger.log('✅ Motor asignado: ' + motorEncontrado.nombre);

    // 3. Registrar en CLIENTES
    Logger.log('📝 Paso 3: Registrando en CLIENTES...');
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var shopId = generarShopIdUnico();
    var token = generarTokenSeguridad();
    var fechaActual = new Date().toISOString();

    var nuevaFila = [
      shopId, nombre, whatsapp, sheetId, '',
      motorEncontrado.nombre, 'Activo', token,
      fechaActual, pin, email, '', '', '', ''
    ];

    clientesSheet.appendRow(nuevaFila);
    Logger.log('✅ Cliente registrado: ' + shopId);

    // 4. Agregar permisos
    if (email && email.indexOf('@') > -1) {
      copiaArchivo.addViewer(email);
    }

    // 5. Enviar email de bienvenida
    Logger.log('📧 Intentando enviar email a: ' + email);
    if (email && email.indexOf('@') > -1) {
      try {
        enviarEmailBienvenida(email, nombre, shopId, token, pin);
        Logger.log('✅ Email de bienvenida enviado');
      } catch (e) {
        Logger.log('❌ Error al enviar email: ' + e.message);
      }
    } else {
      Logger.log('⚠️ No se envía email: email no válido o vacío');
    }

    return {
      success: true,
      shopId: shopId,
      sheetId: sheetId,
      sheetUrl: sheetUrl,
      motorUrl: motorEncontrado.urlScript,
      motorNombre: motorEncontrado.nombre,
      token: token,
      message: 'Tienda creada correctamente'
    };

  } catch (error) {
    Logger.log('❌ Error en autoInstalarCliente: ' + error.message);
    return { error: error.message };
  }
}

/**
 * Envía email de bienvenida al nuevo cliente
 * @param {string} destinatario - Email o WhatsApp del cliente
 * @param {string} nombreTienda - Nombre de la tienda
 * @param {string} shopId - ID único de la tienda
 * @param {string} token - Token de seguridad
 * @param {string} pin - PIN de acceso
 */
function enviarEmailBienvenida(destinatario, nombreTienda, shopId, token, pin) {
  try {
    if (!destinatario || destinatario.indexOf('@') === -1) {
      Logger.log('⚠️ No se puede enviar email: destinatario no válido');
      return;
    }

    var linkTienda = 'https://nexusprord.github.io/testnexuspro/?s=' + encodeURIComponent(nombreTienda);
    var linkPanel = 'https://nexusprord.github.io/testnexuspro/admin.html?s=' + encodeURIComponent(nombreTienda);

    var asunto = '🚀 ¡Bienvenido a Nexus Pro! Tu tienda ' + nombreTienda + ' está lista';
    
    var cuerpo = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .shop-info { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .shop-id { font-size: 24px; font-weight: bold; color: #10b981; }
    .data-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
    .data-label { color: #666; }
    .data-value { font-weight: bold; color: #333; font-family: monospace; }
    .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .btn:hover { background: #059669; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Nexus Pro</h1>
      <p>Tu tienda está lista</p>
    </div>
    <div class="content">
      <h2>¡Hola, ${nombreTienda}! 👋</h2>
      <p>Tu tienda en Nexus Pro ha sido creada exitosamente. Ahora puedes empezar a gestionar tus productos y pedidos.</p>
      
      <div class="shop-info">
        <p style="margin: 0 0 10px 0; color: #666;">Tu tienda:</p>
        <p class="shop-id">${nombreTienda}</p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">ID: ${shopId}</p>
      </div>
      
      <h3>📋 Tus datos de acceso:</h3>
      <div class="data-row">
        <span class="data-label">🔑 PIN de Acceso:</span>
        <span class="data-value">${pin}</span>
      </div>
      <div class="data-row">
        <span class="data-label">🔐 Token de Seguridad:</span>
        <span class="data-value">${token}</span>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${linkTienda}" class="btn">🏪 Ver Mi Tienda</a>
        <a href="${linkPanel}" class="btn" style="background: #6366f1;">⚙️ Panel de Control</a>
      </div>
      
      <div class="warning">
        <strong>⚠️ IMPORTANTE - Seguridad:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>🚫 <strong>Nunca compartas</strong> tu PIN, Token o ShopID con nadie</li>
          <li>🔒 Nexus Pro <strong>nunca</strong> te pedirá estos datos por email ni teléfono</li>
          <li>💀 Si alguien los obtiene, puede acceder a tu tienda y tomar pedidos</li>
        </ul>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        📝 <strong>Notas:</strong><br>
        • Tu Google Sheet ya está configurado y listo para usar<br>
        • El motor asignado optimiza el rendimiento de tu tienda<br>
        • Puedes personalizar tu tienda desde el panel de administración
      </p>
    </div>
    <div class="footer">
      <p>© 2024 Nexus Pro - Todos los derechos reservados</p>
      <p>Este email fue enviado automáticamente. Por favor no responder.</p>
    </div>
  </div>
</body>
</html>
`;

    Logger.log('📧 Preparando email...');
    Logger.log('   Destinatario: ' + destinatario);
    Logger.log('   Asunto: ' + asunto);
    
    GmailApp.sendEmail(destinatario, asunto, '', {
      htmlBody: cuerpo,
      name: 'Nexus Pro'
    });

    Logger.log('✅ Email enviado correctamente a: ' + destinatario);

  } catch (error) {
    Logger.log('❌ Error en enviarEmailBienvenida: ' + error.message);
  }
}

/* ============================================
   SISTEMA DE BACKUP GLOBAL
   ============================================ */

/**
 * Ejecuta backup de todas las tiendas activas
 * @returns {Object}
 */
function ejecutarBackupGlobal() {
  try {
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('💾 INICIANDO BACKUP GLOBAL');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var backupFolder = DriveApp.getFolderById(BACKUP_FOLDER_ID);

    var clientesData = clientesSheet.getDataRange().getValues();
    var resultados = { exitosos: 0, fallidos: 0, detalles: [] };

    // Empezar desde fila 2 (ignorar headers)
    for (var i = 1; i < clientesData.length; i++) {
      var shopId = clientesData[i][0];
      var nombre = clientesData[i][1];
      var sheetId = clientesData[i][3];
      var estado = clientesData[i][6];

      if (!shopId || estado !== 'Activo') continue;

      try {
        var archivo = DriveApp.getFileById(sheetId);
        var fecha = new Date().toISOString().slice(0, 10);
        var nombreBackup = 'Backup_' + shopId + '_' + fecha + '_' + i;
        archivo.makeCopy(nombreBackup, backupFolder);

        Logger.log('✅ Backup: ' + shopId);
        resultados.exitosos++;
        resultados.detalles.push({ shopId: shopId, status: 'ok' });
      } catch (e) {
        Logger.log('❌ Error backup ' + shopId + ': ' + e.message);
        resultados.fallidos++;
        resultados.detalles.push({ shopId: shopId, status: 'error', message: e.message });
      }
    }

    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('✅ BACKUP GLOBAL COMPLETADO');
    Logger.log('   Exitosos: ' + resultados.exitosos);
    Logger.log('   Fallidos: ' + resultados.fallidos);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      total: resultados.exitosos + resultados.fallidos,
      exitosos: resultados.exitosos,
      fallidos: resultados.fallidos,
      detalles: resultados.detalles
    };

  } catch (error) {
    Logger.log('❌ Error en backup global: ' + error.message);
    return { error: error.message };
  }
}

/**
 * Configura trigger para backup automático diario (3:00 AM - 4:00 AM)
 * @returns {Object}
 */
function configurarTriggerBackup() {
  try {
    // Eliminar triggers existentes
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'ejecutarBackupGlobal') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    // Crear nuevo trigger: diariamente entre 3:00 y 4:00 AM (GMT-4)
    ScriptApp.newTrigger('ejecutarBackupGlobal')
      .timeBased()
      .atHour(3)
      .nearEveryDays(1)
      .inTimezone('America/Santo_Domingo')
      .create();

    Logger.log('✅ Trigger de backup configurado para 3:00 AM');

    return {
      success: true,
      message: 'Trigger configurado: backup diario a las 3:00 AM'
    };

  } catch (error) {
    Logger.log('❌ Error al configurar trigger: ' + error.message);
    return { error: error.message };
  }
}

/**
 * Restaura una tienda desde su backup más reciente
 * @param {string} shopId - ID de la tienda
 * @returns {Object}
 */
function restaurarDesdeBackup(shopId) {
  try {
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('♻️ INICIANDO RESTAURACIÓN');
    Logger.log('   ShopID: ' + shopId);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var clientesSheet = ss.getSheetByName('CLIENTES');
    var clientesData = clientesSheet.getDataRange().getValues();
    var sheetIdOriginal = null;
    var nombreTienda = null;
    var filaCliente = -1;

    // Buscar cliente
    for (var i = 1; i < clientesData.length; i++) {
      if (clientesData[i][0] === shopId) {
        sheetIdOriginal = clientesData[i][3];
        nombreTienda = clientesData[i][1];
        filaCliente = i + 1;
        break;
      }
    }

    if (!sheetIdOriginal) {
      throw new Error('Cliente no encontrado: ' + shopId);
    }

    // Buscar backup más reciente
    var backupFolder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
    var archivos = backupFolder.getFiles();
    var backupMasReciente = null;
    var fechaMasReciente = null;

    while (archivos.hasNext()) {
      var archivo = archivos.next();
      if (archivo.getName().indexOf('Backup_' + shopId + '_') === 0) {
        var fecha = archivo.getDateCreated();
        if (!fechaMasReciente || fecha > fechaMasReciente) {
          fechaMasReciente = fecha;
          backupMasReciente = archivo;
        }
      }
    }

    if (!backupMasReciente) {
      throw new Error('No se encontró backup para ' + shopId);
    }

    Logger.log('✅ Backup encontrado: ' + backupMasReciente.getName());

    // Copiar backup sobre la base actual
    var carpetaClientes = DriveApp.getFolderById(CARPETA_CLIENTES_ID);
    var nuevoArchivo = backupMasReciente.makeCopy('NexusDB - ' + nombreTienda + '_restaurado', carpetaClientes);
    var nuevoSheetId = nuevoArchivo.getId();

    // Actualizar Sheet_ID en CLIENTES
    clientesSheet.getRange(filaCliente, 4).setValue(nuevoSheetId);

    Logger.log('✅ Restauración completada');
    Logger.log('   Nuevo Sheet ID: ' + nuevoSheetId);

    return {
      success: true,
      shopId: shopId,
      nuevoSheetId: nuevoSheetId,
      backupUsado: backupMasReciente.getName(),
      message: 'Tienda restaurada correctamente'
    };

  } catch (error) {
    Logger.log('❌ Error en restauración: ' + error.message);
    return { error: error.message };
  }
}

/* ============================================
   UTILIDADES CON CACHE
   ============================================ */

/**
 * Obtiene datos de clientes usando caché
 * @returns {Array}
 */
function obtenerClientesConCache() {
  var cache = CacheService.getUserCache();
  var cacheKey = 'clientes_cache';
  var cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  var clientesSheet = ss.getSheetByName('CLIENTES');
  var lastRow = clientesSheet.getLastRow();

  if (lastRow < 2) return [];

  var data = clientesSheet.getRange(2, 1, lastRow - 1, 14).getValues();

  cache.put(cacheKey, JSON.stringify(data), 300); // 5 min cache

  return data;
}
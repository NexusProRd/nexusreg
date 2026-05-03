/**
 * =============================================================================
 * NEXUS PRO - Landing Page Controller
 * Controlador del formulario de registro público (index.html)
 * =============================================================================
 */

(function() {
    'use strict';

    // ========================================
    // ELEMENTOS DEL DOM
    // ========================================
    const Elements = {
        form: document.getElementById('registration-form'),
        modalOverlay: document.getElementById('modal-overlay'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalClose: document.getElementById('modal-close'),
        modalCancel: document.getElementById('modal-cancel'),
        modalConfirm: document.getElementById('modal-confirm'),
        resultMessage: document.getElementById('result-message'),
        toastContainer: document.getElementById('toast-container')
    };

    // ========================================
    // INICIALIZACIÓN
    // ========================================
    function init() {
        setupEventListeners();
        initLandingLogic();
        console.log('🚀 Landing Page Initialized');
    }

    function setupEventListeners() {
        if (!Elements.form) return;
        
        Elements.form.addEventListener('submit', handleFormSubmit);

        if (Elements.modalClose) {
            Elements.modalClose.addEventListener('click', closeModal);
        }
        if (Elements.modalCancel) {
            Elements.modalCancel.addEventListener('click', closeModal);
        }
        if (Elements.modalConfirm) {
            Elements.modalConfirm.addEventListener('click', closeModal);
        }
        if (Elements.modalOverlay) {
            Elements.modalOverlay.addEventListener('click', function(e) {
                if (e.target === Elements.modalOverlay) {
                    closeModal();
                }
            });
        }
    }

    // ========================================
    // ENVÍO DEL FORMULARIO
    // ========================================
    async function handleFormSubmit(e) {
        e.preventDefault();

        const nombre = document.getElementById('reg-name')?.value.trim();
        const propietario = document.getElementById('reg-owner')?.value.trim();
        const whatsapp = document.getElementById('reg-whatsapp')?.value.trim();
        const pin = document.getElementById('reg-pin')?.value.trim();
        const email = document.getElementById('reg-email')?.value.trim();

        if (!nombre || !propietario || !whatsapp || !pin || !email) {
            showToast('Por favor, completa todos los campos requeridos', 'error');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Por favor, ingresa un email válido', 'error');
            return;
        }

        if (pin.length < 4 || pin.length > 6) {
            showToast('El PIN debe tener entre 4 y 6 dígitos', 'error');
            return;
        }

        showLoadingModal();

        try {
            const result = await window.API.autoInstalarCliente({
                nombre: nombre,
                propietario: propietario,
                whatsapp: whatsapp,
                pin: pin,
                email: email
            });

            if (result.success) {
                showSuccessModalAutoInstalacion(result, nombre);
            } else {
                // Cerrar modal de carga primero
                closeModal();
                
                // Verificar si hay sugerencias de nombres duplicados
                if (result.error === 'nombre_duplicado' && result.sugerencias && result.sugerencias.length > 0) {
                    mostrarSugerenciasEnLanding(result.sugerencias);
                } else {
                    showErrorModal(result.error || result.message || 'Error al registrar cliente');
                }
            }
        } catch (error) {
            // Cerrar modal de carga en caso de error
            closeModal();
            console.error('❌ Error en el registro:', error);
            showErrorModal('Error de conexión. Verifica tu conexión al servidor e intenta nuevamente.');
        }
    }

    /**
     * Muestra sugerencias en el formulario del landing
     * @param {Array} sugerencias - Array de nombres sugeridos
     */
    function mostrarSugerenciasEnLanding(sugerencias) {
        const container = document.getElementById('sugerencias-container');
        if (!container) return;

        container.innerHTML = '';
        container.style.display = 'block';

        const label = document.createElement('p');
        label.style.cssText = 'margin: 0 0 10px 0; font-size: 13px; color: #92400e; font-weight: bold;';
        label.textContent = 'El nombre ya existe. ¿Quieres usar uno de estos?';
        container.appendChild(label);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

        sugerencias.forEach(function(sug) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.style.cssText = 'padding: 8px 14px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
            btn.textContent = sug;
            btn.onclick = function() {
                const nombreInput = document.getElementById('reg-name');
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

    // ========================================
    // MODALES
    // ========================================
    function showLoadingModal() {
        if (!Elements.modalTitle || !Elements.resultMessage) return;
        
        Elements.modalTitle.textContent = 'Procesando Registro';
        Elements.resultMessage.innerHTML = `
            <div class="result-loading">
                <div class="spinner"></div>
                <p>Creando tu tienda en Nexus Pro...</p>
            </div>
        `;
        if (Elements.modalConfirm) Elements.modalConfirm.style.display = 'none';
        if (Elements.modalCancel) {
            Elements.modalCancel.textContent = 'Espere...';
            Elements.modalCancel.disabled = true;
        }
        if (Elements.modalOverlay) Elements.modalOverlay.classList.add('active');
    }

    function showSuccessModalAutoInstalacion(result, nombreTienda) {
        if (!Elements.modalTitle || !Elements.resultMessage) return;

        const tiendaUrl = nombreTienda ? encodeURIComponent(nombreTienda.toLowerCase().replace(/\s+/g, '-')) : '';
        
        Elements.modalTitle.textContent = '🚀 ¡Tu Tienda está Lista!';
        Elements.resultMessage.innerHTML = `
            <div class="result-success" style="text-align: center; padding: 10px;">
                <div class="result-icon success" style="font-size: 64px; margin-bottom: 20px;">⚡</div>
                
                <h4 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px;">
                    ¡Tu tienda ha sido creada exitosamente!
                </h4>
                
                <p style="font-size: 15px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                    Hemos enviado los accesos a tu correo electrónico, incluyendo tu base de datos en Excel (Google Sheets).
                </p>
                
                <p class="warning-text" style="font-size: 13px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 12px 16px; border-radius: 8px; border-left: 3px solid #f59e0b; margin: 20px 0; text-align: left;">
                    ⚠️ <strong>Importante:</strong> Cualquier cambio que realices en esa hoja de cálculo se reflejará automáticamente en tu tienda.
                </p>
                
                <p style="font-size: 16px; color: #10b981; font-weight: 600; margin: 24px 0;">
                    ✅ ${nombreTienda || 'Tu tienda'} está lista para recibir pedidos
                </p>
                
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 24px;">
                    <a href="https://nexusprord.github.io/testnexuspro/admin.html?s=${tiendaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: transparent; color: var(--text-primary); border: 2px solid var(--bg-tertiary); border-radius: 12px; font-weight: 600; font-size: 14px; text-decoration: none;">
                        ⚙️ Panel de Control
                    </a>
                    <a href="https://nexusprord.github.io/testnexuspro/?s=${tiendaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981, #059669); color: #0f172a; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                        🚀 Ir a mi Tienda
                    </a>
                </div>
            </div>
        `;
        
        if (Elements.modalConfirm) {
            Elements.modalConfirm.style.display = 'none';
        }
        if (Elements.modalCancel) Elements.modalCancel.style.display = 'none';
        if (Elements.modalOverlay) Elements.modalOverlay.classList.add('active');

        if (Elements.form) Elements.form.reset();
    }

    function showErrorModal(message) {
        if (!Elements.modalTitle || !Elements.resultMessage) return;

        Elements.modalTitle.textContent = 'Error en el Registro';
        Elements.resultMessage.innerHTML = `
            <div class="result-error">
                <div class="result-icon error">❌</div>
                <p>${message}</p>
            </div>
        `;
        
        if (Elements.modalConfirm) {
            Elements.modalConfirm.style.display = 'inline-block';
            Elements.modalConfirm.textContent = 'Intentar de Nuevo';
            Elements.modalConfirm.className = 'btn-primary';
        }
        if (Elements.modalCancel) {
            Elements.modalCancel.style.display = 'inline-block';
            Elements.modalCancel.textContent = 'Cerrar';
            Elements.modalCancel.disabled = false;
        }
        if (Elements.modalOverlay) Elements.modalOverlay.classList.add('active');
    }

    function closeModal() {
        if (Elements.modalOverlay) {
            Elements.modalOverlay.classList.remove('active');
        }
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    function showToast(message, type) {
        type = type || 'info';
        if (!Elements.toastContainer) return;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML = '' +
            '<span class="toast-icon">' + icons[type] + '</span>' +
            '<span class="toast-message">' + message + '</span>' +
            '<button class="toast-close" onclick="this.parentElement.remove()">×</button>' +
        '';

        Elements.toastContainer.appendChild(toast);

        setTimeout(function() {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 4000);
    }

    // ========================================
    // LÓGICA LANDING VS TIENDA
    // ========================================
    function initLandingLogic() {
        const params = new URLSearchParams(window.location.search);
        const shopId = params.get('s');

        if (shopId) {
            cargarTienda(shopId);
        } else {
            mostrarLanding();
        }
    }

    function mostrarLanding() {
        const landingContainer = document.querySelector('.landing-container');
        const storeContainer = document.querySelector('.store-container');

        if (landingContainer) landingContainer.style.display = 'flex';
        if (storeContainer) storeContainer.style.display = 'none';

        localStorage.removeItem('nexus_shopId');
        localStorage.removeItem('nexus_tienda_datos');
    }

    // Función simple - usa el parámetro directamente como ShopID
    async function cargarTienda(shopId) {
        const landingContainer = document.querySelector('.landing-container');
        const storeContainer = document.querySelector('.store-container');

        console.log('🔄 Cargando tienda. ShopID:', shopId);

        // Guardar en localStorage
        localStorage.setItem('nexus_shopId', shopId);

        // Mostrar contenedor de tienda
        if (landingContainer) landingContainer.style.display = 'none';
        if (storeContainer) {
            storeContainer.style.display = 'block';
            storeContainer.innerHTML = `
                <div style="padding: 50px; text-align: center;">
                    <h2>🏪 ${shopId}</h2>
                    <p>Cargando tienda...</p>
                </div>
            `;
        }

        // Obtener datos de la tienda desde el backend
        try {
            console.log('📡 Llamando a API.obtenerTienda con:', shopId);
            
            if (!window.API || !window.API.obtenerTienda) {
                throw new Error('API.obtenerTienda no está definido');
            }
            
            const tiendaData = await window.API.obtenerTienda(shopId);
            console.log('📥 Respuesta de API:', tiendaData);
            
            if (tiendaData.success) {
                console.log('✅ Tienda encontrada:', tiendaData.data);
                
                localStorage.setItem('nexus_tienda_datos', JSON.stringify(tiendaData.data));
                
                if (storeContainer) {
                    storeContainer.innerHTML = `
                        <div style="padding: 50px; text-align: center;">
                            <h2>🏪 ${tiendaData.data.nombre}</h2>
                            <p style="color: #10b981;">✅ Tienda encontrada</p>
                            <p><strong>ShopID:</strong> ${tiendaData.data.shopId}</p>
                            <p><strong>Estado:</strong> ${tiendaData.data.estado}</p>
                            <p><strong>Sheet ID:</strong> ${tiendaData.data.sheetId}</p>
                        </div>
                    `;
                }
            } else {
                console.error('❌ Tienda no encontrada:', tiendaData.error);
                if (storeContainer) {
                    storeContainer.innerHTML = `
                        <div style="padding: 50px; text-align: center;">
                            <h2>❌ Tienda no encontrada</h2>
                            <p>${tiendaData.error || 'El ShopID no existe'}</p>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error('❌ Error al cargar tienda:', e);
            if (storeContainer) {
                storeContainer.innerHTML = `
                    <div style="padding: 50px; text-align: center;">
                        <h2>❌ Error de conexión</h2>
                        <p>No se pudo cargar la tienda</p>
                        <p style="font-size: 12px; color: #666;">${e.message}</p>
                    </div>
                `;
            }
        }
    }

    // ========================================
    // INICIAR CUANDO EL DOM ESTÉ LISTO
    // ========================================
    // TOGGLE PIN VISIBILITY
    // ========================================
    window.togglePinVisibility = function() {
        const pinInput = document.getElementById('reg-pin');
        const toggleBtn = document.querySelector('.toggle-pin');
        
        if (pinInput.type === 'password') {
            pinInput.type = 'text';
            toggleBtn.textContent = '🔒';
        } else {
            pinInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    };

    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
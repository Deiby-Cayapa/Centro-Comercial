(function() {
    'use strict';
    
    if (window.__MODAL_CARGADO__) return;
    window.__MODAL_CARGADO__ = true;

    const estilos = document.createElement('style');
    estilos.textContent = `
        .modal-overlay-detalle {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0);
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
            z-index: 9998;
            visibility: hidden;
            transition: all 0.6s ease;
        }
        
        .modal-overlay-detalle.active { 
            visibility: visible;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
        }
        
        .modal-container-detalle {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, 150%) scale(0.5); 
            opacity: 0;
            width: 95%;           
            max-width: 1400px;     
            height: 70vh; /* ALTURA FIJA PARA QUE NO SE ENSANCHE */
            background: #fff;
            border-radius: 30px;
            box-shadow: 0 40px 100px rgba(0,0,0,0.5);
            z-index: 9999;
            overflow: hidden;
            visibility: hidden;
            transition: all 0.8s cubic-bezier(0.17, 0.89, 0.32, 1.28);
        }

        .modal-container-detalle.active { 
            visibility: visible;
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1);
        }

        .modal-main-layout { 
            display: grid; 
            grid-template-columns: 50% 50%; 
            height: 100%; /* Ocupa toda la altura fija */
        }

        .modal-image-side { 
            background: #f8fafc; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 30px;
        }

        .modal-image-side img { 
            max-width: 100%; 
            max-height: 100%; 
            object-fit: contain; 
            border-radius: 15px; 
        }

        .modal-info-side { 
            padding: 40px; 
            display: flex; 
            flex-direction: column; 
            height: 100%; 
            overflow: hidden; /* Evita que el contenido principal se salga */
        }

        /* ESTE ES EL TRUCO PARA EL SCROLL */
        .modal-scroll-area {
            flex: 1;
            overflow-y: auto; /* Permite bajar con el mouse */
            padding-right: 15px;
            margin-top: 15px;
        }

        /* Estilo para que la barrita de scroll se vea bonita (opcional) */
        .modal-scroll-area::-webkit-scrollbar { width: 6px; }
        .modal-scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        .modal-close-btn {
            position: absolute;
            top: 20px; right: 20px;
            width: 35px; height: 35px;
            background: #f1f5f9;
            border: none; border-radius: 50%;
            cursor: pointer; z-index: 10;
            font-size: 18px; color: #64748b;
        }
        
        .modal-badge { background: #FFD700; color: #000; padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; width: fit-content; margin-bottom: 10px; }
        .modal-info-side h2 { font-size: 2rem; color: #0f172a; margin: 0; font-weight: 800; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
        .info-card { background: #f8fafc; padding: 10px 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .info-card label { display: block; font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase; }
        .info-card p { margin: 2px 0 0; font-size: 13px; color: #1e293b; font-weight: 600; }
        
        .modal-desc-text { font-size: 14px; line-height: 1.6; color: #475569; }
        .modal-footer-social { margin-top: 20px; display: flex; gap: 12px; }
        .modal-social-btn { width: 40px; height: 40px; border-radius: 50%; background: #fff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; }
        .modal-social-btn img { width: 22px; height: 22px; }

        @media (max-width: 850px) {
            .modal-main-layout { grid-template-columns: 1fr; }
            .modal-container-detalle { height: 90vh; overflow-y: auto; }
            .modal-image-side { height: 200px; }
        }
    `;
    document.head.appendChild(estilos);

    const modalHTML = `
        <div class="modal-overlay-detalle" id="modalOverlay"></div>
        <div class="modal-container-detalle" id="modalContainer">
            <button class="modal-close-btn" id="btnCerrar">✕</button>
            <div class="modal-main-layout">
                <div class="modal-image-side">
                    <img id="imgLocal" src="" alt="">
                </div>
                <div class="modal-info-side">
                    <div class="modal-badge" id="numeroLocal"></div>
                    <h2 id="nombreLocal"></h2>
                    
                    <div class="modal-scroll-area">
                        <div class="info-grid">
                            <div class="info-card"><label>👤 Propietario</label><p id="propietario"></p></div>
                            <div class="info-card"><label>⏰ Horario</label><p id="horario"></p></div>
                            <div class="info-card" style="grid-column: span 2;"><label>📞 Contacto</label><p id="contacto"></p></div>
                        </div>
                        <div id="descripcionContainer" class="modal-desc-text" style="margin-top: 20px;">
                            <p id="descripcion"></p>
                        </div>
                    </div>

                    <div class="modal-footer-social" id="redes"></div>
                </div>
            </div>
        </div>
    `;

    function cerrar() {
        const overlay = document.getElementById('modalOverlay');
        const container = document.getElementById('modalContainer');
        container.classList.remove('active');
        overlay.classList.remove('active');
        setTimeout(() => { document.body.style.overflow = ''; }, 800);
    }

function abrir(card) {
        const data = card.dataset;
        document.getElementById('imgLocal').src = `/img/${data.localImagen}`;
        document.getElementById('nombreLocal').textContent = data.localNombre;
        document.getElementById('numeroLocal').textContent = `LOCAL #${data.localNumero}`;
        document.getElementById('propietario').textContent = data.localPropietario || 'No asignado';
        document.getElementById('horario').textContent = data.localHorario || 'Consultar';
        document.getElementById('contacto').textContent = data.localContacto || 'Sin contacto';

        // Lógica de descripción que respeta guiones y saltos
        const descElement = document.getElementById('descripcion');
        const textoOriginal = data.localDescripcion || '';

        if (textoOriginal.includes('-')) {
            const partes = textoOriginal.split('-');
            const intro = partes[0].trim();
            const listaItems = partes.slice(1).map(item => item.trim()).filter(i => i.length > 0);

            descElement.innerHTML = `
                <p style="margin-bottom: 15px;">${intro}</p>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${listaItems.map(i => `
                        <li style="margin-bottom: 12px; display: flex; gap: 10px;">
                            <span style="color: #FFD700; font-weight: bold;">-</span>
                            <span>${i}</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            descElement.innerHTML = `<p style="white-space: pre-line;">${textoOriginal}</p>`;
        }

        // Redes Sociales
        const redes = document.getElementById('redes');
        redes.innerHTML = '';
        if (data.localContacto) {
            const num = data.localContacto.replace(/\D/g,'');
            redes.innerHTML += `<a href="https://wa.me/+593${num}" target="_blank" class="modal-social-btn"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"></a>`;
        }
        if (data.localFacebook && data.localFacebook !== '-') {
            redes.innerHTML += `<a href="${data.localFacebook}" target="_blank" class="modal-social-btn"><img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg"></a>`;
        }

        document.body.style.overflow = 'hidden';
        document.getElementById('modalOverlay').classList.add('active');
        document.getElementById('modalContainer').classList.add('active');
    }

    function init() {
        if (!document.getElementById('modalOverlay')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        document.getElementById('modalOverlay').onclick = cerrar;
        document.getElementById('btnCerrar').onclick = cerrar;
        document.body.addEventListener('click', e => {
            const card = e.target.closest('.custom-card[data-local-nombre]');
            if (card) { e.preventDefault(); abrir(card); }
        });
    }

    init();
})();
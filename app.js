/* ============================================================
   Hotel Descanso Premium — Application Logic
   Sheraton-style SPA with async API calls
   ============================================================ */

(() => {
  'use strict';

  // ─── Config ───────────────────────────────────────────────
  const API_BASE = 'https://3.142.235.11.sslip.io';

  // ─── DOM Helpers ──────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── DOM References ───────────────────────────────────────
  const header        = $('#header');
  const menuToggle    = $('#menu-toggle');
  const mainNav       = $('#main-nav');
  const navTabs       = $$('.nav-tab');
  const sections      = $$('.section');
  const toastContainer = $('#toast-container');
  const apiStatusDot  = $('.status-dot');
  const apiStatusText = $('.status-text');

  // Forms
  const formCliente   = $('#form-cliente');
  const formReserva   = $('#form-reserva');
  const formCancelar  = $('#form-cancelar');

  // Rooms
  const btnRecargar   = $('#btn-recargar-habitaciones');
  const roomsGrid     = $('#rooms-grid');
  const roomsLoader   = $('#rooms-loader');
  const statTotal     = $('#stat-total');

  // ─── Toast System ─────────────────────────────────────────
  const TOAST_ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  function showToast(type, title, message, duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div class="toast__icon">${TOAST_ICONS[type]}</div>
      <div class="toast__body">
        <div class="toast__title">${title}</div>
        <div class="toast__message">${message}</div>
      </div>
      <button class="toast__close" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    const dismiss = () => {
      toast.classList.add('toast--exit');
      toast.addEventListener('animationend', () => toast.remove());
    };

    toast.querySelector('.toast__close').addEventListener('click', dismiss);
    toastContainer.appendChild(toast);

    if (duration > 0) setTimeout(dismiss, duration);
  }

  // ─── Navigation ───────────────────────────────────────────
  function navigateTo(sectionId) {
    sections.forEach((s) => s.classList.remove('active'));
    navTabs.forEach((t) => t.classList.remove('active'));

    const target = $(`#section-${sectionId}`);
    const tab = $(`[data-section="${sectionId}"]`);

    if (target) target.classList.add('active');
    if (tab) tab.classList.add('active');

    // Close mobile nav
    mainNav.classList.remove('open');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Nav tab clicks
  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => navigateTo(tab.dataset.section));
  });

  // Data-navigate buttons (highlight cards, hero CTA, etc.)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-navigate]');
    if (btn) {
      e.preventDefault();
      navigateTo(btn.dataset.navigate);
    }
  });

  // Mobile menu toggle
  menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('open');
  });

  // Header shadow on scroll
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // ─── API Helper ───────────────────────────────────────────
  async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'DescansoPremiumSecured2026!#',
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = data?.detail || data?.message || `Error HTTP ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.status) throw err;

      console.error('Network error:', err);
      throw new Error(
        'No se pudo conectar con el servidor. Verifique su conexión o intente más tarde.'
      );
    }
  }

  // ─── Validation ───────────────────────────────────────────
  function validateNotEmpty(value, fieldName) {
    if (!value || value.trim() === '') {
      throw new Error(`El campo "${fieldName}" es obligatorio.`);
    }
    return value.trim();
  }

  function validateAge(value) {
    const age = parseInt(value, 10);
    if (isNaN(age) || age < 18) {
      throw new Error('La edad debe ser un número mayor o igual a 18.');
    }
    return age;
  }

  function validateDates(ingreso, salida) {
    if (!ingreso) throw new Error('La fecha de ingreso es obligatoria.');
    if (!salida)  throw new Error('La fecha de salida es obligatoria.');

    const dateIn  = new Date(ingreso);
    const dateOut = new Date(salida);
    const today   = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateIn < today) throw new Error('La fecha de ingreso no puede ser anterior a hoy.');
    if (dateOut <= dateIn) throw new Error('La fecha de salida debe ser posterior a la de ingreso.');

    return { ingreso, salida };
  }

  function markFieldError(inputId) {
    const el = $(`#${inputId}`);
    if (el) {
      el.classList.add('input-error');
      el.addEventListener('input', () => el.classList.remove('input-error'), { once: true });
    }
  }

  // ─── Button Loading State ─────────────────────────────────
  function setButtonLoading(btn, loading) {
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<div class="loader__spinner" style="width:16px;height:16px;border-width:2px;margin:0;display:inline-block;"></div> Procesando…`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
  }

  // ─── 1. Registrar Cliente (POST /clientes) ────────────────
  formCliente.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-registrar-cliente');

    try {
      const rut    = validateNotEmpty($('#cliente-rut').value, 'RUT');
      const nombre = validateNotEmpty($('#cliente-nombre').value, 'Nombre');
      const edad   = validateAge($('#cliente-edad').value);
      const acepta = $('#cliente-terminos').checked;

      if (!acepta) throw new Error('Debe aceptar los términos y condiciones SERNAC.');

      setButtonLoading(btn, true);

      await apiRequest('/clientes', {
        method: 'POST',
        body: JSON.stringify({
          rut,
          nombre,
          edad,
          acepta_terminos_sernac: acepta,
        }),
      });

      showToast('success', 'Huésped registrado', `${nombre} fue registrado exitosamente en el sistema.`);
      formCliente.reset();
    } catch (err) {
      showToast('error', 'Error en el registro', err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });

  // ─── 2. Listar Habitaciones (GET /habitaciones/disponibles) ──
  async function loadRooms() {
    roomsLoader.style.display = 'flex';
    roomsGrid.style.display = 'none';

    try {
      const rooms = await apiRequest('/habitaciones/disponibles');

      roomsLoader.style.display = 'none';
      roomsGrid.style.display = 'grid';

      if (!rooms || rooms.length === 0) {
        roomsGrid.innerHTML = `
          <div class="rooms-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            <p>No hay habitaciones disponibles en este momento.</p>
          </div>
        `;
        statTotal.textContent = '0';
        return;
      }

      statTotal.textContent = rooms.length;

      roomsGrid.innerHTML = rooms
        .map(
          (room, i) => `
        <div class="room-card" style="animation-delay: ${i * 50}ms">
          <div class="room-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span class="room-card__number">${room.numero}</span>
          <span class="room-card__badge">${room.estado}</span>
          <span class="room-card__id">ID: ${room.id}</span>
        </div>`
        )
        .join('');

      showToast('info', 'Disponibilidad actualizada', `${rooms.length} habitación(es) disponible(s).`);
    } catch (err) {
      roomsLoader.style.display = 'none';
      roomsGrid.style.display = 'grid';
      roomsGrid.innerHTML = `
        <div class="rooms-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <p>Error al consultar disponibilidad. Intente nuevamente.</p>
        </div>
      `;
      showToast('error', 'Error de conexión', err.message);
    }
  }

  btnRecargar.addEventListener('click', loadRooms);

  // ─── 3. Crear Reserva (POST /reservas) ────────────────────
  formReserva.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-crear-reserva');

    try {
      const rut = validateNotEmpty($('#reserva-rut').value, 'RUT del Cliente');
      const habitacion = parseInt($('#reserva-habitacion').value, 10);
      if (isNaN(habitacion) || habitacion <= 0) {
        markFieldError('reserva-habitacion');
        throw new Error('Ingrese un número de habitación válido.');
      }

      const ingreso = $('#reserva-ingreso').value;
      const salida  = $('#reserva-salida').value;
      const dates   = validateDates(ingreso, salida);

      setButtonLoading(btn, true);

      const result = await apiRequest('/reservas', {
        method: 'POST',
        body: JSON.stringify({
          cliente_rut: rut,
          habitacion_numero: habitacion,
          fecha_ingreso: dates.ingreso,
          fecha_salida: dates.salida,
        }),
      });

      const reservaId = result?.id || result?.reserva_id || 'N/A';
      showToast('success', 'Reserva confirmada', `Su reserva fue creada exitosamente. ID: ${reservaId}`, 8000);
      formReserva.reset();
    } catch (err) {
      let title = 'Error en la reserva';
      if (err.status === 404) {
        title = 'Cliente no encontrado';
        markFieldError('reserva-rut');
      } else if (err.status === 409) {
        title = 'Conflicto de disponibilidad';
      }
      showToast('error', title, err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });

  // ─── 4. Cancelar Reserva (DELETE /reservas/{id}) ──────────
  formCancelar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-cancelar-reserva');

    try {
      const reservaId = validateNotEmpty($('#cancelar-id').value, 'ID de Reserva');

      setButtonLoading(btn, true);

      await apiRequest(`/reservas/${encodeURIComponent(reservaId)}`, {
        method: 'DELETE',
      });

      showToast('success', 'Reserva cancelada', `La reserva ${reservaId} fue cancelada exitosamente.`);
      formCancelar.reset();
    } catch (err) {
      showToast('error', 'Error al cancelar', err.message);
      markFieldError('cancelar-id');
    } finally {
      setButtonLoading(btn, false);
    }
  });

  // ─── API Health Check ─────────────────────────────────────
  async function checkApiHealth() {
    try {
      const response = await fetch(`${API_BASE}/habitaciones/disponibles`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        apiStatusDot.className = 'status-dot online';
        apiStatusText.textContent = 'API conectada';
      } else {
        throw new Error();
      }
    } catch {
      apiStatusDot.className = 'status-dot offline';
      apiStatusText.textContent = 'API sin conexión';
    }
  }

  // ─── Booking Bar Interactions ───────────────────────────────
  const guestsTrigger = $('#guests-trigger');
  const guestsDropdown = $('#guests-dropdown');
  const guestsApply = $('#guests-apply');
  const guestsSummary = $('#guests-summary');
  const counterBtns = $$('.counter-btn');

  const filtersToggle = $('#filters-toggle');
  const filtersPanel = $('#filters-panel');

  let guestsState = {
    rooms: 1,
    adults: 1,
    children: 0
  };

  // Toggle guests dropdown
  if (guestsTrigger && guestsDropdown) {
    guestsTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = guestsTrigger.classList.toggle('active');
      if (isActive) {
        guestsDropdown.classList.add('show');
      } else {
        guestsDropdown.classList.remove('show');
      }
    });

    // Prevent closing when clicking inside
    guestsDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Close on outside click
    document.addEventListener('click', () => {
      guestsTrigger.classList.remove('active');
      guestsDropdown.classList.remove('show');
    });

    // Apply button
    if (guestsApply) {
      guestsApply.addEventListener('click', () => {
        guestsTrigger.classList.remove('active');
        guestsDropdown.classList.remove('show');
      });
    }

    // Counters logic
    counterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const action = btn.dataset.action;
        const valueEl = $(`#count-${target}`);
        
        if (action === 'increment') {
          if (target === 'rooms' && guestsState.rooms >= 5) return;
          if (target === 'adults' && guestsState.adults >= 10) return;
          if (target === 'children' && guestsState.children >= 10) return;
          guestsState[target]++;
        } else {
          if (target === 'rooms' && guestsState.rooms <= 1) return;
          if (target === 'adults' && guestsState.adults <= 1) return;
          if (target === 'children' && guestsState.children <= 0) return;
          guestsState[target]--;
        }

        valueEl.textContent = guestsState[target];
        updateGuestsSummary();
      });
    });
  }

  function updateGuestsSummary() {
    if (!guestsSummary) return;
    const r = guestsState.rooms;
    const a = guestsState.adults;
    const c = guestsState.children;
    
    let text = `${r} Habitación${r > 1 ? 'es' : ''}, ${a} Adulto${a > 1 ? 's' : ''}`;
    if (c > 0) {
      text += `, ${c} Niñ${c > 1 ? 'os' : 'o'}`;
    }
    guestsSummary.textContent = text;
  }

  // Toggle advanced filters
  if (filtersToggle && filtersPanel) {
    filtersToggle.addEventListener('click', () => {
      const isActive = filtersToggle.classList.toggle('active');
      if (isActive) {
        filtersPanel.classList.add('show');
      } else {
        filtersPanel.classList.remove('show');
      }
    });
  }

  // ─── Date Input Defaults ──────────────────────────────────
  function setDateDefaults() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Booking bar dates
    const quickCheckin  = $('#quick-checkin');
    const quickCheckout = $('#quick-checkout');
    if (quickCheckin)  { quickCheckin.value = today; quickCheckin.min = today; }
    if (quickCheckout) { quickCheckout.value = tomorrow; quickCheckout.min = tomorrow; }

    // Reserva form dates
    const ingresoInput = $('#reserva-ingreso');
    const salidaInput  = $('#reserva-salida');

    if (ingresoInput) ingresoInput.setAttribute('min', today);
    if (salidaInput)  salidaInput.setAttribute('min', tomorrow);

    if (ingresoInput) {
      ingresoInput.addEventListener('change', () => {
        const nextDay = new Date(new Date(ingresoInput.value).getTime() + 86400000)
          .toISOString().split('T')[0];
        salidaInput.setAttribute('min', nextDay);
        if (salidaInput.value && salidaInput.value <= ingresoInput.value) {
          salidaInput.value = nextDay;
        }
      });
    }
  }

  // ─── Initialize ───────────────────────────────────────────
  function init() {
    setDateDefaults();
    checkApiHealth();
    setInterval(checkApiHealth, 30000);
  }

  init();
})();

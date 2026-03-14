let cola = [
  { id: 'Cliente-001', tiempoTotal: 5, tiempoRestante: 5 },
  { id: 'Cliente-002', tiempoTotal: 2, tiempoRestante: 2 },
  { id: 'Cliente-003', tiempoTotal: 8, tiempoRestante: 8 },
  { id: 'Cliente-004', tiempoTotal: 4, tiempoRestante: 4 },
  { id: 'Cliente-005', tiempoTotal: 1, tiempoRestante: 1 },
];

let quantumBoletos   = 3;   // máx boletos por turno  (quantum del Python)
let quantumTiempo    = 5;   // segundos reales para decidir y comprar
let tiempoGlobal     = 0;   // tiempoGlobal del Python
let activo           = false;
let intervalo        = null;
let nextNum          = 6;

// Estado del turno en curso
let turnoEjecucion    = 0;  // min(quantum, tiempoRestante) del Python
let boletosComprados  = 0;  // cuántos lleva comprados este turno
let segundosRestantes = 0;  // countdown del timer

// Guarda el id del cliente mandado al final para mostrar "Regresó a cola"
// mientras el siguiente cliente está siendo atendido.
// Se borra cuando ese cliente vuelve a ser el primero de la fila.
let lastReturnedId = null;

// ==========================================================================
//  REFERENCIAS AL DOM
// ==========================================================================
const queueBody       = document.getElementById('queueBody');
const emptyState      = document.getElementById('emptyState');
const clientId        = document.getElementById('clientId');
const clientIntent    = document.getElementById('clientIntent');
const boletosProgress = document.getElementById('boletosProgress');
const timerValue      = document.getElementById('timerValue');
const timerBar        = document.getElementById('timerBar');
const clientCard      = document.getElementById('clientCard');
const doneBanner      = document.getElementById('doneBanner');
const statusBadge     = document.getElementById('statusBadge');
const btnIniciar      = document.getElementById('btnIniciar');
const btnAgregar      = document.getElementById('btnAgregar');

// ==========================================================================
//  UTILIDADES
// ==========================================================================
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ==========================================================================
//  RENDER 
//  freshEntry = true → animación de slide
// ==========================================================================
function render(freshEntry = false) {
  queueBody.innerHTML = '';

  if (cola.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  cola.forEach((c, i) => {
    const esActual = activo && i === 0;

    // "Regresó a cola": el cliente en lastReturnedId,
    // solo si NO es quien está en ventanilla ahora
    const esRetornado = !esActual
                        && lastReturnedId
                        && c.id === lastReturnedId
                        && i === cola.length - 1;

    let estadoHtml;
    if (esActual) {
      estadoHtml = `<span class="status serving">En Ventanilla</span>`;
    } else if (esRetornado) {
      estadoHtml = `<span class="status returned">↩ Regresó a cola</span>`;
    } else {
      estadoHtml = `<span class="status waiting">Esperando</span>`;
    }

    const tr = document.createElement('tr');
    tr.id = 'r-' + CSS.escape(c.id);

    // Fondo naranja tenue + borde izquierdo para el retornado
    if (esRetornado) tr.classList.add('was-returned');

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${c.id}</td>
      <td>${c.tiempoRestante}</td>
      <td>${estadoHtml}</td>`;

    // Slide-in solo la primera vez que llega al final
    if (esRetornado && freshEntry) tr.classList.add('row-entering');

    queueBody.appendChild(tr);
  });
}

// ==========================================================================
//  ACTUALIZAR TARJETA DE VENTANILLA
// ==========================================================================
function actualizarCard() {
  if (!activo || cola.length === 0) {
    clientId.textContent        = '— Sin cliente activo —';
    clientIntent.textContent    = 'Esperando inicio de simulación';
    boletosProgress.innerHTML   = '';
    timerValue.textContent      = '—';
    timerValue.className        = '';
    timerBar.style.width        = '100%';
    timerBar.className          = 'timer-bar';
    clientCard.className        = 'client-card';
    return;
  }

  const c = cola[0];
  clientId.textContent     = `ID: ${c.id}`;
  clientIntent.textContent =
    `Quiere: ${c.tiempoTotal} boletos  |  Restantes: ${c.tiempoRestante}  |  Este turno: ${turnoEjecucion}`;

  // Dots: uno por cada boleto del turno — blanco = comprado, vacío = pendiente
  boletosProgress.innerHTML = '';
  for (let i = 0; i < turnoEjecucion; i++) {
    const dot = document.createElement('div');
    dot.className = 'boleto-dot' + (i < boletosComprados ? ' comprado' : '');
    boletosProgress.appendChild(dot);
  }
}

// ==========================================================================
//  ACTUALIZAR TIMER DISPLAY
// ==========================================================================
function actualizarTimerDisplay() {
  timerValue.textContent = segundosRestantes + 's';

  const esDanger = segundosRestantes <= 2;
  const esWarn   = !esDanger && segundosRestantes <= Math.ceil(quantumTiempo * 0.4);

  timerValue.className = esDanger ? 'danger' : esWarn ? 'warn' : '';
  timerBar.className   = 'timer-bar' + (esDanger ? ' danger' : '');

  const pct = (segundosRestantes / quantumTiempo) * 100;
  timerBar.style.width = pct + '%';
}

// ==========================================================================
//  INICIAR TURNO
//  Equivale al body del while del Python:
// ==========================================================================
function iniciarTurno() {
  if (cola.length === 0) { terminar(); return; }

  const c = cola[0];

  // Si el cliente retornado vuelve a ser atendido → limpiar estado naranja
  if (lastReturnedId && c.id === lastReturnedId) lastReturnedId = null;

  // tiempoEjecucion = min(quantum, tiempoRestante)  ← Python
  turnoEjecucion    = Math.min(quantumBoletos, c.tiempoRestante);
  boletosComprados  = 0;
  segundosRestantes = quantumTiempo;

  clientCard.className = 'client-card';
  actualizarCard();
  actualizarTimerDisplay();
  render(); // marca [0] como "En Ventanilla"

  clearInterval(intervalo);
  intervalo = setInterval(() => {

    // Cada segundo real → 1 boleto comprado)
    if (boletosComprados < turnoEjecucion) {
      boletosComprados++;
      c.tiempoRestante--;
      tiempoGlobal++;

      // Rellenar dot del boleto recién comprado
      const dots = boletosProgress.querySelectorAll('.boleto-dot');
      if (dots[boletosComprados - 1]) {
        dots[boletosComprados - 1].classList.add('comprado');
      }

      // Actualizar boletos restantes en la tabla en tiempo real
      const rowEl = document.getElementById('r-' + CSS.escape(c.id));
      if (rowEl) rowEl.cells[2].textContent = c.tiempoRestante;

      clientIntent.textContent =
        `Quiere: ${c.tiempoTotal} boletos  |  Restantes: ${c.tiempoRestante}  |  Este turno: ${turnoEjecucion}`;
    }

    segundosRestantes--;
    actualizarTimerDisplay();

    // Terminó todos los boletos del turno antes de que se acabe el tiempo
    if (boletosComprados >= turnoEjecucion) {
      clearInterval(intervalo);
      procesarFinDeTurno(false);
      return;
    }

    // Se acabó el tiempo
    if (segundosRestantes <= 0) {
      clearInterval(intervalo);
      procesarFinDeTurno(true);
    }

  }, 1000);
}

//  porTimeout = true  → se acabó el tiempo → regresa al final
//  porTimeout = false → terminó bien → continúa
async function procesarFinDeTurno(porTimeout) {
  const c = cola[0];

  if (porTimeout) {
    // Flash rojo: el cliente se quedó pensando y perdió su turno
    clientCard.className = 'client-card timeout';
    await sleep(600);
    clientCard.className = 'client-card';
  }

  if (c.tiempoRestante <= 0) {
    // ── TERMINÓ: equivale a "terminó de enviar su mensaje" del Python ────
    // print(f"Tiempo {tiempoGlobal}: {proceso.id} terminó de enviar su mensaje")
    if (lastReturnedId === c.id) lastReturnedId = null;

    const rowEl = document.getElementById('r-' + CSS.escape(c.id));
    if (rowEl) { rowEl.classList.add('row-done'); await sleep(440); }

    cola.shift(); // cola.pop(0) del Python (pero ya lo procesamos)

    if (cola.length === 0) { render(); terminar(); return; }

    render();
    actualizarCard();
    flashRow(cola[0]);
    iniciarTurno();

  } else {
    // ── NO TERMINÓ: equivale a cola.append(proceso) del Python ───────────
    // print(f"Tiempo {tiempoGlobal}: {proceso.id} pausado Mensaje incompleto de regreso a la fila")
    lastReturnedId = c.id; // para mantener "Regresó a cola" visible en la tabla

    cola.shift();  // pop(0)
    cola.push(c);  // append

    render(true);  // freshEntry → slide-in + pill-pop en la última fila
    actualizarCard();
    flashRow(cola[0]);

    await sleep(300);
    iniciarTurno();
  }
}

// ==========================================================================
//  FLASH AZUL en la fila del siguiente cliente
// ==========================================================================
function flashRow(c) {
  if (!c) return;
  const el = document.getElementById('r-' + CSS.escape(c.id));
  if (!el) return;
  el.classList.remove('row-flash');
  void el.offsetWidth;
  el.classList.add('row-flash');
  setTimeout(() => el.classList.remove('row-flash'), 1000);
}

// ==========================================================================
//  INICIAR SIMULACIÓN
// ==========================================================================
function iniciar() {
  if (cola.length === 0) {
    alert('Agrega al menos un cliente a la fila.');
    return;
  }

  quantumBoletos = Math.max(1, parseInt(document.getElementById('cfgQuantum').value) || 3);
  quantumTiempo  = Math.max(1, parseInt(document.getElementById('cfgTiempo').value)  || 5);

  activo         = true;
  tiempoGlobal   = 0;
  lastReturnedId = null;

  doneBanner.style.display = 'none';
  statusBadge.textContent  = 'Sistema Activo ';
  btnIniciar.disabled      = true;

  iniciarTurno();
}

// ==========================================================================
//  TERMINAR SIMULACIÓN
//  Equivale a: print("SIMULACIÓN TERMINADA")
// ==========================================================================
function terminar() {
  activo = false;
  clearInterval(intervalo);

  clientId.textContent      = '— Todos atendidos —';
  clientIntent.textContent  = `Simulación completa · Tiempo global: ${tiempoGlobal} unidades`;
  boletosProgress.innerHTML = '';
  timerValue.textContent    = '✓';
  timerValue.className      = '';
  timerBar.style.width      = '0%';
  clientCard.className      = 'client-card';
  statusBadge.textContent   = 'Sistema en Reposo';

  doneBanner.style.display = 'block';
  doneBanner.textContent   =
    `Todos los clientes fueron atendidos. Tiempo global: ${tiempoGlobal} unidades.`;

  btnIniciar.disabled    = false;
  btnIniciar.textContent = '↺ Nueva Simulación';
}

// ==========================================================================
//  AGREGAR CLIENTE A LA FILA
// ==========================================================================
btnAgregar.addEventListener('click', () => {
  const nombre  = document.getElementById('inNombre').value.trim()
                  || `Cliente-${String(nextNum).padStart(3, '0')}`;
  const boletos = parseInt(document.getElementById('inBoletos').value) || 0;

  if (boletos < 1) {
    alert('Ingresa un número de boletos válido (mínimo 1).');
    return;
  }

  cola.push({ id: nombre, tiempoTotal: boletos, tiempoRestante: boletos });
  nextNum++;

  document.getElementById('inNombre').value  = '';
  document.getElementById('inBoletos').value = '';

  render();
  if (!activo) actualizarCard();
});

// ==========================================================================
//  BOTÓN INICIAR
// ==========================================================================
btnIniciar.addEventListener('click', () => {
  if (!activo) iniciar();
});

// ==========================================================================
//  INICIALIZACIÓN
// ==========================================================================
render();
actualizarCard();
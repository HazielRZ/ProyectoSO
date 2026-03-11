const procesos = [
  { id: 'P1', rafaga: 7, prioridad: 4, color: '#f23847' },
  { id: 'P2', rafaga: 3, prioridad: 1, color: '#8c3e53' },
  { id: 'P3', rafaga: 10, prioridad: 2, color: '#f2b6cc' },
  { id: 'P4', rafaga: 3, prioridad: 3, color: '#f27272' },
  { id: 'P5', rafaga: 3, prioridad: 5, color: '#efcfcf' }
];

// Referencias al DOM
const tbody = document.querySelector('#processTable tbody');
const contenedorGantt = document.getElementById('ganttChart');
const finalMetricsDiv = document.getElementById('finalMetrics');


function inicializarTabla() {
  procesos.forEach(p => {
    const fila = document.createElement('tr');
    fila.id = `row-${p.id}`;
    fila.innerHTML = `
            <td><strong>${p.id}</strong></td>
            <td>${p.rafaga}</td>
            <td>${p.prioridad}</td>
            <td class="cell-tr">-</td> <td class="cell-tw">-</td> `;
    tbody.appendChild(fila);
  });
}


const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function ejecutarSimulacionAnimada() {

  const colaPlanificada = [...procesos].sort((a, b) => a.prioridad - b.prioridad);

  const tiempoTotalRafaga = colaPlanificada.reduce((sum, p) => sum + p.rafaga, 0);
  let tiempoActual = 0;
  let sumaTr = 0;
  let sumaTw = 0;

  const DURACION_ANIMACION_TOTAL_MS = 6000; // 6 segundos
  const factorEscalaTiempo = DURACION_ANIMACION_TOTAL_MS / tiempoTotalRafaga;


  for (const p of colaPlanificada) {

    const tiempoFinalizacion = tiempoActual + p.rafaga;


    const tiempoRetorno = tiempoFinalizacion - 0;


    const tiempoEspera = tiempoRetorno - p.rafaga;

    sumaTr += tiempoRetorno;
    sumaTw += tiempoEspera;

    // Renderizado
    const anchoObjetivo = (p.rafaga / tiempoTotalRafaga) * 100;


    const bloque = document.createElement('div');
    bloque.className = 'gantt-block';
    bloque.style.backgroundColor = p.color;
    bloque.innerText = p.id;
    contenedorGantt.appendChild(bloque);


    void bloque.offsetWidth;


    bloque.style.width = `${anchoObjetivo}%`;
    bloque.classList.add('animate-grow');

    // Calcular tiempo
    const tiempoEsperaReal = p.rafaga * factorEscalaTiempo;

    // PAUSAR
    await esperar(tiempoEsperaReal);


    tiempoActual = tiempoFinalizacion;

    // Agregar marcador de tiempo
    const marcador = document.createElement('span');
    marcador.className = 'gantt-time-marker';
    marcador.style.left = `${(tiempoActual / tiempoTotalRafaga) * 100}%`;
    marcador.innerText = tiempoActual;
    contenedorGantt.appendChild(marcador);

    // Actualizar la tabla
    const filaProceso = document.getElementById(`row-${p.id}`);
    filaProceso.querySelector('.cell-tr').innerText = tiempoRetorno;
    filaProceso.querySelector('.cell-tw').innerText = tiempoEspera;
    // Resaltar la fila momentáneamente
    filaProceso.style.backgroundColor = '#e8f4fd';
    setTimeout(() => filaProceso.style.backgroundColor = '', 500);
  }

  document.getElementById('avgTr').innerText = (sumaTr / procesos.length).toFixed(2);
  document.getElementById('avgTw').innerText = (sumaTw / procesos.length).toFixed(2);
  finalMetricsDiv.style.display = 'block';
}


inicializarTabla();

setTimeout(ejecutarSimulacionAnimada, 1000);

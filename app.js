const CLAVE_CORRECTA = "2026";

// Seguridad
function verificarClave() {
    const pass = document.getElementById('input-clave').value;
    if (pass === CLAVE_CORRECTA) {
        sessionStorage.setItem('accesoPermitido', 'true');
        document.getElementById('pantalla-login').style.display = 'none';
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('accesoPermitido') === 'true') {
        document.getElementById('pantalla-login').style.display = 'none';
    }
});

// Modal Personalizado Inteligente
function mostrarConfirmacion(mensaje, accionConfirmada) {
    const modal = document.getElementById('modal-confirmacion');
    const msgTxt = document.getElementById('modal-mensaje');
    const btnConf = document.getElementById('btn-confirmar');
    const btnCanc = document.getElementById('btn-cancelar');
    
    // Si el mensaje dice "correctamente" o "Socio", es un aviso de éxito (un solo botón)
    const esExito = mensaje.includes("correctamente") || mensaje.includes("Socio guardado");
    
    msgTxt.innerText = mensaje;
    btnConf.innerText = esExito ? "Aceptar" : "Eliminar";
    btnConf.className = esExito ? "btn btn-primary w-100" : "btn btn-danger w-100";
    btnCanc.style.display = esExito ? 'none' : 'inline-block';
    
    modal.style.display = 'flex';

    btnConf.onclick = () => { 
        if(accionConfirmada) accionConfirmada(); 
        modal.style.display = 'none'; 
    };
    btnCanc.onclick = () => { modal.style.display = 'none'; };
}

// FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyALepfLTXEL3w-BRpzrRwFCS5-A-Varu4o",
    authDomain: "recibos-san-martin.firebaseapp.com",
    databaseURL: "https://recibos-san-martin-default-rtdb.firebaseio.com",
    projectId: "recibos-san-martin",
    storageBucket: "recibos-san-martin.firebasestorage.app",
    messagingSenderId: "757269810918",
    appId: "1:757269810918:web:c8ab85d5e9a90a4ecfb527"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let socios = [], historial = [], numeroFolio = 1;

// Sincronización
db.ref('socios').on('value', snap => {
    socios = [];
    snap.forEach(c => { socios.push({id:c.key, ...c.val()}); });
    actualizarListaSociosUI();
});

db.ref('historial').on('value', snap => {
    historial = [];
    snap.forEach(c => { historial.push({id:c.key, ...c.val()}); });
    if(historial.length > 0) {
        numeroFolio = Math.max(...historial.map(h => parseInt(h.Nro_Folio) || 0)) + 1;
    }
    actualizarTablaHistorial();
});

// Buscador
const inputNombre = document.getElementById('nombre');
const sug = document.getElementById('listaSugerencias');
inputNombre.addEventListener('input', e => {
    const val = e.target.value.toUpperCase();
    sug.innerHTML = '';
    if(val.length > 0) {
        const filtrados = socios.filter(s => s.nombre.toUpperCase().includes(val));
        filtrados.forEach(s => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.textContent = s.nombre;
            li.onclick = () => {
                inputNombre.value = s.nombre;
                document.getElementById('categoria').value = s.categoria;
                sug.classList.add('d-none');
            };
            sug.appendChild(li);
        });
        sug.classList.toggle('d-none', filtrados.length === 0);
    } else sug.classList.add('d-none');
});

// Guardar Recibo
document.getElementById('formCobro').onsubmit = (e) => {
    e.preventDefault();
    const hoy = new Date();
    const d = {
        Nro_Folio: numeroFolio.toString().padStart(4, '0'),
        Fecha: `${hoy.getDate()}/${hoy.getMonth()+1}/${hoy.getFullYear()}`,
        Jugador: inputNombre.value.toUpperCase(),
        Categoria: document.getElementById('categoria').value,
        Mes: document.getElementById('mes').value,
        Concepto: document.getElementById('concepto').value,
        Importe: document.getElementById('total').value,
        Metodo_Pago: document.getElementById('pago').value
    };
    db.ref('historial').push(d).then(() => {
        imprimirRecibo(d);
        e.target.reset();
    });
};

// Guardar Socio
document.getElementById('btnGuardarSocio').onclick = () => {
    const n = document.getElementById('nuevoSocioNombre').value.toUpperCase().trim();
    const c = document.getElementById('nuevoSocioCat').value;
    if(n) {
        db.ref('socios').push({nombre:n, categoria:c}).then(() => {
            document.getElementById('nuevoSocioNombre').value = '';
            mostrarConfirmacion("Socio guardado correctamente", () => {
                const m = document.getElementById('modalSocios');
                bootstrap.Modal.getInstance(m).hide();
            });
        });
    }
};

function actualizarTablaHistorial() {
    const body = document.getElementById('tablaHistorialBody');
    if(!body) return;
    body.innerHTML = '';
    [...historial].reverse().forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.Nro_Folio}</td><td>${r.Fecha}</td><td>${r.Jugador}</td><td>$${r.Importe}</td>
        <td><button class="btn btn-sm btn-outline-danger border-0" onclick="borrarRecibo('${r.id}')">×</button></td>`;
        body.appendChild(tr);
    });
}

function imprimirRecibo(d) {
    document.getElementById('r-folio').innerText = d.Nro_Folio;
    document.getElementById('r-fecha').innerText = d.Fecha;
    document.getElementById('r-nombre').innerText = d.Jugador;
    document.getElementById('r-categoria').innerText = d.Categoria;
    document.getElementById('r-mes').innerText = d.Mes;
    document.getElementById('r-concepto').innerText = d.Concepto;
    document.getElementById('r-pago').innerText = d.Metodo_Pago;
    document.getElementById('r-total').innerText = d.Importe;
    const area = document.getElementById('areaRecibo');
    area.style.display = 'block';
    setTimeout(() => { window.print(); area.style.display = 'none'; }, 500);
}

function borrarRecibo(id) { mostrarConfirmacion("¿Eliminar este recibo?", () => db.ref('historial').child(id).remove()); }
function borrarSocio(id) { mostrarConfirmacion("¿Eliminar socio definitivamente?", () => db.ref('socios').child(id).remove()); }

function actualizarListaSociosUI() {
    const lista = document.getElementById('listaSociosGuardados');
    lista.innerHTML = '';
    socios.sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(s => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center small';
        li.innerHTML = `${s.nombre} (${s.categoria}) <i class="fa fa-trash text-danger" onclick="borrarSocio('${s.id}')" style="cursor:pointer"></i>`;
        lista.appendChild(li);
    });
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(historial);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, "Cobranza_SMH.xlsx");
}
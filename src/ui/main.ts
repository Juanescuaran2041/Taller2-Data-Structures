import { LoanSystem } from "../servicios/LoanSystem.js";
import type { OperationalResult } from "../servicios/LoanSystem.js";
import { State, TypeOfEquipment } from "../models/Equipment.js";

const H = 2;
const K = 3;
const system = new LoanSystem(H, K);
const types = Object.values(TypeOfEquipment);

const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => (el(id) as HTMLInputElement).value.trim();
const hour = () => Number(value("hour")) || 0;
const typeOf = (id: string) => value(id) as TypeOfEquipment;

// every button ends here: shows the message, saves it in the log and redraws
function show(operation: string, result: OperationalResult) {
    const message = el("message");
    message.textContent = result.msg;
    message.style.color = result.ok ? "green" : "red";
    system.log(operation, result);
    render();
}

function fillSelect(id: string, options: string[], withAll: boolean) {
    const select = el(id) as HTMLSelectElement;
    select.innerHTML = (withAll ? `<option value="">Todos</option>` : "") +
        options.map(o => `<option value="${o}">${o}</option>`).join("");
}

// vertical stack, first element is the top
function stackHtml(codes: string[]): string {
    if (codes.length === 0) return "<i>(vacio)</i>";
    return codes.map((code, i) =>
        `<div class="box ${i === 0 ? "top" : ""}">${code}${i === 0 ? ' <span class="tag">TOPE</span>' : ""}</div>`
    ).join("<br>");
}

// horizontal queue, first element is the front
function queueHtml(title: string, codes: string[]): string {
    const boxes = codes.length === 0 ? "<i>(vacia)</i>" : codes.map((code, i) => {
        const tags = (i === 0 ? " FRENTE" : "") + (i === codes.length - 1 ? " FINAL" : "");
        return `<span class="box">${code}<span class="tag">${tags}</span></span>`;
    }).join(" -> ");
    return `<div class="queue"><b>${title}</b> (${codes.length}): ${boxes}</div>`;
}

const sample = [
    { code: "PORT-01", type: TypeOfEquipment.PORTATIL },
    { code: "PORT-02", type: TypeOfEquipment.PORTATIL },
    { code: "PORT-03", type: TypeOfEquipment.PORTATIL },
    { code: "PORT-04", type: TypeOfEquipment.PORTATIL },
    { code: "KIT-01", type: TypeOfEquipment.KIT },
    { code: "KIT-02", type: TypeOfEquipment.KIT },
    { code: "MULT-01", type: TypeOfEquipment.MULTIMETRO },
    { code: "MULT-02", type: TypeOfEquipment.MULTIMETRO },
];

function render() {
    // inventory with filters
    const filterType = value("filter-type");
    const filterState = value("filter-state");
    const rows = system.getInventory()
        .filter(e => filterType === "" || e.getType() === filterType)
        .filter(e => filterState === "" || e.getState() === filterState)
        .map(e => `<tr><td>${e.getCode()}</td><td>${e.getType()}</td><td>${e.getState()}</td><td>${e.getBorrowings()}</td></tr>`)
        .join("");
    el("inventory").innerHTML =
        `<table><tr><th>Codigo</th><th>Tipo</th><th>Estado</th><th>Prestamos</th></tr>${rows}</table>`;

    // waiting lists
    el("wait-queues").innerHTML = types.map(t =>
        queueHtml(`Espera ${t}`, system.getWaitQueue(t).map(r => r.getStudentCode()))
    ).join("");

    // carts (main + auxiliary)
    el("carts").innerHTML = types.map(t => {
        const codes = system.getCart(t).map(e => e.getCode());
        return `<div class="stack"><b>${t}</b> ${codes.length}/${K}<br>${stackHtml(codes)}</div>`;
    }).join("") + `<div class="stack"><b>AUXILIAR</b><br>${stackHtml(system.getAuxiliar().map(e => e.getCode()))}</div>`;

    // review and store queues
    el("review-queue").innerHTML = queueHtml("Cola de revision", system.getReviewQueue().map(e => e.getCode()));
    el("store-queue").innerHTML = queueHtml("Equipos por guardar", system.getStoreQueue().map(e => e.getCode()));

    // metrics
    const r = system.report();
    const mostBorrowed = r.mostBorrowed === null ? "-" : `${r.mostBorrowed.code} (${r.mostBorrowed.borrowings})`;
    el("report").innerHTML = `
        <p>Por estado: ${Object.entries(r.byState).map(([k, v]) => `${k}: ${v}`).join(" | ")}</p>
        <p>Por tipo: ${Object.entries(r.byType).map(([k, v]) => `${k}: ${v}`).join(" | ")}</p>
        <p>Ocupacion de carros: ${r.occupancy.map(o => `${o.type} ${o.used}/${o.capacity}`).join(" | ")}</p>
        <p>Solicitudes inmediatas: ${r.immediateRequest} | Pasaron por espera: ${r.queuedRequest} | Espera promedio: ${r.averageWait.toFixed(1)} min</p>
        <p>Prestamos dirigidos: ${r.directLoans} | Movimientos totales: ${r.totalMovements}</p>
        <p>Devoluciones con dano: ${r.damagedReturns} | En mantenimiento: ${r.byState[State.MANTENIMIENTO]} | Devoluciones en mora: ${r.lateReturns} | Equipos en mora ahora: ${r.overdueNow}</p>
        <p>Mas prestado: ${mostBorrowed} | Mantenimiento preventivo (R8): ${r.preventiveMaintenance.join(", ") || "-"}</p>`;

    // log
    el("logs").innerHTML = system.getLogs().map(l => `<div>${l}</div>`).join("");
}

fillSelect("type", types, false);
fillSelect("filter-type", types, true);
fillSelect("filter-state", Object.values(State), true);

el("filter-type").addEventListener("change", render);
el("filter-state").addEventListener("change", render);

el("btn-sample").addEventListener("click", () => {
    show("cargarInventario", system.loadInventory(sample));
});

el("btn-request").addEventListener("click", () => {
    show("solicitar", system.request(value("student"), typeOf("type"), hour()));
});

el("btn-lend").addEventListener("click", () => {
    const equipment = system.lend(typeOf("type"), value("student"), hour());
    show("prestar", equipment === null
        ? { ok: false, msg: `R2: el carro de ${typeOf("type")} esta vacio` }
        : { ok: true, msg: `${equipment.getCode()} prestado a ${value("student")}` });
});

el("btn-serve").addEventListener("click", () => {
    show("atenderEspera", system.serveWaitingList(typeOf("type"), hour()));
});

el("btn-return").addEventListener("click", () => {
    show("devolver", system.returns(value("return-code"), hour()));
});

el("btn-approve").addEventListener("click", () => {
    show("revisar", system.reviews(false));
});

el("btn-damage").addEventListener("click", () => {
    show("revisar", system.reviews(true));
});

el("btn-directed").addEventListener("click", () => {
    const result = system.lendDirected(value("directed-code"), value("teacher"), hour());
    show("prestarDirigido", result);
    el("directed-info").textContent = `Movimientos: ${result.movements}`;
    el("steps").innerHTML = result.steps.map(s =>
        `<li>${s.step} | carro: [${s.cart.join(", ")}] | auxiliar: [${s.aux.join(", ")}]</li>`
    ).join("");
});

el("btn-search").addEventListener("click", () => {
    const result = system.search(value("search-code"));
    el("search-result").textContent = !result.found
        ? "No existe ese equipo"
        : `Estado: ${result.state}` + (result.position === null ? "" : ` | posicion en el carro desde el tope: ${result.position}`);
});

render();

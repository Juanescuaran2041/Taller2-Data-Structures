import { EquipmentList } from "../estructuras/EquipmentList.js";
import { EquipmentStack } from "../estructuras/EquipmentStack.js";
import { Equipment, State, TypeOfEquipment } from "../models/Equipment.js";
import { RequestQueue } from "../estructuras/RequestQueue.js";
import { EquipmentQueue } from "../estructuras/EquipmentQueue.js";
import { Request } from "../models/Request.js";


export interface OperationalResult {
    ok: boolean;
    msg: string;
}

export interface EquipmentSeed {
    code: string;
    type: TypeOfEquipment;
}

// state of both carts after one movement of R4 (top first)
export interface CartSnapshot {
    step: string;
    cart: string[];
    aux: string[];
}

export interface DirectedResult extends OperationalResult {
    movements: number;
    steps: CartSnapshot[];
}

export interface SearchResult {
    found: boolean;
    state: State | null;
    position: number | null;
}

export class LoanSystem {
    private inventory = new EquipmentList();

    //data structures
    private carts = new Map<TypeOfEquipment, EquipmentStack>();
    private waitQueue = new Map<TypeOfEquipment, RequestQueue>();
    private storeQueue = new EquipmentQueue();

    //review 
    private reviewQueue = new EquipmentQueue();

    private auxiliar = new EquipmentStack(Infinity);

    private logs: string[] = [];

    immediateRequest = 0;
    totalWaitMinutes = 0;
    servedFromQueue = 0;
    directLoans = 0;
    queuedRequest = 0;
    totalMovements = 0;
    damagedReturns = 0;
    lateReturns = 0;

    private readonly maxLoanMinutes: number
    private readonly cartCapacity: number

    private borrowers = new Map<string, string>();
    private preventiveMaintenance = new Set<string>();

    //last hour received, used when a review serves the waiting list (R3)
    private lastHour = 0;

    constructor(maxLoansHours: number, cartCapacity: number) {
        this.maxLoanMinutes = maxLoansHours * 60
        this.cartCapacity = cartCapacity

        for (const type of Object.values(TypeOfEquipment)) {
            this.carts.set(type, new EquipmentStack(cartCapacity));
            this.waitQueue.set(type, new RequestQueue());
        }
    }

    loadInventory(seeds: EquipmentSeed[]): OperationalResult {
        let loaded = 0;

        for (const seed of seeds) {
            if (this.inventory.find(seed.code) !== null) {
                continue
            }

            const equipment = new Equipment(seed.code, seed.type)
            this.inventory.append(equipment)

            const stacked = this.carts.get(seed.type)!.push(equipment)

            if (!stacked) {
                equipment.setState(State.EN_REVISION)
                this.storeQueue.enqueue(equipment)
            }

            loaded++;
        }
        const response: OperationalResult = {
            ok: true,
            msg: `Inventario cargado correctamente. Equipos registrados: ${loaded}.`
        }
        return response

    }

    lend(type: TypeOfEquipment, student: string, hour: number) {
        const top = this.carts.get(type)!.pop();
        if (top === null) {
            return null
        }
        top.setState(State.PRESTADO);

        top.registerBorrowing()

        top.setLoanTime(hour)

        this.borrowers.set(top.getCode(), student)

        this.refillFromStore();

        return top
    }

    private refillFromStore() {
        const first = this.storeQueue.peek()

        if (first === null) {
            return
        }

        const targetCart = this.carts.get(first.getType()!)

        if (!targetCart!.isFull()) {
            this.storeQueue.dequeue()
            first.setState(State.EN_CARRO)
            targetCart!.push(first)
        }
    }

    request(student: string, type: TypeOfEquipment, hour: number): OperationalResult {
        this.lastHour = Math.max(this.lastHour, hour)
        // evaluate if student is in Mora
        if (this.isLate(student, hour)){
            return {ok: false, msg: `R6: ${student} esta en mora y no puede solicitar equipos`}
        }
        // evaluate if student has already requested a lend with the same type of equipment
        if (this.holdsType(student, type) || this.waitQueue.get(type)!.contains(student)){
            return {ok:false, msg: `R1: ${student} ya tiene o espera un equipo de tipo ${type}`}
        }

        //if carts is empty its redirectionated to waitQueue
        if (this.carts.get(type)!.isEmpty()){
            const request = new Request(student, type, hour)
            this.waitQueue.get(type)!.enqueue(request)
            this.queuedRequest ++;
            return {ok:true, msg:`No hay ${type} disponible en este momento, se redirige a lista de espera`}
        }

        // lend to the student if cart is not emtpy
        const equipment = this.lend(type, student, hour);
        this.immediateRequest ++;
        return {ok:true, msg: `${student} ha solicitado el prestamo de ${equipment!.getCode()}`}
    }

    private isLate(studentCode: string, hour: number): boolean {
        for (const equipment of this.inventory.toArray()) {
            if (this.borrowers.get(equipment.getCode()) !== studentCode) {
                continue
            }
            const loanTime = equipment.getLoanTime()
            if (loanTime !== null && hour - loanTime > this.maxLoanMinutes){
                return true
            }
        }
        return false;
    
    }

    private holdsType(studentCode:string, type:TypeOfEquipment): boolean {
        for (const equipment of this.inventory.toArray()){
            if (this.borrowers.get(equipment.getCode()) === studentCode && equipment.getType() === type){
                return true
            }
        }
        return false
    }

    returns(code:string, hour:number): OperationalResult {
        this.lastHour = Math.max(this.lastHour, hour)
        const equipment = this.inventory.find(code)

        if (equipment === null){
            return {ok:false, msg:`${code} is not registered `}
        }
        if (!(equipment.getState() === State.PRESTADO)){
            return {ok:false, msg:`${code} is not currently on loan, his current state is: ${equipment.getState()}`}
        }
        const duration = hour - Number(equipment.getLoanTime());

        if (duration > this.maxLoanMinutes){
            this.lateReturns++;
        }
        equipment.setState(State.EN_REVISION);
        equipment.setLoanTime(null);
        this.borrowers.delete(code);

        //enqueue in reviewQueue
        this.reviewQueue.enqueue(equipment)

        return {
            ok: true,
            msg: `${code} equipment gived back successfully`
        }

    }

    reviews (damaged:boolean): OperationalResult {
        const equipment = this.reviewQueue.dequeue()

        if (equipment === null){
            return {ok:false, msg: `There is not an equipment registered in review Queue`}
        }

        if (damaged){
            equipment.setState(State.MANTENIMIENTO);
            this.damagedReturns ++;
            return {ok:true, msg: `R5: ${equipment.getCode()} is damaged and now in maintainance`}
        }
        if (equipment.getBorrowings() >= 5){
            equipment.setState(State.MANTENIMIENTO);
            this.preventiveMaintenance.add(equipment.getCode());
            return {ok:true, msg: `R8: ${equipment.getCode()} has 5 or more borrowings, now in preventive maintainance`}
        }
        const stacked = this.carts.get(equipment.getType()!)!.push(equipment);

        if (stacked === false){
            equipment.setState(State.EN_REVISION);
            this.storeQueue.enqueue(equipment);
            return {ok:true, msg: `R7: ${equipment.getCode()} approved but the cart is full, it waits in storeQueue`}
        }

        equipment.setState(State.EN_CARRO);

        // R3: the equipment is back in the cart, serve the first one waiting
        const served = this.serveWaitingList(equipment.getType()!, this.lastHour)
        const extra = served.ok ? ` ${served.msg}` : ""
        return {ok:true, msg: `${equipment.getCode()} approved and stacked in its cart.${extra}`}
    }

    // RF-07
    serveWaitingList(type: TypeOfEquipment, hour: number): OperationalResult {
        const queue = this.waitQueue.get(type)!

        if (this.carts.get(type)!.isEmpty() || queue.isEmpty()){
            return {ok:false, msg:`There is no equipment or nobody waiting for ${type}`}
        }

        const waiting = queue.dequeue()!
        const equipment = this.lend(type, waiting.getStudentCode(), hour)!

        this.totalWaitMinutes += hour - waiting.getRequestedTime()
        this.servedFromQueue ++

        return {ok:true, msg:`R3: ${equipment.getCode()} delivered to ${waiting.getStudentCode()} from the waiting list`}
    }

    // RF-08: reads the cart, never changes it
    search(code: string): SearchResult {
        const equipment = this.inventory.find(code)
        if (equipment === null){
            return {found:false, state:null, position:null}
        }

        let position: number | null = null
        if (equipment.getState() === State.EN_CARRO){
            position = this.carts.get(equipment.getType()!)!.positionOf(code)
        }
        return {found:true, state:equipment.getState(), position}
    }

    // RF-04 (R4): one auxiliary stack is enough, moving A->B->A reverses twice and keeps the order
    lendDirected(code: string, teacher: string, hour: number): DirectedResult {
        this.lastHour = Math.max(this.lastHour, hour)
        const equipment = this.inventory.find(code)

        if (equipment === null){
            return {ok:false, msg:`R4: ${code} is not registered`, movements:0, steps:[]}
        }
        if (equipment.getState() !== State.EN_CARRO){
            return {ok:false, msg:`R4: ${code} is not in a cart, its state is ${equipment.getState()}`, movements:0, steps:[]}
        }

        const cart = this.carts.get(equipment.getType()!)!
        const steps: CartSnapshot[] = [this.snapshot("Initial state", cart)]
        let movements = 0

        // unstack to the auxiliary cart until the requested one is on top
        while (cart.peek()!.getCode() !== code){
            const moved = cart.pop()!
            this.auxiliar.push(moved)
            movements ++
            steps.push(this.snapshot(`Move ${moved.getCode()} to auxiliary`, cart))
        }

        cart.pop()
        steps.push(this.snapshot(`Take out ${code}`, cart))

        // put the others back, same order as before
        while (!this.auxiliar.isEmpty()){
            const moved = this.auxiliar.pop()!
            cart.push(moved)
            movements ++
            steps.push(this.snapshot(`Return ${moved.getCode()} to the cart`, cart))
        }

        equipment.setState(State.PRESTADO)
        equipment.registerBorrowing()
        equipment.setLoanTime(hour)
        this.borrowers.set(code, teacher)
        this.refillFromStore()

        this.directLoans ++
        this.totalMovements += movements

        return {ok:true, msg:`R4: ${code} delivered to ${teacher} with ${movements} movements`, movements, steps}
    }

    private snapshot(step: string, cart: EquipmentStack): CartSnapshot {
        return {
            step,
            cart: cart.toArray().map(e => e.getCode()),
            aux: this.auxiliar.toArray().map(e => e.getCode())
        }
    }

    // RF-09
    report() {
        const byState: Record<string, number> = {}
        const byType: Record<string, number> = {}
        let mostBorrowed: Equipment | null = null
        let overdueNow = 0

        for (const state of Object.values(State)) byState[state] = 0
        for (const type of Object.values(TypeOfEquipment)) byType[type] = 0

        for (const equipment of this.inventory.toArray()){
            const state = equipment.getState()!
            const type = equipment.getType()!
            byState[state] = (byState[state] ?? 0) + 1
            byType[type] = (byType[type] ?? 0) + 1

            const loanTime = equipment.getLoanTime()
            if (loanTime !== null && this.lastHour - loanTime > this.maxLoanMinutes){
                overdueNow ++
            }
            if (mostBorrowed === null || equipment.getBorrowings() > mostBorrowed.getBorrowings()){
                mostBorrowed = equipment
            }
        }

        const occupancy = Object.values(TypeOfEquipment).map(type => ({
            type,
            used: this.carts.get(type)!.getSize(),
            capacity: this.cartCapacity
        }))

        return {
            byState,
            byType,
            occupancy,
            immediateRequest: this.immediateRequest,
            queuedRequest: this.queuedRequest,
            averageWait: this.servedFromQueue === 0 ? 0 : this.totalWaitMinutes / this.servedFromQueue,
            directLoans: this.directLoans,
            totalMovements: this.totalMovements,
            damagedReturns: this.damagedReturns,
            lateReturns: this.lateReturns,
            overdueNow,
            mostBorrowed: mostBorrowed === null ? null : {code: mostBorrowed.getCode(), borrowings: mostBorrowed.getBorrowings()},
            preventiveMaintenance: [...this.preventiveMaintenance]
        }
    }

    // log of operations (RFE-08): the interface sends each result here
    log(operation: string, result: OperationalResult): void {
        this.logs.push(`[min ${this.lastHour}] ${operation}: ${result.ok ? "OK" : "ERROR"} - ${result.msg}`)
    }

    // getters for the interface (RFE-01): only copies as arrays, top/front first
    getLogs(): string[] { return [...this.logs] }
    getInventory(): Equipment[] { return this.inventory.toArray() }
    getCart(type: TypeOfEquipment): Equipment[] { return this.carts.get(type)!.toArray() }
    getAuxiliar(): Equipment[] { return this.auxiliar.toArray() }
    getWaitQueue(type: TypeOfEquipment): Request[] { return this.waitQueue.get(type)!.toArray() }
    getReviewQueue(): Equipment[] { return this.reviewQueue.toArray() }
    getStoreQueue(): Equipment[] { return this.storeQueue.toArray() }
}
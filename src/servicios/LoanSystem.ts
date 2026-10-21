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
        return {ok:true, msg: `${equipment.getCode()} approved and stacked in its cart`}
    }


}
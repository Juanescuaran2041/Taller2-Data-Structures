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

    loadInventory(seeds: EquipmentSeed[]): OperationalResult | undefined {
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


        };
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
            return null
        }

        const targetCart = this.carts.get(first.getType()!)

        if (!targetCart!.isFull()) {
            this.storeQueue.dequeue()
            first.setState(State.EN_CARRO)
            targetCart!.push(first)
        }
    }

    request(student: string, type: TypeOfEquipment, hour: number){
        // evaluate if student is in Mora
        if (this.isLate(student, hour)){
            return {ok: false, msg:"El estudiante tiene asociado un prestamo que ya esta vencido"}
        }
        // evaluate if student has already requested a lend with the same type of equipment
        if (this.holdsType(student, type) || this.waitQueue.get(type)?.contains(student)){
            return {ok:false, msg: `${student} ya tiene o espera un equipo de tipo ${type}`}
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

    private holdsType(studentCode:string, type:TypeOfEquipment){
        for (const equipment of this.inventory.toArray()){
            if (this.borrowers.get(equipment.getCode()) === studentCode && equipment.getType() == type){
                return true
            }
        }
        return false
    }


}
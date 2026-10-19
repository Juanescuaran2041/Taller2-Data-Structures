import { EquipmentList } from "../estructuras/EquipmentList.js";
import { EquipmentStack } from "../estructuras/EquipmentStack.js";
import { Equipment, State, TypeOfEquipment } from "../models/Equipment.js";
import { RequestQueue } from "../estructuras/RequestQueue.js";
import { EquipmentQueue } from "../estructuras/EquipmentQueue.js";


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
}
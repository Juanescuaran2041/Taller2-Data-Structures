import { Equipment} from "../models/Equipment.js";

class NodeEquipmentQueue {
    equipment: Equipment;
    next: NodeEquipmentQueue | null = null

    constructor(equipment: Equipment) {
        this.equipment = equipment;
    }

}

export class EquipmentQueue {
    private first: NodeEquipmentQueue | null = null;
    private last: NodeEquipmentQueue | null = null;
    private size: number = 0;

    enqueue(equipment: Equipment) {
        const newEquipment = new NodeEquipmentQueue(equipment);

        if (this.last === null) {
            this.first = newEquipment;
            this.last = newEquipment;
        } else {
            this.last.next = newEquipment;
            this.last = newEquipment;
        }
        this.size++;

    }

    dequeue() {
        if (this.first === null) {
            return null;
        }

        const removed = this.first
        this.first = removed.next

        if (this.first === null) {
            this.last = null
        }

        this.size--;
        return removed.equipment
    }

    peek(): Equipment | null {
        return this.first === null ? null : this.first.equipment;
    }

    isEmpty(): boolean {
        return this.size === 0
    }

    getSize(): number {
        return this.size
    }

    toArray () {
        let current = this.first
        const equipment: Equipment[] = []

        while (current !== null){
            equipment.push(current.equipment)
            current = current.next;
        }
        return equipment
    }
    
}
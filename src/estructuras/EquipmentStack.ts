import { Equipment } from "../models/Equipment.js";

class NodeEquipmentStack {
    equipment: Equipment
    next: NodeEquipmentStack | null = null

    constructor (equipment:Equipment){
        this.equipment = equipment;
    }
}

export class EquipmentStack {
    private top: NodeEquipmentStack | null = null
    private size: number = 0;
    private readonly capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity        
    }


    push (equipment:Equipment): boolean {
        if (this.size >= this.capacity){
            return false
        }

        const newEquipment = new NodeEquipmentStack(equipment);

        newEquipment.next = this.top
        this.top = newEquipment

        this.size ++;
        return true
    }

    isEmpty(){
        return this.size === 0;
    }

    pop(): Equipment | null {
        if (this.top === null){
            return null
        }

        const removed = this.top
        this.top = removed.next

        this.size --;
        return removed.equipment
    }


    peek () {
        return this.top === null ? null : this.top.equipment
    }


    getSize(){
        return this.size
    }

    toArray () {
        let current = this.top
        const equipmentArray: Equipment[] = []

        while (current !== null){
            equipmentArray.push(current.equipment)
            current = current.next
        }

        return equipmentArray
        
    }

    positionOf (code:string){
        let current = this.top
        let position = 1

        while (current !== null){
            if (current.equipment.getCode() === code){
                return position
            }

            current = current.next
            position ++;
        }
        return -1;
    }

    isFull(): boolean {
        return this.size >= this.capacity
    }
}
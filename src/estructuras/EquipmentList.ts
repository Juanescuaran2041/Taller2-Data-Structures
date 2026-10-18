import { Equipment } from "../models/Equipment.js";

export class NodeEquipment{
    public equipment : Equipment; 
    public next: NodeEquipment | null = null;
    public prev: NodeEquipment | null = null
    
    constructor(equipment: Equipment) {
        this.equipment = equipment;
    }
}

export class EquipmentList {
    private head: NodeEquipment | null = null;
    private tail: NodeEquipment | null = null;
    private size: number = 0;

    append(equipment: Equipment): void {
        const newNode = new NodeEquipment(equipment);

        if (this.tail === null || this.head === null) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            newNode.prev = this.tail;
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.size++;
    }

    prepend (equipment:Equipment) {
        const newNode = new NodeEquipment(equipment)
        if (this.head === null){
            this.head = newNode
            this.tail = newNode
        }
        else{
            newNode.next = this.head
            this.head.prev = newNode
            this.head = newNode
        }
        this.size ++;
    }

    //return the position of the current node
    private traverse_to_index (index:number): NodeEquipment | null {
        let current = this.head
        let i = 0;
        while (current !==null && i < index){
            current = current.next
            i++;
        }
        return current
    }

    insert (index:number, equipment:Equipment): void {
        if (index < 0 || index > this.size) {
            throw new RangeError("Index out of range");
        }
        if (index === 0) {
            this.prepend(equipment);
            return;
        }
        if (index === this.size) {
            this.append(equipment);
            return;
        }

        const newNode = new NodeEquipment(equipment)

        //points to the previous node
        const leader = this.traverse_to_index(index - 1)
        if (leader === null || leader.next === null) return;

        const follower = leader.next;
        leader.next = newNode;
        newNode.prev = leader
        newNode.next = follower
        follower.prev = newNode

        this.size ++;
    }

    //returns the equipment with the given code, or null if it is not in the list
    find (code: string): Equipment | null {
        let current = this.head
        while (current !== null) {
            if (current.equipment.getCode() === code) {
                return current.equipment
            }
            current = current.next
        }
        return null
    }

    //removes the equipment with the given code; returns it, or null if not found
    remove (code: string): Equipment | null {
        let current = this.head
        while (current !== null && current.equipment.getCode() !== code) {
            current = current.next
        }
        if (current === null) return null;

        if (current.prev === null) {
            this.head = current.next
        } else {
            // el siguiente al anterior del actual es igual al siguiente del actual
            current.prev.next = current.next
        }

        if (current.next === null) {
            this.tail = current.prev
        } else {
            // el anterior al siguiente del actual es igual al previo del actual
            current.next.prev = current.prev
        }

        current.next = null
        current.prev = null
        this.size --;
        return current.equipment
    }

    getSize (): number {
        return this.size
    }

    //return the list of equipments from head to tail
    toArray (): Equipment[] {
        const equipments: Equipment[] = [];
        let current = this.head

        while (current !== null){
            equipments.push(current.equipment);
            current = current.next;
        }

        return equipments
    }

    //return the list of equipments inverse
    traverseBackwards (): Equipment[] {
        const equipments: Equipment[] = [];
        let current = this.tail

        while (current !== null){
            equipments.push(current.equipment);
            current = current.prev;
        }
    
        return equipments
    }
}
import { LoanSystem } from "./servicios/LoanSystem.js";
import { TypeOfEquipment } from "./models/Equipment.js";

const system = new LoanSystem(2, 3)
console.log(system.loadInventory([
    { code: "PORT-01", type: TypeOfEquipment.PORTATIL },
    { code: "PORT-02", type: TypeOfEquipment.PORTATIL },
    { code: "PORT-01", type: TypeOfEquipment.PORTATIL },
]))
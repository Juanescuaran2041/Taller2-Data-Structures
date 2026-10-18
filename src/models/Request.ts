import { TypeOfEquipment } from "./Equipment.js";

export class Request {
    private studentCode: string;
    private requestedType: TypeOfEquipment;
    private requestedTime: number

    constructor (studentCode:string, requestedType:TypeOfEquipment, requestedTime:number){
        this.studentCode = studentCode;
        this.requestedTime = requestedTime;
        this.requestedType = requestedType
    }

    getStudentCode () : string {
        return this.studentCode
    }

    getRequestedType() : TypeOfEquipment {
        return this.requestedType
    }

    getRequestedTime () : number {
        return this.requestedTime
    }
}
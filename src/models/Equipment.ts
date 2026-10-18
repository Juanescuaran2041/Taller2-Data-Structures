export enum TypeOfEquipment {
    PORTATIL = "PORTATIL",
    KIT = "KIT",
    MULTIMETRO ="MULTIMETRO",
}


export enum State {
    EN_CARRO = "EN_CARRO",
    PRESTADO = "PRESTADO",
    EN_REVISION = "EN_REVISION",
    MANTENIMIENTO = "MANTENIMIENTO"

}

export class Equipment {
    private readonly code: string;
    private typeOfEquipment: TypeOfEquipment | null= null;
    private state: State | null = null
    private borrowings: number
    private loanTime: number | null = null

    constructor(code: string, typeOfEquipment: TypeOfEquipment, state: State = State.EN_CARRO) {
        this.code = code;
        this.typeOfEquipment = typeOfEquipment;
        this.state = state;
        this.borrowings = 0;
    }

    getCode(): string { return this.code; }
    getType(): TypeOfEquipment | null{ return this.typeOfEquipment; }
    getState(): State | null { return this.state; }
    getBorrowings(): number{ return this.borrowings; }
    getLoanTime(): number | null { return this.loanTime; }

    setState(state: State): void { this.state = state; }
    setLoanTime(time: number | null): void { this.loanTime = time; }
    registerBorrowing(): void { this.borrowings++; }


}
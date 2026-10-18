import { Request } from "../models/Request.js";

class NodeRequest {
    request: Request;
    next: NodeRequest | null = null;

    constructor(request: Request) {
        this.request = request
    }

}

export class RequestQueue {
    private first: NodeRequest | null = null
    private last: NodeRequest | null = null
    private size: number = 0;



    enqueue(request: Request): void {
        const newRequest = new NodeRequest(request)

        if (this.first === null) {
            this.first = newRequest
            this.last = newRequest
        }
        else {
            this.last!.next = newRequest
            this.last = newRequest
        }
        this.size++
    }

    dequeue(): Request | null {
        if (this.first === null) {
            return null
        }

        const removed = this.first
        this.first = removed.next

        if (this.first === null) {
            this.last = null
        }

        this.size--

        return removed.request
    }

    peek(): Request | null {
        return this.first === null ? null : this.first.request;
    }

    isEmpty(): boolean {
        return this.size === 0
    }

    getSize(): number {
        return this.size
    }


    contains(studentCode: string): boolean {
        let current = this.first

        while (current !== null) {
            if (current.request.getStudentCode() === studentCode) {
                return true
            }
            current = current.next
        }

        return false
    }

    toArray(): Request[] {
        let current = this.first
        const result: Request[] = []

        while (current !== null) {
            result.push(current.request)
            current = current.next
        }

        return result
    }
}
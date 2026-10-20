import type {DiningIdGenerator} from '../../application/port/out/DiningIdGenerator'

export class DiningIdGeneratorAdapter implements DiningIdGenerator {
    private sequence = 0

    createId(): string {
        return `meal-${Date.now()}-${++this.sequence}-${Math.random().toString(36).slice(2, 10)}`
    }
}

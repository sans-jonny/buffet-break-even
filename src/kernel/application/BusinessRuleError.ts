export class BusinessRuleError extends Error {
    constructor(readonly code: string) {
        super(code);
        this.name = 'BusinessRuleError';
    }
}

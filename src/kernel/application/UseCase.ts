import {Domain} from '../domain/Domain';
import {DomainRejection} from '../domain/DomainRejection';
import {InvalidRequestError} from './InvalidRequestError';
import {BusinessRuleError} from './BusinessRuleError';
import type {InjectionToken} from './InjectionToken';

export interface UseCase<R extends UseCase.Request, S extends UseCase.Response> {
    execute(request: R): S | Promise<S>;
}

export namespace UseCase {
    export type Token<T> = InjectionToken<T>;
    export type Scope = Readonly<{
        scopeId: string;
        roomId: string | null;
    }>;

    export abstract class Request {
    }

    export abstract class TransactionRequest extends Request {
        readonly scope: Scope;

        protected constructor(scope: Scope) {
            super();
            id(scope.scopeId);
            if (scope.roomId !== null && scope.roomId !== scope.scopeId)
                throw new InvalidRequestError('WRONG_STREAM');
            this.scope = Object.freeze({...scope});
        }
    }

    export abstract class Response {
    }

    export function id(value: string): void {
        if (typeof value !== 'string' || !value.trim())
            throw new InvalidRequestError('INVALID_ID');
    }

    export function quantity(value: number): void {
        if (!Domain.positive(value))
            throw new InvalidRequestError('INVALID_QUANTITY');
    }

    export function amount(value: number, positive = false): void {
        if (!Domain.minor(value) || (positive && value === 0))
            throw new InvalidRequestError('INVALID_TICKET_PRICE');
    }

    export function dto<T>(value: T): T {
        return value === undefined ? value : Domain.freeze(Domain.copy(value));
    }

    export function accept<T>(result: T | DomainRejection): T {
        if (result instanceof DomainRejection)
            throw new BusinessRuleError(result.rejected);
        return result as T;
    }
}

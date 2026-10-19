export interface BreakEvenResult {
    difference: number;
    percent: number;
    isBreakEven: boolean;
    verdict: 'break-even' | 'close' | 'below'
}

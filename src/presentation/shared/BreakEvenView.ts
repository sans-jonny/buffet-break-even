export interface BreakEvenView {
    difference: number;
    percent: number;
    isBreakEven: boolean;
    verdict: 'break-even' | 'close' | 'below'
}

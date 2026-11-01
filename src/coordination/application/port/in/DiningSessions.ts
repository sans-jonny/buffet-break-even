/** Device session entry points; callers supply parsed amounts in minor units. */
export interface DiningSessions {
    initialize(): Promise<void>;
    createRoom(total: number, categoryId: string): Promise<void>;
    joinRoom(code?: string): Promise<void>;
    refresh(): Promise<void>;
    leaveRoom(): Promise<void>;
    acknowledgeSubmission(): Promise<void>;
}

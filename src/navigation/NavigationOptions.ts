export interface NavigationOptions {
    url: string;
    success: () => void;
    fail: (error: unknown) => void
}

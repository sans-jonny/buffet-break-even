import type {NavigationOptions} from './NavigationOptions'

export interface NavigationPlatform {
    navigateTo(options: NavigationOptions): void

    redirectTo(options: NavigationOptions): void

    reLaunch(options: NavigationOptions): void

    navigateBack(options: { success: () => void; fail: (error: unknown) => void }): void
}

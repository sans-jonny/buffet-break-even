export namespace PageIds {
    export function create(): string {
        // Draft identifiers are retained when the page saves the new business object.
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
    }
}

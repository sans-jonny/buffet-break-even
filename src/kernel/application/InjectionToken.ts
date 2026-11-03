/** Runtime identity is a symbol; the required phantom field carries its service type. */
export type InjectionToken<T> = symbol & {readonly __injectionType: T};

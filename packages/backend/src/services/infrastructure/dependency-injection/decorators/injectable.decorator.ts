/**
 * Injectable Decorator
 * 
 * Marks a class as injectable and registers it with the DI container
 * 
 * Note: For full decorator support with metadata, install 'reflect-metadata' package
 * and import it at the top of your entry file: import 'reflect-metadata';
 */

import { container, ServiceScope } from '../core/diContainer.service';

// Use WeakMap for metadata storage (works without reflect-metadata)
const INJECTABLE_METADATA = new WeakMap<any, { token?: string; scope?: ServiceScope }>();
const INJECT_METADATA = new WeakMap<any, Map<number, string>>();
const OPTIONAL_PARAMS = new WeakMap<any, Set<number>>();

export interface InjectableMetadata {
  token?: string;
  scope?: ServiceScope;
}

/**
 * Injectable decorator - marks a class as injectable
 * 
 * @example
 * ```typescript
 * @Injectable({ token: SERVICE_TOKENS.USER_SERVICE, scope: 'singleton' })
 * export class UserService {
 *   constructor(
 *     @Inject(SERVICE_TOKENS.DATABASE_SERVICE) private db: DatabaseService
 *   ) {}
 * }
 * ```
 */
export function Injectable(options: {
  token?: string;
  scope?: ServiceScope;
} = {}): ClassDecorator {
  return function (target: any) {
    // Store metadata using WeakMap
    const token = options.token || target.name;
    const scope = options.scope || 'singleton';
    
    INJECTABLE_METADATA.set(target, { token, scope });

    // Get dependencies from constructor
    const dependencies = getDependencies(target);
    
    // Auto-register with container
    container.register(token, target as any, {
      scope,
      dependencies
    });

    return target;
  };
}

/**
 * Inject decorator - marks a constructor parameter for injection
 * 
 * @example
 * ```typescript
 * constructor(
 *   @Inject(SERVICE_TOKENS.DATABASE_SERVICE) private db: DatabaseService
 * ) {}
 * ```
 */
export function Inject(token: string): ParameterDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Store dependency token for this parameter index
    if (!INJECT_METADATA.has(target)) {
      INJECT_METADATA.set(target, new Map());
    }
    const deps = INJECT_METADATA.get(target)!;
    deps.set(parameterIndex, token);
  };
}

/**
 * Get dependencies from a constructor using stored metadata
 */
function getDependencies<T extends { new (...args: any[]): {} }>(target: T): string[] {
  const depsMap = INJECT_METADATA.get(target);
  if (!depsMap) {
    return [];
  }
  
  // Convert map to array, filling in undefined for missing indices
  const maxIndex = Math.max(...Array.from(depsMap.keys()), -1);
  const dependencies: (string | undefined)[] = new Array(maxIndex + 1).fill(undefined);
  
  depsMap.forEach((token, index) => {
    dependencies[index] = token;
  });
  
  return dependencies.filter((dep): dep is string => dep !== undefined);
}

/**
 * Optional decorator - marks a dependency as optional
 */
export function Optional(): ParameterDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (!OPTIONAL_PARAMS.has(target)) {
      OPTIONAL_PARAMS.set(target, new Set());
    }
    OPTIONAL_PARAMS.get(target)!.add(parameterIndex);
  };
}


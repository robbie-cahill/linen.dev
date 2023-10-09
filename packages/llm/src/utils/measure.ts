export function measure<T = any>(
  target: T,
  propertyName: string,
  descriptor: PropertyDescriptor
): any {
  const originalMethod = descriptor.value;

  const name =
    target && target.constructor && target.constructor.name
      ? `${target.constructor.name}.${propertyName.toString()}`
      : propertyName.toString();

  if (descriptor.value) {
    descriptor.value = async function (...args: any): Promise<void> {
      const start = Date.now();
      console.info(`${name} started.`);

      let result = originalMethod.apply(this, args);

      if (!!(result && result.then !== undefined)) {
        result = await result;
      }
      console.info(
        `${name} finished after ${(Date.now() - start).toFixed(
          2
        )} milliseconds.`
      );
      return result;
    };

    return descriptor;
  }
  throw new Error('@measure is applicable only on a methods.');
}

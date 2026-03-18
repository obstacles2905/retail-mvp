import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export const Match = <T>(
  property: keyof T,
  validationOptions?: ValidationOptions,
): PropertyDecorator => {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'Match',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedPropertyName] = args.constraints as (keyof T)[];
          const relatedValue = (args.object as T)[relatedPropertyName];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedPropertyName] = args.constraints as (keyof T)[];
          return `${String(args.property)} must match ${String(relatedPropertyName)}`;
        },
      },
    });
  };
};


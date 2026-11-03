import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'match', async: false })
class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [pattern] = args.constraints as [RegExp];
    return typeof value === 'string' && pattern.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return (args.constraints[1] as string) ?? 'Format tidak valid.';
  }
}

export function Match(
  pattern: RegExp,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    registerDecorator({
      target: (target as object).constructor,
      propertyName: propertyKey as string,
      options,
      constraints: [pattern, options?.message],
      validator: MatchConstraint,
    });
  };
}

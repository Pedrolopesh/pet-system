import { SetMetadata } from '@nestjs/common';
import type { PERMISSIONS } from '@petsystem/contracts';

export const PERMISSION_KEY = 'permission';

/** Exige uma permissão do papel (ex.: só dono e gerente cadastram produtos). */
export const RequiresPermission = (
  action: keyof typeof PERMISSIONS,
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSION_KEY, action);
